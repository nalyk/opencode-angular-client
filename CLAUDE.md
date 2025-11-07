# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Platform Support

This application supports both **web browsers** and **native Android** platforms:

- **Web**: Standard Angular development with dev server and proxy configuration
- **Android**: Native Android app built with Capacitor (see [ANDROID.md](./ANDROID.md) for build instructions)

The app automatically detects the platform and adjusts its behavior:
- On web: uses proxy to connect to localhost:3000
- On Android: requires configurable server URL via the server configuration screen

## Development Commands

### Web Development

```bash
# Install dependencies
npm install

# Start development server (requires backend server running first!)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Watch mode for development
npm run watch
```

### Android Development

```bash
# Build and sync to Android
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK (from android directory)
cd android && ./gradlew assembleDebug
```

For complete Android build instructions, see [ANDROID.md](./ANDROID.md).

### Backend Server Requirement

**CRITICAL**: The Angular client MUST have the OpenCode backend server running BEFORE starting development.

This is a standalone frontend that requires a separate OpenCode backend. The backend must be running on port 3000:

```bash
# In a separate terminal, run OpenCode backend:
opencode serve --port 3000
```

The Angular dev server (port 4200) proxies all API requests to `http://localhost:3000` via `proxy.conf.mjs`. If you see `ECONNREFUSED 127.0.0.1:3000` errors, verify the backend is running on port 3000.

**IMPORTANT**: The proxy uses a `bypass` function to distinguish between:
- **API calls** (XHR/fetch with JSON Accept header) → proxied to backend
- **Browser navigation** (HTML Accept header) → serves Angular app

This allows direct URL access like `http://localhost:4200/session/ses_xxx` to work correctly.

**Note**: You need OpenCode CLI installed. Install it via npm: `npm install -g opencode-ai` or follow OpenCode installation instructions.

## Architecture Overview (v3.0)

This is a modern Angular 19+ application built with standalone components and TypeScript strict mode. The architecture follows a reactive pattern using RxJS for state management and Server-Sent Events (SSE) for real-time updates.

### Core Design Pattern: Reactive State Management

The application uses a centralized state management pattern where:

1. **AppComponent** (src/app/app.component.ts:72) - Root component that:
   - Initializes SSE connection on startup (connects to `/event` endpoint)
   - Routes all SSE events to StateService
   - Manages global UI layout (header, sidebar, content)
   - Handles permission dialogs
   - Displays toast notifications
   - Reads `directory` query param for multi-project support

2. **SseService v3.0** (src/app/services/sse.service.ts:28) - Real-time event stream:
   - Connects to `/event` endpoint (NOT `/api/event` - backend serves SSE directly)
   - Parses incoming Server-Sent Events
   - Exposes typed event streams as Observables
   - Provides connection state monitoring
   - **Auto-reconnection**: Exponential backoff (1s to 30s max), up to 10 attempts
   - **Event streams**: messageParts$, messageUpdates$, sessionUpdates$, todoUpdates$, permissions$, sessionErrors$, fileWatcher$

3. **StateService v3.0** (src/app/services/state.service.ts:21) - Central state hub:
   - Manages ALL application state using RxJS BehaviorSubjects
   - **Session state**: sessions, current session
   - **Message state**: messages (keyed by sessionID), with streaming support
   - **Todo state**: todos (keyed by sessionID)
   - **Permission state**: permissions (keyed by sessionID)
   - **Project state**: projects, current project, current directory
   - **UI state**: loading, sidebar open, connection state
   - **Critical method**: `updateMessagePart()` - handles streaming message parts with deltas
   - **Critical method**: `mergePart()` - intelligently merges incremental text updates
   - State changes are broadcast via Observable streams

4. **ApiService** (src/app/services/api.service.ts:11) - REST API client:
   - Handles all HTTP requests to backend
   - Base URL adapts based on platform:
     - **Web**: empty string (relies on proxy)
     - **Android**: uses configured server URL from ServerConfigService
   - Returns Observables for reactive composition
   - **Session endpoints**: CRUD, fork, share/unshare, abort, init, summarize
   - **Message endpoints**: get, send, revert, unrevert
   - **Todo endpoints**: get todos
   - **Diff endpoints**: get session diffs
   - **Config endpoints**: get/update config, providers, agents
   - **File endpoints**: list, read, status
   - **Search endpoints**: file search, text search
   - **Permission endpoints**: respond to permissions
   - **Command endpoints**: get commands, execute command
   - **Shell endpoints**: execute shell commands
   - **Hierarchy endpoints**: get session children
   - **Status endpoints**: MCP, LSP, Formatter status
   - **Project endpoints**: get projects, current project
   - **Auth endpoints**: get providers, update credentials, test auth

