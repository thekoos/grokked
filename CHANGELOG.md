# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

### Added
- Slash command autocomplete — typing `/` pops a filtered command list above the input box
- **Tab completion** — pressing Tab fills in the command when exactly one match is shown; press Enter to run
- `/clip` command — attach a clipboard screenshot (Win+Shift+S) to your next message
- `/model` command — shows a numbered list of models from `GROK_MODELS` in `.env`; type a number and press Enter to switch for the session
- `GROK_MODELS` env var — comma-separated list of models available via `/model`; `.env.example` updated with the current xAI model lineup

### Fixed
- Command output (`/help`, `/model`, etc.) not appearing — `readLine()` was clearing the `cursorInBox` flag before returning, causing `enterOutputMode()` to skip repositioning the cursor on platforms where the cursor position was not reliably preserved; flag is now kept set so the first write after any input always repositions correctly
- Session context not saving on `Ctrl+C` — raw mode was intercepting the keypress before the SIGINT handler could run; now routes through the registered shutdown callback so the AI summary is always written
- `read_file` result preview suppressed in terminal output — the header line is sufficient
- HTML files written via `write_file` rendering as plain text — model instructed never to wrap file content in markdown code fences and never to entity-encode HTML tags

### Tests
- Added `tests/repl.test.ts` — 11 tests covering `stripImagesFromHistory` and `runAgentLoop` (tool execution, JSON parse fallback, multi-tool turns, history rollback)

---

## [0.2.0] — 2026-03-23

### Added
- Thinking spinner streams reasoning model output on the spinner line in real time
- Working directory shown in the bottom border (`Folder: ...`)
- Colored line-by-line diff shown before approving file edits
- `list_dir` tool — lists directory contents with type indicators and file sizes
- `search_replace_all` tool — replaces every occurrence of a string in a file
- `/clear` clears the screen only; `/reset` clears screen and conversation history
- Session context persistence — AI-generated summary saved on exit, loaded on next launch
- Markdown code fences render as visual blocks (dim rule + cyan content)
- Input box stays visible while the agent streams its response
- Resize debouncing — terminal redraws cleanly after resizing stops

### Fixed
- Input box flickering/disappearing between prompt submission and response
- Terminal border artifacts when resizing rapidly

---

## [0.1.0] — 2026-03-20

Initial release.

### Features
- Streaming responses powered by xAI Grok via the OpenAI-compatible SDK
- Fixed-bottom terminal UI with a live input box — output scrolls above, input stays pinned
- Multi-line input wrapping — the input box grows upward as you type
- Agentic tool loop: `bash`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`
- Per-operation approval prompts for bash commands and file edits
- Session-wide "Yes to all" auto-approve for file edits
- Conversation history with multi-turn context
- Custom system prompt via `GROKKED.md` in any project directory
- Vitest test suite — 53 tests across 8 modules
- GitHub Actions CI on Node.js 18, 20, and 22
- MIT licence
