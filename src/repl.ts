/**
 * @file repl.ts
 * @version 0.1.12
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
  terminal.setCtrlCHandler(() => shutdown());

  // When non-null, the next user input is treated as a model selection number.
  let pendingModelList: string[] | null = null;

  const commands: Record<string, () => void | Promise<void>> = {
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
    '/model': () => {
      terminal.clearScreen();
      terminal.write(chalk.bold('\n  Select a model:\n\n'));
      config.models.forEach((m, i) => {
        const current = m === config.model ? chalk.dim('  ← current') : '';
        terminal.write(`  ${chalk.bold(`[${i + 1}]`)}  ${m}${current}\n`);
      });
      terminal.write(chalk.yellow(`\n  Type a number (1–${config.models.length}) and press Enter:\n`));
      pendingModelList = config.models;
    },
  };

  const commandDescriptions: Record<string, string> = {
    '/clip':  'Attach a clipboard screenshot to your next message',
    '/clear': 'Clear the screen',
    '/exit':  'Exit grokked',
    '/help':  'Show available commands',
    '/model': 'Select a model from the available xAI models',
    '/reset': 'Clear the screen and conversation history',
  };

  terminal.setCompletionProvider((input: string) => {
    const filter = input.toLowerCase();
    return Object.entries(commandDescriptions)
      .filter(([name]) => name.startsWith(filter))
      .map(([name, description]) => ({ name, description }));
  });

  while (true) {
    const input = (await terminal.readLine()).trim();

    if (!input) continue;

    // Model selection mode — next input after /model is a number choice.
    if (pendingModelList) {
      const models = pendingModelList as string[];
      const n = parseInt(input, 10);
      if (n >= 1 && n <= models.length) {
        config.model = models[n - 1]!;
        terminal.write(chalk.dim(`  ✓ Model set to ${chalk.bold(config.model)}\n`));
        pendingModelList = null;
      } else {
        terminal.write(chalk.red(`  Invalid — enter a number between 1 and ${models.length}:\n`));
      }
      continue;
    }

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
      if (cmd) {
        try {
          await cmd();
        } catch (err: any) {
          terminal.write(chalk.red(`  Error: ${err.message}\n`));
        }
      } else {
        terminal.write(chalk.red(`  Unknown command: ${input}. Type /help for commands.\n`));
      }
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
