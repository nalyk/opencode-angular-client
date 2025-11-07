import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ApiService, ProjectInfo } from '../../services/api.service';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-project-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="project-switcher">
      <button class="project-button" (click)="toggleDropdown()" [class.active]="dropdownOpen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="project-name" *ngIf="currentProject$ | async as project">
          {{ getProjectName(project) }}
        </span>
        <span class="project-name" *ngIf="!(currentProject$ | async)">
          No Project
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             [style.transform]="dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="dropdown" *ngIf="dropdownOpen">
        <div class="dropdown-header">
          <strong>Projects</strong>
        </div>

        <div class="project-list">
          <div *ngIf="(projects$ | async) as projects">
            <button *ngFor="let project of projects"
                    class="project-item"
                    [class.current]="isCurrentProject(project)"
                    (click)="switchProject(project)">
              <div class="project-info">
                <div class="project-title">
                  <svg *ngIf="isCurrentProject(project)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{{ getProjectName(project) }}</span>
                </div>
                <div class="project-path">{{ project.worktree }}</div>
              </div>
            </button>

            <div *ngIf="projects.length === 0" class="no-projects">
              No projects available
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dropdown-backdrop" *ngIf="dropdownOpen" (click)="toggleDropdown()"></div>
  `,
  styles: [`
    .project-switcher {
      position: relative;
    }

    .project-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .project-button:hover {
      background: var(--bg-hover);
      border-color: var(--primary);
    }

    .project-button.active {
      background: var(--bg-hover);
      border-color: var(--primary);
    }

    .project-button svg:first-child {
      flex-shrink: 0;
      color: var(--primary);
    }

    .project-button svg:last-child {
      flex-shrink: 0;
      transition: transform 0.2s;
    }

    .project-name {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      min-width: 320px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      overflow: hidden;
    }

    .dropdown-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .project-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .project-item {
      width: 100%;
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      border-bottom: 1px solid var(--border);
      text-align: left;
      cursor: pointer;
      transition: background 0.15s;
    }

    .project-item:last-child {
      border-bottom: none;
    }

    .project-item:hover {
      background: var(--bg-hover);
    }

    .project-item.current {
      background: rgba(139, 92, 246, 0.1);
    }

    .project-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .project-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .project-title svg {
      flex-shrink: 0;
      color: var(--primary);
    }

    .project-path {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .no-projects {
      padding: 2rem 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
    }
  `]
})
export class ProjectSwitcherComponent implements OnInit, OnDestroy {
  currentProject$: Observable<ProjectInfo | null>;
  projects$: Observable<ProjectInfo[]>;
  dropdownOpen = false;
  private subscriptions = new Subscription();

  constructor(
    private apiService: ApiService,
    private stateService: StateService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.currentProject$ = this.stateService.currentProject$;
    this.projects$ = this.stateService.projects$;
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadCurrentProject();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadProjects(): void {
    this.subscriptions.add(
      this.apiService.getProjects().subscribe({
        next: (projects) => {
          this.stateService.setProjects(projects);
        },
        error: (error) => {
          console.error('[Project Switcher] Failed to load projects:', error);
        }
      })
    );
  }

  loadCurrentProject(): void {
    this.subscriptions.add(
      this.apiService.getCurrentProject().subscribe({
        next: (project) => {
          this.stateService.setCurrentProject(project);
        },
        error: (error) => {
          console.error('[Project Switcher] Failed to load current project:', error);
        }
      })
    );
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  isCurrentProject(project: ProjectInfo): boolean {
    const current = this.stateService.getCurrentProject();
    return current?.id === project.id;
  }

  getProjectName(project: ProjectInfo): string {
    if (project.id === 'global') {
      return 'Global';
    }
    // Extract directory name from worktree path
    const parts = project.worktree.split('/').filter(p => p);
    return parts.length > 0 ? parts[parts.length - 1] : 'Root';
  }

  switchProject(project: ProjectInfo): void {
    console.log('[Project Switcher] Switching to project:', this.getProjectName(project));

    // Update current project in state
    this.stateService.setCurrentProject(project);

    // Clear current session since we're switching projects
    this.stateService.setCurrentSession(null);

    // Close dropdown
    this.dropdownOpen = false;

    // Navigate to home with directory query param
    // This will trigger AppComponent's queryParams subscription
    // which will call setCurrentDirectory() and trigger session reload in SidebarComponent
    const queryParams = project.id === 'global'
      ? {} // No directory param for global
      : { directory: project.worktree };

    this.router.navigate(['/'], {
      queryParams: queryParams
    });
  }
}
