import { NextRequest, NextResponse } from 'next/server';
import { githubClient } from '@/lib/github';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '';

  try {
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
