/**
 * @file repl.ts
 * @version 0.1.8
 * @description Main REPL loop and agentic tool-execution loop with conversation history management.
 */

import chalk from 'chalk';
import OpenAI from 'openai';
import { Config } from './config';
import { GrokClient } from './client';
import { toolDefinitions, executeTool } from './tools/index';
import { printHelp, printError, printToolStart, printToolResult } from './ui';
import { terminal } from './terminal';
import { saveContext, clearContext } from './context';
import { captureRegion } from './tools/screenshot';

type Message = OpenAI.Chat.ChatCompletionMessageParam;

export async function startRepl(config: Config): Promise<void> {
  const client = new GrokClient(config);
  const history: Message[] = [{ role: 'system', content: config.systemPrompt }];

  const shutdown = (clearHistory = false) => {
    terminal.cleanup();
    process.stdout.write('  Saving session context...\n');
    const historyToSave = clearHistory ? [history[0]!] : history;
    saveContext(client, historyToSave, config.workingDir)
      .catch(() => {})
      .finally(() => {
        process.stdout.write('Goodbye!\n');
        process.exit(0);
      });
  };

  process.on('SIGINT', () => shutdown());

  const commands: Record<string, () => void> = {
    '/help': () => printHelp(),
    '/clear': () => {
      terminal.clearScreen();
    },
    '/reset': () => {
      history.splice(1);
      clearContext(config.workingDir);
      terminal.clearScreen();
      terminal.write(chalk.dim('  Conversation history and context cleared.\n'));
    },
    '/exit': () => shutdown(),
    '/model': () => terminal.write(chalk.dim(`  Model: ${config.model}\n`)),
  };

  while (true) {
    const input = (await terminal.readLine()).trim();

    if (!input) continue;

    // /clip must be checked before the generic command handler so that
    // "/clip" alone (which starts with '/') is not caught as an unknown command.
    if (input.includes('/clip')) {
      const text = input.replace('/clip', '').trim() || 'Analyze this screenshot.';
      terminal.write(chalk.dim('  Reading screenshot from clipboard...\n'));
      let base64: string | null = null;
      try {
        base64 = await captureRegion();
      } catch (err: any) {
        terminal.write(chalk.red(`  Screenshot error: ${err.message}\n`));
        continue;
      }
      if (!base64) {
        terminal.write(chalk.yellow('  No image in clipboard. Press Win+Shift+S to capture a region first.\n'));
        continue;
      }
      terminal.write(chalk.dim('  Screenshot captured.\n'));
      history.push({
        role: 'user',
        content: [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      });
    } else if (input.startsWith('/')) {
      const cmd = commands[input];
      if (cmd) cmd();
      else terminal.write(chalk.red(`  Unknown command: ${input}. Type /help for commands.\n`));
      continue;
    } else {
      history.push({ role: 'user', content: input });
    }

    // Snapshot length after user message — restore here on failure so any
    // partial assistant/tool messages added during the loop are rolled back.
    const historySnapshot = history.length;

    try {
      await runAgentLoop(client, history, config);
      // Strip images from history after response to avoid token bloat on future turns.
      stripImagesFromHistory(history);
    } catch (err: any) {
      printError(err.message);
      history.splice(historySnapshot);
    }
  }
}

export function stripImagesFromHistory(history: Message[]): void {
  for (const msg of history) {
    if (Array.isArray(msg.content)) {
      const textParts = msg.content.filter((p) => p.type === 'text');
      if (textParts.length > 0) {
        msg.content = textParts.map((p) => (p as { type: 'text'; text: string }).text).join(' ');
      }
    }
  }
}

export async function runAgentLoop(
  client: GrokClient,
  history: Message[],
  config: Config,
): Promise<void> {
  while (true) {
    const { text, toolCalls } = await client.streamCompletion(history, toolDefinitions);

    if (toolCalls.length === 0) {
      history.push({ role: 'assistant', content: text });
      break;
    }

    history.push({
      role: 'assistant',
      content: text || null,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      printToolStart(toolCall.function.name, args);
      const result = await executeTool(toolCall.function.name, args, config);
      if (toolCall.function.name !== 'read_file') printToolResult(result);

      history.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}
