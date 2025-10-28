import type { VaultFile, VaultTree, Note } from '@/types/vault';

const GITHUB_API = 'https://api.github.com';

export class GitHubClient {
  private baseUrl: string;
  private token?: string;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(token: string, owner: string, repo: string, branch: string = 'main') {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.baseUrl = `${GITHUB_API}/repos/${owner}/${repo}`;
  }

  /**
   * Get repository info
   */
  async getRepoInfo() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(this.baseUrl, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch repo: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch the vault tree from GitHub
   */
  async getVaultTree(path: string = ''): Promise<VaultTree> {
    const url = `${this.baseUrl}/contents/${path}?ref=${this.branch}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    // Use OAuth token or fallback to env token
    const authToken = this.token || process.env.GITHUB_TOKEN;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
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
    const url = `${this.baseUrl}/contents/${path}?ref=${this.branch}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3.raw',
    };

    // Use OAuth token or fallback to env token
    const authToken = this.token || process.env.GITHUB_TOKEN;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
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
   * Get file content with metadata (including SHA)
   */
  async getFileWithMetadata(path: string): Promise<{ content: string; sha: string; size: number }> {
    const url = `${this.baseUrl}/contents/${path}?ref=${this.branch}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    // Use OAuth token or fallback to env token
    const authToken = this.token || process.env.GITHUB_TOKEN;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 0 }, // Don't cache for editor
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return {
      content,
      sha: data.sha,
      size: data.size,
    };
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

// Create client instance with OAuth token from session
// Usage: const client = new GitHubClient(session?.accessToken)
