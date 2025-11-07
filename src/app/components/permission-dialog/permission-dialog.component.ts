import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Permission } from '../../models/event.model';

export type PermissionResponse = 'once' | 'always' | 'reject';

@Component({
  selector: 'app-permission-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick()">
      <div class="dialog-container" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Permission Request</h2>
          <button class="close-btn" (click)="onReject()" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <div class="permission-type-badge" [class]="'badge-' + permission.type">
            {{ permission.type }}
          </div>

          <h3 class="permission-title">{{ permission.title }}</h3>

          <div class="permission-details">
            <div class="detail-item">
              <span class="detail-label">Pattern:</span>
              <code class="detail-value">{{ formatPattern(permission.pattern) }}</code>
            </div>

            <div class="detail-item" *ngIf="permission.metadata && Object.keys(permission.metadata).length > 0">
              <span class="detail-label">Details:</span>
              <div class="metadata">
                <div *ngFor="let item of getMetadataEntries()" class="metadata-item">
                  <span class="metadata-key">{{ item.key }}:</span>
                  <span class="metadata-value">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="permission-explanation">
            <p class="explanation-text">
              The AI assistant is requesting permission to perform this action.
              Choose how you want to respond:
            </p>
            <ul class="explanation-list">
              <li><strong>Once:</strong> Allow this action one time only</li>
              <li><strong>Always Allow:</strong> Automatically approve all future requests matching this pattern</li>
              <li><strong>Reject:</strong> Deny this request and block the operation</li>
            </ul>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="onReject()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Reject
          </button>
          <button class="btn btn-success" (click)="onAllow('always')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Always Allow
          </button>
          <button class="btn btn-primary" (click)="onAllow('once')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Allow Once
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .dialog-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .dialog-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .permission-type-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1rem;
    }

    .badge-bash {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }

    .badge-edit {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }

    .badge-webfetch {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .permission-title {
      font-size: 1.125rem;
      font-weight: 500;
      color: var(--text-primary);
      margin: 0 0 1.5rem 0;
    }

    .permission-details {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .detail-item {
      margin-bottom: 0.75rem;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
      letter-spacing: 0.5px;
    }

    .detail-value {
      display: block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 0.5rem;
      border-radius: 4px;
      word-break: break-all;
    }

    .metadata {
      background: var(--bg-primary);
      padding: 0.5rem;
      border-radius: 4px;
    }

    .metadata-item {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
    }

    .metadata-item:last-child {
      margin-bottom: 0;
    }

    .metadata-key {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .metadata-value {
      color: var(--text-primary);
      word-break: break-all;
    }

    .permission-explanation {
      background: rgba(37, 99, 235, 0.1);
      border: 1px solid rgba(37, 99, 235, 0.3);
      border-radius: var(--radius);
      padding: 1rem;
    }

    .explanation-text {
      color: var(--text-primary);
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
    }

    .explanation-list {
      margin: 0;
      padding-left: 1.25rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .explanation-list li {
      margin-bottom: 0.5rem;
    }

    .explanation-list li:last-child {
      margin-bottom: 0;
    }

    .explanation-list strong {
      color: var(--text-primary);
    }

    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.5rem;
      border-top: 1px solid var(--border);
      background: var(--bg-primary);
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
    }

    .btn-success {
      background: var(--success);
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }
  `]
})
export class PermissionDialogComponent {
  @Input() permission!: Permission;
  @Output() response = new EventEmitter<PermissionResponse>();
  @Output() close = new EventEmitter<void>();

  Object = Object; // Expose Object to template

  onAllow(type: 'once' | 'always'): void {
    this.response.emit(type);
  }

  onReject(): void {
    this.response.emit('reject');
  }

  onBackdropClick(): void {
    // Don't close on backdrop click - user must make a choice
    // this.close.emit();
  }

  formatPattern(pattern: string | string[]): string {
    if (Array.isArray(pattern)) {
      return pattern.join(', ');
    }
    return pattern;
  }

  getMetadataEntries(): Array<{ key: string; value: any }> {
    if (!this.permission.metadata) return [];
    return Object.entries(this.permission.metadata).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }
}
