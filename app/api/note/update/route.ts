import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Update an existing note
 * PUT /api/note/update
 * Body: { path: string, content: string, sha: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repoSelection = await getRepoSelection();
    if (!repoSelection) {
      return NextResponse.json({ error: 'No repository selected' }, { status: 400 });
    }

    const body = await request.json();
    const { path, content, sha } = body;

    if (!path || !content || !sha) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update file via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoSelection.owner}/${repoSelection.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update ${path}`,
          content: Buffer.from(content).toString('base64'),
          sha,
          branch: repoSelection.branch,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to update file:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update file' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      path,
      sha: data.content.sha,
    });
  } catch (error) {
    console.error('Failed to update note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}
