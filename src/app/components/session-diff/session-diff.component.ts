import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { FileDiff } from '../../models/session.model';
import { Subscription } from 'rxjs';
import hljs from 'highlight.js';
import { createTwoFilesPatch } from 'diff';

@Component({
  selector: 'app-session-diff',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="diff-backdrop" (click)="onBackdropClick()">
      <div class="diff-container" (click)="$event.stopPropagation()">
        <div class="diff-header">
          <div class="header-content">
            <h2>Session Changes</h2>
            <div class="diff-summary" *ngIf="diffs.length > 0">
              <span class="file-count">{{ diffs.length }} file{{ diffs.length !== 1 ? 's' : '' }} changed</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" (click)="copyToClipboard()" title="Copy all diffs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </button>
            <button class="btn btn-secondary close-btn" (click)="onClose()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="diff-body">
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading changes...</p>
          </div>

          <div *ngIf="!loading && error" class="error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <p>Failed to load changes</p>
            <p class="error-message">{{ error }}</p>
          </div>

          <div *ngIf="!loading && !error && diffs.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <p>No changes in this session</p>
          </div>

          <div *ngIf="!loading && !error && diffs.length > 0" class="diff-list">
            <div *ngFor="let diff of diffs; let i = index" class="diff-file">
              <div class="file-header" (click)="toggleFile(i)">
                <div class="file-info">
                  <span class="file-type-icon" [class]="'icon-' + getFileType(diff)">
                    <svg *ngIf="getFileType(diff) === 'added'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <svg *ngIf="getFileType(diff) === 'modified'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 6v6l4 2"></path>
                    </svg>
                    <svg *ngIf="getFileType(diff) === 'deleted'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </span>
                  <span class="file-path">{{ diff.file }}</span>
                  <span class="file-type-badge">{{ getFileType(diff) }}</span>
                  <span class="file-stats" *ngIf="diff.additions || diff.deletions">
                    <span class="additions" *ngIf="diff.additions">+{{ diff.additions }}</span>
                    <span class="deletions" *ngIf="diff.deletions">-{{ diff.deletions }}</span>
                  </span>
                </div>
                <button class="expand-btn" [class.expanded]="expandedFiles.has(i)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>

              <div class="file-diff" *ngIf="expandedFiles.has(i)">
                <div class="diff-content">
                  <pre><code [innerHTML]="generateDiffHtml(diff)"></code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diff-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .diff-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 95%;
      max-width: 1200px;
      height: 90vh;
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

    .diff-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--bg-primary);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-content h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    .diff-summary {
      padding: 0.25rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .file-count {
      color: var(--text-secondary);
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .diff-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-secondary);
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--bg-tertiary);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      font-size: 0.875rem;
      color: var(--error);
    }

    .diff-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .diff-file {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .file-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .file-header:hover {
      background: var(--bg-tertiary);
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .file-type-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
    }

    .icon-added {
      color: var(--success);
      background: rgba(16, 185, 129, 0.1);
    }

    .icon-modified {
      color: var(--warning);
      background: rgba(245, 158, 11, 0.1);
    }

    .icon-deleted {
      color: var(--error);
      background: rgba(239, 68, 68, 0.1);
    }

    .file-path {
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.875rem;
      color: var(--text-primary);
      flex: 1;
    }

    .file-type-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .file-stats {
      display: flex;
      gap: 0.5rem;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .additions {
      color: var(--success);
    }

    .deletions {
      color: var(--error);
    }

    .diff-file:has(.icon-added) .file-type-badge {
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
    }

    .diff-file:has(.icon-modified) .file-type-badge {
      background: rgba(245, 158, 11, 0.2);
      color: var(--warning);
    }

    .diff-file:has(.icon-deleted) .file-type-badge {
      background: rgba(239, 68, 68, 0.2);
      color: var(--error);
    }

    .expand-btn {
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

    .expand-btn:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .expand-btn.expanded {
      transform: rotate(180deg);
    }

    .file-diff {
      border-top: 1px solid var(--border);
    }

    .diff-content {
      padding: 1rem;
      background: var(--bg-secondary);
    }

    .diff-content pre {
      margin: 0;
      padding: 0;
      background: none;
      font-size: 0.875rem;
      line-height: 1.5;
      overflow-x: auto;
    }

    .diff-content code {
      padding: 0;
      background: none;
      font-family: 'Courier New', Courier, monospace;
    }

    .no-diff-content {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    /* Diff syntax highlighting */
    :deep(.diff-addition) {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      display: block;
    }

    :deep(.diff-deletion) {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      display: block;
    }

    :deep(.diff-context) {
      color: var(--text-secondary);
      display: block;
    }

    :deep(.diff-header) {
      color: var(--text-tertiary);
      font-weight: 600;
      display: block;
    }
  `]
})
export class SessionDiffComponent implements OnInit, OnDestroy {
  @Input() sessionId!: string;
  @Input() messageId?: string;
  @Output() close = new EventEmitter<void>();

  diffs: FileDiff[] = [];
  loading = true;
  error: string | null = null;
  expandedFiles = new Set<number>();

  private subscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private stateService: StateService
  ) {}

  ngOnInit(): void {
    this.loadDiffs();
    // Expand first file by default
    this.expandedFiles.add(0);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadDiffs(): void {
    this.loading = true;
    this.error = null;

    this.subscription = this.apiService.getSessionDiff(this.sessionId, this.messageId).subscribe({
      next: (diffs) => {
        if (diffs && diffs.length > 0) {
          // API returned diffs (from summarize endpoint)
          this.diffs = diffs;
          this.loading = false;
          console.log('[Diff Viewer] Loaded diffs from API:', diffs);
        } else {
          // API returned empty, extract from messages
          console.log('[Diff Viewer] API returned empty, extracting from messages...');
          this.extractDiffsFromMessages();
        }
      },
      error: (err) => {
        // Try extracting from messages on error too
        console.warn('[Diff Viewer] API error, trying message extraction:', err);
        this.extractDiffsFromMessages();
      }
    });
  }

  private extractDiffsFromMessages(): void {
    const messages = this.stateService.getMessages(this.sessionId);
    const diffsMap = new Map<string, FileDiff>();

    console.log('[Diff Viewer] Extracting from', messages.length, 'messages');

    // Extract filediff from tool metadata
    for (const message of messages) {
      if (message.info.role !== 'assistant') continue;

      for (const part of message.parts) {
        if (part.type === 'tool' && (part as any).tool === 'edit') {
          const toolPart = part as any;
          const filediff = toolPart.state?.metadata?.filediff;

          if (filediff && filediff.file) {
            // Accumulate diffs for the same file (use latest)
            diffsMap.set(filediff.file, filediff);
            console.log('[Diff Viewer] Found diff for:', filediff.file);
          }
        }
      }
    }

    this.diffs = Array.from(diffsMap.values());
    this.loading = false;

    if (this.diffs.length === 0) {
      console.warn('[Diff Viewer] No diffs found in messages');
    } else {
      console.log('[Diff Viewer] Extracted', this.diffs.length, 'diffs from messages');
    }
  }

  toggleFile(index: number): void {
    if (this.expandedFiles.has(index)) {
      this.expandedFiles.delete(index);
    } else {
      this.expandedFiles.add(index);
    }
  }

  getFileType(diff: FileDiff): 'added' | 'modified' | 'deleted' {
    if (!diff.before || diff.before.length === 0) return 'added';
    if (!diff.after || diff.after.length === 0) return 'deleted';
    return 'modified';
  }

  generateDiffHtml(diff: FileDiff): string {
    // Use diff library to generate unified diff
    const diffText = createTwoFilesPatch(
      diff.file,
      diff.file,
      diff.before || '',
      diff.after || '',
      'before',
      'after'
    );

    return this.highlightDiff(diffText);
  }

  highlightDiff(diff: string): string {
    const lines = diff.split('\n');
    return lines.map(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return `<span class="diff-addition">${this.escapeHtml(line)}</span>`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return `<span class="diff-deletion">${this.escapeHtml(line)}</span>`;
      } else if (line.startsWith('@@')) {
        return `<span class="diff-header">${this.escapeHtml(line)}</span>`;
      } else {
        return `<span class="diff-context">${this.escapeHtml(line)}</span>`;
      }
    }).join('\n');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  copyToClipboard(): void {
    const text = this.diffs.map(diff => {
      const type = this.getFileType(diff);
      let content = `=== ${diff.file} (${type}) ===\n`;
      const diffText = createTwoFilesPatch(
        diff.file,
        diff.file,
        diff.before || '',
        diff.after || '',
        'before',
        'after'
      );
      content += diffText + '\n\n';
      return content;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      console.log('[Diff Viewer] Copied to clipboard');
      // Could show a toast notification here
    }).catch(err => {
      console.error('[Diff Viewer] Failed to copy:', err);
    });
  }

  onBackdropClick(): void {
    this.onClose();
  }

  onClose(): void {
    this.close.emit();
  }
}
