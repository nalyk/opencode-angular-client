import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { ApiService } from '../../services/api.service';
import { Observable } from 'rxjs';
import { SessionInfo } from '../../models/session.model';
import { ProjectSwitcherComponent } from '../project-switcher/project-switcher.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ProjectSwitcherComponent],
  template: `
    <header class="header">
      <div class="header-left">
        <button class="menu-btn" (click)="toggleSidebar()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <a routerLink="/" class="logo">
          <span class="logo-text">OpenCode</span>
        </a>
        <app-project-switcher></app-project-switcher>
      </div>

      <div class="header-center">
        <div class="session-info" *ngIf="currentSession$ | async as session">
          <span class="session-title">{{ session.title || 'Untitled Session' }}</span>
        </div>
      </div>

      <div class="header-right">
        <a routerLink="/settings" class="btn btn-secondary" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m6-12.07L13.93 10.5m-3.86 3.5L6 17.93m15-5.93h-6m-6 0H1m17.93-6.07L13.93 10.5m-3.86 3.5L6.07 6.07"></path>
          </svg>
          Settings
        </a>
        <button class="btn btn-primary" (click)="createNewSession()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Session
        </button>
      </div>
    </header>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      min-height: 60px;
    }

    .header-left,
    .header-center,
    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-center {
      flex: 1;
      justify-content: center;
    }

    .menu-btn {
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .menu-btn:hover {
      background: var(--bg-tertiary);
    }

    .logo {
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      background: linear-gradient(135deg, var(--primary), #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .session-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .session-title {
      font-weight: 500;
      color: var(--text-primary);
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
    }

    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .btn-secondary:hover {
      background: var(--bg-hover);
    }
  `]
})
export class HeaderComponent {
  currentSession$: Observable<SessionInfo | null>;

  constructor(
    private stateService: StateService,
    private apiService: ApiService,
    private router: Router
  ) {
    this.currentSession$ = this.stateService.currentSession$;
  }

  toggleSidebar(): void {
    this.stateService.toggleSidebar();
  }

  createNewSession(): void {
    this.apiService.createSession().subscribe({
      next: (session) => {
        this.stateService.addSession(session);
        this.stateService.setCurrentSession(session);
        // Navigate using Angular Router (SPA navigation)
        this.router.navigate(['/session', session.id], {
          queryParamsHandling: 'preserve'
        });
      },
      error: (error) => {
        console.error('Failed to create session:', error);
      }
    });
  }
}
