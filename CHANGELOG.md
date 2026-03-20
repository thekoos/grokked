# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

### Added
- Markdown code fences in responses now render as visual blocks — fence lines become a dim `────` rule and code content is shown in cyan
- Input box stays visible (empty) while the agent streams its response instead of disappearing on Enter
- Global install via `npm link` documented in README
- Testing section added to README explaining Vitest suite and CI

### Fixed
- Input box flickering/disappearing between prompt submission and response

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
