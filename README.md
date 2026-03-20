# grokked

A Grok-powered AI coding assistant CLI — works like Claude Code but runs on [xAI Grok](https://x.ai).

## Features

- Streaming responses with a fixed input box pinned to the bottom of the terminal
- Agentic tool loop — reads files, edits code, runs shell commands, searches the codebase
- Per-operation approval prompts (bash commands, file writes, edits)
- Session-wide auto-approve for edits
- Conversation history with multi-turn context
- Custom system prompt via `GROKKED.md` in any project directory

## Requirements

- Node.js >= 18
- An [xAI API key](https://console.x.ai)

## Installation

### From GitHub (recommended)

```bash
npm install -g git+https://github.com/<your-username>/grokked
```

> TypeScript is compiled automatically during install via the `prepare` script.

### From source

```bash
git clone https://github.com/<your-username>/grokked
cd grokked
npm install
npm run build
npm link
```

## Configuration

Copy `.env.example` to `.env` in the directory you want to use grokked from:

```bash
cp .env.example .env
```

Edit `.env`:

```env
XAI_API_KEY=your-xai-api-key-here
GROK_MODEL=grok-3
```

Available models: `grok-3`, `grok-3-mini`, `grok-2`

### Custom system prompt

Create a `GROKKED.md` file in any project directory to prepend custom instructions to the system prompt:

```markdown
# My Project

This is a Next.js 14 app using Postgres. Always use TypeScript strict mode.
```

## Usage

```bash
grokked
```

Start typing — responses stream above the input box in real time.

## Commands

| Command  | Description                        |
|----------|------------------------------------|
| `/help`  | Show available commands             |
| `/clear` | Clear conversation history          |
| `/model` | Show the current model              |
| `/exit`  | Exit grokked                        |

`Ctrl+C` or `Ctrl+D` also exits cleanly.

## Tools

Grokked has access to the following tools. Each tool call is shown inline above the input box as it executes.

| Tool         | Description                                                        |
|--------------|--------------------------------------------------------------------|
| `bash`       | Run a shell command (requires approval per command)                |
| `read_file`  | Read a file with optional line offset and limit                    |
| `write_file` | Create or overwrite a file (requires approval)                     |
| `edit_file`  | Precise find-and-replace within a file (requires approval)         |
| `glob`       | Find files by pattern (e.g. `**/*.ts`)                             |
| `grep`       | Search file contents with a regex                                  |

### Approval prompts

- **bash** — prompted per command: `[1] Yes  [2] No`
- **write_file / edit_file** — prompted per operation: `[1] Yes  [2] Yes to all  [3] No`

Choosing `Yes to all` auto-approves all subsequent file edits for the rest of the session.

## Development

```bash
npm run dev       # run with tsx watch (hot reload)
npm test          # run test suite
npm run test:watch # run tests in watch mode
npm run build     # compile TypeScript to dist/
```

## License

MIT — see [LICENSE](./LICENSE)
