import { Component, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandInfo } from '../../models/command.model';

export interface CommandExecution {
  command: string;
  arguments: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="palette-backdrop" (click)="onCancel()">
      <div class="palette-container" (click)="$event.stopPropagation()">
        <div class="palette-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            #searchInput
            type="text"
            class="palette-search"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            (keydown.arrowdown)="navigateDown($event)"
            (keydown.arrowup)="navigateUp($event)"
            (keydown.enter)="selectCommand($event)"
            (keydown.escape)="onCancel()"
            placeholder="Type a command name..."
            autocomplete="off"
          />
          <button class="close-btn" (click)="onCancel()" title="Close (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div *ngIf="!selectedCommand" class="palette-body">
          <div *ngIf="loading" class="palette-loading">
            <div class="spinner"></div>
            <span>Loading commands...</span>
          </div>

          <div *ngIf="!loading && filteredCommands.length === 0" class="palette-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p>No commands found</p>
            <p class="hint">Try a different search term</p>
          </div>

          <div *ngIf="!loading && filteredCommands.length > 0" class="command-list">
            <div
              *ngFor="let cmd of filteredCommands; let i = index"
              class="command-item"
              [class.selected]="i === selectedIndex"
              (click)="selectCommand()"
              (mouseenter)="selectedIndex = i">
              <div class="command-item-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span class="command-name">{{ cmd.name }}</span>
                <span *ngIf="cmd.agent" class="command-badge agent-badge">{{ cmd.agent }}</span>
                <span *ngIf="cmd.subtask" class="command-badge subtask-badge">subtask</span>
              </div>
              <p *ngIf="cmd.description" class="command-description">{{ cmd.description }}</p>
            </div>
          </div>

          <div class="palette-footer">
            <div class="footer-hint">
              <kbd>↑</kbd><kbd>↓</kbd> navigate
              <kbd>↵</kbd> select
              <kbd>esc</kbd> close
            </div>
            <div class="footer-count">{{ filteredCommands.length }} commands</div>
          </div>
        </div>

        <div *ngIf="selectedCommand" class="palette-body arguments-panel">
          <div class="selected-command-info">
            <button class="back-btn" (click)="deselectCommand()" title="Back to command list">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div class="selected-command-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span class="selected-command-name">{{ selectedCommand.name }}</span>
            </div>
            <p *ngIf="selectedCommand.description" class="selected-command-description">
              {{ selectedCommand.description }}
            </p>
          </div>

          <div class="arguments-section">
            <label for="args-input" class="args-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="9" x2="20" y2="9"></line>
                <line x1="4" y1="15" x2="20" y2="15"></line>
                <line x1="10" y1="3" x2="8" y2="21"></line>
                <line x1="16" y1="3" x2="14" y2="21"></line>
              </svg>
              Arguments <span class="optional">(optional)</span>
            </label>
            <input
              #argsInput
              id="args-input"
              type="text"
              class="args-input"
              [(ngModel)]="commandArguments"
              (keydown.enter)="executeSelectedCommand()"
              (keydown.escape)="deselectCommand()"
              placeholder="Enter command arguments..."
            />
            <p class="args-hint">
              Template: <code>{{ selectedCommand.template }}</code>
            </p>
          </div>

          <div class="execute-footer">
            <button class="btn btn-secondary" (click)="deselectCommand()">
              Back
            </button>
            <button class="btn btn-primary" (click)="executeSelectedCommand()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Execute Command
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .palette-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
      z-index: 2000;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .palette-container {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 90%;
      max-width: 640px;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .palette-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }

    .palette-header svg {
      flex-shrink: 0;
      color: var(--text-secondary);
    }

    .palette-search {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 1rem;
      outline: none;
    }

    .palette-search::placeholder {
      color: var(--text-secondary);
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

    .palette-body {
      flex: 1;
      overflow-y: auto;
      max-height: 50vh;
    }

    .palette-loading,
    .palette-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      color: var(--text-secondary);
    }

    .palette-loading .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .palette-empty svg {
      color: var(--text-tertiary);
      margin-bottom: 1rem;
    }

    .palette-empty p {
      margin: 0.25rem 0;
    }

