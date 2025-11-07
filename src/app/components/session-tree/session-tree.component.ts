import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { SessionInfo } from '../../models/session.model';
import { Subscription } from 'rxjs';

/**
 * Session Tree Node - represents a session with its children in the tree
 */
interface SessionTreeNode {
  session: SessionInfo;
  children: SessionTreeNode[];
  expanded: boolean;
  level: number;
}

/**
 * Session Tree Component - Displays sessions in a hierarchical tree structure
 *
 * Features:
 * - Shows parent-child relationships (Task tool delegation)
 * - Expandable/collapsible child sessions
 * - Visual indentation for hierarchy levels
 * - Navigation to any session in tree
 * - Highlights current session
 */
@Component({
  selector: 'app-session-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="session-tree">
      <div *ngIf="loading" class="tree-loading">
        <div class="spinner"></div>
        <span>Loading session tree...</span>
      </div>

      <div *ngIf="!loading && rootNodes.length === 0" class="tree-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>
        <p>No sessions yet</p>
        <p class="hint">Create a session to get started</p>
      </div>

      <div *ngIf="!loading && rootNodes.length > 0" class="tree-nodes">
        <ng-container *ngFor="let node of rootNodes">
          <div
            class="tree-node"
            [class.current]="node.session.id === currentSessionId"
            [class.has-children]="node.children.length > 0"
            [style.padding-left.rem]="node.level * 1.5"
            (click)="navigateToSession(node.session.id, $event)">

            <button
              *ngIf="node.children.length > 0"
              class="expand-btn"
              (click)="toggleExpand(node, $event)"
              [attr.aria-label]="node.expanded ? 'Collapse' : 'Expand'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline *ngIf="!node.expanded" points="9 18 15 12 9 6"></polyline>
                <polyline *ngIf="node.expanded" points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <div class="node-icon" *ngIf="node.children.length === 0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>

            <div class="node-content">
              <div class="node-title">{{ node.session.title || 'Untitled Session' }}</div>
              <div class="node-meta">
                <span class="node-id">{{ node.session.id.substring(4, 12) }}</span>
                <span class="node-messages" *ngIf="getMessageCount(node.session.id) > 0">
                  {{ getMessageCount(node.session.id) }} messages
                </span>
                <span class="node-parent" *ngIf="node.session.parentID">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  child
                </span>
              </div>
            </div>

            <div class="node-status" *ngIf="node.session.revert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="Reverted">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </div>
          </div>

          <!-- Render children recursively if expanded -->
          <ng-container *ngIf="node.expanded">
            <ng-container *ngFor="let child of node.children">
              <div
                class="tree-node"
                [class.current]="child.session.id === currentSessionId"
                [class.has-children]="child.children.length > 0"
                [style.padding-left.rem]="child.level * 1.5"
                (click)="navigateToSession(child.session.id, $event)">

                <button
                  *ngIf="child.children.length > 0"
                  class="expand-btn"
                  (click)="toggleExpand(child, $event)"
                  [attr.aria-label]="child.expanded ? 'Collapse' : 'Expand'">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline *ngIf="!child.expanded" points="9 18 15 12 9 6"></polyline>
                    <polyline *ngIf="child.expanded" points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                <div class="node-icon" *ngIf="child.children.length === 0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>

                <div class="node-content">
                  <div class="node-title">{{ child.session.title || 'Untitled Session' }}</div>
                  <div class="node-meta">
                    <span class="node-id">{{ child.session.id.substring(4, 12) }}</span>
                    <span class="node-messages" *ngIf="getMessageCount(child.session.id) > 0">
                      {{ getMessageCount(child.session.id) }} messages
                    </span>
                    <span class="node-parent" *ngIf="child.session.parentID">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                      child
                    </span>
                  </div>
                </div>

                <div class="node-status" *ngIf="child.session.revert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="Reverted">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                </div>
              </div>
            </ng-container>
          </ng-container>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .session-tree {
      height: 100%;
      overflow-y: auto;
    }

    .tree-loading,
    .tree-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      color: var(--text-secondary);
      text-align: center;
    }

    .tree-loading .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .tree-empty svg {
      color: var(--text-tertiary);
      margin-bottom: 1rem;
    }

    .tree-empty p {
      margin: 0.25rem 0;
      font-size: 0.9375rem;
    }

    .tree-empty .hint {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .tree-nodes {
      padding: 0.5rem 0;
    }

    .tree-node {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
      border-left: 3px solid transparent;
      position: relative;
    }

    .tree-node:hover {
      background: var(--bg-secondary);
    }

    .tree-node.current {
      background: var(--bg-tertiary);
      border-left-color: var(--primary);
    }

    .tree-node.current .node-title {
      color: var(--primary);
      font-weight: 600;
    }

    .expand-btn {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 3px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
    }

    .expand-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .node-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .node-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .node-title {
      font-size: 0.875rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .node-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .node-id {
      font-family: monospace;
      opacity: 0.7;
    }

    .node-messages {
      opacity: 0.8;
    }

    .node-parent {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.375rem;
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      border-radius: 3px;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .node-status {
      flex-shrink: 0;
      color: #f59e0b;
    }

    /* Scrollbar styling */
    .session-tree::-webkit-scrollbar {
      width: 6px;
    }

    .session-tree::-webkit-scrollbar-track {
      background: transparent;
    }

    .session-tree::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }

    .session-tree::-webkit-scrollbar-thumb:hover {
      background: var(--text-tertiary);
    }
  `]
})
export class SessionTreeComponent implements OnInit, OnDestroy {
  @Input() sessions: SessionInfo[] = [];

  rootNodes: SessionTreeNode[] = [];
  loading: boolean = false;
  currentSessionId: string | null = null;
  private subscriptions = new Subscription();
  private childrenCache = new Map<string, SessionInfo[]>();

  constructor(
    private router: Router,
    private apiService: ApiService,
    private stateService: StateService
  ) {}

  ngOnInit(): void {
    // Subscribe to current session
    this.subscriptions.add(
      this.stateService.currentSession$.subscribe(session => {
        this.currentSessionId = session?.id || null;
      })
    );

    // Subscribe to sessions updates
    this.subscriptions.add(
      this.stateService.sessions$.subscribe(sessionsMap => {
        const sessions = Array.from(sessionsMap.values());
        if (sessions.length > 0) {
          this.sessions = sessions;
          this.buildTree();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Build tree structure from flat session list
   */
  private async buildTree(): Promise<void> {
    this.loading = true;

    // Separate sessions into root (no parent) and children (has parent)
    const rootSessions = this.sessions.filter(s => !s.parentID);
    const childSessions = this.sessions.filter(s => s.parentID);

    // Build tree nodes for root sessions
    const nodes: SessionTreeNode[] = [];
    for (const session of rootSessions) {
      const node = await this.buildNode(session, 0, childSessions);
      nodes.push(node);
    }

    // Sort by most recent first
    nodes.sort((a, b) => b.session.time.created - a.session.time.created);

    this.rootNodes = nodes;
    this.loading = false;
  }

  /**
   * Build a tree node with its children recursively
   */
  private async buildNode(
    session: SessionInfo,
    level: number,
    allChildren: SessionInfo[]
  ): Promise<SessionTreeNode> {
    // Find direct children of this session
    const directChildren = allChildren.filter(s => s.parentID === session.id);

    // Build child nodes recursively
    const childNodes: SessionTreeNode[] = [];
    for (const child of directChildren) {
      const childNode = await this.buildNode(child, level + 1, allChildren);
      childNodes.push(childNode);
    }

    // Sort children by creation time
    childNodes.sort((a, b) => a.session.time.created - b.session.time.created);

    return {
      session,
      children: childNodes,
      expanded: level === 0, // Root nodes expanded by default
      level
    };
  }

  /**
   * Toggle expand/collapse for a node
   */
  toggleExpand(node: SessionTreeNode, event: Event): void {
    event.stopPropagation();
    node.expanded = !node.expanded;
  }

  /**
   * Navigate to a session
   */
  navigateToSession(sessionId: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/session', sessionId], {
      queryParamsHandling: 'preserve'
    });
  }

  /**
   * Get message count for a session
   */
  getMessageCount(sessionId: string): number {
    const messages = this.stateService.getMessages(sessionId);
    return messages ? messages.length : 0;
  }
}
