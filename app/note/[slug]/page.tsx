import { GitHubClient } from '@/lib/github';
import { parseMarkdown } from '@/lib/markdown';
import NoteEditor from '@/components/NoteEditor';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NotePage({ params }: PageProps) {
  const session = await getSession();

  if (!session?.accessToken) {
    redirect('/auth/signin');
  }

  const repoSelection = await getRepoSelection();

  if (!repoSelection) {
    redirect('/select-repo');
  }

  const githubClient = new GitHubClient(
    session.accessToken,
    repoSelection.owner,
    repoSelection.repo,
    repoSelection.branch
  );
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  try {
    // Try to find the file in the vault
    // First try exact match
    let filePath = decodedSlug.endsWith('.md') ? decodedSlug : `${decodedSlug}.md`;

    // If path doesn't exist, try searching in common directories
    const searchPaths = [
      filePath,
      `log/2025/${filePath}`,
      `diary/2025/${filePath}`,
      `sketch/${filePath}`,
      `database/${filePath}`,
    ];

    let fileData: { content: string; sha: string; size: number } | null = null;
    let foundPath: string | null = null;

    for (const path of searchPaths) {
      try {
        fileData = await githubClient.getFileWithMetadata(path);
        foundPath = path;
        break;
      } catch {
        // Continue to next path
        continue;
      }
    }

    if (!fileData || !foundPath) {
      return notFound();
    }

    const parsed = parseMarkdown(fileData.content);
    const title = parsed.frontmatter.title || decodedSlug.replace(/\.md$/, '');

    return (
      <NoteEditor
        initialContent={fileData.content}
        title={title}
        frontmatter={parsed.frontmatter}
        wikilinks={parsed.wikilinks}
        notePath={foundPath}
        sha={fileData.sha}
      />
    );
  } catch (error) {
    console.error('Error loading note:', error);
    return notFound();
  }
}
