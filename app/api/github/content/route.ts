import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github';
import { parseMarkdown } from '@/lib/markdown';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json(
      { error: 'Path parameter is required' },
      { status: 400 }
    );
  }

  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const repoSelection = await getRepoSelection();
    if (!repoSelection) {
      return NextResponse.json(
        { error: 'No repository selected' },
        { status: 400 }
      );
    }

    const githubClient = new GitHubClient(
      session.accessToken,
      repoSelection.owner,
      repoSelection.repo,
      repoSelection.branch
    );
    const content = await githubClient.getFileContent(path);
    const parsed = parseMarkdown(content);

    return NextResponse.json({
      path,
      content: parsed.content,
      frontmatter: parsed.frontmatter,
      wikilinks: parsed.wikilinks,
    });
  } catch (error) {
    console.error('Error fetching file content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 }
    );
  }
}
