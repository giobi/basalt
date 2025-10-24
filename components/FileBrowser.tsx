'use client';

import Link from 'next/link';
import { useState } from 'react';

interface File {
  path: string;
  name: string;
}

interface FileBrowserProps {
  files: File[];
}

export default function FileBrowser({ files }: FileBrowserProps) {
  const [search, setSearch] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['log/2025', 'diary/2025']));

  // Group files by directory
  const filesByDir = files.reduce((acc, file) => {
    const parts = file.path.split('/');
    const dir = parts.slice(0, -1).join('/') || 'root';
    if (!acc[dir]) {
      acc[dir] = [];
    }
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, File[]>);

  // Filter files based on search
  const filteredFiles = search
    ? files.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.path.toLowerCase().includes(search.toLowerCase())
      )
    : files;

  const toggleDir = (dir: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dir)) {
      newExpanded.delete(dir);
    } else {
      newExpanded.add(dir);
    }
    setExpandedDirs(newExpanded);
  };

  // Build directory tree
  const buildTree = () => {
    const dirs = new Set<string>();
    filteredFiles.forEach(file => {
      const parts = file.path.split('/');
      for (let i = 1; i <= parts.length - 1; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    });

    return Array.from(dirs).sort();
  };

  const directories = buildTree();

  return (
    <div className="w-64 h-screen bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Brain Vault</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm mb-4"
        />

        {/* File tree */}
        <div className="space-y-1">
          {search ? (
            // Search results - flat list
            filteredFiles.map(file => (
              <Link
                key={file.path}
                href={`/note/${encodeURIComponent(file.path)}`}
                className="block px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded truncate"
                title={file.path}
              >
                📄 {file.name}
              </Link>
            ))
          ) : (
            // Directory tree
            <>
              {directories.map(dir => {
                const isExpanded = expandedDirs.has(dir);
                const filesInDir = filesByDir[dir] || [];
                const depth = dir.split('/').length - 1;
                const paddingLeft = depth * 12;

                return (
                  <div key={dir}>
                    {/* Directory */}
                    <button
                      onClick={() => toggleDir(dir)}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1"
                      style={{ paddingLeft: `${paddingLeft}px` }}
                    >
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                      <span>📁 {dir.split('/').pop()}</span>
                    </button>

                    {/* Files in directory */}
                    {isExpanded && filesInDir.map(file => (
                      <Link
                        key={file.path}
                        href={`/note/${encodeURIComponent(file.path)}`}
                        className="block px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded truncate"
                        style={{ paddingLeft: `${paddingLeft + 24}px` }}
                        title={file.path}
                      >
                        📄 {file.name}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
          <div>Total files: {files.length}</div>
          <div>Directories: {directories.length}</div>
          {search && <div>Filtered: {filteredFiles.length}</div>}
        </div>
      </div>
    </div>
  );
}
