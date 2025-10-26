import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GitHubClient } from '@/lib/github';
import { setRepoSelection } from '@/lib/repo-session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { owner, repo, branch = 'main' } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this repo
    const githubClient = new GitHubClient(session.accessToken, owner, repo, branch);

    try {
      await githubClient.getRepoInfo();
    } catch (error) {
      return NextResponse.json(
        { error: 'Repository not found or you do not have access' },
        { status: 404 }
      );
    }

    // Store selection in cookie
    await setRepoSelection({ owner, repo, branch });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting repo:', error);
    return NextResponse.json(
      { error: 'Failed to select repository' },
      { status: 500 }
    );
  }
}
