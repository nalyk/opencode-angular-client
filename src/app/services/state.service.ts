import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SessionInfo, MessageWithParts, MessagePart, MessageInfo, TodoItem, TextPart, ReasoningPart, ToolPart } from '../models/session.model';
import { Permission } from '../models/event.model';
import { ProjectInfo } from './api.service';

/**
 * v3.0 State Service - Manages application state with SSE integration
 *
 * Features:
 * - Session management
 * - Real-time message streaming with delta accumulation
 * - Live todo list updates
 * - Permission requests
 * - Connection state
 */
@Injectable({
  providedIn: 'root'
})
export class StateService {
  // Session state
  private currentSessionSubject = new BehaviorSubject<SessionInfo | null>(null);
  private sessionsSubject = new BehaviorSubject<SessionInfo[]>([]);

  // Messages state - keyed by sessionID
  private messagesSubject = new BehaviorSubject<Map<string, MessageWithParts[]>>(new Map());

  // Todos state - keyed by sessionID
  private todosSubject = new BehaviorSubject<Map<string, TodoItem[]>>(new Map());

  // Permissions state - keyed by sessionID
  private permissionsSubject = new BehaviorSubject<Map<string, Permission[]>>(new Map());

  // Project state
  private currentProjectSubject = new BehaviorSubject<ProjectInfo | null>(null);
  private projectsSubject = new BehaviorSubject<ProjectInfo[]>([]);
  private currentDirectorySubject = new BehaviorSubject<string | undefined>(undefined);

  // UI state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private sidebarOpenSubject = new BehaviorSubject<boolean>(true);
  private connectionStateSubject = new BehaviorSubject<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Public observables
  currentSession$ = this.currentSessionSubject.asObservable();
  sessions$ = this.sessionsSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  todos$ = this.todosSubject.asObservable();
  permissions$ = this.permissionsSubject.asObservable();
  currentProject$ = this.currentProjectSubject.asObservable();
  projects$ = this.projectsSubject.asObservable();
  currentDirectory$ = this.currentDirectorySubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  sidebarOpen$ = this.sidebarOpenSubject.asObservable();
  connectionState$ = this.connectionStateSubject.asObservable();

  constructor() {
    console.log('[State Service] v3.0 initialized');
  }

  // ========== Session Management ==========

  setCurrentSession(session: SessionInfo | null): void {
    this.currentSessionSubject.next(session);
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSessionSubject.value;
  }

  setSessions(sessions: SessionInfo[]): void {
    this.sessionsSubject.next(sessions);
  }

  getSessions(): SessionInfo[] {
    return this.sessionsSubject.value;
  }

  addSession(session: SessionInfo): void {
    const sessions = [...this.sessionsSubject.value, session];
    this.sessionsSubject.next(sessions);
    console.log(`[State Service] ✓ Session added: ${session.id}`);
  }

  updateSession(id: string, updates: Partial<SessionInfo>): void {
    const sessions = this.sessionsSubject.value.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    this.sessionsSubject.next(sessions);

    const current = this.currentSessionSubject.value;
    if (current?.id === id) {
      this.currentSessionSubject.next({ ...current, ...updates });
    }
    console.log(`[State Service] ✓ Session updated: ${id}`);
  }

  removeSession(id: string): void {
    const sessions = this.sessionsSubject.value.filter(s => s.id !== id);
    this.sessionsSubject.next(sessions);

    if (this.currentSessionSubject.value?.id === id) {
      this.currentSessionSubject.next(null);
    }

    // Clean up related data
    this.removeMessagesForSession(id);
    this.removeTodosForSession(id);
    this.removePermissionsForSession(id);
    console.log(`[State Service] ✓ Session removed: ${id}`);
  }

  // ========== Message Management ==========

  setMessages(sessionID: string, messages: MessageWithParts[]): void {
    const map = new Map(this.messagesSubject.value);
    map.set(sessionID, messages);
    this.messagesSubject.next(map);
  }

