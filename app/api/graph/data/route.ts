import { NextResponse } from 'next/server';
import { buildGraphData } from '@/lib/graph';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Building graph data...');
    const graphData = await buildGraphData(session.accessToken);

    return NextResponse.json(graphData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Failed to build graph:', error);

    return NextResponse.json(
      { error: 'Failed to build graph data' },
      { status: 500 }
    );
  }
}