5. **ServerConfigService** (src/app/services/server-config.service.ts) - Server configuration management:
   - Manages OpenCode server URL configuration
   - **Platform detection**: Automatically detects native vs web platform
   - **Persistent storage**: Uses Capacitor Preferences for native platforms
   - **Connection testing**: Validates server connectivity before saving
   - **URL validation**: Ensures proper URL format (http/https)
   - **Default behavior**:
     - Web: defaults to localhost:3000
     - Android: requires user configuration
   - Critical for Android app functionality

6. **ToastService** (src/app/services/toast.service.ts:24) - Notification system:
   - Manages toast notifications for file changes and system events
   - Auto-dismissal with configurable duration
   - Action buttons support
   - Types: info, success, warning, error
   - File change notifications with reload action

### Message Streaming Architecture

The most complex part of this application is the message streaming system:

- Backend sends `message.part.updated` events via SSE with incremental `delta` text
- `SseService` emits these as `messageParts$` Observable
- `AppComponent` routes them to `StateService.updateMessagePart()`
- `StateService.mergePart()` intelligently merges deltas into existing message parts
- Components subscribe to `StateService.messages$` and see real-time updates

**Key insight**: Message parts can be updated many times per second during streaming. The merge logic handles:
- Text content parts: append deltas to existing text
- Reasoning parts: append deltas to reasoning text
- Tool use parts: merge state updates (running, success, error)

### Data Flow

```
Backend SSE (/event)
  ↓
SseService (parses events, creates typed Observables, auto-reconnects)
  ↓
AppComponent (subscribes to all event streams)
  ↓
StateService (merges into centralized state, emits updates)
  ↓
Components (subscribe to state$, render UI)
  ↓
ApiService (user actions trigger HTTP requests)
  ↓
Backend REST API
  ↓
Backend emits SSE events → cycle continues
```

### Component Architecture

All components are standalone (Angular 19 style):

#### Core UI Components

- **HeaderComponent** - Session controls, model selector, sidebar toggle
- **SidebarComponent** - Session list, project switcher, create new session
- **HomeComponent** - Landing page with features and recent sessions
- **SessionDetailComponent** - Main chat interface for a session
- **MessageComponent** - Renders individual messages with support for:
  - Text content (markdown rendered with `marked`, code highlighted with `highlight.js`)
  - Reasoning blocks (collapsible thinking sections)
  - Tool use/results (collapsible, formatted output)

#### Feature Components

- **CommandPaletteComponent** (src/app/components/command-palette/command-palette.component.ts) - Command execution interface
  - Keyboard shortcut activation
  - Command search and execution
  - Supports slash commands from backend

- **SessionTreeComponent** (src/app/components/session-tree/session-tree.component.ts) - Hierarchical session view
  - Displays parent-child session relationships
  - Session forking visualization

- **ProjectSwitcherComponent** (src/app/components/project-switcher/project-switcher.component.ts) - Multi-project management
  - Switch between different codebases
  - Global vs project-specific sessions

- **SettingsComponent** (src/app/components/settings/settings.component.ts) - Configuration management
  - Model configuration
  - Provider settings
  - Auth provider management
  - MCP/LSP/Formatter status

- **ShellTerminalComponent** (src/app/components/shell-terminal/shell-terminal.component.ts) - Shell command execution
  - Interactive terminal for executing commands
  - Integration with AI assistant

- **SessionInitDialogComponent** (src/app/components/session-init-dialog/session-init-dialog.component.ts) - AI codebase analysis
  - Triggers AI to analyze and understand the codebase
  - Provider and model selection for initialization

- **SessionSummarizeDialogComponent** (src/app/components/session-summarize-dialog/session-summarize-dialog.component.ts) - Conversation compaction
  - Reduces message history to free up context
  - Provider and model selection for summarization

- **SessionDiffComponent** (src/app/components/session-diff/session-diff.component.ts) - File change visualization
  - Shows diffs for all file changes in a session
  - Uses `diff` library for diff generation

- **PermissionDialogComponent** (src/app/components/permission-dialog/permission-dialog.component.ts) - Tool execution approval
  - Shows when AI needs permission for operations
  - Options: once, always, reject

- **ToastContainerComponent** (src/app/components/toast-container/toast-container.component.ts) - Notification display
  - Renders toast notifications
  - Auto-dismissal and manual dismiss
  - Action buttons

- **ModelSelectorComponent** - Model selection UI with provider grouping

