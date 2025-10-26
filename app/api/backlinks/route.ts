import { NextResponse } from 'next/server';
import { getBacklinks } from '@/lib/graph';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const notePath = searchParams.get('path');

    if (!notePath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    console.log(`Fetching backlinks for: ${notePath}`);
    const backlinks = await getBacklinks(
      notePath,
      session.accessToken,
      repoSelection.owner,
      repoSelection.repo,
      repoSelection.branch
    );

    return NextResponse.json(backlinks, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Failed to fetch backlinks:', error);

    return NextResponse.json(
      { error: 'Failed to fetch backlinks' },
      { status: 500 }
    );
  }
}
