import { NextResponse } from 'next/server';
import { githubClient } from '@/lib/github';

export async function GET() {
  try {
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
