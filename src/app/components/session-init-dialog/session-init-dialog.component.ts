import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProviderInfo, ModelInfo } from '../../models/config.model';

export interface InitRequest {
  providerID: string;
  modelID: string;
}

@Component({
  selector: 'app-session-init-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-backdrop" (click)="onCancel()">
      <div class="dialog-container" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Analyze Codebase</h2>
          <button class="close-btn" (click)="onCancel()" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <div class="info-section">
            <div class="info-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <div class="info-content">
              <h3>AI-Powered Codebase Analysis</h3>
              <p>The AI will analyze your entire codebase and generate an <code>AGENTS.md</code> file containing:</p>
              <ul>
                <li>Build, lint, and test commands</li>
                <li>Single test execution patterns</li>
                <li>Code style guidelines (imports, formatting, types)</li>
                <li>Naming conventions and error handling patterns</li>
                <li>Existing Cursor/Copilot rules integration</li>
              </ul>
              <p class="info-note">
                This file will be used by AI agents to better understand your project context,
                leading to more accurate and contextual assistance.
              </p>
            </div>
          </div>

          <div class="form-section">
            <div class="form-group">
              <label for="provider-select">AI Provider</label>
              <select
                id="provider-select"
                [(ngModel)]="selectedProviderId"
                (change)="onProviderChange()"
                class="form-control">
                <option *ngFor="let provider of providers" [value]="provider.id">
                  {{ provider.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="model-select">Model</label>
              <select
                id="model-select"
                [(ngModel)]="selectedModelId"
                class="form-control"
                [disabled]="!selectedProviderId">
                <option *ngFor="let model of getAvailableModels()" [value]="model.id">
                  {{ model.name }}
                  <span *ngIf="model.contextWindow"> ({{ formatContextWindow(model.contextWindow) }})</span>
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="onCancel()">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            (click)="onAnalyze()"
            [disabled]="!selectedProviderId || !selectedModelId">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Analyze Codebase
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
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: 90%;
      max-width: 650px;
      max-height: 85vh;
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

    .info-section {
      background: rgba(37, 99, 235, 0.1);
      border: 1px solid rgba(37, 99, 235, 0.3);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
    }

    .info-icon {
      flex-shrink: 0;
      color: #60a5fa;
    }

    .info-content h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
      color: var(--text-primary);
    }

    .info-content p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0 0 0.75rem 0;
      line-height: 1.5;
    }

    .info-content ul {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0 0 0.75rem 0;
      padding-left: 1.25rem;
      line-height: 1.6;
    }

    .info-content ul li {
      margin-bottom: 0.25rem;
    }

    .info-content code {
      background: var(--bg-tertiary);
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .info-note {
      font-size: 0.8125rem !important;
      font-style: italic;
      margin-bottom: 0 !important;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-control {
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
      color: var(--text-primary);
      transition: all 0.2s;
    }

    .form-control:hover:not(:disabled) {
      border-color: var(--primary);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-control:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      font-weight: 500;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--bg-quaternary);
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1e40af;
    }
  `]
})
export class SessionInitDialogComponent implements OnInit {
  @Input() providers: ProviderInfo[] = [];
  @Input() defaultProvider?: string;
  @Input() defaultModel?: string;

  @Output() analyze = new EventEmitter<InitRequest>();
  @Output() cancel = new EventEmitter<void>();

  selectedProviderId: string = '';
  selectedModelId: string = '';

  ngOnInit() {
    // Set default provider and model
    if (this.providers.length > 0) {
      this.selectedProviderId = this.defaultProvider || this.providers[0].id;
      this.onProviderChange();

      // Try to set default model if provided
      if (this.defaultModel) {
        const models = this.getAvailableModels();
        const modelExists = models.some(m => m.id === this.defaultModel);
        if (modelExists) {
          this.selectedModelId = this.defaultModel;
        }
      }
    }
  }

  onProviderChange() {
    const models = this.getAvailableModels();
    if (models.length > 0) {
      // Select first model by default
      this.selectedModelId = models[0].id;
    }
  }

  getAvailableModels(): ModelInfo[] {
    const provider = this.providers.find(p => p.id === this.selectedProviderId);
    if (!provider) return [];

    return Object.values(provider.models);
  }

  formatContextWindow(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M tokens`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K tokens`;
    }
    return `${tokens} tokens`;
  }

  onAnalyze() {
    if (!this.selectedProviderId || !this.selectedModelId) return;

    this.analyze.emit({
      providerID: this.selectedProviderId,
      modelID: this.selectedModelId
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
