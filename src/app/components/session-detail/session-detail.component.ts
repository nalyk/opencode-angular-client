import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { MessageWithParts, SessionInfo } from '../../models/session.model';
import { ProviderInfo } from '../../models/config.model';
import { Subscription } from 'rxjs';
import { MessageComponent } from '../message/message.component';
import { ModelSelectorComponent } from '../model-selector/model-selector.component';
import { SessionDiffComponent } from '../session-diff/session-diff.component';
import { SessionInitDialogComponent, InitRequest } from '../session-init-dialog/session-init-dialog.component';
import { SessionSummarizeDialogComponent, SummarizeRequest } from '../session-summarize-dialog/session-summarize-dialog.component';
import { CommandPaletteComponent, CommandExecution } from '../command-palette/command-palette.component';
import { ShellTerminalComponent } from '../shell-terminal/shell-terminal.component';
import { CommandInfo } from '../../models/command.model';

/**
 * v3.0 Session Detail Component - Real-time message streaming
 *
 * Features:
 * - Subscribes to state service for real-time message updates via SSE
 * - Displays streaming text, thinking, tool calls as they happen
 * - Auto-scrolls to bottom on new messages
 * - Shows loading state during AI response
 */
@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageComponent, ModelSelectorComponent, SessionDiffComponent, SessionInitDialogComponent, SessionSummarizeDialogComponent, CommandPaletteComponent, ShellTerminalComponent],
  template: `
    <div class="session-detail">
      <div class="header-bar">
        <app-model-selector
          (modelSelected)="onModelSelected($event)"
        ></app-model-selector>

        <div class="controls">
          <select class="control-select" [(ngModel)]="selectedAgent" title="Agent">
            <option *ngFor="let agent of availableAgents" [value]="agent.name">
              {{ agent.name | titlecase }}
            </option>
          </select>

          <select class="control-select" [(ngModel)]="selectedMode" title="Mode">
            <option value="code">Code</option>
            <option value="plan">Plan</option>
          </select>

          <button class="control-btn" (click)="showDiffViewer = true" title="View changes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>View Diff</span>
          </button>

          <button class="control-btn" (click)="showInitDialog = true" title="Analyze codebase and create AGENTS.md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <span>Analyze</span>
          </button>

          <button class="control-btn" (click)="showSummarizeDialog = true" title="Compress conversation history">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span>Summarize</span>
          </button>

          <button class="control-btn" (click)="openCommandPalette()" title="Open command palette (Ctrl+Shift+P)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <span>Commands</span>
          </button>

          <button class="control-btn" (click)="toggleTerminal()" title="Toggle shell terminal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span>Terminal</span>
          </button>

          <button *ngIf="currentSession?.parentID" class="control-btn" (click)="navigateToParent()" title="View parent session">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Parent</span>
          </button>

          <button *ngIf="sessionChildren.length > 0" class="control-btn" (click)="toggleChildrenDropdown()" title="View child sessions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>Children ({{ sessionChildren.length }})</span>
          </button>
        </div>

        <!-- Children Dropdown -->
        <div *ngIf="showChildrenDropdown" class="children-dropdown" (click)="$event.stopPropagation()">
          <div class="dropdown-header">
            <span>Child Sessions</span>
            <button class="close-dropdown-btn" (click)="showChildrenDropdown = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="dropdown-content">
            <div
              *ngFor="let child of sessionChildren"
              class="dropdown-item"
              (click)="navigateToChild(child.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <div class="dropdown-item-content">
                <div class="dropdown-item-title">{{ child.title || 'Untitled Session' }}</div>
                <div class="dropdown-item-meta">{{ child.id.substring(4, 12) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="session-stats">
          <div class="stat">
            <span class="stat-label">TOKENS IN:</span>
            <span class="stat-value">{{ sessionStats.tokensIn.toLocaleString() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">TOKENS OUT:</span>
            <span class="stat-value">{{ sessionStats.tokensOut.toLocaleString() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">REASONING:</span>
            <span class="stat-value">{{ sessionStats.reasoning.toLocaleString() }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">COST:</span>
            <span class="stat-value">💰 {{ formatCost(sessionStats.cost) }}</span>
          </div>
        </div>
      </div>

      <!-- Revert Warning Banner -->
      <div *ngIf="currentSession?.revert" class="revert-banner">
        <div class="revert-banner-content">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div class="revert-banner-text">
            <strong>You are viewing a reverted state</strong>
            <span>Changes after the revert point are hidden. New messages cannot be sent.</span>
          </div>
        </div>
        <button class="unrevert-btn" (click)="onUnrevertSession()" title="Restore latest state">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Undo Revert
        </button>
      </div>

      <div class="messages-container" #messagesContainer>
        <div *ngIf="messages.length === 0 && !loading" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>Start a Conversation</p>
          <p class="hint">Send a message to begin interacting with the AI assistant</p>
        </div>

        <app-message
          *ngFor="let message of messages; trackBy: trackByMessageId"
          [message]="message"
          (revert)="onRevertToMessage($event)"
        ></app-message>

        <div *ngIf="loading && lastUserMessage" class="user-message-preview">
          <div class="message-bubble">{{ lastUserMessage }}</div>
        </div>

        <div *ngIf="loading" class="loading-indicator">
          <div class="loading-spinner"></div>
          <span>AI is responding...</span>
        </div>
      </div>

      <!-- Fixed input at bottom (outside messages-container) -->
      <div class="input-container">
        <div class="input-wrapper">
          <textarea
            [(ngModel)]="inputText"
            (keydown)="onKeyDown($event)"
            [placeholder]="currentSession?.revert ? 'Cannot send messages in reverted state' : 'Type your message... (Shift+Enter for new line, Enter to send)'"
            class="message-input"
            rows="1"
            #messageInput
            [disabled]="loading || !!currentSession?.revert"
          ></textarea>
          <button
            class="send-btn"
            [disabled]="!inputText.trim() || loading || !!currentSession?.revert"
            (click)="sendMessage()"
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <!-- Session Diff Viewer -->
      <app-session-diff
        *ngIf="showDiffViewer"
        [sessionId]="sessionId"
        (close)="showDiffViewer = false"
      ></app-session-diff>

      <!-- Session Init Dialog -->
      <app-session-init-dialog
        *ngIf="showInitDialog"
        [providers]="providers"
        [defaultProvider]="selectedModel?.providerID"
        [defaultModel]="selectedModel?.modelID"
        (analyze)="onInitSession($event)"
        (cancel)="showInitDialog = false"
      ></app-session-init-dialog>

      <!-- Session Summarize Dialog -->
      <app-session-summarize-dialog
        *ngIf="showSummarizeDialog"
        [providers]="providers"
        [defaultProvider]="selectedModel?.providerID"
        [defaultModel]="selectedModel?.modelID"
        (summarize)="onSummarizeSession($event)"
        (cancel)="showSummarizeDialog = false"
      ></app-session-summarize-dialog>

      <!-- Command Palette -->
      <app-command-palette
        #commandPalette
        *ngIf="showCommandPalette"
        (execute)="onCommandExecute($event)"
        (close)="onCommandPaletteClose()"
      ></app-command-palette>

      <!-- Shell Terminal -->
      <app-shell-terminal
        *ngIf="showTerminal"
        (execute)="onShellExecute($event)"
        (close)="onTerminalClose()"
      ></app-shell-terminal>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .session-detail {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .header-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .revert-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      background: rgba(239, 68, 68, 0.1);
      border-bottom: 2px solid #ef4444;
      gap: 1rem;
    }

    .revert-banner-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
    }

    .revert-banner-content svg {
      flex-shrink: 0;
      color: #ef4444;
      margin-top: 0.125rem;
    }

    .revert-banner-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .revert-banner-text strong {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .revert-banner-text span {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .unrevert-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .unrevert-btn:hover {
      background: #1e40af;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .control-select {
      padding: 0.4rem 0.6rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 0.75rem;
      cursor: pointer;
    }

    .control-select:hover {
      border-color: var(--primary);
    }

    .control-select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .control-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .control-btn:hover {
      border-color: var(--primary);
      background: var(--bg-secondary);
    }

    .control-btn svg {
      flex-shrink: 0;
    }

    .children-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.5rem;
      min-width: 300px;
      max-width: 400px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .close-dropdown-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      transition: all 0.2s;
    }

    .close-dropdown-btn:hover {
      background: var(--bg-quaternary);
      color: var(--text-primary);
    }

    .dropdown-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 1px solid var(--border);
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: var(--bg-tertiary);
    }

    .dropdown-item svg {
      flex-shrink: 0;
      color: var(--text-secondary);
    }

    .dropdown-item-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .dropdown-item-title {
      font-size: 0.875rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-item-meta {
      font-size: 0.75rem;
      font-family: monospace;
      color: var(--text-secondary);
      opacity: 0.7;
    }

    .session-stats {
      display: flex;
      gap: 1.5rem;
      padding: 0.5rem 1rem;
      align-items: center;
      margin-left: auto;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-label {
      font-size: 0.625rem;
      color: var(--text-tertiary);
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 0.875rem;
      color: var(--text-primary);
      font-weight: 500;
      font-family: 'Courier New', monospace;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      scroll-behavior: smooth;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--text-secondary);
      gap: 1rem;
    }

    .empty-state svg {
      opacity: 0.3;
    }

    .empty-state p {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 500;
    }

    .hint {
      font-size: 0.875rem !important;
      font-weight: 400 !important;
      color: var(--text-tertiary) !important;
    }

    .user-message-preview {
      margin-bottom: 1rem;
      display: flex;
      justify-content: flex-end;
    }

    .message-bubble {
      max-width: 70%;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      color: var(--text-primary);
      opacity: 0.7;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(59, 130, 246, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .input-container {
      padding: 1rem;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
    }

    .input-wrapper {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
    }

    .message-input {
      flex: 1;
      padding: 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.875rem;
      resize: none;
      max-height: 200px;
      min-height: 44px;
      line-height: 1.5;
    }

    .message-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .message-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .send-btn {
      padding: 0.75rem 1.25rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .send-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class SessionDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;
  @ViewChild('commandPalette') commandPalette!: CommandPaletteComponent;

  sessionId: string = '';
  currentSession: SessionInfo | null = null;
  messages: MessageWithParts[] = [];
  inputText: string = '';
  loading: boolean = false;
  lastUserMessage: string = '';
  selectedModel: { providerID: string; modelID: string } | null = null;
  sessionStats = { tokensIn: 0, tokensOut: 0, reasoning: 0, cost: 0 };
  toolsConfig: { [key: string]: boolean } = {};
  availableAgents: Array<{name: string; description?: string; mode: string}> = [];
  selectedAgent: string = 'build';
  selectedMode: string = 'code';
  customInstructions: string[] = [];
  showDiffViewer: boolean = false;
  showInitDialog: boolean = false;
  showSummarizeDialog: boolean = false;
  showCommandPalette: boolean = false;
  showTerminal: boolean = false;
  showChildrenDropdown: boolean = false;
  commands: CommandInfo[] = [];
  sessionChildren: SessionInfo[] = [];
  providers: ProviderInfo[] = [];
  private subscriptions = new Subscription();
  private shouldScrollToBottom = false;
  private previousMessageCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private stateService: StateService
  ) {
    console.log('[Session Detail] v3.0 Component initialized');
  }

  /**
   * Keyboard shortcut handler - Ctrl+Shift+P to open command palette
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ctrl+Shift+P (or Cmd+Shift+P on Mac)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.openCommandPalette();
    }
  }

  ngOnInit(): void {
    // Load tools config from backend
    this.apiService.getConfig().subscribe({
      next: (config: any) => {
        this.toolsConfig = config.tools || {};
        console.log('[Session Detail] ✓ Tools config loaded:', this.toolsConfig);
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load config:', error);
      }
    });

    // Load available agents from backend
    this.apiService.getAgents().subscribe({
      next: (agents) => {
        this.availableAgents = agents.filter(a => a.mode === 'primary');
        console.log('[Session Detail] ✓ Agents loaded:', this.availableAgents.map(a => a.name));
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load agents:', error);
      }
    });

    // Load providers for Init and Summarize dialogs
    this.apiService.getProviders().subscribe({
      next: (response) => {
        this.providers = response.providers;
        console.log('[Session Detail] ✓ Providers loaded:', this.providers.length);
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load providers:', error);
      }
    });

    // Load available commands from backend
    this.apiService.getCommands().subscribe({
      next: (commands) => {
        this.commands = commands;
        console.log('[Session Detail] ✓ Commands loaded:', this.commands.length);
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load commands:', error);
      }
    });

    // Subscribe to route params
    const routeSubscription = this.route.params.subscribe(params => {
      this.sessionId = params['id'];
      console.log(`[Session Detail] Loading session: ${this.sessionId}`);
      this.loadSession();
      this.loadMessages();
      this.loadSessionChildren();
      this.subscribeToLiveUpdates();
    });
    this.subscriptions.add(routeSubscription);

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      this.showChildrenDropdown = false;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    console.log('[Session Detail] Component destroyed, cleaning up...');
    this.subscriptions.unsubscribe();
  }

  loadSession(): void {
    this.apiService.getSession(this.sessionId).subscribe({
      next: (session) => {
        this.currentSession = session;
        this.stateService.setCurrentSession(session);
        console.log(`[Session Detail] ✓ Session loaded: ${session.title}`);
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load session:', error);
      }
    });
  }

  loadMessages(): void {
    console.log(`[Session Detail] Loading messages for session ${this.sessionId}...`);
    this.apiService.getMessages(this.sessionId).subscribe({
      next: (messages) => {
        this.stateService.setMessages(this.sessionId, messages);
        this.messages = messages;
        this.shouldScrollToBottom = true;
        console.log(`[Session Detail] ✓ Loaded ${messages.length} messages`);
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load messages:', error);
      }
    });
  }

  /**
   * Subscribe to real-time message updates from state service (SSE)
   * This is CRITICAL for v3.0 - enables live streaming!
   */
  subscribeToLiveUpdates(): void {
    console.log('[Session Detail] ⚡ Subscribing to live updates...');

    const messagesSubscription = this.stateService.messages$.subscribe(messagesMap => {
      const sessionMessages = messagesMap.get(this.sessionId);
      if (sessionMessages) {
        const previousCount = this.messages.length;
        this.messages = sessionMessages;

        // Calculate session stats
        this.calculateSessionStats();

        // Auto-scroll if new messages or parts added
        if (this.messages.length > previousCount || this.hasNewParts()) {
          this.shouldScrollToBottom = true;
        }

        // Check if assistant is still responding
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage && lastMessage.info.role === 'assistant') {
          const hasUnfinishedParts = lastMessage.parts.some(part => {
            if (part.type === 'tool') {
              const toolPart = part as any;
              return toolPart.state?.status === 'pending' || toolPart.state?.status === 'running';
            }
            return false;
          });

          if (!hasUnfinishedParts && this.loading) {
            this.loading = false;
            console.log('[Session Detail] ✓ Response completed');
          }
        }
      }
    });

    this.subscriptions.add(messagesSubscription);
    console.log('[Session Detail] ✓ Live updates enabled');
  }

  private hasNewParts(): boolean {
    const currentPartsCount = this.messages.reduce((sum, msg) => sum + msg.parts.length, 0);
    const hasNew = currentPartsCount > this.previousMessageCount;
    this.previousMessageCount = currentPartsCount;
    return hasNew;
  }

  sendMessage(): void {
    if (!this.inputText.trim() || this.loading) return;

    const text = this.inputText.trim();
    this.lastUserMessage = text;
    this.inputText = '';
    this.loading = true;

    console.log(`[Session Detail] ⚡ Sending message to ${this.sessionId}...`);

    // Build message payload with selected model and MCP tools
    const payload: any = {
      parts: [
        {
          type: 'text',
          text: text
        }
      ]
    };

    // Include MCP tools from backend config
    if (Object.keys(this.toolsConfig).length > 0) {
      payload.tools = this.toolsConfig;
    }

    // Include agent and mode
    payload.agent = this.selectedAgent;
    payload.mode = this.selectedMode;

    // Include custom instructions if any
    if (this.customInstructions.length > 0) {
      payload.system = this.customInstructions;
    }

    // Include model if one is selected
    if (this.selectedModel) {
      payload.model = this.selectedModel;
      console.log(`[Session Detail] Using model: ${this.selectedModel.providerID}/${this.selectedModel.modelID}`);
    } else {
      console.log(`[Session Detail] No model selected, backend will use default`);
    }

    this.apiService.sendMessage(this.sessionId, payload).subscribe({
      next: (response) => {
        console.log('[Session Detail] ✓ Message sent, waiting for SSE updates...');
        // Don't reload - SSE will push updates in real-time!
        // The loading state will be cleared when message completes via SSE
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to send message:', error);
        this.loading = false;
        this.lastUserMessage = '';
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onModelSelected(model: { providerID: string; modelID: string }): void {
    this.selectedModel = model;
    console.log(`[Session Detail] ✓ Model selected: ${model.providerID}/${model.modelID}`);
  }

  trackByMessageId(index: number, message: MessageWithParts): string {
    return message.info.id;
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      // Ignore scroll errors
    }
  }

  /**
   * Calculate aggregate stats from all step-finish parts in messages
   */
  private calculateSessionStats(): void {
    let tokensIn = 0;
    let tokensOut = 0;
    let reasoning = 0;
    let cost = 0;

    this.messages.forEach(message => {
      message.parts.forEach(part => {
        if (part.type === 'step-finish') {
          const stepFinish = part as any;
          tokensIn += stepFinish.tokens?.input || 0;
          tokensOut += stepFinish.tokens?.output || 0;
          reasoning += stepFinish.tokens?.reasoning || 0;
          cost += stepFinish.cost || 0;
        }
      });
    });

    this.sessionStats = { tokensIn, tokensOut, reasoning, cost };
  }

  /**
   * Handle revert to message request
   */
  onRevertToMessage(messageId: string): void {
    console.log('[Session Detail] Reverting to message:', messageId);

    this.apiService.revertMessage(this.sessionId, messageId).subscribe({
      next: (session) => {
        console.log('[Session Detail] ✓ Session reverted successfully');
        // Update state with reverted session
        this.currentSession = session;
        this.stateService.updateSession(session.id, session);
        // Reload messages to get updated state
        this.loadMessages();
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to revert session:', error);
        alert('Failed to revert session. Please try again.');
      }
    });
  }

  /**
   * Handle unrevert request - restore latest state
   */
  onUnrevertSession(): void {
    console.log('[Session Detail] Unreventing session...');

    this.apiService.unrevertMessages(this.sessionId).subscribe({
      next: (session) => {
        console.log('[Session Detail] ✓ Session unreverted successfully');
        // Update state with unreverted session
        this.currentSession = session;
        this.stateService.updateSession(session.id, session);
        // Reload messages to get updated state
        this.loadMessages();
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to unrevert session:', error);
        alert('Failed to unrevert session. Please try again.');
      }
    });
  }

  /**
   * Handle Session Init request - AI codebase analysis
   */
  onInitSession(request: InitRequest): void {
    console.log('[Session Detail] Initiating codebase analysis...', request);
    this.showInitDialog = false;

    // Get the last message ID (or empty string if no messages)
    const messageID = this.messages.length > 0 ? this.messages[this.messages.length - 1].info.id : '';

    this.apiService.initSession(this.sessionId, request.providerID, request.modelID, messageID).subscribe({
      next: (success) => {
        if (success) {
          console.log('[Session Detail] ✓ Codebase analysis started');
          // The result will appear as a new message via SSE
        }
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to start codebase analysis:', error);
        alert('Failed to start codebase analysis. Please try again.');
      }
    });
  }

  /**
   * Handle Session Summarize request - conversation compaction
   */
  onSummarizeSession(request: SummarizeRequest): void {
    console.log('[Session Detail] Summarizing session...', request);
    this.showSummarizeDialog = false;

    this.apiService.summarizeSession(this.sessionId, request.providerID, request.modelID).subscribe({
      next: (success) => {
        if (success) {
          console.log('[Session Detail] ✓ Session summarization started');
          // The backend will emit session.compacted event via SSE
        }
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to summarize session:', error);
        alert('Failed to summarize session. Please try again.');
      }
    });
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Open command palette and set available commands
   */
  openCommandPalette(): void {
    this.showCommandPalette = true;
    // Pass commands to the palette after it's shown
    setTimeout(() => {
      if (this.commandPalette) {
        this.commandPalette.setCommands(this.commands);
      }
    }, 0);
  }

  /**
   * Toggle shell terminal visibility
   */
  toggleTerminal(): void {
    this.showTerminal = !this.showTerminal;
  }

  /**
   * Handle command execution from command palette
   */
  onCommandExecute(execution: CommandExecution): void {
    console.log('[Session Detail] Executing command:', execution);
    this.showCommandPalette = false;

    // Get the last message ID
    const messageID = this.messages.length > 0 ? this.messages[this.messages.length - 1].info.id : undefined;

    // Find command details to get agent/model if specified
    const command = this.commands.find(c => c.name === execution.command);
    const agent = command?.agent;
    const model = command?.model;

    this.apiService.executeCommand(
      this.sessionId,
      execution.command,
      execution.arguments,
      messageID,
      agent,
      model
    ).subscribe({
      next: (response) => {
        console.log('[Session Detail] ✓ Command executed, waiting for SSE updates...');
        // Command results will come via SSE
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to execute command:', error);
        alert(`Failed to execute command: ${error.error?.message || error.message}`);
      }
    });
  }

  /**
   * Handle shell command execution from terminal
   */
  onShellExecute(command: string): void {
    console.log('[Session Detail] Executing shell command:', command);

    this.apiService.executeShell(
      this.sessionId,
      command,
      this.selectedAgent
    ).subscribe({
      next: (response) => {
        console.log('[Session Detail] ✓ Shell command executed, waiting for SSE updates...');
        // Shell output will come via SSE as new messages
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to execute shell command:', error);
        alert(`Failed to execute shell command: ${error.error?.message || error.message}`);
      }
    });
  }

  /**
   * Close command palette
   */
  onCommandPaletteClose(): void {
    this.showCommandPalette = false;
  }

  /**
   * Close shell terminal
   */
  onTerminalClose(): void {
    this.showTerminal = false;
  }

  /**
   * Load session children (for parent/child hierarchy)
   */
  loadSessionChildren(): void {
    this.apiService.getSessionChildren(this.sessionId).subscribe({
      next: (children) => {
        this.sessionChildren = children;
        console.log(`[Session Detail] ✓ Loaded ${children.length} child sessions`);
      },
      error: (error) => {
        console.error('[Session Detail] ✗ Failed to load session children:', error);
        this.sessionChildren = [];
      }
    });
  }

  /**
   * Navigate to parent session
   */
  navigateToParent(): void {
    if (this.currentSession?.parentID) {
      this.router.navigate(['/session', this.currentSession.parentID]);
    }
  }

  /**
   * Navigate to child session
   */
  navigateToChild(childId: string): void {
    this.showChildrenDropdown = false;
    this.router.navigate(['/session', childId]);
  }

  /**
   * Toggle children dropdown
   */
  toggleChildrenDropdown(): void {
    this.showChildrenDropdown = !this.showChildrenDropdown;
  }
}