  getMessages(sessionID: string): MessageWithParts[] {
    return this.messagesSubject.value.get(sessionID) || [];
  }

  getMessagesForSession(sessionID: string): Observable<MessageWithParts[]> {
    return this.messages$.pipe(
      map(messagesMap => messagesMap.get(sessionID) || [])
    );
  }

  addMessage(sessionID: string, message: MessageWithParts): void {
    const messages = this.getMessages(sessionID);
    const map = new Map(this.messagesSubject.value);
    map.set(sessionID, [...messages, message]);
    this.messagesSubject.next(map);
    console.log(`[State Service] ⚡ Message added: ${message.info.id} to session ${sessionID}`);
  }

  updateMessage(sessionID: string, messageID: string, info: Partial<MessageWithParts['info']>): void {
    const messages = this.getMessages(sessionID);
    let messageFound = false;

    const updated = messages.map(m => {
      if (m.info.id === messageID) {
        messageFound = true;
        return { ...m, info: { ...m.info, ...info } as MessageInfo };
      }
      return m;
    });

    // If message doesn't exist, create it with the provided info
    if (!messageFound && info.id) {
      const newMessage: MessageWithParts = {
        info: info as MessageInfo,
        parts: []
      };
      updated.push(newMessage);
      console.log(`[State Service] ⚡ New message created from update: ${messageID} (role: ${info.role})`);
    }

    const map = new Map(this.messagesSubject.value);
    map.set(sessionID, updated);
    this.messagesSubject.next(map);
  }

  removeMessagesForSession(sessionID: string): void {
    const map = new Map(this.messagesSubject.value);
    map.delete(sessionID);
    this.messagesSubject.next(map);
  }

  // ========== Message Part Management (CRITICAL for streaming) ==========

  /**
   * Update or add a message part with streaming support
   * Handles delta accumulation for real-time text/reasoning streaming
   */
  updateMessagePart(sessionID: string, messageID: string, part: MessagePart, delta?: string): void {
    const messages = this.getMessages(sessionID);
    let messageFound = false;
    let partFound = false;

    const updated = messages.map(msg => {
      if (msg.info.id !== messageID) return msg;
      messageFound = true;

      // Find existing part or add new one
      const parts = msg.parts || [];
      const existingPartIndex = parts.findIndex(p => p.id === part.id);

      if (existingPartIndex >= 0) {
        partFound = true;
        // Update existing part
        const existingPart = parts[existingPartIndex];
        const updatedPart = this.mergePart(existingPart, part, delta);
        const newParts = [...parts];
        newParts[existingPartIndex] = updatedPart;

        return { ...msg, parts: newParts };
      } else {
        // Add new part
        return { ...msg, parts: [...parts, part] };
      }
    });

    // If message doesn't exist yet, DON'T create it from a part update
    // Wait for the proper message.updated event which includes role
    if (!messageFound) {
      console.warn(`[State Service] ⚠️ Received part for non-existent message ${messageID}. Ignoring until message.updated arrives with proper role.`);
      return;
    }

    const map = new Map(this.messagesSubject.value);
    map.set(sessionID, updated);
    this.messagesSubject.next(map);

    if (delta) {
      console.log(`[State Service] ⚡ Part updated with delta: ${messageID}/${part.id} (+${delta.length} chars)`);
    }
  }

  /**
   * Merge part with delta accumulation for streaming
   */
  private mergePart(existing: MessagePart, update: MessagePart, delta?: string): MessagePart {
    // For text parts with delta, accumulate the text
    if (update.type === 'text' && delta) {
      const textPart = existing as TextPart;
      return {
        ...update,
        text: (textPart.text || '') + delta
      } as TextPart;
    }

    // For reasoning parts with delta, accumulate the text
    if (update.type === 'reasoning' && delta) {
      const reasoningPart = existing as ReasoningPart;
      return {
        ...update,
        text: (reasoningPart.text || '') + delta
      } as ReasoningPart;
    }

    // For tool parts, merge state
    if (update.type === 'tool') {
      const toolPart = update as ToolPart;
      return {
        ...existing,
        ...update,
        state: toolPart.state
      } as ToolPart;
    }

    // Default: replace
    return update;
  }

