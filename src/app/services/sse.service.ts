import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, filter, shareReplay, distinctUntilChanged } from 'rxjs';
import {
  ServerEvent,
  ServerEventType,
  MessagePartUpdatedEvent,
  MessageUpdatedEvent,
  SessionUpdatedEvent,
  TodoUpdatedEvent,
  PermissionUpdatedEvent,
  SessionErrorEvent,
  FileWatcherUpdatedEvent,
  isMessagePartUpdatedEvent,
  isMessageUpdatedEvent,
  isSessionUpdatedEvent,
  isTodoUpdatedEvent,
  isPermissionUpdatedEvent,
  isServerConnectedEvent,
  isSessionErrorEvent,
  isFileWatcherUpdatedEvent
} from '../models/event.model';

export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

@Injectable({
  providedIn: 'root'
})
export class SseService implements OnDestroy {
  private eventSource: EventSource | null = null;
  private allEvents$ = new Subject<ServerEventType>();
  private connectionState$ = new BehaviorSubject<SSEConnectionState>('disconnected');
  private connectionError$ = new Subject<Error>();

  // Reconnection state
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private baseReconnectDelay = 1000; // 1 second
  private maxReconnectDelay = 30000; // 30 seconds

  // Event-specific observables with shareReplay for late subscribers
  public readonly messageParts$ = this.allEvents$.pipe(
    filter(isMessagePartUpdatedEvent),
    shareReplay(1)
  ) as Observable<MessagePartUpdatedEvent>;

  public readonly messageUpdates$ = this.allEvents$.pipe(
    filter(isMessageUpdatedEvent),
    shareReplay(1)
  ) as Observable<MessageUpdatedEvent>;

  public readonly sessionUpdates$ = this.allEvents$.pipe(
    filter(isSessionUpdatedEvent),
    shareReplay(1)
  ) as Observable<SessionUpdatedEvent>;

  public readonly todoUpdates$ = this.allEvents$.pipe(
    filter(isTodoUpdatedEvent),
    shareReplay(1)
  ) as Observable<TodoUpdatedEvent>;

  public readonly permissions$ = this.allEvents$.pipe(
    filter(isPermissionUpdatedEvent),
    shareReplay(1)
  ) as Observable<PermissionUpdatedEvent>;

  public readonly sessionErrors$ = this.allEvents$.pipe(
    filter(isSessionErrorEvent),
    shareReplay(1)
  ) as Observable<SessionErrorEvent>;

  public readonly fileWatcher$ = this.allEvents$.pipe(
    filter(isFileWatcherUpdatedEvent),
    shareReplay(1)
  ) as Observable<FileWatcherUpdatedEvent>;

  constructor(private ngZone: NgZone) {
    console.log('[SSE Service] v3.0 initialized');
  }

  /**
   * Get current connection state
   */
  get connectionState(): SSEConnectionState {
    return this.connectionState$.value;
  }

  /**
   * Observable of connection state changes
   */
  get connectionState$Observable(): Observable<SSEConnectionState> {
    return this.connectionState$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Observable of connection errors
   */
  get connectionErrors(): Observable<Error> {
    return this.connectionError$.asObservable();
  }

  /**
   * Connect to SSE endpoint with automatic reconnection
   */
  connect(url: string = '/api/event'): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.log('[SSE Service] Already connected');
      return;
    }

    if (this.eventSource?.readyState === EventSource.CONNECTING) {
      console.log('[SSE Service] Connection already in progress');
      return;
    }

    this.connectionState$.next('connecting');
    console.log(`[SSE Service] Connecting to ${url}...`);

    this.ngZone.runOutsideAngular(() => {
      try {
        this.eventSource = new EventSource(url, {
          withCredentials: false
        });

        // Connection opened
        this.eventSource.onopen = () => {
          this.ngZone.run(() => {
            this.connectionState$.next('connected');
            this.reconnectAttempts = 0; // Reset on successful connection
            console.log('[SSE Service] ✓ Connected successfully');
          });
        };

        // Message received
        this.eventSource.onmessage = (event: MessageEvent) => {
          this.ngZone.run(() => {
            try {
              const data: ServerEventType = JSON.parse(event.data);

              // Log important events
              if (isServerConnectedEvent(data)) {
                console.log('[SSE Service] ✓ Server connected event received');
              } else if (isMessagePartUpdatedEvent(data)) {
                // Only log if it has a delta (streaming text)
                if (data.properties.delta) {
                  console.log(`[SSE Service] ⚡ Streaming delta: ${data.properties.delta.length} chars`);
                }
              }

              this.allEvents$.next(data);
            } catch (error) {
              console.error('[SSE Service] Failed to parse event:', error, event.data);
            }
          });
        };

        // Error handling
        this.eventSource.onerror = (error: Event) => {
          this.ngZone.run(() => {
            const errorState = this.eventSource?.readyState === EventSource.CLOSED;
            console.error('[SSE Service] ✗ Error:', errorState ? 'Connection closed' : 'Connection error');

            if (errorState) {
              this.connectionState$.next('error');
              this.connectionError$.next(new Error('SSE connection closed'));
              this.attemptReconnect(url);
            }
          });
        };
      } catch (error) {
        this.ngZone.run(() => {
          console.error('[SSE Service] ✗ Failed to create EventSource:', error);
          this.connectionState$.next('error');
          this.connectionError$.next(error as Error);
          this.attemptReconnect(url);
        });
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(url: string): void {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[SSE Service] ✗ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.connectionState$.next('error');
      return;
    }

    this.reconnectAttempts++;
    this.connectionState$.next('reconnecting');

    // Calculate exponential backoff: baseDelay * 2^(attempts - 1), capped at maxDelay
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[SSE Service] ⟳ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.disconnect(false); // Clean up old connection
      this.connect(url);
    }, delay);
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(clearState: boolean = true): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      console.log('[SSE Service] Disconnecting...');
      this.eventSource.close();
      this.eventSource = null;
    }

    if (clearState) {
      this.connectionState$.next('disconnected');
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Get all events observable (for debugging or custom filtering)
   */
  getAllEvents(): Observable<ServerEventType> {
    return this.allEvents$.asObservable();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    state: SSEConnectionState;
    reconnectAttempts: number;
    isConnected: boolean;
  } {
    return {
      state: this.connectionState$.value,
      reconnectAttempts: this.reconnectAttempts,
      isConnected: this.isConnected()
    };
  }

  /**
   * Reset connection (useful for testing or manual recovery)
   */
  reset(): void {
    console.log('[SSE Service] Resetting connection...');
    this.disconnect(true);
    this.reconnectAttempts = 0;
  }

  ngOnDestroy(): void {
    console.log('[SSE Service] Destroying service...');
    this.disconnect(true);
    this.allEvents$.complete();
    this.connectionState$.complete();
    this.connectionError$.complete();
  }
}
