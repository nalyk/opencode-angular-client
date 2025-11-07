import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { SessionInfo } from '../../models/session.model';
import { SessionTreeComponent } from '../session-tree/session-tree.component';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SessionTreeComponent],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Sessions</h2>
        <div class="view-toggle">
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'list'"
            (click)="viewMode = 'list'"
            title="List view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'tree'"
            (click)="viewMode = 'tree'"
            title="Tree view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- List View -->
      <div *ngIf="viewMode === 'list'" class="sessions-list">
        <div *ngIf="(sessions$ | async)?.length === 0" class="empty-state">
          <p>No sessions yet</p>
          <p class="hint">Create a new session to get started</p>
        </div>

        <a
          *ngFor="let session of sessions$ | async"
          [routerLink]="['/session', session.id]"
          [queryParamsHandling]="'preserve'"
          routerLinkActive="active"
          class="session-item"
          (click)="selectSession(session)"
        >
          <div class="session-item-content">
            <div class="session-title">{{ session.title || 'Untitled Session' }}</div>
            <div class="session-meta">
              <span class="session-time">{{ formatTime(session.time.updated) }}</span>
              <span *ngIf="session.agent" class="session-agent">{{ session.agent }}</span>
            </div>
          </div>
          <button
            class="delete-btn"
            (click)="deleteSession($event, session.id)"
            title="Delete session"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </a>
      </div>

      <!-- Tree View -->
      <app-session-tree *ngIf="viewMode === 'tree'" [sessions]="sessionsList"></app-session-tree>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 300px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }

    .view-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      padding: 0.25rem;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      border-radius: calc(var(--radius) - 2px);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
    }

    .toggle-btn:hover {
      color: var(--text-primary);
      background: var(--bg-quaternary);
    }

    .toggle-btn.active {
      background: var(--primary);
      color: white;
    }

    .sessions-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-state p {
      margin: 0.5rem 0;
    }

    .hint {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    .session-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      border-radius: var(--radius);
      text-decoration: none;
      color: var(--text-primary);
      transition: background 0.2s;
      margin-bottom: 0.25rem;
      cursor: pointer;
    }

    .session-item:hover {
      background: var(--bg-tertiary);
    }

    .session-item.active {
      background: var(--bg-tertiary);
      border-left: 3px solid var(--primary);
    }

    .session-item-content {
      flex: 1;
      min-width: 0;
    }

    .session-title {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 0.25rem;
    }

    .session-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .session-agent {
      padding: 0.125rem 0.375rem;
      background: var(--bg-primary);
      border-radius: 3px;
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .delete-btn {
      background: none;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      opacity: 0;
      transition: all 0.2s;
    }

    .session-item:hover .delete-btn {
      opacity: 1;
    }

    .delete-btn:hover {
      color: var(--error);
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  sessions$: Observable<SessionInfo[]>;
  sessionsList: SessionInfo[] = [];
  viewMode: 'list' | 'tree' = 'list';
  private subscriptions = new Subscription();

  constructor(
    private apiService: ApiService,
    private stateService: StateService
  ) {
    this.sessions$ = this.stateService.sessions$.pipe(
      map(sessionsMap => {
        const sessions = Array.from(sessionsMap.values());
        this.sessionsList = sessions;
        return sessions;
      })
    );
  }

  ngOnInit(): void {
    this.loadSessions();

    // Reload sessions when directory changes (project switch)
    this.subscriptions.add(
      this.stateService.currentDirectory$.subscribe(() => {
        this.loadSessions();
      })
    );
  }

  loadSessions(): void {
    const directory = this.stateService.getCurrentDirectory();
    this.apiService.getSessions(directory).subscribe({
      next: (sessions) => {
        this.stateService.setSessions(sessions);
      },
      error: (error) => {
        console.error('Failed to load sessions:', error);
      }
    });
  }

  selectSession(session: SessionInfo): void {
    this.stateService.setCurrentSession(session);
  }

  deleteSession(event: Event, sessionId: string): void {
    event.preventDefault();
    event.stopPropagation();

    // TODO: Replace with a proper confirmation modal for better UX
    // Using native confirm for now but should be upgraded to a custom modal component
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      this.apiService.deleteSession(sessionId).subscribe({
        next: () => {
          this.stateService.removeSession(sessionId);
        },
        error: (error) => {
          console.error('Failed to delete session:', error);
          alert('Failed to delete session. Please try again.');
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
}
