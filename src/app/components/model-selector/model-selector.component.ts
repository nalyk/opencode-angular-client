import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

interface ModelOption {
  providerID: string;
  modelID: string;
  displayName: string;
  cost: { input: number; output: number };
}

@Component({
  selector: 'app-model-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="model-selector">
      <label class="model-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m5.2-14.8l-4.2 4.2m-5.6 5.6L3.2 18.2m16.6 0l-4.2-4.2m-5.6-5.6L5.8 3.8"></path>
        </svg>
        Model:
      </label>
      <select
        class="model-select"
        [(ngModel)]="selectedModel"
        (change)="onModelChange()"
        [disabled]="loading">
        <option value="">-- Select Model --</option>
        <optgroup *ngFor="let provider of providers" [label]="provider.name">
          <option
            *ngFor="let model of provider.models"
            [value]="provider.id + '/' + model.id">
            {{ getModelDisplayName(model) }}
          </option>
        </optgroup>
      </select>
      <button
        class="filter-btn"
        [class.active]="showOnlyFree"
        (click)="toggleFreeFilter()"
        title="Show only free OpenRouter models">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        FREE
      </button>
    </div>
  `,
  styles: [`
    .model-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
    }

    .model-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .model-label svg {
      color: var(--primary);
    }

    .model-select {
      flex: 1;
      max-width: 500px;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .model-select:hover:not(:disabled) {
      border-color: var(--primary);
    }

    .model-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .model-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    optgroup {
      font-weight: 600;
      color: var(--text-primary);
    }

    option {
      padding: 0.5rem;
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }

    .filter-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.4rem 0.6rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-secondary);
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn svg {
      width: 14px;
      height: 14px;
    }

    .filter-btn:hover {
      border-color: var(--primary);
      color: var(--text-primary);
    }

    .filter-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }
  `]
})
export class ModelSelectorComponent implements OnInit {
  @Output() modelSelected = new EventEmitter<{ providerID: string; modelID: string }>();

  providers: Array<{ id: string; name: string; models: Array<any> }> = [];
  allProviders: Array<{ id: string; name: string; models: Array<any> }> = [];
  selectedModel: string = '';
  loading = true;
  showOnlyFree = false;
  freeModelIds: Set<string> = new Set();
  fetchingFreeModels = false;

  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.apiService.getProviders().subscribe({
      next: (response) => {
        // Transform providers data into a flat structure
        this.allProviders = response.providers.map(provider => ({
          id: provider.id,
          name: provider.name,
          models: Object.values(provider.models).map((model: any) => ({
            id: model.id,
            name: model.name,
            cost: model.cost,
            reasoning: model.reasoning,
            toolCall: model.tool_call,
            releaseDate: model.release_date
          }))
        }));

        // Apply filter
        this.applyFilter();

        // Set default model if available
        if (response.default && response.default['openrouter']) {
          this.selectedModel = `openrouter/${response.default['openrouter']}`;
          this.emitSelection();
        }

        this.loading = false;
        console.log('[Model Selector] ✓ Loaded providers:', this.allProviders.length);
      },
      error: (error) => {
        console.error('[Model Selector] ✗ Failed to load providers:', error);
        this.loading = false;
      }
    });
  }

  toggleFreeFilter(): void {
    this.showOnlyFree = !this.showOnlyFree;

    if (this.showOnlyFree && this.freeModelIds.size === 0) {
      // Fetch free models from OpenRouter API dynamically
      this.fetchingFreeModels = true;
      console.log('[Model Selector] Fetching free models from OpenRouter API...');

      this.http.get<any>('https://openrouter.ai/api/v1/models').subscribe({
        next: (response) => {
          // Extract IDs of models that are free (pricing.prompt == "0" and pricing.completion == "0")
          this.freeModelIds = new Set(
            response.data
              .filter((m: any) => m.pricing?.prompt === '0' && m.pricing?.completion === '0')
              .map((m: any) => m.id)
          );
          console.log(`[Model Selector] ✓ Fetched ${this.freeModelIds.size} free models from OpenRouter`);
          this.fetchingFreeModels = false;
          this.applyFilter();
        },
        error: (error) => {
          console.error('[Model Selector] ✗ Failed to fetch free models from OpenRouter:', error);
          this.fetchingFreeModels = false;
          // Fallback to local filtering
          this.applyFilter();
        }
      });
    } else {
      this.applyFilter();
    }

    console.log(`[Model Selector] Filter: ${this.showOnlyFree ? 'FREE only' : 'ALL'}`);
  }

  private applyFilter(): void {
    if (this.showOnlyFree) {
      // Show only models that are in the OpenRouter free list
      this.providers = this.allProviders
        .filter(p => p.id === 'openrouter')
        .map(p => ({
          ...p,
          models: p.models
            .filter(m => this.freeModelIds.has(m.id))  // Only show models from OpenRouter's free list
            .sort((a, b) => {
              // Sort by release_date descending (newest first)
              const dateA = new Date(a.releaseDate || '1970-01-01').getTime();
              const dateB = new Date(b.releaseDate || '1970-01-01').getTime();
              return dateB - dateA;
            })
        }))
        .filter(p => p.models.length > 0);
    } else {
      // Show all providers
      this.providers = [...this.allProviders];
    }
  }

  onModelChange(): void {
    this.emitSelection();
  }

  private emitSelection(): void {
    if (!this.selectedModel) return;

    const [providerID, ...modelParts] = this.selectedModel.split('/');
    const modelID = modelParts.join('/'); // Handle cases like "x-ai/grok-code-fast-1"

    console.log(`[Model Selector] ✓ Model selected: ${providerID}/${modelID}`);
    this.modelSelected.emit({ providerID, modelID });
  }

  getModelDisplayName(model: any): string {
    let name = model.name;
    if (model.cost.input === 0 && model.cost.output === 0) {
      name += ' (FREE)';
    } else if (model.cost.input > 0) {
      name += ` ($${model.cost.input}/M in, $${model.cost.output}/M out)`;
    }
    return name;
  }
}