    .palette-empty .hint {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    .command-list {
      padding: 0.5rem 0;
    }

    .command-item {
      padding: 0.875rem 1.25rem;
      cursor: pointer;
      transition: all 0.1s;
      border-left: 3px solid transparent;
    }

    .command-item:hover,
    .command-item.selected {
      background: var(--bg-tertiary);
      border-left-color: var(--primary);
    }

    .command-item-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .command-item-header svg {
      flex-shrink: 0;
      color: var(--primary);
    }

    .command-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.9375rem;
    }

    .command-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .agent-badge {
      background: rgba(37, 99, 235, 0.2);
      color: #60a5fa;
    }

    .subtask-badge {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .command-description {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .palette-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--border);
      background: var(--bg-primary);
    }

    .footer-hint {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .footer-hint kbd {
      padding: 0.125rem 0.375rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .footer-count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .arguments-panel {
      padding: 1.25rem;
    }

    .selected-command-info {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .back-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: inline-flex;
      align-items: center;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .selected-command-header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 0.5rem;
    }

    .selected-command-header svg {
      color: var(--primary);
    }

    .selected-command-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .selected-command-description {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .arguments-section {
      margin-bottom: 1.5rem;
    }

    .args-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .args-label svg {
      color: var(--text-secondary);
    }

    .args-label .optional {
      font-weight: 400;
      color: var(--text-secondary);
      font-style: italic;
    }

    .args-input {
      width: 100%;
      padding: 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 0.9375rem;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      transition: all 0.2s;
    }

    .args-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .args-hint {
      margin: 0.5rem 0 0 0;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .args-hint code {
      background: var(--bg-tertiary);
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
    }

    .execute-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
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

    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg-quaternary);
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: #1e40af;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
  `]
})
export class CommandPaletteComponent implements OnInit {
  @Output() execute = new EventEmitter<CommandExecution>();
  @Output() close = new EventEmitter<void>();

  commands: CommandInfo[] = [];
  filteredCommands: CommandInfo[] = [];
  searchQuery: string = '';
  selectedIndex: number = 0;
  selectedCommand: CommandInfo | null = null;
  commandArguments: string = '';
  loading: boolean = false;

  ngOnInit() {
    // Commands will be provided via @Input or fetched in parent
  }

  setCommands(commands: CommandInfo[]) {
    this.commands = commands;
    this.filteredCommands = commands;
    this.loading = false;
  }

  onSearchChange() {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredCommands = this.commands;
    } else {
      // Simple fuzzy-like search: matches if query is substring of name or description
      this.filteredCommands = this.commands.filter(cmd => {
        const nameMatch = cmd.name.toLowerCase().includes(query);
        const descMatch = cmd.description?.toLowerCase().includes(query) || false;
        return nameMatch || descMatch;
      });
    }

    this.selectedIndex = 0;
  }

  navigateDown(event: Event) {
    event.preventDefault();
    if (this.selectedIndex < this.filteredCommands.length - 1) {
      this.selectedIndex++;
      this.scrollToSelected();
    }
  }

  navigateUp(event: Event) {
    event.preventDefault();
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.scrollToSelected();
    }
  }

  selectCommand(event?: Event) {
    if (event) event.preventDefault();

    if (this.filteredCommands.length === 0) return;

    this.selectedCommand = this.filteredCommands[this.selectedIndex];
    this.commandArguments = '';

    // Auto-focus args input after a tick
    setTimeout(() => {
      const argsInput = document.getElementById('args-input') as HTMLInputElement;
      if (argsInput) argsInput.focus();
    }, 0);
  }

  deselectCommand() {
    this.selectedCommand = null;
    this.commandArguments = '';

    // Auto-focus search input after a tick
    setTimeout(() => {
      const searchInput = document.querySelector('.palette-search') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }, 0);
  }

  executeSelectedCommand() {
    if (!this.selectedCommand) return;

    this.execute.emit({
      command: this.selectedCommand.name,
      arguments: this.commandArguments
    });
  }

  onCancel() {
    this.close.emit();
  }

  private scrollToSelected() {
    setTimeout(() => {
      const selected = document.querySelector('.command-item.selected');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }
}
