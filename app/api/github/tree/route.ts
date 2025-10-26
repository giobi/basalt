import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '';

  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const githubClient = new GitHubClient(session.accessToken);
    const tree = await githubClient.getVaultTree(path);
    return NextResponse.json(tree);
  } catch (error) {
    console.error('Error fetching vault tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault tree' },
      { status: 500 }
    );
  }
}
