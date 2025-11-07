import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionInfo, MessageWithParts, CreateSessionInput, PromptInput, TodoItem, FileDiff } from '../models/session.model';
import { ConfigInfo, ProvidersResponse } from '../models/config.model';
import { FileNode, FileContent, FileStatus } from '../models/file.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Backend serves endpoints WITHOUT /api prefix!
  private baseUrl = '';

  constructor(private http: HttpClient) {}

  // Session endpoints
  getSessions(directory?: string): Observable<SessionInfo[]> {
    const params = directory ? new HttpParams().set('directory', directory) : undefined;
    return this.http.get<SessionInfo[]>(`${this.baseUrl}/session`, { params });
  }

  getSession(id: string): Observable<SessionInfo> {
    return this.http.get<SessionInfo>(`${this.baseUrl}/session/${id}`);
  }

  createSession(input?: CreateSessionInput): Observable<SessionInfo> {
    return this.http.post<SessionInfo>(`${this.baseUrl}/session`, input || {});
  }

  deleteSession(id: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/session/${id}`);
  }

  updateSession(id: string, updates: { title?: string }): Observable<SessionInfo> {
    return this.http.patch<SessionInfo>(`${this.baseUrl}/session/${id}`, updates);
  }

  forkSession(id: string, messageID: string): Observable<SessionInfo> {
    return this.http.post<SessionInfo>(`${this.baseUrl}/session/${id}/fork`, { messageID });
  }

  abortSession(id: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/session/${id}/abort`, {});
  }

  shareSession(id: string): Observable<SessionInfo> {
    return this.http.post<SessionInfo>(`${this.baseUrl}/session/${id}/share`, {});
  }

  unshareSession(id: string): Observable<SessionInfo> {
    return this.http.delete<SessionInfo>(`${this.baseUrl}/session/${id}/share`);
  }

  // Message endpoints
  getMessages(sessionId: string): Observable<MessageWithParts[]> {
    return this.http.get<MessageWithParts[]>(`${this.baseUrl}/session/${sessionId}/message`);
  }

  getMessage(sessionId: string, messageId: string): Observable<MessageWithParts> {
    return this.http.get<MessageWithParts>(`${this.baseUrl}/session/${sessionId}/message/${messageId}`);
  }

  sendMessage(sessionId: string, input: PromptInput): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/${sessionId}/message`, input);
  }

  revertMessage(sessionId: string, messageId: string): Observable<SessionInfo> {
    return this.http.post<SessionInfo>(`${this.baseUrl}/session/${sessionId}/revert`, { messageID: messageId });
  }

  unrevertMessages(sessionId: string): Observable<SessionInfo> {
    return this.http.post<SessionInfo>(`${this.baseUrl}/session/${sessionId}/unrevert`, {});
  }

  // Todo endpoints
  getTodos(sessionId: string): Observable<TodoItem[]> {
    return this.http.get<TodoItem[]>(`${this.baseUrl}/session/${sessionId}/todo`);
  }

  // Diff endpoints
  getSessionDiff(sessionId: string, messageId?: string): Observable<FileDiff[]> {
    const params = messageId ? new HttpParams().set('messageID', messageId) : undefined;
    return this.http.get<FileDiff[]>(`${this.baseUrl}/session/${sessionId}/diff`, { params });
  }

  // Config endpoints
  getConfig(): Observable<ConfigInfo> {
    return this.http.get<ConfigInfo>(`${this.baseUrl}/config`);
  }

  updateConfig(config: ConfigInfo): Observable<ConfigInfo> {
    return this.http.patch<ConfigInfo>(`${this.baseUrl}/config`, config);
  }

  getProviders(): Observable<ProvidersResponse> {
    return this.http.get<ProvidersResponse>(`${this.baseUrl}/config/providers`);
  }

  getAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/agent`);
  }

  // File endpoints
  listFiles(path: string): Observable<FileNode[]> {
    return this.http.get<FileNode[]>(`${this.baseUrl}/file`, {
      params: new HttpParams().set('path', path)
    });
  }

  readFile(path: string): Observable<FileContent> {
    return this.http.get<FileContent>(`${this.baseUrl}/file/content`, {
      params: new HttpParams().set('path', path)
    });
  }

  getFileStatus(): Observable<FileStatus[]> {
    return this.http.get<FileStatus[]>(`${this.baseUrl}/file/status`);
  }

  searchFiles(query: string, includeDirs = true): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/find/file`, {
      params: new HttpParams()
        .set('query', query)
        .set('dirs', includeDirs ? 'true' : 'false')
    });
  }

  searchText(pattern: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/find`, {
      params: new HttpParams().set('pattern', pattern)
    });
  }

  // Permission endpoints
  respondToPermission(sessionId: string, permissionId: string, response: 'once' | 'always' | 'reject'): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/session/${sessionId}/permissions/${permissionId}`, { response });
  }

  // Session Init endpoint - AI codebase analysis
  initSession(sessionId: string, providerID: string, modelID: string, messageID: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/session/${sessionId}/init`, {
      providerID,
      modelID,
      messageID
    });
  }

  // Session Summarize endpoint - conversation compaction
  summarizeSession(sessionId: string, providerID: string, modelID: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/session/${sessionId}/summarize`, {
      providerID,
      modelID
    });
  }

  // Command endpoints
  getCommands(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/command`);
  }

  executeCommand(sessionId: string, command: string, args: string, messageID?: string, agent?: string, model?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/${sessionId}/command`, {
      command,
      arguments: args,
      messageID,
      agent,
      model
    });
  }

  // Shell execution endpoint
  executeShell(sessionId: string, command: string, agent?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/session/${sessionId}/shell`, {
      command,
      agent
    });
  }

  // Session hierarchy endpoint
  getSessionChildren(sessionId: string, directory?: string): Observable<SessionInfo[]> {
    const params = directory ? new HttpParams().set('directory', directory) : undefined;
    return this.http.get<SessionInfo[]>(`${this.baseUrl}/session/${sessionId}/children`, { params });
  }

  // Status endpoints
  getMcpStatus(directory?: string): Observable<Record<string, any>> {
    const params = directory ? new HttpParams().set('directory', directory) : undefined;
    return this.http.get<Record<string, any>>(`${this.baseUrl}/mcp`, { params });
  }

  getLspStatus(directory?: string): Observable<any[]> {
    const params = directory ? new HttpParams().set('directory', directory) : undefined;
    return this.http.get<any[]>(`${this.baseUrl}/lsp`, { params });
  }

  getFormatterStatus(directory?: string): Observable<any[]> {
    const params = directory ? new HttpParams().set('directory', directory) : undefined;
    return this.http.get<any[]>(`${this.baseUrl}/formatter`, { params });
  }

  // Project endpoints
  getProjects(): Observable<ProjectInfo[]> {
    return this.http.get<ProjectInfo[]>(`${this.baseUrl}/project`);
  }

  getCurrentProject(): Observable<ProjectInfo> {
    return this.http.get<ProjectInfo>(`${this.baseUrl}/project/current`);
  }

  // Auth endpoints
  getAuthProviders(): Observable<AuthProvider[]> {
    return this.http.get<AuthProvider[]>(`${this.baseUrl}/auth`);
  }

  updateAuthProvider(providerId: string, credentials: AuthCredentials): Observable<any> {
    return this.http.put(`${this.baseUrl}/auth/${providerId}`, credentials);
  }

  testAuthProvider(providerId: string): Observable<{success: boolean; message?: string}> {
    return this.http.post<{success: boolean; message?: string}>(`${this.baseUrl}/auth/${providerId}/test`, {});
  }
}

// Project info interface (matches backend schema)
export interface ProjectInfo {
  id: string;
  worktree: string;
  vcs?: string;
  time?: {
    created: number;
    initialized?: number;
  };
}

// Auth interfaces
export interface AuthProvider {
  id: string;
  name: string;
  type: 'api_key' | 'oauth';
  hasCredentials: boolean;
  configured?: boolean;
}

export interface AuthCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
}
