/**
 * @file repl.ts
 * @version 0.1.0
 * @description Main REPL loop and agentic tool-execution loop with conversation history management.
 */

import chalk from 'chalk';
import OpenAI from 'openai';
import { Config } from './config';
import { GrokClient } from './client';
import { toolDefinitions, executeTool } from './tools/index';
import { printHelp, printError, printToolStart, printToolResult } from './ui';
import { terminal } from './terminal';

type Message = OpenAI.Chat.ChatCompletionMessageParam;

export async function startRepl(config: Config): Promise<void> {
  const client = new GrokClient(config);
  const history: Message[] = [{ role: 'system', content: config.systemPrompt }];

  const commands: Record<string, () => void> = {
    '/help': () => printHelp(),
    '/clear': () => {
      history.splice(1);
      terminal.write(chalk.dim('  History cleared.\n'));
    },
    '/exit': () => {
      terminal.cleanup();
      process.stdout.write('Goodbye!\n');
      process.exit(0);
    },
    '/model': () => terminal.write(chalk.dim(`  Model: ${config.model}\n`)),
  };

  while (true) {
    const input = (await terminal.readLine()).trim();

    if (!input) continue;

    if (input.startsWith('/')) {
      const cmd = commands[input];
      if (cmd) cmd();
      else terminal.write(chalk.red(`  Unknown command: ${input}. Type /help for commands.\n`));
      continue;
    }

    history.push({ role: 'user', content: input });
    // Snapshot length after user message — restore here on failure so any
    // partial assistant/tool messages added during the loop are rolled back.
    const historySnapshot = history.length;

    try {
      await runAgentLoop(client, history, config);
    } catch (err: any) {
      printError(err.message);
      history.splice(historySnapshot);
    }
  }
}

async function runAgentLoop(
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
      printToolResult(result);

      history.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }
}
