/**
 * @file formatter.ts
 * @version 0.1.0
 * @description Buffers streaming response text and emits indented, italic-formatted lines as they complete.
 */

import chalk from 'chalk';

const INDENT = '  ';

function formatLine(line: string): string {
  return INDENT + chalk.italic(line);
}

/**
 * Buffers streaming text and emits formatted lines as they complete.
 * Keeps raw text separately so conversation history is unaffected.
 */
export class ResponseFormatter {
  private buffer = '';

  /** Feed a chunk of streamed text. Returns ready-to-print formatted output. */
  push(chunk: string): string {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? ''; // keep the incomplete trailing line
    return lines.map((line) => formatLine(line) + '\n').join('');
  }

  /** Flush any remaining buffered text at end of stream. */
  flush(): string {
    if (!this.buffer) return '';
    const result = formatLine(this.buffer);
    this.buffer = '';
    return result;
  }
}
