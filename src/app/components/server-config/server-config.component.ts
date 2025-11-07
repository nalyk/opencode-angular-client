import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServerConfigService } from '../../services/server-config.service';

@Component({
  selector: 'app-server-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './server-config.component.html',
  styleUrls: ['./server-config.component.scss']
})
export class ServerConfigComponent implements OnInit {
  serverUrl: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  isTesting: boolean = false;
  testResult: 'success' | 'error' | null = null;

  constructor(
    private serverConfig: ServerConfigService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Pre-fill with current URL if available
    const config = this.serverConfig.getConfig();
    if (config.serverUrl) {
      this.serverUrl = config.serverUrl;
    } else {
      // Suggest a default for Android
      this.serverUrl = 'http://192.168.1.1:3000';
    }
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

      // Navigate to home
      this.router.navigate(['/']);

      // Reload to establish SSE connection with new URL
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