- **ServerConfigComponent** (src/app/components/server-config/server-config.component.ts) - Server URL configuration
  - **Android-specific**: Allows configuring OpenCode server URL
  - Connection testing before saving
  - First-run setup screen on native platforms
  - Persistent configuration using Capacitor Preferences

### TypeScript Configuration

- **Strict mode enabled** - all strict type checking flags are on
- **Path alias**: `@/*` maps to `./src/*`
- **ES2022** target for modern JavaScript features
- **Standalone component mode** - no NgModules
- **Angular strict templates** enabled

### API Proxy Configuration (proxy.conf.mjs)

The `proxy.conf.mjs` routes these paths to `http://localhost:3000`:
- `/session` - Session CRUD and message operations
- `/event` - SSE event stream
- `/config` - Configuration management
- `/file` - File operations
- `/agent` - Agent operations
- `/mcp` - MCP operations
- `/find` - Search operations (file and text)
- `/lsp` - LSP status
- `/formatter` - Formatter status
- `/project` - Project management
- `/auth` - Authentication provider management

**Important**:
- API paths in code should NOT include `/api` prefix (e.g., use `/session/123`, not `/api/session/123`)
- The proxy uses `bypass` function to allow Angular routing for HTML navigation while proxying API calls
- This enables direct URL access (e.g., `http://localhost:4200/session/ses_xxx`) to work correctly
- SSE endpoint is `/event` (proxied to backend's `/event`)

### Routes

The application has 4 main routes (defined in src/app/app.routes.ts:3):
- `/` - Home page (HomeComponent)
- `/session/:id` - Session detail view (SessionDetailComponent)
- `/settings` - Settings page (SettingsComponent)
- `/server-config` - Server configuration (ServerConfigComponent) - **Android-specific**
- All components are lazy-loaded for better performance

**Note**: On Android, the app automatically redirects to `/server-config` on first launch if no server URL is configured.

## Common Patterns

### Adding a New Event Type

1. Add interface in `src/app/models/event.model.ts`
2. Add to `ServerEventType` union type
3. Create type guard function
4. Add Observable stream in `SseService` with filter and shareReplay
5. Subscribe to it in `AppComponent.ngOnInit()`
6. Route to appropriate `StateService` method

### Adding a New Component

Components are standalone. Template:

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-your-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './your-component.component.html',
  styleUrls: ['./your-component.component.scss']
})
export class YourComponent { }
```

### Subscribing to State

Always use the async pipe in templates when possible:

```typescript
sessions$ = this.stateService.sessions$;
```

```html
<div *ngFor="let session of sessions$ | async">
```

Or subscribe in component (remember to unsubscribe):

```typescript
private subscriptions = new Subscription();

ngOnInit() {
  this.subscriptions.add(
    this.stateService.sessions$.subscribe(sessions => {
      // handle sessions
    })
  );
}

