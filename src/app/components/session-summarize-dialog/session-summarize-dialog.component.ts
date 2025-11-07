import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProviderInfo, ModelInfo } from '../../models/config.model';

export interface SummarizeRequest {
  providerID: string;
  modelID: string;
}

@Component({
  selector: 'app-session-summarize-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-backdrop" (click)="onCancel()">
      <div class="dialog-container" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Summarize Session</h2>
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
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                <path d="M9 12h6m-6 4h6"/>
              </svg>
            </div>
            <div class="info-content">
              <h3>Session Compaction</h3>
              <p>Summarize long conversation history to prevent token overflow while preserving critical context.</p>
              <div class="feature-list">
                <div class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Maintains all critical context and decisions</span>
                </div>
                <div class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Preserves file changes and error information</span>
                </div>
                <div class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Condenses repetitive tool outputs</span>
                </div>
                <div class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Protects recent messages (last 2 turns)</span>
                </div>
              </div>
              <p class="info-note">
                <strong>Recommendation:</strong> Use a small, fast model like Claude Haiku to minimize cost.
                The summary will be used as context for future AI responses.
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
                  {{ getModelDisplayName(model) }}
                </option>
              </select>
              <p class="form-hint">
                💡 Free or cheap models are recommended for summarization tasks.
              </p>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="onCancel()">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            (click)="onSummarize()"
            [disabled]="!selectedProviderId || !selectedModelId">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Summarize Session
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
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
    }

    .info-icon {
      flex-shrink: 0;
      color: #34d399;
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

    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .feature-item svg {
      flex-shrink: 0;
      color: #34d399;
    }

    .info-note {
      font-size: 0.8125rem !important;
      margin-bottom: 0 !important;
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 4px;
    }

    .info-note strong {
      color: var(--text-primary);
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

    .form-hint {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0;
      font-style: italic;
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
      background: var(--success);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #059669;
    }
  `]
})
export class SessionSummarizeDialogComponent implements OnInit {
  @Input() providers: ProviderInfo[] = [];
  @Input() defaultProvider?: string;
  @Input() defaultModel?: string;

  @Output() summarize = new EventEmitter<SummarizeRequest>();
  @Output() cancel = new EventEmitter<void>();

  selectedProviderId: string = '';
  selectedModelId: string = '';

  ngOnInit() {
    // Set default provider and try to select a cheap/free model
    if (this.providers.length > 0) {
      this.selectedProviderId = this.defaultProvider || this.providers[0].id;
      this.onProviderChange();

      // Try to auto-select a cheap/free model
      const models = this.getAvailableModels();
      const cheapModel = models.find(m => this.isCheapModel(m));
      if (cheapModel) {
        this.selectedModelId = cheapModel.id;
      } else if (this.defaultModel) {
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
      // Try to select a cheap/free model first
      const cheapModel = models.find(m => this.isCheapModel(m));
      this.selectedModelId = cheapModel ? cheapModel.id : models[0].id;
    }
  }

  getAvailableModels(): ModelInfo[] {
    const provider = this.providers.find(p => p.id === this.selectedProviderId);
    if (!provider) return [];

    return Object.values(provider.models);
  }

  /**
   * Check if model is cheap/small (free or low cost)
   * Using same logic as ModelSelectorComponent
   */
  isCheapModel(model: ModelInfo): boolean {
    const modelData = model as any; // Cast to access cost property

    // Free models (cost = 0)
    if (modelData.cost?.input === 0 && modelData.cost?.output === 0) {
      return true;
    }

    // Very cheap models (< $1 per million tokens)
    if (modelData.cost?.input < 1 && modelData.cost?.output < 1) {
      return true;
    }

    // Common small model patterns
    const name = model.name.toLowerCase();
    const id = model.id.toLowerCase();

    return name.includes('haiku') ||
           id.includes('haiku') ||
           name.includes('flash') ||
           id.includes('flash') ||
           name.includes('mini') ||
           id.includes('mini') ||
           name.includes('gemma') ||
           id.includes('gemma');
  }

  /**
   * Format model display name with cost info
   * Using same logic as ModelSelectorComponent
   */
  getModelDisplayName(model: ModelInfo): string {
    const modelData = model as any; // Cast to access cost property
    let name = model.name;

    if (modelData.cost?.input === 0 && modelData.cost?.output === 0) {
      name += ' (FREE) ✨';
    } else if (modelData.cost?.input !== undefined && modelData.cost?.input < 1) {
      name += ' (Cheap) ✨';
    } else if (modelData.cost?.input !== undefined && modelData.cost?.input > 0) {
      name += ` ($${modelData.cost.input}/M in, $${modelData.cost.output}/M out)`;
    }

    return name;
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

  onSummarize() {
    if (!this.selectedProviderId || !this.selectedModelId) return;

    this.summarize.emit({
      providerID: this.selectedProviderId,
      modelID: this.selectedModelId
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
