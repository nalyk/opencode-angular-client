import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { SseService } from './services/sse.service';
import { StateService } from './services/state.service';
import { ApiService } from './services/api.service';
import { Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PermissionDialogComponent, PermissionResponse } from './components/permission-dialog/permission-dialog.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ToastService } from './services/toast.service';
import { Permission } from './models/event.model';

/**
 * v3.0 App Component - Root component with SSE integration
 *
 * Responsibilities:
 * - Initialize SSE connection for real-time updates
 * - Route SSE events to state service
 * - Manage global UI layout
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, PermissionDialogComponent, ToastContainerComponent],
  template: `
    <div class="app-container">
      <app-header></app-header>
      <div class="main-container">
        <app-sidebar *ngIf="sidebarOpen$ | async"></app-sidebar>
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Permission Dialog -->
      <app-permission-dialog
        *ngIf="currentPermission"
        [permission]="currentPermission"
        (response)="handlePermissionResponse($event)"
      ></app-permission-dialog>

      <!-- Toast Notifications -->
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-primary);
    }

    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  sidebarOpen$: Observable<boolean>;
  currentPermission: Permission | null = null;
  private subscriptions = new Subscription();

  constructor(
    private sseService: SseService,
    private stateService: StateService,
    private apiService: ApiService,
    private toastService: ToastService,
    private route: ActivatedRoute
  ) {
    this.sidebarOpen$ = this.stateService.sidebarOpen$;
    console.log('[App Component] v3.0 OpenCode Web Client initialized');
  }

  ngOnInit(): void {
    console.log('[App Component] Starting SSE integration...');

    // Read directory query param and set in state
    this.route.queryParams.subscribe(params => {
      const directory = params['directory'];
      this.stateService.setCurrentDirectory(directory);
    });

    // Connect to SSE - backend serves SSE at /event NOT /api/event!
    this.sseService.connect('/event');

    // Subscribe to connection state
    this.subscriptions.add(
      this.sseService.connectionState$Observable.subscribe(state => {
        console.log(`[App Component] Connection state: ${state}`);
        this.stateService.setConnectionState(state as any);
      })
    );

    // Subscribe to connection errors
    this.subscriptions.add(
      this.sseService.connectionErrors.subscribe(error => {
        console.error('[App Component] Connection error:', error);
      })
    );

    // ========== Message Part Updates (CRITICAL for streaming) ==========
    this.subscriptions.add(
      this.sseService.messageParts$.subscribe(event => {
        const { part, delta } = event.properties;
        this.stateService.updateMessagePart(
          part.sessionID,
          part.messageID,
          part,
          delta
        );
      })
    );

    // ========== Message Updates ==========
    this.subscriptions.add(
      this.sseService.messageUpdates$.subscribe(event => {
        const { info } = event.properties;
        this.stateService.updateMessage(info.sessionID, info.id, info);
      })
    );

    // ========== Session Updates ==========
    this.subscriptions.add(
      this.sseService.sessionUpdates$.subscribe(event => {
        const { info } = event.properties;
        this.stateService.updateSession(info.id, info);
      })
    );

    // ========== Todo Updates ==========
    this.subscriptions.add(
      this.sseService.todoUpdates$.subscribe(event => {
        const { sessionID, todos } = event.properties;
        this.stateService.setTodos(sessionID, todos);
      })
    );

    // ========== Permission Requests ==========
    this.subscriptions.add(
      this.sseService.permissions$.subscribe(event => {
        const permission = event.properties;
        this.stateService.addPermission(permission.sessionID, permission);
        // Show permission dialog immediately
        this.showPermissionDialog(permission);
      })
    );

    // ========== Session Errors ==========
    this.subscriptions.add(
      this.sseService.sessionErrors$.subscribe(event => {
        const { sessionID, error } = event.properties;
        console.error(`[App Component] Session error for ${sessionID}:`, error);
        // Could show a toast notification here
      })
    );

    // ========== File Watcher ==========
    this.subscriptions.add(
      this.sseService.fileWatcher$.subscribe(event => {
        const { file, event: fileEvent } = event.properties;
        console.log(`[App Component] File watcher: ${fileEvent} - ${file}`);
        this.toastService.fileChanged(file, fileEvent);
      })
    );

    console.log('[App Component] ✓ SSE integration complete');
  }

  ngOnDestroy(): void {
    console.log('[App Component] Cleaning up...');
    this.subscriptions.unsubscribe();
    this.sseService.disconnect();
  }

  // ========== Permission Dialog Management ==========

  private showPermissionDialog(permission: Permission): void {
    console.log('[App Component] Showing permission dialog:', permission);
    this.currentPermission = permission;
  }

  handlePermissionResponse(response: PermissionResponse): void {
    if (!this.currentPermission) return;

    const { sessionID, id } = this.currentPermission;
    console.log(`[App Component] Permission response: ${response} for ${id}`);

    this.apiService.respondToPermission(sessionID, id, response).subscribe({
      next: (success) => {
        console.log('[App Component] Permission response sent successfully:', success);
        // Remove permission from state
        this.stateService.removePermission(sessionID, id);
        // Hide dialog
        this.currentPermission = null;
      },
      error: (error) => {
        console.error('[App Component] Failed to send permission response:', error);
        // Still hide dialog on error to prevent blocking
        this.currentPermission = null;
      }
    });
  }
}
