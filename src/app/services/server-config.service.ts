import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface ServerConfig {
  serverUrl: string;
  configured: boolean;
}

const DEFAULT_SERVER_URL = 'http://localhost:3000';
const SERVER_URL_KEY = 'opencode_server_url';

@Injectable({
  providedIn: 'root'
})
export class ServerConfigService {
  private configSubject = new BehaviorSubject<ServerConfig>({
    serverUrl: DEFAULT_SERVER_URL,
    configured: false
  });

  public config$: Observable<ServerConfig> = this.configSubject.asObservable();
  public isNativePlatform = Capacitor.isNativePlatform();

  constructor() {
    this.loadServerUrl();
  }

  /**
   * Load the stored server URL from preferences
   */
  private async loadServerUrl(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: SERVER_URL_KEY });

      if (value) {
        this.configSubject.next({
          serverUrl: value,
          configured: true
        });
      } else if (this.isNativePlatform) {
        // On native platforms, require configuration
        this.configSubject.next({
          serverUrl: '',
          configured: false
        });
      } else {
        // On web, use default localhost
        this.configSubject.next({
          serverUrl: DEFAULT_SERVER_URL,
          configured: true
        });
      }
    } catch (error) {
      console.error('Error loading server URL:', error);
      this.configSubject.next({
        serverUrl: this.isNativePlatform ? '' : DEFAULT_SERVER_URL,
        configured: !this.isNativePlatform
      });
    }
  }

  /**
   * Get the current server URL
   */
  getServerUrl(): string {
    return this.configSubject.value.serverUrl;
  }

  /**
   * Get the current configuration state
   */
  getConfig(): ServerConfig {
    return this.configSubject.value;
  }

  /**
   * Set a new server URL and persist it
   */
  async setServerUrl(url: string): Promise<void> {
    try {
      // Normalize the URL (remove trailing slash)
      const normalizedUrl = url.trim().replace(/\/$/, '');

      // Validate URL format
      if (!normalizedUrl || !this.isValidUrl(normalizedUrl)) {
        throw new Error('Invalid server URL format');
      }

      // Save to preferences
      await Preferences.set({
        key: SERVER_URL_KEY,
        value: normalizedUrl
      });

      // Update the state
      this.configSubject.next({
        serverUrl: normalizedUrl,
        configured: true
      });
    } catch (error) {
      console.error('Error setting server URL:', error);
      throw error;
    }
  }

  /**
   * Clear the stored server URL
   */
  async clearServerUrl(): Promise<void> {
    try {
      await Preferences.remove({ key: SERVER_URL_KEY });

      this.configSubject.next({
        serverUrl: this.isNativePlatform ? '' : DEFAULT_SERVER_URL,
        configured: !this.isNativePlatform
      });
    } catch (error) {
      console.error('Error clearing server URL:', error);
      throw error;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Test connection to the server
   */
  async testConnection(url?: string): Promise<boolean> {
    const testUrl = url || this.getServerUrl();

    if (!testUrl) {
      return false;
    }

    try {
      const response = await fetch(`${testUrl}/config`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
