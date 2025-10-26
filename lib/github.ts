import type { VaultFile, VaultTree, Note } from '@/types/vault';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'giobi';
const REPO_NAME = 'brain';
const BRANCH = 'main';

export class GitHubClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}`;
  }

  /**
   * Fetch the vault tree from GitHub
   */
  async getVaultTree(path: string = ''): Promise<VaultTree> {
    const url = `${this.baseUrl}/contents/${path}?ref=${BRANCH}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    // Add auth token if available (increases rate limit)
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      // Single file response
      return { files: [this.parseFile(data)], dirs: [] };
    }

    const files: VaultFile[] = [];
    const dirs: VaultFile[] = [];

    for (const item of data) {
      const file = this.parseFile(item);
      if (file.type === 'dir') {
        dirs.push(file);
      } else {
        files.push(file);
      }
    }

    return { files, dirs };
  }

  /**
   * Get file content from GitHub
   */
  async getFileContent(path: string): Promise<string> {
    const url = `${this.baseUrl}/contents/${path}?ref=${BRANCH}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3.raw',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * List all markdown files recursively
   */
  async getAllMarkdownFiles(basePath: string = ''): Promise<string[]> {
    const tree = await this.getVaultTree(basePath);
    const mdFiles: string[] = [];

    // Add markdown files from current level
    for (const file of tree.files) {
      if (file.path.endsWith('.md')) {
        mdFiles.push(file.path);
      }
    }

    // Recursively get files from subdirectories
    for (const dir of tree.dirs) {
      const subFiles = await this.getAllMarkdownFiles(dir.path);
      mdFiles.push(...subFiles);
    }

    return mdFiles;
  }

  private parseFile(item: any): VaultFile {
    return {
      path: item.path,
      name: item.name,
      type: item.type === 'dir' ? 'dir' : 'file',
      sha: item.sha,
      size: item.size,
    };
  }
}

export const githubClient = new GitHubClient();
