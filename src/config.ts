/**
 * @file config.ts
 * @version 0.1.4
 * @description Loads and validates configuration from environment variables and optional GROKKED.md.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  apiKey: string;
  model: string;
  models: string[];
  systemPrompt: string;
  workingDir: string;
}

export function loadConfig(): Config {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not set. Add it to your .env file.');
  }

  const model = (process.env.GROK_MODEL ?? 'grok-3').trim();
  if (!model) {
    throw new Error('GROK_MODEL is set but empty. Use a valid model name like "grok-3".');
  }

  const modelsRaw = process.env.GROK_MODELS ?? '';
  const models = modelsRaw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  if (!models.includes(model)) models.unshift(model);

  const workingDir = process.cwd();
  const systemPrompt = buildSystemPrompt(workingDir);

  return { apiKey, model, models, systemPrompt, workingDir };
}

function buildSystemPrompt(cwd: string): string {
  const grokkedMdPath = path.join(cwd, 'GROKKED.md');
  const customInstructions = fs.existsSync(grokkedMdPath)
    ? fs.readFileSync(grokkedMdPath, 'utf-8') + '\n\n'
    : '';

  const contextPath = path.join(cwd, '.grokked', 'context.md');
  const sessionContext = fs.existsSync(contextPath)
    ? `## Previous session context\n\n${fs.readFileSync(contextPath, 'utf-8')}\n\n`
    : '';

  return `${customInstructions}${sessionContext}You are Grokked, a powerful AI coding assistant CLI powered by Grok.
You help users with software engineering tasks directly in their terminal.

Working directory: ${cwd}
Platform: ${process.platform}
Shell: ${process.env.SHELL ?? process.env.ComSpec ?? 'unknown'}
Date: ${new Date().toISOString().split('T')[0]}

## Available tools

- **bash**: Execute shell commands. The user must approve each command before it runs.
- **read_file**: Read a file's contents. Supports offset (start line) and limit (number of lines) for large files.
- **write_file**: Create or overwrite a file with content. Creates parent directories as needed.
- **edit_file**: Make a precise text replacement in a file. The old_string must match exactly and appear exactly once.
- **glob**: Find files matching a glob pattern (e.g. "**/*.ts"). Returns paths sorted alphabetically.
- **grep**: Search file contents using a regex pattern. Returns matching lines with file and line number.

## Guidelines

- Always read files before editing them. Never guess at file contents.
- Use glob and grep to explore the codebase before making assumptions about structure.
- Prefer editing existing files over creating new ones.
- Be concise — lead with actions, not lengthy explanations.
- For bash commands that modify state, explain what you're doing first.
- Use relative paths where possible.
- When writing any file via write_file or edit_file, provide raw file content only — never wrap it in markdown code fences (no \`\`\`html, \`\`\`js, or any \`\`\` delimiters). The content argument is written directly to disk.
- When writing HTML files, always use raw HTML tags (<div>, not &lt;div&gt;). Never entity-encode the content.
- When a task is ambiguous, ask for clarification rather than guessing.`;
}
