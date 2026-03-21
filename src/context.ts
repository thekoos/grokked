/**
 * @file context.ts
 * @version 0.1.0
 * @description Session context persistence — saves an AI-generated summary on exit and loads it on startup.
 *              Context is stored in .grokked/context.md in the working directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GrokClient } from './client';
import type OpenAI from 'openai';

const CONTEXT_DIR = '.grokked';
const CONTEXT_FILE = 'context.md';

export function contextPath(workingDir: string): string {
  return path.join(workingDir, CONTEXT_DIR, CONTEXT_FILE);
}

export function loadContext(workingDir: string): string | null {
  const p = contextPath(workingDir);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}

export function clearContext(workingDir: string): void {
  const p = contextPath(workingDir);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export async function saveContext(
  client: GrokClient,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  workingDir: string,
): Promise<void> {
  if (history.length <= 1) return; // nothing beyond the system message

  const summary = await client.summarize(history);
  if (!summary) return;

  const p = contextPath(workingDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  fs.writeFileSync(p, `# Session Context — ${date}\n\n${summary}\n`, 'utf-8');
}
