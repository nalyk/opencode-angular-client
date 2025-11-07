export interface SessionInfo {
  id: string;
  title: string;
  agent?: string;
  parentID?: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;  // Session summarization timestamp
  };
  revert?: {
    messageID: string;    // Message ID to revert to
    time: number;         // When revert happened
  };
  share?: {
    key: string;
    url: string;
  };
}

// Message Part Types matching backend MessageV2
export interface BaseMessagePart {
  id: string;
  sessionID: string;
  messageID: string;
}

export interface TextPart extends BaseMessagePart {
  type: 'text';
  text: string;
  synthetic?: boolean;
  time?: {
    start: number;
    end?: number;
  };
  metadata?: Record<string, any>;
}

export interface ReasoningPart extends BaseMessagePart {
  type: 'reasoning';
  text: string;
  metadata?: Record<string, any>;
  time: {
    start: number;
    end?: number;
  };
}

export interface FilePart extends BaseMessagePart {
  type: 'file';
  mime: string;
  filename?: string;
  url: string;
  source?: any;
}

export interface AgentPart extends BaseMessagePart {
  type: 'agent';
  name: string;
  source?: {
    value: string;
    start: number;
    end: number;
  };
}

export interface ToolState {
  status: 'pending' | 'running' | 'completed' | 'error';
  input: Record<string, any>;
  output?: string;
  error?: string;
  title?: string;
  metadata?: Record<string, any>;
  time?: {
    start: number;
    end?: number;
  };
  raw?: string;
  attachments?: FilePart[];
}

export interface ToolPart extends BaseMessagePart {
  type: 'tool';
  callID: string;
  tool: string;
  state: ToolState;
  metadata?: Record<string, any>;
}

export interface RetryPart extends BaseMessagePart {
  type: 'retry';
  attempt: number;
  error: any;
  time: {
    created: number;
  };
}

export interface StepStartPart extends BaseMessagePart {
  type: 'step-start';
  snapshot?: string;
}

export interface StepFinishPart extends BaseMessagePart {
  type: 'step-finish';
  reason: string;
  snapshot?: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: {
      read: number;
      write: number;
    };
  };
}

export interface SnapshotPart extends BaseMessagePart {
  type: 'snapshot';
  snapshot: string;
}

export interface PatchPart extends BaseMessagePart {
  type: 'patch';
  hash: string;
  files: string[];
}

export type MessagePart =
  | TextPart
  | ReasoningPart
  | FilePart
  | AgentPart
  | ToolPart
  | RetryPart
  | StepStartPart
  | StepFinishPart
  | SnapshotPart
  | PatchPart;

// Message Info Types matching backend MessageV2
export interface UserMessageInfo {
  id: string;
  sessionID: string;
  role: 'user';
  time: {
    created: number;
    reverted?: number;  // Timestamp when message was reverted
    compacted?: number; // Timestamp when message was compacted
  };
  summary?: {
    title?: string;
    body?: string;
    diffs: any[];
  };
}

export interface AssistantMessageInfo {
  id: string;
  sessionID: string;
  role: 'assistant';
  time: {
    created: number;
    completed?: number;
    reverted?: number;  // Timestamp when message was reverted
    compacted?: number; // Timestamp when message was compacted
  };
  error?: any;
  system: string[];
  parentID: string;
  modelID: string;
  providerID: string;
  mode: string;
  path: {
    cwd: string;
    root: string;
  };
  summary?: boolean;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: {
      read: number;
      write: number;
    };
  };
}

export type MessageInfo = UserMessageInfo | AssistantMessageInfo;

export interface MessageWithParts {
  info: MessageInfo;
  parts: MessagePart[];
}

export interface TodoItem {
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface CreateSessionInput {
  title?: string;
  agent?: string;
  parentID?: string;
}

export interface PromptInput {
  sessionID?: string;
  messageID?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  agent?: string;
  noReply?: boolean;
  system?: string;
  tools?: Record<string, boolean>;
  parts: Array<{
    type: 'text' | 'file' | 'agent';
    text?: string;
    url?: string;
    mime?: string;
    filename?: string;
    name?: string;
    id?: string;
    source?: any;
  }>;
}

export interface FileDiff {
  file: string;           // File path
  before: string;         // Content before change
  after: string;          // Content after change
  additions: number;      // Lines added
  deletions: number;      // Lines deleted
}
