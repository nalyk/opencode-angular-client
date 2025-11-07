import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  action?: {
    label: string;
    callback: () => void;
  };
  duration?: number;
  dismissible?: boolean;
}

/**
 * Toast Notification Service
 *
 * Manages toast notifications for file changes and other system events
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  private toastIdCounter = 0;

  toasts$ = this.toastsSubject.asObservable();

  constructor() {
    console.log('[Toast Service] Initialized');
  }

  /**
   * Show a toast notification
   * @param message The message to display
   * @param type Toast type (info, success, warning, error)
   * @param action Optional action button
   * @param duration Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  show(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    action?: { label: string; callback: () => void },
    duration: number = 5000
  ): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      message,
      type,
      action,
      duration,
      dismissible: true
    };

    const toasts = [...this.toastsSubject.value, toast];
    this.toastsSubject.next(toasts);

    console.log(`[Toast Service] Showing ${type} toast: ${message}`);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  /**
   * Show an info toast
   */
  info(message: string, action?: { label: string; callback: () => void }, duration = 5000): string {
    return this.show(message, 'info', action, duration);
  }

  /**
   * Show a success toast
   */
  success(message: string, duration = 3000): string {
    return this.show(message, 'success', undefined, duration);
  }

  /**
   * Show a warning toast
   */
  warning(message: string, action?: { label: string; callback: () => void }, duration = 5000): string {
    return this.show(message, 'warning', action, duration);
  }

  /**
   * Show an error toast
   */
  error(message: string, action?: { label: string; callback: () => void }, duration = 7000): string {
    return this.show(message, 'error', action, duration);
  }

  /**
   * Show a file change notification
   */
  fileChanged(file: string, event: 'add' | 'change' | 'unlink'): string {
    const action = event === 'change' ? {
      label: 'Reload',
      callback: () => {
        console.log(`[Toast Service] Reloading file: ${file}`);
        window.location.reload();
      }
    } : undefined;

    const messages = {
      add: `File added: ${file}`,
      change: `File changed: ${file}`,
      unlink: `File deleted: ${file}`
    };

    return this.info(messages[event], action, 5000);
  }

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string): void {
    const toasts = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(toasts);
    console.log(`[Toast Service] Dismissed toast: ${id}`);
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toastsSubject.next([]);
    console.log('[Toast Service] All toasts cleared');
  }
}
