import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ShellCommand {
  command: string;
  timestamp: number;
}

@Component({
  selector: 'app-shell-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="terminal-container" [class.collapsed]="collapsed">
      <div class="terminal-header">
        <div class="terminal-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span>Shell Terminal</span>
          <span class="terminal-status">Ready</span>
        </div>
        <div class="terminal-header-right">
          <button class="header-btn" (click)="clearHistory()" title="Clear history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Clear
          </button>
          <button class="header-btn" (click)="toggleCollapse()" title="Collapse/Expand">
            <svg *ngIf="!collapsed" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <svg *ngIf="collapsed" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
          <button class="header-btn" (click)="onClose()" title="Close terminal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="terminal-body" *ngIf="!collapsed">
        <div class="terminal-output" #terminalOutput>
          <div *ngIf="history.length === 0" class="terminal-welcome">
            <p>Shell Terminal - Execute commands directly</p>
            <p class="hint">Type a shell command and press Enter</p>
            <p class="hint">Use ↑/↓ to navigate command history</p>
          </div>

          <div *ngFor="let entry of history" class="terminal-entry">
            <div class="terminal-prompt">
              <span class="prompt-symbol">$</span>
              <span class="prompt-command">{{ entry.command }}</span>
            </div>
          </div>
        </div>

        <div class="terminal-input-container">
          <span class="input-prompt">$</span>
          <input
            #terminalInput
            type="text"
            class="terminal-input"
            [(ngModel)]="currentCommand"
            (keydown.enter)="executeCommand()"
            (keydown.arrowup)="navigateHistory(-1, $event)"
            (keydown.arrowdown)="navigateHistory(1, $event)"
            placeholder="Enter shell command..."
            autocomplete="off"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .terminal-container {
      background: #1e1e1e;
      border: 1px solid #3e3e3e;
      border-radius: var(--radius);
      overflow: hidden;
      transition: all 0.3s;
    }

    .terminal-container.collapsed {
      max-height: 40px;
    }

    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.875rem;
      background: #252526;
      border-bottom: 1px solid #3e3e3e;
    }

    .terminal-header-left,
    .terminal-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .terminal-header-left svg {
      color: #4ec9b0;
      flex-shrink: 0;
    }

    .terminal-header-left span {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #cccccc;
    }

    .terminal-status {
      font-size: 0.75rem !important;
      font-weight: 500 !important;
      color: #4ec9b0 !important;
      padding: 0.125rem 0.5rem;
      background: rgba(78, 201, 176, 0.15);
      border-radius: 3px;
    }

    .header-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 3px;
      color: #cccccc;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .header-btn:hover {
      background: #2d2d30;
      border-color: #3e3e3e;
    }

    .terminal-body {
      display: flex;
      flex-direction: column;
      height: 300px;
    }

    .terminal-output {
      flex: 1;
      overflow-y: auto;
      padding: 0.875rem;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #cccccc;
    }

    .terminal-output::-webkit-scrollbar {
      width: 8px;
    }

    .terminal-output::-webkit-scrollbar-track {
      background: #1e1e1e;
    }

    .terminal-output::-webkit-scrollbar-thumb {
      background: #3e3e3e;
      border-radius: 4px;
    }

    .terminal-output::-webkit-scrollbar-thumb:hover {
      background: #4e4e4e;
    }

    .terminal-welcome {
      color: #858585;
      font-size: 0.8125rem;
    }

    .terminal-welcome p {
      margin: 0.25rem 0;
    }

    .terminal-welcome .hint {
      font-size: 0.75rem;
      color: #6e6e6e;
    }

    .terminal-entry {
      margin-bottom: 0.5rem;
    }

    .terminal-prompt {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .prompt-symbol {
      color: #4ec9b0;
      font-weight: 700;
    }

    .prompt-command {
      color: #d4d4d4;
    }

    .terminal-input-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 0.875rem;
      background: #252526;
      border-top: 1px solid #3e3e3e;
    }

    .input-prompt {
      color: #4ec9b0;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.875rem;
    }

    .terminal-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #d4d4d4;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.875rem;
      outline: none;
    }

    .terminal-input::placeholder {
      color: #6e6e6e;
    }
  `]
})
export class ShellTerminalComponent implements OnInit, AfterViewInit {
  @Output() execute = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('terminalInput') terminalInput!: ElementRef<HTMLInputElement>;
  @ViewChild('terminalOutput') terminalOutput!: ElementRef<HTMLDivElement>;

  currentCommand: string = '';
  history: ShellCommand[] = [];
  historyIndex: number = -1;
  collapsed: boolean = false;

  private readonly HISTORY_KEY = 'shell_terminal_history';
  private readonly MAX_HISTORY = 100;

  ngOnInit() {
    this.loadHistory();
  }

  ngAfterViewInit() {
    // Auto-focus terminal input
    setTimeout(() => {
      if (this.terminalInput) {
        this.terminalInput.nativeElement.focus();
      }
    }, 100);
  }

  executeCommand() {
    const cmd = this.currentCommand.trim();
    if (!cmd) return;

    // Add to history
    this.addToHistory(cmd);

    // Emit execute event
    this.execute.emit(cmd);

    // Clear input
    this.currentCommand = '';
    this.historyIndex = -1;

    // Scroll to bottom
    this.scrollToBottom();
  }

  navigateHistory(direction: number, event: Event) {
    event.preventDefault();

    if (this.history.length === 0) return;

    // direction: -1 = up (older), 1 = down (newer)
    const newIndex = this.historyIndex + direction;

    if (newIndex < -1) {
      return; // Can't go further down
    }

    if (newIndex >= this.history.length) {
      return; // Can't go further up
    }

    this.historyIndex = newIndex;

    if (this.historyIndex === -1) {
      this.currentCommand = '';
    } else {
      this.currentCommand = this.history[this.history.length - 1 - this.historyIndex].command;
    }
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;

    if (!this.collapsed) {
      // When expanding, focus input
      setTimeout(() => {
        if (this.terminalInput) {
          this.terminalInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  clearHistory() {
    if (confirm('Clear command history?')) {
      this.history = [];
      this.historyIndex = -1;
      this.saveHistory();
    }
  }

  onClose() {
    this.close.emit();
  }

  private addToHistory(command: string) {
    const entry: ShellCommand = {
      command,
      timestamp: Date.now()
    };

    this.history.push(entry);

    // Limit history size
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(-this.MAX_HISTORY);
    }

    this.saveHistory();
  }

  private loadHistory() {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Shell Terminal] Failed to load history:', error);
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('[Shell Terminal] Failed to save history:', error);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.terminalOutput) {
        const element = this.terminalOutput.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 0);
  }
}
