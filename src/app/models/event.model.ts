import { MessageInfo, MessagePart, TodoItem } from './session.model';
import { SessionInfo } from './session.model';

// Base server event structure
export interface ServerEvent {
  type: string;
  properties: any;
}

// Server Connected Event - First event on SSE connection
export interface ServerConnectedEvent extends ServerEvent {
  type: 'server.connected';
  properties: {};
}

// Message Events - Critical for real-time message streaming
export interface MessageUpdatedEvent extends ServerEvent {
  type: 'message.updated';
  properties: {
    info: MessageInfo;
  };
}

export interface MessageRemovedEvent extends ServerEvent {
  type: 'message.removed';
  properties: {
    sessionID: string;
    messageID: string;
  };
}

// Message Part Events - CRITICAL for streaming text/tool execution
export interface MessagePartUpdatedEvent extends ServerEvent {
  type: 'message.part.updated';
  properties: {
    part: MessagePart;
    delta?: string; // Incremental text update for streaming
  };
}

export interface MessagePartRemovedEvent extends ServerEvent {
  type: 'message.part.removed';
  properties: {
    sessionID: string;
    messageID: string;
    partID: string;
  };
}

// Session Events
export interface SessionCreatedEvent extends ServerEvent {
  type: 'session.created';
  properties: {
    info: SessionInfo;
  };
}

export interface SessionUpdatedEvent extends ServerEvent {
  type: 'session.updated';
  properties: {
    info: SessionInfo;
  };
}

export interface SessionDeletedEvent extends ServerEvent {
  type: 'session.deleted';
  properties: {
    info: SessionInfo;
  };
}

export interface SessionErrorEvent extends ServerEvent {
  type: 'session.error';
  properties: {
    sessionID: string;
    error: any;
  };
}

export interface SessionIdleEvent extends ServerEvent {
  type: 'session.idle';
  properties: {
    sessionID: string;
  };
}

export interface SessionCompactedEvent extends ServerEvent {
  type: 'session.compacted';
  properties: {
    sessionID: string;
  };
}

// Todo Events - For live todo list updates
export interface TodoUpdatedEvent extends ServerEvent {
  type: 'todo.updated';
  properties: {
    sessionID: string;
    todos: TodoItem[];
  };
}

// Permission Events - For tool execution approval
export interface Permission {
  id: string;
  type: string;
  pattern: string | string[];
  sessionID: string;
  messageID: string;
  callID?: string;
  title: string;
  metadata: Record<string, any>;
  time: {
    created: number;
  };
}

export interface PermissionUpdatedEvent extends ServerEvent {
  type: 'permission.updated';
  properties: Permission;
}

export interface PermissionRepliedEvent extends ServerEvent {
  type: 'permission.replied';
  properties: {
    sessionID: string;
    permissionID: string;
    response: 'once' | 'always' | 'reject';
  };
}

// File Events
export interface FileEditedEvent extends ServerEvent {
  type: 'file.edited';
  properties: {
    file: string;
  };
}

export interface FileWatcherUpdatedEvent extends ServerEvent {
  type: 'file.watcher.updated';
  properties: {
    file: string;
    event: 'add' | 'change' | 'unlink';
  };
}

// Command Events
export interface CommandExecutedEvent extends ServerEvent {
  type: 'command.executed';
  properties: {
    name: string;
    sessionID: string;
    arguments: string;
    messageID: string;
  };
}

// LSP Events
export interface LSPClientDiagnosticsEvent extends ServerEvent {
  type: 'lsp.client.diagnostics';
  properties: {
    serverID: string;
    path: string;
  };
}

export interface LSPUpdatedEvent extends ServerEvent {
  type: 'lsp.updated';
  properties: {};
}

// Installation Events
export interface InstallationUpdatedEvent extends ServerEvent {
  type: 'installation.updated';
  properties: {
    version: string;
  };
}

// TUI Events (Terminal UI - may not be relevant for web)
export interface TUIPromptAppendEvent extends ServerEvent {
  type: 'tui.prompt.append';
  properties: {
    text: string;
  };
}

export interface TUICommandExecuteEvent extends ServerEvent {
  type: 'tui.command.execute';
  properties: {
    command: string;
  };
}

export interface TUIToastShowEvent extends ServerEvent {
  type: 'tui.toast.show';
  properties: {
    title?: string;
    message: string;
    variant: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
  };
}

// Union type for all events
export type ServerEventType =
  | ServerConnectedEvent
  | MessageUpdatedEvent
  | MessageRemovedEvent
  | MessagePartUpdatedEvent
  | MessagePartRemovedEvent
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | SessionDeletedEvent
  | SessionErrorEvent
  | SessionIdleEvent
  | SessionCompactedEvent
  | TodoUpdatedEvent
  | PermissionUpdatedEvent
  | PermissionRepliedEvent
  | FileEditedEvent
  | FileWatcherUpdatedEvent
  | CommandExecutedEvent
  | LSPClientDiagnosticsEvent
  | LSPUpdatedEvent
  | InstallationUpdatedEvent
  | TUIPromptAppendEvent
  | TUICommandExecuteEvent
  | TUIToastShowEvent;

// Helper type guards
export function isMessagePartUpdatedEvent(event: ServerEvent): event is MessagePartUpdatedEvent {
  return event.type === 'message.part.updated';
}

export function isMessageUpdatedEvent(event: ServerEvent): event is MessageUpdatedEvent {
  return event.type === 'message.updated';
}

export function isSessionUpdatedEvent(event: ServerEvent): event is SessionUpdatedEvent {
  return event.type === 'session.updated';
}

export function isTodoUpdatedEvent(event: ServerEvent): event is TodoUpdatedEvent {
  return event.type === 'todo.updated';
}

export function isPermissionUpdatedEvent(event: ServerEvent): event is PermissionUpdatedEvent {
  return event.type === 'permission.updated';
}

export function isServerConnectedEvent(event: ServerEvent): event is ServerConnectedEvent {
  return event.type === 'server.connected';
}

export function isSessionErrorEvent(event: ServerEvent): event is SessionErrorEvent {
  return event.type === 'session.error';
}

export function isSessionCreatedEvent(event: ServerEvent): event is SessionCreatedEvent {
  return event.type === 'session.created';
}

export function isSessionDeletedEvent(event: ServerEvent): event is SessionDeletedEvent {
  return event.type === 'session.deleted';
}

export function isFileWatcherUpdatedEvent(event: ServerEvent): event is FileWatcherUpdatedEvent {
  return event.type === 'file.watcher.updated';
}
