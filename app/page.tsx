import FileBrowser from '@/components/FileBrowser';
import { GitHubClient } from '@/lib/github';
import { getSession } from '@/lib/auth';
import { getRepoSelection } from '@/lib/repo-session';
import { redirect } from 'next/navigation';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  if (!session?.accessToken) {
    redirect('/auth/signin');
  }

  // Check if repo is selected
  const repoSelection = await getRepoSelection();

  if (!repoSelection) {
    redirect('/select-repo');
  }

  // Fetch all markdown files from the vault
  const githubClient = new GitHubClient(
    session.accessToken,
    repoSelection.owner,
    repoSelection.repo,
    repoSelection.branch
  );
  const allFiles = await githubClient.getAllMarkdownFiles();

  const files = allFiles.map(path => ({
    path,
    name: path.split('/').pop() || path,
  }));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <FileBrowser files={files} />

      {/* Main content */}
      <main className="flex-1 p-8 bg-[#1e1e1e]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-[#d4d4d4]">Basalt</h1>
          <p className="text-[#a0a0a0] mb-8">
            Web-based Obsidian vault reader for{' '}
            <a
              href={`https://github.com/${repoSelection.owner}/${repoSelection.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7f7f7f] hover:text-[#a0a0a0] underline"
            >
              {repoSelection.owner}/{repoSelection.repo}
            </a>
            {' '}
            <a
              href="/select-repo"
              className="text-sm text-[#7f7f7f] hover:text-[#a0a0a0] underline"
            >
              (change)
            </a>
          </p>

          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-[#d4d4d4]">Features</h2>
            <ul className="space-y-2 list-disc list-inside mb-4 text-[#a0a0a0]">
              <li>Read Obsidian vault directly from GitHub</li>
              <li>Wikilinks support with navigation</li>
              <li>{files.length} markdown files indexed</li>
              <li>Clean markdown rendering</li>
              <li>File search and directory browser</li>
              <li>Interactive graph view of note connections</li>
            </ul>
            <a
              href="/graph"
              className="inline-block px-6 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#d4d4d4] font-medium rounded-lg transition-colors"
            >
              Explore Graph View
            </a>
          </div>

          <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-[#d4d4d4]">Getting Started</h3>
            <p className="text-sm text-[#a0a0a0]">
              Use the sidebar on the left to browse through the vault. Click on any file to view its contents.
              Wikilinks in notes are clickable and will navigate you to the linked note.
            </p>
          </div>

          {/* Recent files */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-[#d4d4d4]">Recent files</h3>
            <div className="space-y-2">
              {files.slice(0, 10).map(file => (
                <a
                  key={file.path}
                  href={`/note/${encodeURIComponent(file.path)}`}
                  className="block p-3 bg-[#2a2a2a] rounded border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors"
                >
                  <div className="font-medium text-[#d4d4d4]">{file.name}</div>
                  <div className="text-sm text-[#7f7f7f]">{file.path}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
