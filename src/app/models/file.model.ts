export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
}

export interface FileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
}
