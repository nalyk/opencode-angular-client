export interface CommandInfo {
  name: string;
  description: string;
  agent?: string;
  model?: string;
  template: string;
  subtask?: boolean;
}
