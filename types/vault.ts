export interface VaultFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  sha?: string;
  size?: number;
}

export interface VaultTree {
  files: VaultFile[];
  dirs: VaultFile[];
}

export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter?: Record<string, any>;
  wikilinks: string[];
  backlinks?: string[];
}
