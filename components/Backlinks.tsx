'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Backlink {
  path: string;
  name: string;
  context: string;
}

interface BacklinksProps {
  notePath: string;
}

export default function Backlinks({ notePath }: BacklinksProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBacklinks() {
      try {
        setLoading(true);
        const response = await fetch(`/api/backlinks?path=${encodeURIComponent(notePath)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch backlinks');
        }

        const data = await response.json();
        setBacklinks(data);
      } catch (err) {
        console.error('Error fetching backlinks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load backlinks');
      } finally {
        setLoading(false);
      }
    }

    fetchBacklinks();
  }, [notePath]);

  if (loading) {
    return (
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Backlinks</h3>
        <div className="text-sm text-gray-500">Loading backlinks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">Backlinks Error</h3>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Backlinks</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No backlinks found</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">
        Backlinks <span className="text-sm font-normal text-gray-500">({backlinks.length})</span>
      </h3>
      <div className="space-y-3">
        {backlinks.map((backlink, index) => (
          <div key={index} className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <Link
              href={`/note/${encodeURIComponent(backlink.path.replace(/\.md$/, ''))}`}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {backlink.name}
            </Link>
            {backlink.context && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {backlink.context}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{backlink.path}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
