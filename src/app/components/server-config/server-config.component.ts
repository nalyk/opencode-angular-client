import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ServerConfigService } from '../../services/server-config.service';

@Component({
  selector: 'app-server-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './server-config.component.html',
  styleUrls: ['./server-config.component.scss']
})
export class ServerConfigComponent implements OnInit, OnDestroy {
  serverUrl: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  isTesting: boolean = false;
  testResult: 'success' | 'error' | null = null;
  private subscription?: Subscription;

  constructor(
    private serverConfig: ServerConfigService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to config Observable to handle async preferences loading
    // This fixes the race condition where getConfig() might return stale values
    this.subscription = this.serverConfig.config$.subscribe(config => {
      // Only update if we haven't manually entered a URL yet
      if (this.serverUrl === '' || this.serverUrl === 'http://localhost:3000') {
        if (config.configured && config.serverUrl) {
          // User has a saved configuration - use it
          this.serverUrl = config.serverUrl;
        } else if (!config.configured) {
          // First-time user or preferences not loaded yet - show default
          this.serverUrl = 'http://192.168.1.100:3000';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async testConnection(): Promise<void> {
    if (!this.serverUrl.trim()) {
      this.errorMessage = 'Please enter a server URL';
      return;
    }

    this.errorMessage = '';
    this.isTesting = true;
    this.testResult = null;

    try {
      const isConnected = await this.serverConfig.testConnection(this.serverUrl);

      if (isConnected) {
        this.testResult = 'success';
        this.errorMessage = '';
      } else {
        this.testResult = 'error';
        this.errorMessage = 'Failed to connect to server. Please check the URL and try again.';
      }
    } catch (error) {
      this.testResult = 'error';
      this.errorMessage = 'Connection error: ' + (error as Error).message;
    } finally {
      this.isTesting = false;
    }
  }

  async saveAndContinue(): Promise<void> {
    if (!this.serverUrl.trim()) {
      this.errorMessage = 'Please enter a server URL';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    try {
      await this.serverConfig.setServerUrl(this.serverUrl);

      // Navigate to home, then reload to establish SSE connection with new URL
      this.router.navigate(['/']).then(() => {
        window.location.reload();
      });
    } catch (error) {
      this.errorMessage = 'Failed to save configuration: ' + (error as Error).message;
    } finally {
      this.isLoading = false;
    }
  }

  async skipConfiguration(): Promise<void> {
    // For testing purposes, allow skipping on web
    if (!this.serverConfig.isNativePlatform) {
      this.router.navigate(['/']);
    }
  }
}
