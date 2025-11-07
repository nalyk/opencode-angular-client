# OpenCode Angular Client

A modern, feature-rich web interface for the OpenCode AI development tool. Built with Angular 19, this standalone frontend provides an intuitive chat-based interface for AI-assisted software development with real-time streaming, multi-project support, and advanced session management.

## ✨ Features

### Core Capabilities
- **Real-time AI Interaction** - Live message streaming with Server-Sent Events (SSE)
- **Multi-Project Support** - Manage multiple codebases simultaneously
- **Session Management** - Create, fork, share, and organize AI coding sessions
- **Command Palette** - Quick access to slash commands and operations (Cmd/Ctrl+K)
- **File Watcher** - Real-time notifications for file changes in your codebase
- **Permission System** - Approve or reject AI tool executions with fine-grained control

### Advanced Features
- **Session Forking** - Branch off from any message to explore alternatives
- **Session Hierarchies** - Visualize parent-child relationships between sessions
- **AI Codebase Analysis** - Let AI analyze and understand your project structure
- **Conversation Compaction** - Summarize long conversations to free up context
- **Shell Integration** - Execute shell commands directly from the interface
- **Diff Viewer** - Review all file changes made during a session
- **Settings Management** - Configure AI providers, models, and authentication

### User Experience
- **Modern UI** - Clean, responsive design with dark mode support
- **Markdown Rendering** - Rich text display with syntax highlighting
- **Collapsible Sections** - Reasoning blocks and tool outputs for focused reading
- **Toast Notifications** - Non-intrusive alerts for file changes and system events
- **Keyboard Shortcuts** - Efficient navigation and command execution

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ and npm 10+
- **OpenCode CLI** installed globally

Install OpenCode CLI:
```bash
npm install -g opencode-ai
```

