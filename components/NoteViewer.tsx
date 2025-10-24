'use client';

import Link from 'next/link';
import { convertWikilinks } from '@/lib/markdown';

interface NoteViewerProps {
  content: string;
  title: string;
  frontmatter?: Record<string, any>;
  wikilinks?: string[];
}

export default function NoteViewer({ content, title, frontmatter, wikilinks }: NoteViewerProps) {
  // Convert wikilinks to HTML
  const htmlContent = convertWikilinks(content);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← Back to vault
        </Link>
        <h1 className="text-4xl font-bold mb-2">{title}</h1>

        {/* Frontmatter metadata */}
        {frontmatter && Object.keys(frontmatter).length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <details>
              <summary className="cursor-pointer font-semibold">Metadata</summary>
              <dl className="mt-2 space-y-1">
                {Object.entries(frontmatter).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="font-medium">{key}:</dt>
                    <dd>{JSON.stringify(value)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        )}
      </div>

      {/* Note content */}
      <article
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Wikilinks sidebar */}
      {wikilinks && wikilinks.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Linked notes ({wikilinks.length})</h2>
          <ul className="space-y-2">
            {wikilinks.map((link, idx) => (
              <li key={idx}>
                <Link
                  href={`/note/${encodeURIComponent(link)}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
