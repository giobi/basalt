'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Backlinks from './Backlinks';

interface NoteViewerProps {
  content: string;
  title: string;
  frontmatter?: Record<string, any>;
  wikilinks?: string[];
  notePath?: string;
}

export default function NoteViewer({ content, title, frontmatter, wikilinks, notePath }: NoteViewerProps) {
  // Convert wikilinks to markdown links for react-markdown
  const processedContent = content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => {
      const displayText = alias || target;
      const href = `/note/${encodeURIComponent(target)}`;
      return `[${displayText}](${href})`;
    }
  );

  return (
    <div className="max-w-4xl mx-auto p-8 bg-[#1e1e1e] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-[#7f7f7f] hover:text-[#a0a0a0] mb-4 inline-block">
          ← Back to vault
        </Link>
        <h1 className="text-4xl font-bold mb-2 text-[#d4d4d4]">{title}</h1>

        {/* Frontmatter metadata */}
        {frontmatter && Object.keys(frontmatter).length > 0 && (
          <div className="text-sm text-[#a0a0a0] mt-4 p-4 bg-[#2a2a2a] rounded border border-[#3a3a3a]">
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
      <article className="prose prose-invert max-w-none prose-headings:text-[#d4d4d4] prose-p:text-[#a0a0a0] prose-a:text-[#7f7f7f] hover:prose-a:text-[#a0a0a0] prose-strong:text-[#d4d4d4] prose-code:text-[#a0a0a0] prose-pre:bg-[#2a2a2a] prose-li:text-[#a0a0a0]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {processedContent}
        </ReactMarkdown>
      </article>

      {/* Wikilinks sidebar */}
      {wikilinks && wikilinks.length > 0 && (
        <div className="mt-12 pt-8 border-t border-[#3a3a3a]">
          <h2 className="text-xl font-semibold mb-4 text-[#d4d4d4]">Linked notes ({wikilinks.length})</h2>
          <ul className="space-y-2">
            {wikilinks.map((link, idx) => (
              <li key={idx}>
                <Link
                  href={`/note/${encodeURIComponent(link)}`}
                  className="text-[#7f7f7f] hover:text-[#a0a0a0]"
                >
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Backlinks */}
      {notePath && <Backlinks notePath={notePath} />}
    </div>
  );
}
