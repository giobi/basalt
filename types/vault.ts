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

export interface GraphNode {
  id: string;
  name: string;
  path: string;
  group: number;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
