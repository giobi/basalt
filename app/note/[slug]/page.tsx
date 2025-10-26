import { githubClient } from '@/lib/github';
import { parseMarkdown } from '@/lib/markdown';
import NoteViewer from '@/components/NoteViewer';
import { notFound } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NotePage({ params }: PageProps) {
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

    let content: string | null = null;
    let foundPath: string | null = null;

    for (const path of searchPaths) {
      try {
        content = await githubClient.getFileContent(path);
        foundPath = path;
        break;
      } catch {
        // Continue to next path
        continue;
      }
    }

    if (!content || !foundPath) {
      return notFound();
    }

    const parsed = parseMarkdown(content);
    const title = parsed.frontmatter.title || decodedSlug.replace(/\.md$/, '');

    return (
      <NoteViewer
        content={parsed.content}
        title={title}
        frontmatter={parsed.frontmatter}
        wikilinks={parsed.wikilinks}
        notePath={foundPath}
      />
    );
  } catch (error) {
    console.error('Error loading note:', error);
    return notFound();
  }
}