ngOnDestroy() {
  this.subscriptions.unsubscribe();
}
```

### Adding a New API Endpoint

1. Add method to `ApiService` (src/app/services/api.service.ts)
2. If it's a new base path, add to `proxy.conf.mjs`
3. Define request/response types in appropriate model file
4. Return `Observable<T>` for reactive composition
5. Use `HttpParams` for query parameters

### Multi-Project Support

The app supports multiple projects (codebases):
- Projects retrieved via `ApiService.getProjects()`
- Current project stored in `StateService.currentProject$`
- Directory context passed via query param: `?directory=/path/to/project`
- Sessions can be project-specific or global
- Many API endpoints accept optional `directory` param

## Important Implementation Details

### SSE Connection Lifecycle

- Connection starts in `AppComponent.ngOnInit()`
- Connects to `/event` endpoint (not `/api/event`)
- First event received is always `server.connected`
- Connection state tracked via `SseService.connectionState$Observable`
- **Auto-reconnect** with exponential backoff (1s → 2s → 4s → ... → 30s max)
- Up to 10 reconnection attempts before giving up
- Cleanup in `AppComponent.ngOnDestroy()`

### Message Part Delta Merging

When a `message.part.updated` event includes a `delta`:
- For text content: append delta to existing text
- For reasoning content: append delta to reasoning text
- For tool parts: merge state (running, success, error)
- The `mergePart()` method in StateService handles all merge logic
- CRITICAL: Don't replace text, always append deltas!

### Session State Management

- Sessions stored in Map keyed by session ID
- Current session tracked separately via `currentSessionSubject`
- When session deleted, remove associated messages, todos, and permissions
- Session updates merge with existing session data (don't replace entirely)
- Sessions can have parent-child relationships (forking)

### Permission System

- Permissions requested when AI needs approval for operations
- Flows: SSE event → StateService → PermissionDialog
- User responds: once (single use), always (remember), reject
- Response sent via `ApiService.respondToPermission()`
- Permission removed from state after response

### File Watcher Integration

- Backend monitors file changes in codebase
- SSE events: `file.watcher.updated` with event type (add, change, unlink)
- Toast notifications shown for file changes
- Change events offer "Reload" action to refresh the page

### Command System

- Slash commands loaded from backend via `ApiService.getCommands()`
- Commands can be subtasks or regular commands
- Execution via `ApiService.executeCommand()` with optional agent/model
- Command palette provides UI for discovery and execution

### Session Features

- **Fork**: Create new session from specific message
- **Share**: Generate shareable link (if backend supports)
- **Init**: AI analyzes codebase to understand project structure
- **Summarize**: Compact conversation history to reduce token usage
- **Revert**: Undo to specific message
- **Unrevert**: Restore reverted messages
- **Abort**: Stop ongoing AI processing

## Technology Stack Details

- **Angular 19** - Latest version with standalone components
- **RxJS 7** - Observables for reactive state management
- **TypeScript 5.6** - Strict mode, modern features
- **marked 15** - Markdown parsing for message content
- **highlight.js 11** - Syntax highlighting for code blocks
- **diff 8** - Diff generation for file changes
- **SCSS** - CSS preprocessor with CSS variables for theming

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── header/                 # Top navigation
│   │   ├── sidebar/                # Session list + project switcher
│   │   ├── home/                   # Landing page
│   │   ├── session-detail/         # Chat interface
│   │   ├── message/                # Message renderer
│   │   ├── command-palette/        # Command execution UI
│   │   ├── session-tree/           # Hierarchical session view
│   │   ├── project-switcher/       # Multi-project switcher
│   │   ├── settings/               # Configuration management
│   │   ├── shell-terminal/         # Shell command execution
│   │   ├── session-init-dialog/    # AI codebase analysis
│   │   ├── session-summarize-dialog/ # Conversation compaction
│   │   ├── session-diff/           # File change visualization
│   │   ├── permission-dialog/      # Tool execution approval
│   │   ├── toast-container/        # Notification display
│   │   └── model-selector/         # Model selection UI
│   ├── services/
│   │   ├── api.service.ts          # REST API client
│   │   ├── sse.service.ts          # SSE integration (v3.0)
│   │   ├── state.service.ts        # State management (v3.0)
│   │   └── toast.service.ts        # Toast notifications
│   ├── models/
│   │   ├── session.model.ts        # Session, Message, Todo types
│   │   ├── config.model.ts         # Config, Provider types
│   │   ├── file.model.ts           # File, FileNode types
│   │   ├── event.model.ts          # SSE event types
│   │   └── command.model.ts        # Command types
│   ├── app.component.ts            # Root component (v3.0)
│   ├── app.config.ts               # App configuration
│   └── app.routes.ts               # Route definitions
├── styles.scss                     # Global styles
├── index.html                      # HTML entry point
└── main.ts                         # Application bootstrap

docs/                               # Development documentation
  ├── MASTER_PLAN.md
  ├── PHASE1_FIXES.md
  ├── PHASE2_IMPLEMENTATION.md
  ├── PHASE2.4_IMPLEMENTATION.md
  ├── ROUTING_FIX.md
  ├── SUMMARIZE_FIX.md
  └── openapi-specs.json
```

## Key Files Reference

- **State management**: src/app/services/state.service.ts:21
- **SSE integration**: src/app/services/sse.service.ts:28
- **API client**: src/app/services/api.service.ts:11
- **Root component**: src/app/app.component.ts:72
- **Event types**: src/app/models/event.model.ts:1
- **Session types**: src/app/models/session.model.ts:1
- **Proxy config**: proxy.conf.mjs:1
- **Routes**: src/app/app.routes.ts:3

## Troubleshooting

### Backend Connection Issues
- Verify OpenCode backend is running on port 3000
- Check proxy configuration in `proxy.conf.mjs`
- Look for SSE connection state in browser console
- SSE auto-reconnects up to 10 times with exponential backoff

### Streaming Not Working
- Check `StateService.mergePart()` logic
- Verify delta accumulation in console logs
- Ensure message exists before part updates arrive

### State Not Updating
- Check if component subscribed to correct Observable
- Verify SSE events arriving (check browser console)
- Ensure `AppComponent` routes events to `StateService`

### Permission Dialogs Not Showing
- Check `AppComponent` subscription to `permissions$`
- Verify `PermissionDialogComponent` rendered in template
- Check backend is sending `permission.updated` events
