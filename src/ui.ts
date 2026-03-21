/**
 * @file ui.ts
 * @version 0.1.1
 * @description Terminal output helpers for banners, help text, tool display, and error messages.
 */

import chalk from 'chalk';
import { terminal } from './terminal';

export function printBanner(model: string): void {
  terminal.write(
    chalk.bold.magenta('grokked') +
      chalk.dim(` — powered by Grok (${model})\n`) +
      chalk.dim('Type /help for commands, Ctrl+C to exit.\n'),
  );
}

export function printHelp(): void {
  terminal.write(
    chalk.bold('\nCommands:\n') +
      `  ${chalk.cyan('/clear')}   Clear the screen\n` +
      `  ${chalk.cyan('/reset')}   Clear the screen and conversation history\n` +
      `  ${chalk.cyan('/exit')}    Exit grokked\n` +
      `  ${chalk.cyan('/help')}    Show this help\n` +
      `  ${chalk.cyan('/model')}   Show current model\n`,
  );
}

export function printError(msg: string): void {
  terminal.write(chalk.red('\nError: ') + msg + '\n');
}

export function printToolStart(name: string, args: Record<string, unknown>): void {
  const preview = formatArgs(args);
  terminal.write('\n' + chalk.yellow('◆ ') + chalk.bold(name) + chalk.dim(`(${preview})\n`));
}

export function printEditDiff(
  filePath: string,
  oldString: string,
  newString: string,
  startLine: number,
): void {
  const oldLines = oldString.split('\n');
  const newLines = newString.split('\n');
  const maxLineNo = startLine + Math.max(oldLines.length, newLines.length);
  const lineNoWidth = String(maxLineNo).length;

  terminal.write(chalk.bold.dim(`\n  ${filePath}\n`));

  let lineNo = startLine;
  for (const line of oldLines) {
    const num = String(lineNo).padStart(lineNoWidth);
    terminal.write(chalk.red(`  ${num} - ${line}\n`));
    lineNo++;
  }

  lineNo = startLine;
  for (const line of newLines) {
    const num = String(lineNo).padStart(lineNoWidth);
    terminal.write(chalk.green(`  ${num} + ${line}\n`));
    lineNo++;
  }
}

export function printToolResult(result: string): void {
  const trimmed = result.length > 400 ? result.substring(0, 400) + '...' : result;
  const lines = trimmed.split('\n').slice(0, 10).join('\n');
  terminal.write(chalk.dim('  → ' + lines.replace(/\n/g, '\n    ')) + '\n');
}

function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  if (entries.length === 1) {
    const str = String(entries[0]?.[1]);
    return str.length > 80 ? str.substring(0, 80) + '...' : str;
  }
  return entries
    .map(([k, v]) => {
      const str = String(v);
      return `${k}: ${str.length > 40 ? str.substring(0, 40) + '...' : str}`;
    })
    .join(', ');
}
