import type { GraphData, GraphNode, GraphLink } from '@/types/vault';
import { GitHubClient } from './github';

interface WikiLink {
  target: string;
  alias?: string;
}

/**
 * Extract wikilinks from markdown content
 */
function extractWikilinks(content: string): WikiLink[] {
  const wikilinks: WikiLink[] = [];

  // Match [[target]] or [[target|alias]]
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

/**
 * Normalize file path to node ID
 */
function normalizePathToId(path: string): string {
  // Remove .md extension and convert to lowercase for matching
  return path.replace(/\.md$/, '').toLowerCase();
}

/**
 * Find matching file path for a wikilink target
 */
function findMatchingFile(target: string, allPaths: string[]): string | null {
  const targetNorm = target.toLowerCase();

  // Strategy 1: Exact match with .md
  const exact = allPaths.find(p => normalizePathToId(p) === targetNorm);
  if (exact) return exact;

  // Strategy 2: Match basename (last part of path)
  const basename = allPaths.find(p => {
    const name = p.split('/').pop()?.replace(/\.md$/, '').toLowerCase();
    return name === targetNorm;
  });
  if (basename) return basename;

  // Strategy 3: Partial match (contains target)
  const partial = allPaths.find(p =>
    normalizePathToId(p).includes(targetNorm)
  );
  if (partial) return partial;

  return null;
}

/**
 * Build graph data from vault files
 */
export async function buildGraphData(accessToken: string, owner: string, repo: string, branch: string = 'main'): Promise<GraphData> {
  const githubClient = new GitHubClient(accessToken, owner, repo, branch);

  // Get all markdown files
  const allFiles = await githubClient.getAllMarkdownFiles();

  // Initialize nodes and links
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  // Create nodes for all files
  for (const path of allFiles) {
    const id = normalizePathToId(path);
    const name = path.split('/').pop()?.replace(/\.md$/, '') || path;

    // Determine node group based on path
    let group = 0;
    if (path.startsWith('log/')) group = 1;
    else if (path.startsWith('diary/')) group = 2;
    else if (path.startsWith('sketch/')) group = 3;
    else if (path.startsWith('projects/')) group = 4;
    else if (path.startsWith('database/')) group = 5;

    nodesMap.set(id, {
      id,
      name,
      path,
      group,
      val: 1, // Node size, will be adjusted by degree
      exists: true, // All nodes from buildGraphData are existing files
    });
  }

  // Extract wikilinks from each file
  let processedCount = 0;
  for (const path of allFiles) {
    try {
      const content = await githubClient.getFileContent(path);
      const wikilinks = extractWikilinks(content);

      const sourceId = normalizePathToId(path);

      for (const link of wikilinks) {
        const targetPath = findMatchingFile(link.target, allFiles);

        if (targetPath) {
          const targetId = normalizePathToId(targetPath);

          // Add link (directed: source -> target)
          links.push({
            source: sourceId,
            target: targetId,
          });

          // Increase node size based on degree
          const targetNode = nodesMap.get(targetId);
          if (targetNode) {
            targetNode.val = (targetNode.val || 1) + 0.5;
          }
        }
      }

      processedCount++;

      // Log progress every 50 files
      if (processedCount % 50 === 0) {
        console.log(`Graph: Processed ${processedCount}/${allFiles.length} files`);
      }
    } catch (error) {
      console.error(`Failed to process ${path}:`, error);
    }
  }

  // Convert nodes map to array
  const nodes = Array.from(nodesMap.values());

  console.log(`Graph built: ${nodes.length} nodes, ${links.length} links`);

  return {
    nodes,
    links,
  };
}

/**
 * Get backlinks for a specific note
 */
export async function getBacklinks(notePath: string, accessToken: string, owner: string, repo: string, branch: string = 'main'): Promise<Array<{
  path: string;
  name: string;
  context: string;
}>> {
  const githubClient = new GitHubClient(accessToken, owner, repo, branch);
  const allFiles = await githubClient.getAllMarkdownFiles();
  const backlinks: Array<{ path: string; name: string; context: string }> = [];

  const targetId = normalizePathToId(notePath);
  const targetName = notePath.split('/').pop()?.replace(/\.md$/, '') || notePath;

  for (const sourcePath of allFiles) {
    try {
      const content = await githubClient.getFileContent(sourcePath);
      const wikilinks = extractWikilinks(content);

      // Check if this file links to target
      const hasLink = wikilinks.some(link => {
        const linkedPath = findMatchingFile(link.target, allFiles);
        return linkedPath && normalizePathToId(linkedPath) === targetId;
      });

      if (hasLink) {
        // Extract context (the line containing the wikilink)
        const lines = content.split('\n');
        const contextLine = lines.find(line =>
          line.includes(`[[${targetName}]]`) ||
          line.toLowerCase().includes(targetName.toLowerCase())
        );

        backlinks.push({
          path: sourcePath,
          name: sourcePath.split('/').pop()?.replace(/\.md$/, '') || sourcePath,
          context: contextLine?.trim() || '',
        });
      }
    } catch (error) {
      console.error(`Failed to check backlinks in ${sourcePath}:`, error);
    }
  }

  return backlinks;
}
