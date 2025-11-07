import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts$ | async"
           class="toast"
           [class.toast-info]="toast.type === 'info'"
           [class.toast-success]="toast.type === 'success'"
           [class.toast-warning]="toast.type === 'warning'"
           [class.toast-error]="toast.type === 'error'">

        <!-- Icon -->
        <div class="toast-icon">
          <svg *ngIf="toast.type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <svg *ngIf="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg *ngIf="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg *ngIf="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>

        <!-- Message -->
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>

        <!-- Actions -->
        <div class="toast-actions">
          <button *ngIf="toast.action" class="toast-action-btn" (click)="handleAction(toast)">
            {{ toast.action.label }}
          </button>
          <button *ngIf="toast.dismissible" class="toast-close-btn" (click)="dismiss(toast.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-left-width: 4px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-info {
      border-left-color: #3b82f6;
    }

    .toast-success {
      border-left-color: #22c55e;
    }

    .toast-warning {
      border-left-color: #f59e0b;
    }

    .toast-error {
      border-left-color: #ef4444;
    }

    .toast-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .toast-info .toast-icon {
      color: #3b82f6;
    }

    .toast-success .toast-icon {
      color: #22c55e;
    }

    .toast-warning .toast-icon {
      color: #f59e0b;
    }

    .toast-error .toast-icon {
      color: #ef4444;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-message {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--text-primary);
      word-break: break-word;
    }

    .toast-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .toast-action-btn {
      padding: 0.25rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--primary);
      background: transparent;
      border: 1px solid var(--primary);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toast-action-btn:hover {
      background: var(--primary);
      color: white;
    }

    .toast-close-btn {
      padding: 0.25rem;
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .toast-close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  `]
})
export class ToastContainerComponent implements OnInit {
  toasts$: Observable<Toast[]>;

  constructor(private toastService: ToastService) {
    this.toasts$ = this.toastService.toasts$;
  }

  ngOnInit(): void {}

  handleAction(toast: Toast): void {
    if (toast.action) {
      toast.action.callback();
      this.dismiss(toast.id);
    }
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
