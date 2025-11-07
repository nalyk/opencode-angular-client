import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

/**
 * Settings Component - Status Dashboard
 *
 * Displays system status for:
 * - MCP (Model Context Protocol) servers
 * - LSP (Language Server Protocol) servers
 * - Code formatters
 *
 * Auto-refreshes every 5 seconds to show real-time status
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <h1>System Status</h1>
        <p>Monitor MCP servers, LSP servers, and code formatters</p>
      </div>

      <!-- MCP Status Section -->
      <section class="status-section">
        <div class="section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            MCP Servers
          </h2>
          <span class="status-badge" [class.loading]="loading">
            {{ loading ? 'Refreshing...' : 'Live' }}
          </span>
        </div>

        <div class="status-card" *ngIf="!mcpError">
          <div *ngIf="mcpServers.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>No MCP servers configured</p>
          </div>

          <div class="status-table" *ngIf="mcpServers.length > 0">
            <div class="status-row header-row">
              <div class="col-name">Server Name</div>
              <div class="col-status">Status</div>
              <div class="col-error">Details</div>
            </div>
            <div class="status-row" *ngFor="let server of mcpServers">
              <div class="col-name">
                <span class="server-name">{{ server.name }}</span>
              </div>
              <div class="col-status">
                <span class="status-indicator" [class.connected]="server.status === 'connected'"
                      [class.failed]="server.status === 'failed'"
                      [class.disabled]="server.status === 'disabled'">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  {{ server.status }}
                </span>
              </div>
              <div class="col-error">
                <span class="error-text" *ngIf="server.error">{{ server.error }}</span>
                <span class="success-text" *ngIf="server.status === 'connected'">Connected</span>
                <span class="disabled-text" *ngIf="server.status === 'disabled'">Disabled in config</span>
              </div>
            </div>
          </div>
        </div>

        <div class="error-card" *ngIf="mcpError">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Failed to load MCP status</strong>
            <p>{{ mcpError }}</p>
          </div>
        </div>
      </section>

      <!-- LSP Status Section -->
      <section class="status-section">
        <div class="section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            LSP Servers
          </h2>
        </div>

        <div class="status-card" *ngIf="!lspError">
          <div *ngIf="lspServers.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>No LSP servers running</p>
          </div>

          <div class="status-table" *ngIf="lspServers.length > 0">
            <div class="status-row header-row">
              <div class="col-name">Language Server</div>
              <div class="col-extensions">Extensions</div>
              <div class="col-status">Status</div>
              <div class="col-root">Root Directory</div>
            </div>
            <div class="status-row" *ngFor="let server of lspServers">
              <div class="col-name">
                <span class="server-name">{{ server.name || server.id }}</span>
              </div>
              <div class="col-extensions">
                <span class="extensions-list">{{ formatExtensions(server.extensions) }}</span>
              </div>
              <div class="col-status">
                <span class="status-indicator" [class.connected]="server.status === 'connected'"
                      [class.failed]="server.status === 'failed'">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  {{ server.status }}
                </span>
              </div>
              <div class="col-root">
                <span class="root-path" *ngIf="server.root">{{ server.root }}</span>
                <span class="error-text" *ngIf="server.error">{{ server.error }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="error-card" *ngIf="lspError">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Failed to load LSP status</strong>
            <p>{{ lspError }}</p>
          </div>
        </div>
      </section>

      <!-- Formatter Status Section -->
      <section class="status-section">
        <div class="section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 7 4 4 20 4 20 7"></polyline>
              <line x1="9" y1="20" x2="15" y2="20"></line>
              <line x1="12" y1="4" x2="12" y2="20"></line>
            </svg>
            Code Formatters
          </h2>
        </div>

        <div class="status-card" *ngIf="!formatterError">
          <div *ngIf="formatters.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>No formatters configured</p>
          </div>

          <div class="status-table" *ngIf="formatters.length > 0">
            <div class="status-row header-row">
              <div class="col-name">Formatter</div>
              <div class="col-extensions">Extensions</div>
              <div class="col-status">Status</div>
            </div>
            <div class="status-row" *ngFor="let formatter of formatters">
              <div class="col-name">
                <span class="server-name">{{ formatter.name }}</span>
              </div>
              <div class="col-extensions">
                <span class="extensions-list">{{ formatExtensions(formatter.extensions) }}</span>
              </div>
              <div class="col-status">
                <span class="status-indicator" [class.connected]="formatter.enabled"
                      [class.disabled]="!formatter.enabled">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  {{ formatter.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="error-card" *ngIf="formatterError">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Failed to load formatter status</strong>
            <p>{{ formatterError }}</p>
          </div>
        </div>
      </section>

      <!-- Authentication Section -->
      <section class="status-section">
        <div class="section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            API Authentication
          </h2>
        </div>

        <div class="auth-cards">
          <!-- Anthropic Provider -->
          <div class="auth-card">
            <div class="auth-header">
              <div class="provider-info">
                <h3>Anthropic</h3>
                <span class="provider-badge" [class.configured]="authStatus['anthropic'].configured">
                  {{ authStatus['anthropic'].configured ? 'Configured' : 'Not Configured' }}
                </span>
              </div>
            </div>
            <div class="auth-form">
              <label for="anthropic-key">API Key</label>
              <input type="password" id="anthropic-key"
                     [(ngModel)]="authCredentials['anthropic']"
                     placeholder="sk-ant-..."
                     class="auth-input">
              <div class="auth-actions">
                <button class="btn btn-primary" (click)="saveAuthProvider('anthropic')"
                        [disabled]="!authCredentials['anthropic']">
                  Save
                </button>
                <button class="btn btn-secondary" (click)="testAuthProvider('anthropic')"
                        [disabled]="!authStatus['anthropic'].configured">
                  Test Connection
                </button>
              </div>
              <p class="auth-message success" *ngIf="authMessages['anthropic'].success">
                {{ authMessages['anthropic'].success }}
              </p>
              <p class="auth-message error" *ngIf="authMessages['anthropic'].error">
                {{ authMessages['anthropic'].error }}
              </p>
            </div>
          </div>

          <!-- OpenAI Provider -->
          <div class="auth-card">
            <div class="auth-header">
              <div class="provider-info">
                <h3>OpenAI</h3>
                <span class="provider-badge" [class.configured]="authStatus['openai'].configured">
                  {{ authStatus['openai'].configured ? 'Configured' : 'Not Configured' }}
                </span>
              </div>
            </div>
            <div class="auth-form">
              <label for="openai-key">API Key</label>
              <input type="password" id="openai-key"
                     [(ngModel)]="authCredentials['openai']"
                     placeholder="sk-..."
                     class="auth-input">
              <div class="auth-actions">
                <button class="btn btn-primary" (click)="saveAuthProvider('openai')"
                        [disabled]="!authCredentials['openai']">
                  Save
                </button>
                <button class="btn btn-secondary" (click)="testAuthProvider('openai')"
                        [disabled]="!authStatus['openai'].configured">
                  Test Connection
                </button>
              </div>
              <p class="auth-message success" *ngIf="authMessages['openai'].success">
                {{ authMessages['openai'].success }}
              </p>
              <p class="auth-message error" *ngIf="authMessages['openai'].error">
                {{ authMessages['openai'].error }}
              </p>
            </div>
          </div>

          <!-- Custom Provider -->
          <div class="auth-card">
            <div class="auth-header">
              <div class="provider-info">
                <h3>Custom Provider</h3>
                <span class="provider-badge" [class.configured]="authStatus['custom'].configured">
                  {{ authStatus['custom'].configured ? 'Configured' : 'Not Configured' }}
                </span>
              </div>
            </div>
            <div class="auth-form">
              <label for="custom-key">API Key</label>
              <input type="password" id="custom-key"
                     [(ngModel)]="authCredentials['custom']"
                     placeholder="Custom API key..."
                     class="auth-input">
              <div class="auth-actions">
                <button class="btn btn-primary" (click)="saveAuthProvider('custom')"
                        [disabled]="!authCredentials['custom']">
                  Save
                </button>
                <button class="btn btn-secondary" (click)="testAuthProvider('custom')"
                        [disabled]="!authStatus['custom'].configured">
                  Test Connection
                </button>
              </div>
              <p class="auth-message success" *ngIf="authMessages['custom'].success">
                {{ authMessages['custom'].success }}
              </p>
              <p class="auth-message error" *ngIf="authMessages['custom'].error">
                {{ authMessages['custom'].error }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      background: var(--bg-primary);
      height: 100%;
      overflow-y: auto;
    }

    .settings-header {
      margin-bottom: 2rem;
    }

    .settings-header h1 {
      font-size: 2rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    .settings-header p {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .status-section {
      margin-bottom: 2.5rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .section-header svg {
      color: var(--text-secondary);
    }

    .status-badge {
      padding: 0.375rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .status-badge.loading {
      background: rgba(59, 130, 246, 0.1);
      border-color: #3b82f6;
      color: #3b82f6;
    }

    .status-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .error-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      border-radius: var(--radius);
      color: var(--text-primary);
    }

    .error-card svg {
      flex-shrink: 0;
      color: #ef4444;
      margin-top: 0.125rem;
    }

    .error-card strong {
      display: block;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .error-card p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      color: var(--text-secondary);
      text-align: center;
    }

    .empty-state svg {
      margin-bottom: 1rem;
      color: var(--text-tertiary);
    }

    .empty-state p {
      margin: 0;
      font-size: 0.9375rem;
    }

    .status-table {
      display: flex;
      flex-direction: column;
    }

    .status-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 2fr;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      align-items: center;
    }

    .status-row.header-row {
      background: var(--bg-tertiary);
      font-weight: 600;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }

    .status-row:last-child {
      border-bottom: none;
    }

    .col-name {
      overflow: hidden;
    }

    .server-name {
      font-weight: 500;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-extensions {
      overflow: hidden;
    }

    .extensions-list {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-root {
      overflow: hidden;
    }

    .root-path {
      font-family: monospace;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.625rem;
      border-radius: 12px;
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-indicator.connected {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .status-indicator.connected svg {
      color: #22c55e;
    }

    .status-indicator.failed {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .status-indicator.failed svg {
      color: #ef4444;
    }

    .status-indicator.disabled {
      background: rgba(107, 114, 128, 0.1);
      color: #6b7280;
    }

    .status-indicator.disabled svg {
      color: #6b7280;
    }

    .error-text {
      font-size: 0.875rem;
      color: #ef4444;
    }

    .success-text {
      font-size: 0.875rem;
      color: #22c55e;
    }

    .disabled-text {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    /* Authentication Section */
    .auth-cards {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    }

    .auth-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.2s;
    }

    .auth-card:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
    }

    .auth-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .auth-header h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .provider-badge {
      padding: 0.375rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .provider-badge.configured {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .auth-form label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .auth-form input {
      padding: 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--text-primary);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      transition: all 0.2s;
    }

    .auth-form input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .auth-form input::placeholder {
      color: var(--text-tertiary);
    }

    .auth-form button {
      padding: 0.75rem 1rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .auth-form button:hover {
      background: #7c3aed;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .auth-form button:active {
      transform: translateY(0);
    }

    .auth-form button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .auth-message {
      margin-top: 0.5rem;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .auth-message.success {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .auth-message.error {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  loading = false;

  // MCP Status
  mcpServers: any[] = [];
  mcpError: string | null = null;

  // LSP Status
  lspServers: any[] = [];
  lspError: string | null = null;

  // Formatter Status
  formatters: any[] = [];
  formatterError: string | null = null;

  // Authentication
  authStatus: Record<string, { configured: boolean }> = {
    anthropic: { configured: false },
    openai: { configured: false },
    custom: { configured: false }
  };
  authCredentials: Record<string, string> = {
    anthropic: '',
    openai: '',
    custom: ''
  };
  authMessages: Record<string, { success: string; error: string }> = {
    anthropic: { success: '', error: '' },
    openai: { success: '', error: '' },
    custom: { success: '', error: '' }
  };

  private refreshSubscription?: Subscription;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Initial load
    this.loadAllStatus();
    this.loadAuthStatus();

    // Auto-refresh every 5 seconds
    this.refreshSubscription = interval(5000)
      .pipe(startWith(0))
      .subscribe(() => this.loadAllStatus());
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  loadAllStatus(): void {
    this.loading = true;
    this.loadMcpStatus();
    this.loadLspStatus();
    this.loadFormatterStatus();
  }

  loadMcpStatus(): void {
    this.apiService.getMcpStatus().subscribe({
      next: (data) => {
        // Convert object to array
        this.mcpServers = Object.entries(data).map(([name, status]: [string, any]) => ({
          name,
          ...status
        }));
        this.mcpError = null;
        this.loading = false;
      },
      error: (error) => {
        console.error('[Settings] Failed to load MCP status:', error);
        this.mcpError = error.message || 'Failed to connect to backend';
        this.loading = false;
      }
    });
  }

  loadLspStatus(): void {
    this.apiService.getLspStatus().subscribe({
      next: (data) => {
        this.lspServers = data;
        this.lspError = null;
      },
      error: (error) => {
        console.error('[Settings] Failed to load LSP status:', error);
        this.lspError = error.message || 'Failed to connect to backend';
      }
    });
  }

  loadFormatterStatus(): void {
    this.apiService.getFormatterStatus().subscribe({
      next: (data) => {
        this.formatters = data;
        this.formatterError = null;
      },
      error: (error) => {
        console.error('[Settings] Failed to load formatter status:', error);
        this.formatterError = error.message || 'Failed to connect to backend';
      }
    });
  }

  formatExtensions(extensions: string[] | undefined): string {
    if (!extensions || extensions.length === 0) return 'N/A';
    return extensions.map(ext => `.${ext}`).join(', ');
  }

  // Authentication methods
  loadAuthStatus(): void {
    this.apiService.getAuthProviders().subscribe({
      next: (providers) => {
        providers.forEach(provider => {
          this.authStatus[provider.id] = {
            configured: provider.hasCredentials || false
          };
        });
      },
      error: (error) => {
        console.error('[Settings] Failed to load auth status:', error);
      }
    });
  }

  saveAuthProvider(providerId: string): void {
    const apiKey = this.authCredentials[providerId];

    if (!apiKey || apiKey.trim() === '') {
      this.authMessages[providerId].error = 'Please enter an API key';
      this.authMessages[providerId].success = '';
      return;
    }

    this.apiService.updateAuthProvider(providerId, { apiKey }).subscribe({
      next: () => {
        this.authMessages[providerId].success = 'API key saved successfully';
        this.authMessages[providerId].error = '';
        this.authStatus[providerId].configured = true;
        // Clear the input after successful save
        this.authCredentials[providerId] = '';
      },
      error: (error) => {
        console.error(`[Settings] Failed to save ${providerId} credentials:`, error);
        this.authMessages[providerId].error = error.message || 'Failed to save API key';
        this.authMessages[providerId].success = '';
      }
    });
  }

  testAuthProvider(providerId: string): void {
    this.authMessages[providerId].success = '';
    this.authMessages[providerId].error = '';

    this.apiService.testAuthProvider(providerId).subscribe({
      next: (result) => {
        if (result.success) {
          this.authMessages[providerId].success = result.message || 'Connection successful!';
          this.authMessages[providerId].error = '';
        } else {
          this.authMessages[providerId].error = result.message || 'Connection failed';
          this.authMessages[providerId].success = '';
        }
      },
      error: (error) => {
        console.error(`[Settings] Failed to test ${providerId} connection:`, error);
        this.authMessages[providerId].error = error.message || 'Failed to test connection';
        this.authMessages[providerId].success = '';
      }
    });
  }
}
