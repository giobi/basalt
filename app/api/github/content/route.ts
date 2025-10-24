import { NextRequest, NextResponse } from 'next/server';
import { githubClient } from '@/lib/github';
import { parseMarkdown } from '@/lib/markdown';

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
