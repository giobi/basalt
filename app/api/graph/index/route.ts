import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';
import { GitHubClient } from '@/lib/github';

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

/**
 * Build full vault index with all files and wikilinks
 * GET /api/graph/index
 *
 * Returns:
 * {
 *   files: string[],  // All markdown files
 *   wikilinks: { [file: string]: string[] },  // Wikilinks per file
 *   allWikilinks: string[],  // Unique list of all wikilink targets
 *   timestamp: number
 * }
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

    const github = new GitHubClient(
      session.accessToken,
      repoSelection.owner,
      repoSelection.repo,
      repoSelection.branch
    );

    console.log('Starting vault indexing...');

    // Get all markdown files
    const allFiles = await github.getAllMarkdownFiles();
    console.log(`Found ${allFiles.length} markdown files`);

    // Extract wikilinks from each file
    const wikilinksMap: { [file: string]: string[] } = {};
    const allWikilinksSet = new Set<string>();
    let processedCount = 0;

    for (const filePath of allFiles) {
      try {
        const content = await github.getFileContent(filePath);
        const wikilinks = extractWikilinks(content);

        if (wikilinks.length > 0) {
          wikilinksMap[filePath] = wikilinks.map(w => w.target);
          wikilinks.forEach(w => allWikilinksSet.add(w.target));
        }

        processedCount++;

        // Log progress every 100 files
        if (processedCount % 100 === 0) {
          console.log(`Indexed ${processedCount}/${allFiles.length} files`);
        }
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error);
      }
    }

    const allWikilinks = Array.from(allWikilinksSet);

    console.log(`Indexing complete: ${allFiles.length} files, ${allWikilinks.length} unique wikilinks`);

    return NextResponse.json(
      {
        files: allFiles,
        wikilinks: wikilinksMap,
        allWikilinks,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Failed to build index:', error);
    return NextResponse.json(
      { error: 'Failed to build index' },
      { status: 500 }
    );
  }
}