For other installation methods, see [OpenCode documentation](https://docs.opencode.com).

### Installation

```bash
# Clone the repository (if not already done)
git clone https://github.com/nalyk/opencode-angular-client.git
cd opencode-angular-client

# Install dependencies
npm install
```

### Running the Application

**Step 1: Start the OpenCode Backend**

In a separate terminal, start the OpenCode backend server on port 3000:

```bash
opencode serve --port 3000
```

The backend server must be running before starting the Angular client.

**Step 2: Start the Angular Client**

In the project directory:

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:4200
- **Backend**: http://localhost:3000 (proxied)

### Troubleshooting

If you see connection errors like `ECONNREFUSED 127.0.0.1:3000`:
1. Verify the OpenCode backend is running on port 3000
2. Check that the backend started successfully without errors
3. Ensure no firewall is blocking the connection

## 📚 Usage

### Creating a Session

1. Click "New Session" in the sidebar
2. Start typing your request in the chat input
3. AI will respond in real-time with streaming text

### Using Commands

Press `Cmd/Ctrl+K` to open the command palette and discover available commands:
- `/init` - Analyze codebase structure
- `/summarize` - Compact conversation history
- Custom slash commands defined in your project

### Managing Projects

1. Click the project switcher in the sidebar
2. Select a different codebase
3. Sessions can be global or project-specific

### Session Features

- **Fork Session**: Right-click any message to create a branching point
- **Share Session**: Generate a shareable link (if configured)
- **View Diffs**: See all file changes in the current session
- **Revert**: Undo conversation to a specific message

### Permissions

When AI needs to execute operations, you'll see a permission dialog:
- **Once** - Allow this time only
- **Always** - Remember and auto-approve
- **Reject** - Deny the operation

## 🏗️ Architecture

This application follows a reactive architecture pattern:

### Core Services

- **StateService** - Centralized state management using RxJS BehaviorSubjects
- **SseService** - Real-time event stream with auto-reconnection
- **ApiService** - REST API client for all backend operations
- **ToastService** - Notification system for user feedback

### Key Components

- **SessionDetailComponent** - Main chat interface
- **MessageComponent** - Rich message rendering with markdown and syntax highlighting
- **CommandPaletteComponent** - Keyboard-driven command execution
- **SettingsComponent** - Configuration management
- **ProjectSwitcherComponent** - Multi-project navigation

### Data Flow

```
User Action → API Request → Backend Processing
                                ↓
                          SSE Event Stream
                                ↓
Backend Events → SseService → StateService → Components (Real-time UI Update)
```

For detailed architecture information, see [CLAUDE.md](./CLAUDE.md).

## 🛠️ Development

### Build Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Watch mode for continuous compilation
npm run watch

# Run tests (when available)
npm test
```

### Project Structure

```
src/app/
├── components/       # UI components (header, sidebar, session-detail, etc.)
├── services/         # Core services (state, sse, api, toast)
├── models/           # TypeScript interfaces and types
├── app.component.ts  # Root component with SSE integration
├── app.routes.ts     # Route definitions
└── app.config.ts     # Application configuration

proxy.conf.mjs        # API proxy configuration
docs/                 # Development documentation
```

### Key Technologies

- **Angular 19** - Modern standalone components
- **RxJS 7** - Reactive state management
- **TypeScript 5.6** - Strict type safety
- **marked 15** - Markdown parsing
- **highlight.js 11** - Code syntax highlighting
- **diff 8** - Diff generation for file changes
- **SCSS** - Styling with CSS variables

## 🔧 Configuration

### API Proxy

The development proxy (`proxy.conf.mjs`) routes these endpoints to the backend:

- `/session` - Session operations
- `/event` - SSE event stream
- `/config` - Configuration
- `/file` - File operations
- `/find` - Search operations
- `/mcp` - MCP status
- `/lsp` - LSP status
- `/formatter` - Formatter status
- `/project` - Project management
- `/auth` - Authentication

The proxy intelligently distinguishes between:
- API calls (JSON) → proxied to backend
- Page navigation (HTML) → served by Angular

This enables direct URL access like `http://localhost:4200/session/ses_xxx`.

## 📖 API Reference

The client communicates with the OpenCode backend via REST and SSE:

### REST Endpoints

- **Sessions**: Create, read, update, delete, fork, share
- **Messages**: Send, retrieve, revert
- **Todos**: Get todo lists
- **Diffs**: View file changes
- **Config**: Manage settings and providers
- **Files**: List, read, status
- **Commands**: Execute slash commands
- **Shell**: Run shell commands
- **Projects**: List and switch projects
- **Auth**: Manage authentication providers

### SSE Events

Real-time events for:
- Message parts (streaming text)
- Message updates (status changes)
- Session updates (title, status)
- Todo updates (live todo list)
- Permissions (approval requests)
- File watcher (file change notifications)
- Errors (session failures)

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. Code follows Angular style guide
2. TypeScript strict mode compliance
3. All components are standalone
4. Proper RxJS subscription cleanup
5. Add appropriate type definitions

## 📝 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive developer guide for working with Claude Code
- **[docs/](./docs/)** - Implementation plans and specifications
  - MASTER_PLAN.md - Overall architecture plan
  - PHASE1_FIXES.md - Initial fixes
  - PHASE2_IMPLEMENTATION.md - Feature implementations
  - openapi-specs.json - API specifications

## 🔒 Security

- All API requests go through the configured proxy
- Authentication managed through backend
- Permission system for tool execution approval
- File operations require explicit user consent

## 📊 Performance

- **Lazy loading** - Routes loaded on demand
- **SSE streaming** - Efficient real-time updates
- **Auto-reconnection** - Resilient connection handling (exponential backoff)
- **Bundle optimization** - Production builds use aggressive optimization

## 🐛 Known Issues

See the [docs/](./docs/) folder for current implementation status and known limitations.

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- [Angular](https://angular.io/)
- [RxJS](https://rxjs.dev/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)
- [OpenCode](https://opencode.com/)

---

**Need Help?**
- Check [CLAUDE.md](./CLAUDE.md) for development guidance
- Review [docs/](./docs/) for implementation details
- Ensure OpenCode backend is running on port 3000
