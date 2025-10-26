import { NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const githubClient = new GitHubClient(session.accessToken);
    const files = await githubClient.getAllMarkdownFiles();
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching all files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
