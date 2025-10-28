'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Backlinks from './Backlinks';

interface NoteEditorProps {
  initialContent: string;
  title: string;
  frontmatter?: Record<string, any>;
  wikilinks?: string[];
  notePath: string;
  sha: string;
}

type SyncStatus = 'saved' | 'saving' | 'error';

export default function NoteEditor({
  initialContent,
  title,
  frontmatter,
  wikilinks,
  notePath,
  sha: initialSha,
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [sha, setSha] = useState(initialSha);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstChangeTimeRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save function
  const saveNote = async (contentToSave: string, currentSha: string) => {
    try {
      setSyncStatus('saving');
      const response = await fetch('/api/note/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: notePath,
          content: contentToSave,
          sha: currentSha,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      const data = await response.json();
      setSha(data.sha); // Update SHA for next save
      setSyncStatus('saved');
      firstChangeTimeRef.current = null; // Reset first change time
    } catch (error) {
      console.error('Save error:', error);
      setSyncStatus('error');
    }
  };

  // Auto-save effect with 15s debounce and 5min max wait
  useEffect(() => {
    // Clear any pending debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Skip if content hasn't changed from initial
    if (content === initialContent) {
      return;
    }

    // Track first change time for max timeout
    if (firstChangeTimeRef.current === null) {
      firstChangeTimeRef.current = Date.now();

      // Set max timeout of 5 minutes (300000ms)
      maxTimeoutRef.current = setTimeout(() => {
        saveNote(content, sha);
      }, 300000);
    }

    // Check if we've exceeded 5 minutes since first change
    const timeSinceFirstChange = Date.now() - firstChangeTimeRef.current;
    if (timeSinceFirstChange >= 300000) {
      // Force save immediately if we've hit the 5 minute mark
      saveNote(content, sha);
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
      return;
    }

    // Set debounce save for 15 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(content, sha);
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    }, 15000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, notePath, sha, initialContent]);

  // Convert wikilinks to markdown links for preview
  const processedContent = content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => {
      const displayText = alias || target;
      const href = `/note/${encodeURIComponent(target)}`;
      return `[${displayText}](${href})`;
    }
  );

  // Sync icon component
  const SyncIcon = () => {
    if (syncStatus === 'saving') {
      return (
        <div className="flex items-center gap-2 text-[#7f7f7f]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7f7f7f]"></div>
          <span className="text-xs">Saving...</span>
        </div>
      );
    }

    if (syncStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-red-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">Error</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-[#5a5a5a]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs">Saved</span>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen bg-[#1e1e1e] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#3a3a3a] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[#7f7f7f] hover:text-[#a0a0a0]">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-[#d4d4d4]">{title}</h1>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 text-xs rounded ${
                viewMode === 'edit'
                  ? 'bg-[#3a3a3a] text-[#d4d4d4]'
                  : 'text-[#7f7f7f] hover:text-[#a0a0a0]'
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-xs rounded ${
                viewMode === 'split'
                  ? 'bg-[#3a3a3a] text-[#d4d4d4]'
                  : 'text-[#7f7f7f] hover:text-[#a0a0a0]'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-xs rounded ${
                viewMode === 'preview'
                  ? 'bg-[#3a3a3a] text-[#d4d4d4]'
                  : 'text-[#7f7f7f] hover:text-[#a0a0a0]'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 overflow-hidden flex">
        {/* Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full border-r border-[#3a3a3a]`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-8 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm resize-none outline-none"
              placeholder="Start writing..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full overflow-y-auto`}>
            <div className="p-8">
              {/* Frontmatter */}
              {frontmatter && Object.keys(frontmatter).length > 0 && (
                <div className="text-sm text-[#a0a0a0] mb-6 p-4 bg-[#2a2a2a] rounded border border-[#3a3a3a]">
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

              {/* Rendered markdown */}
              <article className="prose prose-invert max-w-none prose-headings:text-[#d4d4d4] prose-p:text-[#a0a0a0] prose-a:text-[#7f7f7f] hover:prose-a:text-[#a0a0a0] prose-strong:text-[#d4d4d4] prose-code:text-[#a0a0a0] prose-pre:bg-[#2a2a2a] prose-li:text-[#a0a0a0]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {processedContent}
                </ReactMarkdown>
              </article>

              {/* Wikilinks */}
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
              <Backlinks notePath={notePath} />
            </div>
          </div>
        )}
      </div>

      {/* Sync status indicator - bottom right */}
      <div className="absolute bottom-4 right-4 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-2">
        <SyncIcon />
      </div>
    </div>
  );
}
