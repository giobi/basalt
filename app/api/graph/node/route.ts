import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';
import { GitHubClient } from '@/lib/github';
import type { GraphData, GraphNode, GraphLink } from '@/types/vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WikiLink {
  target: string;
  alias?: string;
}

function extractWikilinks(content: string): WikiLink[] {
  const wikilinks: WikiLink[] = [];
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    wikilinks.push({
      target: match[1].trim(),
      alias: match[2]?.trim(),
    });
  }
  return wikilinks;
}

function normalizePathToId(path: string): string {
  return path.replace(/\.md$/, '').toLowerCase();
}

function findMatchingFile(target: string, allPaths: string[]): string | null {
  const targetNorm = target.toLowerCase();

  // Exact match
  const exact = allPaths.find(p => normalizePathToId(p) === targetNorm);
  if (exact) return exact;

  // Match basename
  const basename = allPaths.find(p => {
    const name = p.split('/').pop()?.replace(/\.md$/, '').toLowerCase();
    return name === targetNorm;
  });
  if (basename) return basename;

  // Partial match at end of path
  return allPaths.find(p => p.toLowerCase().endsWith(`${targetNorm}.md`)) || null;
}

function getNodeGroup(path: string): number {
  if (path.startsWith('log/')) return 1;
  if (path.startsWith('diary/')) return 2;
  if (path.startsWith('sketch/')) return 3;
  if (path.startsWith('projects/')) return 4;
  if (path.startsWith('database/')) return 5;
  return 0;
}

/**
 * Get graph data for a specific node and its connections
 * GET /api/graph/node?path=note.md&depth=2
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repoSelection = await getRepoSelection();
    if (!repoSelection) {
      return NextResponse.json({ error: 'No repository selected' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startPath = searchParams.get('path');
    const depth = Math.min(parseInt(searchParams.get('depth') || '2'), 5); // Max depth 5

    if (!startPath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const github = new GitHubClient(
      session.accessToken,
      repoSelection.owner,
      repoSelection.repo,
      repoSelection.branch
    );

    // Get all markdown files for reference
    const allPaths = await github.getAllMarkdownFiles();

    // BFS to build graph with depth limit
    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];
    const visited = new Set<string>();
    const queue: Array<{ path: string; depth: number }> = [{ path: startPath, depth: 0 }];

    while (queue.length > 0) {
      const { path, depth: currentDepth } = queue.shift()!;

      if (visited.has(path) || currentDepth > depth) continue;
      visited.add(path);

      // Fetch file content
      let content: string;
      try {
        content = await github.getFileContent(path);
      } catch (error) {
        console.error(`Failed to fetch ${path}:`, error);
        continue;
      }

      // Add node
      const nodeId = normalizePathToId(path);
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          name: path.split('/').pop()?.replace(/\.md$/, '') || nodeId,
          path,
          group: getNodeGroup(path),
          val: 4, // Node size
        });
      }

      // Extract and process wikilinks
      if (currentDepth < depth) {
        const wikilinks = extractWikilinks(content);

        for (const link of wikilinks) {
          const targetPath = findMatchingFile(link.target, allPaths);
          if (!targetPath) continue;

          const targetId = normalizePathToId(targetPath);

          // Add link
          links.push({
            source: nodeId,
            target: targetId,
          });

          // Queue target for next iteration
          if (!visited.has(targetPath)) {
            queue.push({ path: targetPath, depth: currentDepth + 1 });
          }
        }
      }
    }

    const graphData: GraphData = {
      nodes: Array.from(nodes.values()),
      links,
    };

    return NextResponse.json(graphData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Failed to build node graph:', error);
    return NextResponse.json(
      { error: 'Failed to build graph data' },
      { status: 500 }
    );
  }
}
