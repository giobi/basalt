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
    <div className="w-64 h-screen bg-[#1e1e1e] border-r border-[#3a3a3a] overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 text-[#d4d4d4]">Brain Vault</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-[#3a3a3a] rounded bg-[#2a2a2a] text-[#d4d4d4] text-sm mb-4 placeholder:text-[#7f7f7f] focus:outline-none focus:border-[#4a4a4a]"
        />

        {/* File tree */}
        <div className="space-y-1">
          {search ? (
            // Search results - flat list
            filteredFiles.map(file => (
              <Link
                key={file.path}
                href={`/note/${encodeURIComponent(file.path)}`}
                className="block px-2 py-1 text-sm text-[#a0a0a0] hover:bg-[#2a2a2a] rounded truncate"
                title={file.path}
              >
                {file.name}
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
                      className="w-full text-left px-2 py-1 text-sm text-[#a0a0a0] hover:bg-[#2a2a2a] rounded flex items-center gap-1"
                      style={{ paddingLeft: `${paddingLeft}px` }}
                    >
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                      <span>{dir.split('/').pop()}</span>
                    </button>

                    {/* Files in directory */}
                    {isExpanded && filesInDir.map(file => (
                      <Link
                        key={file.path}
                        href={`/note/${encodeURIComponent(file.path)}`}
                        className="block px-2 py-1 text-sm text-[#a0a0a0] hover:bg-[#2a2a2a] rounded truncate"
                        style={{ paddingLeft: `${paddingLeft + 24}px` }}
                        title={file.path}
                      >
                        {file.name}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-[#3a3a3a] text-xs text-[#7f7f7f]">
          <div>Total files: {files.length}</div>
          <div>Directories: {directories.length}</div>
          {search && <div>Filtered: {filteredFiles.length}</div>}
        </div>
      </div>
    </div>
  );
}
