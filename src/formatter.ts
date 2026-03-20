/**
 * @file formatter.ts
 * @version 0.1.1
 * @description Buffers streaming response text and emits indented, italic-formatted lines as they complete.
 *              Renders markdown code fences as visual blocks instead of literal backticks.
 */

import chalk from 'chalk';

const INDENT = '  ';

/**
 * Buffers streaming text and emits formatted lines as they complete.
 * Keeps raw text separately so conversation history is unaffected.
 */
export class ResponseFormatter {
  private buffer = '';
  private inCodeBlock = false;

  /** Feed a chunk of streamed text. Returns ready-to-print formatted output. */
  push(chunk: string): string {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? ''; // keep the incomplete trailing line
    return lines.map((line) => this.formatLine(line) + '\n').join('');
  }

  /** Flush any remaining buffered text at end of stream. */
  flush(): string {
    if (!this.buffer) return '';
    const result = this.formatLine(this.buffer);
    this.buffer = '';
    return result;
  }

  private formatLine(line: string): string {
    if (line.startsWith('```')) {
      this.inCodeBlock = !this.inCodeBlock;
      return INDENT + chalk.dim('─'.repeat(40));
    }
    if (this.inCodeBlock) {
      return INDENT + chalk.cyan(line);
    }
    return INDENT + chalk.italic(line);
  }
}
