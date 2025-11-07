import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { Observable } from 'rxjs';
import { SessionInfo } from '../../models/session.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="welcome-section">
        <h1 class="welcome-title">Welcome to OpenCode</h1>
        <p class="welcome-subtitle">AI-powered development tool for modern developers</p>

        <div class="actions">
          <button class="btn btn-primary btn-large" (click)="createNewSession()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Start New Session
          </button>
        </div>

        <div class="features">
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <h3>AI-Powered Coding</h3>
            <p>Get intelligent code suggestions and assistance</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h3>Real-time Updates</h3>
            <p>See changes as they happen with live synchronization</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            </div>
            <h3>File Management</h3>
            <p>Browse and edit files with ease</p>
          </div>
        </div>
      </div>

      <div class="recent-sessions" *ngIf="(sessions$ | async)?.length ?? 0 > 0">
        <h2>Recent Sessions</h2>
        <div class="sessions-grid">
          <div
            *ngFor="let session of (sessions$ | async)?.slice(0, 6)"
            class="session-card"
            (click)="openSession(session.id)"
          >
            <div class="session-card-header">
              <h3>{{ session.title || 'Untitled Session' }}</h3>
              <span class="session-time">{{ formatTime(session.time.updated) }}</span>
            </div>
            <div class="session-card-meta" *ngIf="session.agent">
              <span class="agent-badge">{{ session.agent }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      overflow-y: auto;
      height: 100%;
    }

    .welcome-section {
      text-align: center;
      padding: 4rem 2rem;
    }

    .welcome-title {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, var(--primary), #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .welcome-subtitle {
      font-size: 1.25rem;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .actions {
      margin: 2rem 0 4rem;
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.125rem;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-top: 4rem;
    }

    .feature-card {
      padding: 2rem;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      text-align: center;
      transition: transform 0.2s, border-color 0.2s;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }

    .feature-icon {
      display: inline-flex;
      padding: 1rem;
      background: var(--bg-tertiary);
      border-radius: 50%;
      margin-bottom: 1rem;
      color: var(--primary);
    }

    .feature-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .feature-card p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .recent-sessions {
      margin-top: 4rem;
    }

    .recent-sessions h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .sessions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .session-card {
      padding: 1.5rem;
      background: var(--bg-secondary);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      cursor: pointer;
      transition: all 0.2s;
    }

    .session-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .session-card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 0.5rem;
    }

    .session-card-header h3 {
      font-size: 1.125rem;
      margin: 0;
    }

    .session-time {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      white-space: nowrap;
      margin-left: 1rem;
    }

    .session-card-meta {
      margin-top: 1rem;
    }

    .agent-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: var(--bg-tertiary);
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary);
    }
  `]
})
export class HomeComponent implements OnInit {
  sessions$: Observable<SessionInfo[]>;

  constructor(
    private apiService: ApiService,
    private stateService: StateService,
    private router: Router
  ) {
    this.sessions$ = this.stateService.sessions$;
  }

  ngOnInit(): void {
    // Sessions are already loaded by sidebar
  }

  createNewSession(): void {
    this.apiService.createSession().subscribe({
      next: (session) => {
        this.stateService.addSession(session);
        this.stateService.setCurrentSession(session);
        this.router.navigate(['/session', session.id], {
          queryParamsHandling: 'preserve'
        });
      },
      error: (error) => {
        console.error('Failed to create session:', error);
      }
    });
  }

  openSession(id: string): void {
    this.router.navigate(['/session', id], {
      queryParamsHandling: 'preserve'
    });
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
