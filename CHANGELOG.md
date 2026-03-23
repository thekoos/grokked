# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

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
