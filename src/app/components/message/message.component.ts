import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { marked } from 'marked';
import { StateService } from '../../services/state.service';
import {
  MessageWithParts,
  MessagePart,
  MessageInfo,
  TextPart,
  ReasoningPart,
  ToolPart,
  FilePart,
  StepFinishPart,
  RetryPart,
  PatchPart,
  AssistantMessageInfo
} from '../../models/session.model';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="message" [class.user]="message.info.role === 'user'" [class.assistant]="message.info.role === 'assistant'">
      <div class="message-header">
        <div class="message-header-left">
          <span class="role">{{ message.info.role === 'user' ? 'You' : 'Assistant' }}</span>
          <span *ngIf="isAssistant(message.info)" class="model-badge">{{ getAssistantInfo(message.info).modelID }}</span>
          <span *ngIf="isAssistant(message.info) && getAssistantInfo(message.info).mode" class="mode-badge">
            {{ getAssistantInfo(message.info).mode }}
          </span>
          <span *ngIf="message.info.time.reverted" class="status-badge reverted-badge" title="This message was reverted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Reverted
          </span>
          <span *ngIf="message.info.time.compacted" class="status-badge compacted-badge" title="This message was compacted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Compacted
          </span>
        </div>
        <div class="message-header-right">
          <button *ngIf="!message.info.time.reverted" class="revert-btn" (click)="onRevert()" title="Revert session to this point">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Revert to Here
          </button>
          <span *ngIf="isAssistant(message.info)" class="cost">{{ formatCost(getAssistantInfo(message.info).cost) }}</span>
          <span class="time">{{ formatTime(message.info.time.created) }}</span>
        </div>
      </div>

      <div class="message-content">
        <div *ngFor="let part of message.parts; let i = index; trackBy: trackByPartId" class="message-part">

          <!-- Text Part -->
          <div *ngIf="part.type === 'text'" class="text-part"
               [class.synthetic]="isTextPart(part) && part.synthetic"
               [innerHTML]="formatText(getTextPartText(part))"></div>

          <!-- Reasoning/Thinking Part -->
          <div *ngIf="part.type === 'reasoning'" class="reasoning-part">
            <div class="reasoning-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Reasoning</span>
              <span *ngIf="isReasoningPart(part) && part.time?.end" class="duration">
                {{ formatDuration(part.time.start, part.time.end) }}
              </span>
            </div>
            <div class="reasoning-content">{{ getReasoningPartText(part) }}</div>
          </div>

          <!-- Tool Part - Task Tool (Special UI) -->
          <div *ngIf="part.type === 'tool' && isTaskTool(part)" class="task-tool-part"
               [class.pending]="getToolPart(part).state.status === 'pending'"
               [class.running]="getToolPart(part).state.status === 'running'"
               [class.completed]="getToolPart(part).state.status === 'completed'"
               [class.error]="getToolPart(part).state.status === 'error'">
            <div class="task-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <div class="task-title-area">
                <div class="task-title">
                  Delegated to <strong>{{ '&#64;' + getTaskAgentName(part) }}</strong> agent
                </div>
                <div class="task-description">{{ getTaskDescription(part) }}</div>
              </div>
              <span class="tool-status-badge" [class.status-pending]="getToolPart(part).state.status === 'pending'"
                    [class.status-running]="getToolPart(part).state.status === 'running'"
                    [class.status-completed]="getToolPart(part).state.status === 'completed'"
                    [class.status-error]="getToolPart(part).state.status === 'error'">
                {{ getToolPart(part).state.status }}
              </span>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'running'" class="task-running">
              <div class="loading-spinner"></div>
              <span>Sub-agent is working...</span>
            </div>

            <!-- Expandable Progress Section -->
            <div *ngIf="getTaskChildSessionId(part)" class="task-progress-section">
              <button class="task-progress-toggle" (click)="toggleTaskExpanded(part, i)"
                      [class.expanded]="isTaskExpanded(part, i)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     [style.transform]="isTaskExpanded(part, i) ? 'rotate(90deg)' : 'rotate(0deg)'">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span>Sub-agent progress</span>
                <span class="message-count" *ngIf="getChildMessages(part, i) | async as childMsgs">
                  ({{ getChildMessageCount(childMsgs) }} messages)
                </span>
              </button>

              <div *ngIf="isTaskExpanded(part, i)" class="task-progress-messages">
                <div *ngIf="getChildMessages(part, i) | async as childMsgs; else loadingMsgs">
                  <div *ngIf="childMsgs.length === 0" class="no-messages">
                    No messages yet...
                  </div>
                  <div *ngFor="let childMsg of childMsgs" class="child-message">
                    <div class="child-message-header">
                      <span class="child-role">{{ childMsg.info.role }}</span>
                      <span class="child-time">{{ formatTime(childMsg.info.time.created) }}</span>
                    </div>
                    <div *ngFor="let childPart of childMsg.parts" class="child-part">
                      <div *ngIf="childPart.type === 'text'" class="child-text">
                        {{ getTextPart(childPart).text }}
                      </div>
                    </div>
                  </div>
                </div>
                <ng-template #loadingMsgs>
                  <div class="loading-messages">Loading messages...</div>
                </ng-template>
              </div>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'completed'" class="task-result">
              <div class="task-result-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <strong>Result:</strong>
              </div>
              <div class="task-result-content">{{ getTaskResult(part) }}</div>
              <a *ngIf="getTaskChildSessionId(part)"
                 [routerLink]="['/session', getTaskChildSessionId(part)]"
                 class="view-session-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                View full session
              </a>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'error' && getToolPart(part).state.error" class="tool-error">
              <strong>Error:</strong>
              <pre>{{ getToolPart(part).state.error }}</pre>
            </div>
          </div>

          <!-- Tool Part - WebFetch Tool -->
          <div *ngIf="part.type === 'tool' && isWebFetchTool(part)" class="webfetch-tool-part"
               [class.completed]="getToolPart(part).state.status === 'completed'"
               [class.error]="getToolPart(part).state.status === 'error'">
            <div class="webfetch-header">
              <img *ngIf="getFaviconURL(getWebFetchURL(part))"
                   [src]="getFaviconURL(getWebFetchURL(part))"
                   class="webfetch-favicon"
                   alt="favicon">
              <div class="webfetch-title-container">
                <h4 class="webfetch-title">{{ getWebFetchTitle(part) }}</h4>
                <a [href]="getWebFetchURL(part)" target="_blank" rel="noopener noreferrer" class="webfetch-url">
                  {{ getWebFetchURL(part) }}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
              <span class="tool-status-badge"
                    [class.status-completed]="getToolPart(part).state.status === 'completed'"
                    [class.status-error]="getToolPart(part).state.status === 'error'">
                {{ getToolPart(part).state.status }}
              </span>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'completed' && getWebFetchContent(part)"
                 class="webfetch-content">
              <div [innerHTML]="formatText(getWebFetchContent(part))"></div>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'error' && getToolPart(part).state.error"
                 class="tool-error">
              <strong>Error:</strong>
              <pre>{{ getToolPart(part).state.error }}</pre>
            </div>
          </div>

          <!-- Tool Part - Regular Tools -->
          <div *ngIf="part.type === 'tool' && !isTaskTool(part) && !isWebFetchTool(part)" class="tool-part"
               [class.pending]="getToolPart(part).state.status === 'pending'"
               [class.running]="getToolPart(part).state.status === 'running'"
               [class.completed]="getToolPart(part).state.status === 'completed'"
               [class.error]="getToolPart(part).state.status === 'error'">
            <div class="tool-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              <span class="tool-name">{{ getToolPart(part).tool }}</span>
              <span class="tool-status-badge" [class.status-pending]="getToolPart(part).state.status === 'pending'"
                    [class.status-running]="getToolPart(part).state.status === 'running'"
                    [class.status-completed]="getToolPart(part).state.status === 'completed'"
                    [class.status-error]="getToolPart(part).state.status === 'error'">
                {{ getToolPart(part).state.status }}
              </span>
              <span *ngIf="getToolPart(part).state.time?.end" class="tool-duration">
                {{ formatDuration(getToolPart(part).state.time?.start, getToolPart(part).state.time?.end) }}
              </span>
            </div>

            <div *ngIf="getToolPart(part).state.title" class="tool-title">{{ getToolPart(part).state.title }}</div>

            <details class="tool-details" [open]="getToolPart(part).state.status === 'error'">
              <summary>Input</summary>
              <pre class="tool-input">{{ formatJson(getToolPart(part).state.input) }}</pre>
            </details>

            <div *ngIf="getToolPart(part).state.status === 'running'" class="tool-running">
              <div class="loading-spinner"></div>
              <span>Executing...</span>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'completed' && getToolPart(part).state.output" class="tool-output">
              <strong>Output:</strong>
              <pre>{{ getToolPart(part).state.output }}</pre>
            </div>

            <div *ngIf="getToolPart(part).state.status === 'error' && getToolPart(part).state.error" class="tool-error">
              <strong>Error:</strong>
              <pre>{{ getToolPart(part).state.error }}</pre>
            </div>
          </div>

          <!-- File Part -->
          <div *ngIf="part.type === 'file'" class="file-part">
            <div class="file-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              <span>{{ getFilePart(part).filename || 'File' }}</span>
              <span class="file-mime">{{ getFilePart(part).mime }}</span>
            </div>
          </div>

          <!-- Retry Part -->
          <div *ngIf="part.type === 'retry'" class="retry-part">
            <div class="retry-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>Retry attempt {{ getRetryPart(part).attempt }}</span>
            </div>
            <div class="retry-message">{{ getRetryPart(part).error?.data?.message || 'Retrying...' }}</div>
          </div>

          <!-- Step Finish Part - Hidden (stats shown in header instead) -->

          <!-- Patch Part (code changes) -->
          <div *ngIf="part.type === 'patch'" class="patch-part">
            <div class="patch-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>Code changes ({{ getPatchPart(part).files.length }} files)</span>
            </div>
            <ul class="patch-files">
              <li *ngFor="let file of getPatchPart(part).files">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                {{ file }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Error display if message has error -->
      <div *ngIf="isAssistant(message.info) && getAssistantInfo(message.info).error" class="message-error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <strong>{{ getAssistantInfo(message.info).error.name || 'Error' }}:</strong>
          {{ getAssistantInfo(message.info).error.data?.message || 'Unknown error' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message {
      margin-bottom: 1.5rem;
      padding: 1rem;
      border-radius: var(--radius);
      background: var(--bg-secondary);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .message.user {
      background: var(--bg-tertiary);
      margin-left: 2rem;
    }

    .message.assistant {
      margin-right: 2rem;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .message-header-left,
    .message-header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .role {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .reverted-badge {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .compacted-badge {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .revert-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .revert-btn:hover {
      background: var(--bg-tertiary);
      border-color: var(--text-secondary);
      color: var(--text-primary);
    }

    .model-badge,
    .mode-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    .cost {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .time {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .duration {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-left: auto;
    }

    .message-content {
      line-height: 1.6;
    }

    .message-part {
      margin-bottom: 0.75rem;
    }

    .message-part:last-child {
      margin-bottom: 0;
    }

    .text-part {
      color: var(--text-primary);
    }

    .text-part.synthetic {
      opacity: 0.7;
      font-size: 0.875rem;
      font-style: italic;
    }

    .reasoning-part {
      padding: 0.75rem;
      background: rgba(251, 191, 36, 0.1);
      border-left: 3px solid var(--warning);
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .reasoning-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--warning);
      margin-bottom: 0.5rem;
    }

    .reasoning-content {
      font-size: 0.875rem;
      color: var(--text-secondary);
      white-space: pre-wrap;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }

    .tool-part {
      padding: 0.75rem;
      background: var(--bg-primary);
      border-left: 3px solid var(--primary);
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .tool-part.running {
      border-left-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
    }

    .tool-part.completed {
      border-left-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }

    .tool-part.error {
      border-left-color: var(--error);
      background: rgba(239, 68, 68, 0.05);
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .tool-name {
      color: var(--text-primary);
    }

    .tool-status-badge {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .tool-status-badge.status-pending {
      background: rgba(156, 163, 175, 0.2);
      color: #6b7280;
    }

    .tool-status-badge.status-running {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }

    .tool-status-badge.status-completed {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .tool-status-badge.status-error {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .tool-duration {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-left: auto;
    }

    .tool-title {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .tool-details {
      margin: 0.5rem 0;
    }

    .tool-details summary {
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.25rem 0;
      color: var(--text-secondary);
      user-select: none;
    }

    .tool-details summary:hover {
      color: var(--text-primary);
    }

    .tool-input,
    .tool-output pre,
    .tool-error pre {
      margin: 0.5rem 0 0 0;
      padding: 0.5rem;
      background: var(--bg-secondary);
      border-radius: 4px;
      font-size: 0.75rem;
      overflow-x: auto;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      line-height: 1.5;
    }

    .tool-running {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      color: #3b82f6;
      font-size: 0.875rem;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .tool-output,
    .tool-error {
      margin-top: 0.5rem;
    }

    .tool-output strong,
    .tool-error strong {
      font-size: 0.875rem;
      color: var(--text-primary);
      display: block;
      margin-bottom: 0.25rem;
    }

    /* Task Tool Part - Special styling for multi-agent delegation */
    .task-tool-part {
      padding: 1rem;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
      border-left: 4px solid #8b5cf6;
      border-radius: 8px;
      margin: 0.75rem 0;
    }

    .task-tool-part.completed {
      border-left-color: #10b981;
    }

    .task-tool-part.error {
      border-left-color: #ef4444;
    }

    .task-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .task-header svg {
      flex-shrink: 0;
      color: #8b5cf6;
      margin-top: 0.125rem;
    }

    .task-title-area {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.375rem;
    }

    .task-title strong {
      color: #8b5cf6;
      font-weight: 700;
    }

    .task-description {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .task-running {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 6px;
      font-size: 0.875rem;
      color: #3b82f6;
      font-weight: 500;
    }

    .task-result {
      margin-top: 0.75rem;
    }

    .task-result-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      color: #10b981;
      font-size: 0.875rem;
    }

    .task-result-header svg {
      flex-shrink: 0;
    }

    .task-result-content {
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.05);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--text-primary);
      line-height: 1.6;
      margin-bottom: 0.75rem;
      white-space: pre-wrap;
    }

    .view-session-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-primary);
      text-decoration: none;
      transition: all 0.2s;
    }

    .view-session-link:hover {
      background: var(--bg-hover);
      border-color: #8b5cf6;
      color: #8b5cf6;
    }

    .view-session-link svg {
      flex-shrink: 0;
    }

    /* Task Progress Section (Expandable) */
    .task-progress-section {
      margin: 0.75rem 0;
    }

    .task-progress-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .task-progress-toggle:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.3);
    }

    .task-progress-toggle svg {
      flex-shrink: 0;
      transition: transform 0.2s;
    }

    .task-progress-toggle .message-count {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 400;
    }

    .task-progress-messages {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(139, 92, 246, 0.03);
      border: 1px solid rgba(139, 92, 246, 0.1);
      border-radius: 6px;
      max-height: 400px;
      overflow-y: auto;
    }

    .no-messages,
    .loading-messages {
      padding: 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .child-message {
      padding: 0.75rem;
      background: var(--bg-secondary);
      border-radius: 6px;
      margin-bottom: 0.5rem;
      border-left: 3px solid rgba(139, 92, 246, 0.3);
    }

    .child-message:last-child {
      margin-bottom: 0;
    }

    .child-message-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
    }

    .child-role {
      font-weight: 600;
      color: var(--text-primary);
      text-transform: capitalize;
    }

    .child-time {
      color: var(--text-tertiary);
      font-size: 0.6875rem;
    }

    .child-part {
      margin-top: 0.375rem;
    }

    .child-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
      white-space: pre-wrap;
    }

    /* WebFetch Tool Styles */
    .webfetch-tool-part {
      padding: 1rem;
      background: rgba(59, 130, 246, 0.05);
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      margin: 0.75rem 0;
    }

    .webfetch-tool-part.completed {
      border-left-color: #10b981;
    }

    .webfetch-tool-part.error {
      border-left-color: #ef4444;
    }

    .webfetch-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(59, 130, 246, 0.15);
    }

    .webfetch-favicon {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .webfetch-title-container {
      flex: 1;
      min-width: 0;
    }

    .webfetch-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.375rem 0;
      line-height: 1.3;
    }

    .webfetch-url {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: #3b82f6;
      text-decoration: none;
      word-break: break-all;
      line-height: 1.4;
      transition: color 0.2s;
    }

    .webfetch-url:hover {
      color: #2563eb;
      text-decoration: underline;
    }

    .webfetch-url svg {
      flex-shrink: 0;
    }

    .webfetch-content {
      padding: 0.75rem;
      background: var(--bg-secondary);
      border-radius: 6px;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-primary);
      max-height: 600px;
      overflow-y: auto;
    }

    .webfetch-content h1,
    .webfetch-content h2,
    .webfetch-content h3,
    .webfetch-content h4,
    .webfetch-content h5,
    .webfetch-content h6 {
      color: var(--text-primary);
      margin: 1rem 0 0.5rem 0;
    }

    .webfetch-content h1:first-child,
    .webfetch-content h2:first-child,
    .webfetch-content h3:first-child {
      margin-top: 0;
    }

    .webfetch-content p {
      margin: 0.5rem 0;
    }

    .webfetch-content a {
      color: #3b82f6;
      text-decoration: none;
    }

    .webfetch-content a:hover {
      text-decoration: underline;
    }

    .webfetch-content code {
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      background: var(--bg-tertiary);
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-size: 0.8125rem;
    }

    .webfetch-content pre {
      background: var(--bg-tertiary);
      padding: 0.75rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0.5rem 0;
    }

    .webfetch-content pre code {
      background: none;
      padding: 0;
    }

    .webfetch-content ul,
    .webfetch-content ol {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }

    .webfetch-content li {
      margin: 0.25rem 0;
    }

    .file-part {
      padding: 0.5rem 0.75rem;
      background: rgba(139, 92, 246, 0.05);
      border-left: 3px solid #8b5cf6;
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .file-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .file-mime {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-left: auto;
    }

    .retry-part {
      padding: 0.75rem;
      background: rgba(251, 191, 36, 0.1);
      border-left: 3px solid var(--warning);
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .retry-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--warning);
      margin-bottom: 0.5rem;
    }

    .retry-message {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .step-finish-part {
      padding: 0.75rem;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      font-weight: 500;
    }

    .metric-value {
      font-size: 0.875rem;
      color: var(--text-primary);
      font-weight: 600;
    }

    .patch-part {
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.05);
      border-left: 3px solid #10b981;
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .patch-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: #10b981;
      margin-bottom: 0.5rem;
    }

    .patch-files {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .patch-files li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }

    .message-error {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid var(--error);
      border-radius: 4px;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      color: var(--error);
    }

    .message-error svg {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .message-error strong {
      display: block;
      margin-bottom: 0.25rem;
    }
  `]
})
export class MessageComponent implements OnInit, OnDestroy {
  @Input() message!: MessageWithParts;
  @Output() revert = new EventEmitter<string>();  // Emits message ID to revert to

  expandedTasks = new Set<string>();  // Track which task sections are expanded
  childSessionMessages = new Map<string, Observable<MessageWithParts[]>>();
  private subscriptions = new Subscription();

  constructor(
    private sanitizer: DomSanitizer,
    private stateService: StateService
  ) {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  ngOnInit(): void {
    // Initialize child session message observables for Task tools
    this.message.parts.forEach((part, index) => {
      if (this.isTaskTool(part)) {
        const childSessionId = this.getTaskChildSessionId(part);
        if (childSessionId) {
          this.childSessionMessages.set(
            `${part.messageID}-${index}`,
            this.stateService.getMessagesForSession(childSessionId)
          );
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onRevert(): void {
    if (confirm('This will undo all changes after this point and revert the session. Continue?')) {
      this.revert.emit(this.message.info.id);
    }
  }

  // Type guards and helper methods
  isAssistant(info: MessageInfo): info is AssistantMessageInfo {
    return info.role === 'assistant';
  }

  getAssistantInfo(info: MessageInfo): AssistantMessageInfo {
    return info as AssistantMessageInfo;
  }

  isTextPart(part: MessagePart): part is TextPart {
    return part.type === 'text';
  }

  isReasoningPart(part: MessagePart): part is ReasoningPart {
    return part.type === 'reasoning';
  }

  getTextPartText(part: MessagePart): string {
    return this.isTextPart(part) ? part.text : '';
  }

  getReasoningPartText(part: MessagePart): string {
    return this.isReasoningPart(part) ? part.text : '';
  }

  getTextPart(part: MessagePart): TextPart {
    return part as TextPart;
  }

  getToolPart(part: MessagePart): ToolPart {
    return part as ToolPart;
  }

  getFilePart(part: MessagePart): FilePart {
    return part as FilePart;
  }

  getRetryPart(part: MessagePart): RetryPart {
    return part as RetryPart;
  }

  getStepFinishPart(part: MessagePart): StepFinishPart {
    return part as StepFinishPart;
  }

  getPatchPart(part: MessagePart): PatchPart {
    return part as PatchPart;
  }

  // Formatting methods
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatCost(cost: number): string {
    return `💰 $${cost.toFixed(4)}`;
  }

  formatDuration(start?: number, end?: number): string {
    if (!start || !end) return '';
    const duration = end - start;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  formatText(text: string): string {
    const html = marked.parse(text, { async: false }) as string;
    return this.sanitizer.sanitize(1, html) || '';
  }

  formatJson(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  trackByPartId(index: number, part: MessagePart): string {
    return part.id;
  }

  // Task tool helper methods
  isTaskTool(part: MessagePart): boolean {
    if (part.type !== 'tool') return false;
    const toolPart = part as ToolPart;
    return toolPart.tool === 'Task';
  }

  getTaskAgentName(part: MessagePart): string {
    const toolPart = part as ToolPart;
    return toolPart.state.input?.['subagent_type'] || 'general';
  }

  getTaskDescription(part: MessagePart): string {
    const toolPart = part as ToolPart;
    return toolPart.state.input?.['description'] || 'Working on task...';
  }

  getTaskResult(part: MessagePart): string {
    const toolPart = part as ToolPart;
    if (!toolPart.state.output) return '';

    try {
      const output = typeof toolPart.state.output === 'string'
        ? JSON.parse(toolPart.state.output)
        : toolPart.state.output;
      return output?.result || output?.['result'] || toolPart.state.output;
    } catch {
      return toolPart.state.output;
    }
  }

  getTaskChildSessionId(part: MessagePart): string | null {
    const toolPart = part as ToolPart;
    if (!toolPart.state.output) return null;

    try {
      const output = typeof toolPart.state.output === 'string'
        ? JSON.parse(toolPart.state.output)
        : toolPart.state.output;
      return output?.sessionID || output?.['sessionID'] || null;
    } catch {
      return null;
    }
  }

  getTaskKey(part: MessagePart, index: number): string {
    return `${part.messageID}-${index}`;
  }

  isTaskExpanded(part: MessagePart, index: number): boolean {
    return this.expandedTasks.has(this.getTaskKey(part, index));
  }

  toggleTaskExpanded(part: MessagePart, index: number): void {
    const key = this.getTaskKey(part, index);
    if (this.expandedTasks.has(key)) {
      this.expandedTasks.delete(key);
    } else {
      this.expandedTasks.add(key);
    }
  }

  getChildMessages(part: MessagePart, index: number): Observable<MessageWithParts[]> | null {
    return this.childSessionMessages.get(this.getTaskKey(part, index)) || null;
  }

  // ========== WebFetch Tool Helper Methods ==========

  isWebFetchTool(part: MessagePart): boolean {
    if (part.type !== 'tool') return false;
    const toolPart = part as ToolPart;
    return toolPart.tool === 'WebFetch';
  }

  getWebFetchURL(part: MessagePart): string {
    const toolPart = part as ToolPart;
    return toolPart.state.input?.['url'] || '';
  }

  getWebFetchTitle(part: MessagePart): string {
    const toolPart = part as ToolPart;
    const url = this.getWebFetchURL(part);

    // Try to extract title from output or use URL
    if (toolPart.state.output) {
      try {
        const output = typeof toolPart.state.output === 'string'
          ? JSON.parse(toolPart.state.output)
          : toolPart.state.output;
        if (output?.title) return output.title;
      } catch {
        // Fallback to URL
      }
    }

    // Extract domain from URL as fallback
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  getWebFetchContent(part: MessagePart): string {
    const toolPart = part as ToolPart;
    if (!toolPart.state.output) return '';

    return toolPart.state.output;
  }

  getFaviconURL(url: string): string {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return '';
    }
  }

  getChildMessageCount(messages: MessageWithParts[] | null): number {
    return messages?.length || 0;
  }
}
