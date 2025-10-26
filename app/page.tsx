import FileBrowser from '@/components/FileBrowser';
import { GitHubClient } from '@/lib/github';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  if (!session?.accessToken) {
    redirect('/auth/signin');
  }

  // Fetch all markdown files from the vault
  const githubClient = new GitHubClient(session.accessToken);
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
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Basalt</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Web-based Obsidian vault reader for{' '}
            <a
              href="https://github.com/giobi/brain"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              giobi/brain
            </a>
          </p>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Features</h2>
            <ul className="space-y-2 list-disc list-inside mb-4">
              <li>📖 Read Obsidian vault directly from GitHub</li>
              <li>🔗 Wikilinks support with navigation</li>
              <li>📄 {files.length} markdown files indexed</li>
              <li>🎨 Clean markdown rendering</li>
              <li>🔍 File search and directory browser</li>
              <li>🕸️ Interactive graph view of note connections</li>
            </ul>
            <a
              href="/graph"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              🕸️ Explore Graph View
            </a>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Use the sidebar on the left to browse through the vault. Click on any file to view its contents.
              Wikilinks in notes are clickable and will navigate you to the linked note.
            </p>
          </div>

          {/* Recent files */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Recent files</h3>
            <div className="space-y-2">
              {files.slice(0, 10).map(file => (
                <a
                  key={file.path}
                  href={`/note/${encodeURIComponent(file.path)}`}
                  className="block p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{file.path}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
