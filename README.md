# grokked

A Grok-powered AI coding assistant CLI — works like Claude Code but runs on [xAI Grok](https://x.ai).

Use at your own risk, no guarantees, no expectations, have fun...

## Features

- 100% vibed with Claude code CLI in ~10 prompts and 0% code review
- Tested on Powershell, may run on bash
- Works fine for the development basics, stuborn as hell trying to get it to do other things
- Streaming responses
- Agentic tool loop — reads files, edits code, runs shell commands, searches the codebase
- Per-operation approval prompts (bash commands, file writes, edits)
- Session-wide auto-approve for edits
- Conversation history with multi-turn context
- Session context persistence — AI summary saved on exit, restored on next start
- Slash command autocomplete — type `/` to see a filtered command list; Tab to complete, Enter to run
- Switch models mid-session with `/model`
- Attach clipboard screenshots with `/clip`
- Custom system prompt via `GROKKED.md` in any project directory

## Requirements

- Node.js >= 18
- An [xAI API key](https://console.x.ai)

## Installation

### From GitHub (recommended)

```bash
npm install -g git+https://github.com/thekoos/grokked
```

> The pre-compiled `dist/` is included in the repo so no build step is needed on install.


### From source

```bash
git clone https://github.com/thekoos/grokked
cd grokked
npm install
npm run build
npm link
```

### Global install (local dev)

If you've cloned the repo and want `grokked` available system-wide:

```bash
npm run build
npm link
```

To uninstall: `npm unlink -g grokked`

## Configuration

Copy `.env.example` to `.env` in the directory you want to use grokked from:

```bash
cp .env.example .env
```

Edit `.env`:

```env
XAI_API_KEY=your-xai-api-key-here
GROK_MODEL=grok-4-0709
GROK_MODELS=grok-3,grok-3-mini,grok-4-0709,grok-4-1-fast-reasoning,grok-4-1-fast-non-reasoning,grok-4-fast-reasoning,grok-4-fast-non-reasoning,grok-4.20-0309-reasoning,grok-4.20-0309-non-reasoning
```

- `GROK_MODEL` — the model to use on startup.
- `GROK_MODELS` — comma-separated list of models available via the `/model` command. If omitted, only the startup model is listed.

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

| Command   | Description                                        |
|-----------|----------------------------------------------------||
| `/help`   | Show available commands                            |
| `/clear`  | Clear the screen (keeps conversation history)      |
| `/reset`  | Clear the screen, conversation history, and saved context |
| `/model`  | Show model list and select one for the session     |
| `/clip`   | Attach a region screenshot to your next message    |
| `/exit`   | Exit grokked                                       |

### Slash command autocomplete

Type `/` to see the full command list with descriptions. The list filters as you type.

- **Tab** — fill in the command when there is exactly one match
- **Enter** — run the command

### Switching models

Use `/model` to switch the active model without restarting:

1. Type `/model` and press Enter.
2. A numbered list of models from `GROK_MODELS` in your `.env` is shown.
3. Type the number next to the model you want and press Enter.

The switch takes effect immediately for all subsequent messages in the session. The startup model (`GROK_MODEL`) is restored on next launch.

`Ctrl+C` or `Ctrl+D` also exits cleanly (session context is saved first).

## Session context

When you exit grokked (`/exit`, `Ctrl+C`, or `Ctrl+D`), it generates an AI summary of the session and saves it to `.grokked/context.md` in your working directory. On the next start, that summary is prepended to the system prompt so Grok remembers what you were working on.

Use `/reset` to clear both the in-memory history and the saved context file and start fresh.

## Screenshot

1. Press **Win+Shift+S** to open the Windows Snip & Sketch overlay and drag to select a region. The capture is placed in your clipboard automatically.
2. Include `/clip` anywhere in your message to attach it:

```
What is this error? /clip
```

or as a standalone command:

```
/clip
```

grokked reads the image directly from the clipboard — no overlay window, no focus change, no antivirus issues.

> **macOS:** use `screencapture -i` (built in). **Linux:** requires `scrot` (`sudo apt install scrot`).

## Tools

Grokked has access to the following tools. Each tool call is shown inline above the input box as it executes.

| Tool         | Description                                                        |
|--------------|--------------------------------------------------------------------||
| `bash`       | Run a shell command (requires approval per command)                |
| `read_file`  | Read a file with optional line offset and limit                    |
| `write_file` | Create or overwrite a file (requires approval)                     |
| `edit_file`  | Precise find-and-replace within a file (requires approval)         |
| `search_replace_all` | Replace every occurrence of a string in a file (requires approval) |
| `list_dir`   | List directory contents with type indicators and file sizes        |
| `glob`       | Find files by pattern (e.g. `**/*.ts`)                             |
| `grep`       | Search file contents with a regex                                  |

### Approval prompts

- **bash** — prompted per command: `[1] Yes  [2] No`
- **write_file / edit_file** — prompted per operation: `[1] Yes  [2] Yes to all  [3] No`

Choosing `Yes to all` auto-approves all subsequent file edits for the rest of the session.

## Development

```bash
npm run dev        # run with tsx watch (hot reload)
npm run build      # compile TypeScript to dist/
```

### Testing

Grokked uses [Vitest](https://vitest.dev) for unit testing. Tests cover the core modules: config loading, response formatting, repl logic, and all tools (bash, read, write, edit, glob, grep).

```bash
npm test           # run the full test suite once
npm run test:watch # re-run tests automatically on file changes
```

Tests are also run automatically on every push and pull request via GitHub Actions (Node.js 18, 20, and 22).

## License

MIT — see [LICENSE](./LICENSE)