  removeMessagePart(sessionID: string, messageID: string, partID: string): void {
    const messages = this.getMessages(sessionID);
    const updated = messages.map(msg => {
      if (msg.info.id !== messageID) return msg;
      return {
        ...msg,
        parts: msg.parts.filter(p => p.id !== partID)
      };
    });
    const map = new Map(this.messagesSubject.value);
    map.set(sessionID, updated);
    this.messagesSubject.next(map);
    console.log(`[State Service] ✓ Part removed: ${messageID}/${partID}`);
  }

  // ========== Todo Management ==========

  setTodos(sessionID: string, todos: TodoItem[]): void {
    const map = new Map(this.todosSubject.value);
    map.set(sessionID, todos);
    this.todosSubject.next(map);
    console.log(`[State Service] ✓ Todos updated for session ${sessionID}: ${todos.length} items`);
  }

  getTodos(sessionID: string): TodoItem[] {
    return this.todosSubject.value.get(sessionID) || [];
  }

  removeTodosForSession(sessionID: string): void {
    const map = new Map(this.todosSubject.value);
    map.delete(sessionID);
    this.todosSubject.next(map);
  }

  // ========== Permission Management ==========

  addPermission(sessionID: string, permission: Permission): void {
    const permissions = this.getPermissions(sessionID);
    const map = new Map(this.permissionsSubject.value);
    map.set(sessionID, [...permissions, permission]);
    this.permissionsSubject.next(map);
    console.log(`[State Service] ⚠️ Permission requested: ${permission.id} - ${permission.title}`);
  }

  getPermissions(sessionID: string): Permission[] {
    return this.permissionsSubject.value.get(sessionID) || [];
  }

  removePermission(sessionID: string, permissionID: string): void {
    const permissions = this.getPermissions(sessionID);
    const map = new Map(this.permissionsSubject.value);
    map.set(sessionID, permissions.filter(p => p.id !== permissionID));
    this.permissionsSubject.next(map);
    console.log(`[State Service] ✓ Permission removed: ${permissionID}`);
  }

  removePermissionsForSession(sessionID: string): void {
    const map = new Map(this.permissionsSubject.value);
    map.delete(sessionID);
    this.permissionsSubject.next(map);
  }

  // ========== UI State ==========

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  toggleSidebar(): void {
    this.sidebarOpenSubject.next(!this.sidebarOpenSubject.value);
  }

  setSidebarOpen(open: boolean): void {
    this.sidebarOpenSubject.next(open);
  }

  setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error'): void {
    this.connectionStateSubject.next(state);
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.connectionStateSubject.value;
  }

  // ========== Project Management ==========

  setCurrentProject(project: ProjectInfo | null): void {
    this.currentProjectSubject.next(project);
    const name = project ? (project.id === 'global' ? 'Global' : project.worktree.split('/').filter(p => p).pop() || 'Root') : 'none';
    console.log('[State Service] Current project set:', name);
  }

  setProjects(projects: ProjectInfo[]): void {
    this.projectsSubject.next(projects);
    console.log(`[State Service] ${projects.length} projects loaded`);
  }

  getCurrentProject(): ProjectInfo | null {
    return this.currentProjectSubject.value;
  }

  getProjects(): ProjectInfo[] {
    return this.projectsSubject.value;
  }

  setCurrentDirectory(directory: string | undefined): void {
    this.currentDirectorySubject.next(directory);
    console.log('[State Service] Current directory set:', directory || 'Global');
  }

  getCurrentDirectory(): string | undefined {
    return this.currentDirectorySubject.value;
  }
}
