import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';
import { GitHubClient } from '@/lib/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Search for notes in the vault
 * GET /api/graph/search?q=query
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
    const query = searchParams.get('q')?.toLowerCase().trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const github = new GitHubClient(
      session.accessToken,
      repoSelection.owner,
      repoSelection.repo,
      repoSelection.branch
    );

    // Get all markdown files
    const allPaths = await github.getAllMarkdownFiles();

    // Fuzzy search: match query in filename or path
    const results = allPaths
      .filter(path => {
        const pathLower = path.toLowerCase();
        const name = path.split('/').pop()?.replace(/\.md$/, '').toLowerCase() || '';
        return pathLower.includes(query) || name.includes(query);
      })
      .slice(0, 50) // Limit to 50 results
      .map(path => ({
        path,
        name: path.split('/').pop()?.replace(/\.md$/, '') || path,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
