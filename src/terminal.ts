#!/usr/bin/env node
/**
 * @file terminal.ts
 * @version 0.1.2
 * @description Fixed-bottom terminal UI with raw mode input, ANSI scroll region output, and approval prompts.
 *              Input box wraps to multiple lines when text exceeds terminal width.
 */

/**
 * Terminal UI — fixed input box at the bottom, scrollable output above.
 *
 * The input box grows downward from the top border as the user types.
 * The scroll region shrinks to match, keeping the bottom border fixed.
 *
 * Layout for a 2-line input (rows counted from top, 1-indexed):
 *   1 … rows-4  │ scroll region — all output goes here
 *   rows-3       │ ─────────────────────────── (top border, floats up)
 *   rows-2       │ >  first line of input
 *   rows-1       │    continuation of input
 *   rows         │ ─────────────────────────── (bottom border, fixed)
 */

import chalk from 'chalk';

const PROMPT = '> ';
const PROMPT_WIDTH = PROMPT.length; // 2

// Maximum fraction of terminal height the input box may occupy.
const MAX_INPUT_FRACTION = 0.4;

class TerminalUI {
  private liveBuffer = '';
  private liveCursor = 0;
  private cursorInBox = false;

  // Track the current input area geometry so enterOutputMode and done() know
  // which rows to target and clear.
  private currentScrollBottom: number;
  private currentTopBorderRow: number;
  private currentInputLines: number;

  constructor() {
    const rows = process.stdout.rows ?? 24;
    this.currentInputLines = 1;
    this.currentTopBorderRow = rows - 2;
    this.currentScrollBottom = Math.max(3, rows - 3);
  }

  // ── Dimensions ─────────────────────────────────────────────────────────────

  private get rows(): number { return process.stdout.rows ?? 24; }
  private get cols(): number { return process.stdout.columns ?? 80; }
  private get bottomBorderRow(): number { return this.rows; }

  // Named resize handler so it can be removed in cleanup().
  private readonly onResize = (): void => {
    this.drawBox(this.liveBuffer, this.liveCursor);
  };

  // ── Initialisation ──────────────────────────────────────────────────────────

  init(): void {
    process.stdout.write('\x1b[2J\x1b[H');
    this.drawBox('', 0); // sets scroll region as part of drawing
    process.stdout.on('resize', this.onResize);
    process.on('exit', () => this.restoreTerminal());
  }

  cleanup(): void {
    process.stdout.off('resize', this.onResize);
    this.restoreTerminal();
  }

  private restoreTerminal(): void {
    try {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdout.write('\x1b[r');
      process.stdout.write('\x1b[?25h');
      process.stdout.write(`\x1b[${this.rows};1H\n`);
    } catch {
      // Ignore — stream may already be closed during forced exit
    }
  }

  // ── Input box ───────────────────────────────────────────────────────────────

  /**
   * Draw the input box at the bottom of the terminal.
   *
   * The box expands upward to accommodate wrapped text:
   *   - Treat PROMPT + buffer as one continuous string and wrap at cols width.
   *   - Top border floats up; scroll region shrinks to match.
   *   - Cursor is positioned at the correct row + column within the wrap.
   */
  private drawBox(input: string, cursorPos: number): void {
    const cols = this.cols;
    const rows = this.rows;

    // The full visual string: prompt on the first "line", then text wraps.
    const combined = PROMPT + input;

    // How many terminal rows the input needs (cap to avoid eating the screen).
    const maxInputLines = Math.max(1, Math.floor(rows * MAX_INPUT_FRACTION));
    const rawLines = Math.max(1, Math.ceil(combined.length / cols));
    const inputLines = Math.min(rawLines, maxInputLines);

    const topBorderRow = rows - 1 - inputLines;  // row for ─── above input
    const inputStartRow = topBorderRow + 1;        // first row of actual text
    const scrollBottom = Math.max(2, topBorderRow - 1);

    // Clear every row that is, or was, part of the input area.
    const clearFrom = Math.min(topBorderRow, this.currentTopBorderRow);
    for (let r = clearFrom; r <= rows; r++) {
      process.stdout.write(`\x1b[${r};1H\x1b[2K`);
    }

    // Update the ANSI scroll region.
    process.stdout.write(`\x1b[1;${scrollBottom}r`);

    // Draw top border.
    const hr = chalk.dim('─'.repeat(cols));
    process.stdout.write(`\x1b[${topBorderRow};1H${hr}`);

    // Draw input lines.
    for (let i = 0; i < inputLines; i++) {
      const lineStart = i * cols;
      const lineContent = combined.slice(lineStart, lineStart + cols);
      process.stdout.write(`\x1b[${inputStartRow + i};1H`);
      if (i === 0) {
        // Colour the prompt prefix on the first line only.
        const promptPart = lineContent.slice(0, PROMPT_WIDTH);
        const textPart = lineContent.slice(PROMPT_WIDTH);
        process.stdout.write(chalk.bold.green(promptPart) + textPart);
      } else {
        process.stdout.write(lineContent);
      }
    }

    // Draw bottom border (always fixed to last row).
    process.stdout.write(`\x1b[${this.bottomBorderRow};1H${hr}`);

    // Position cursor within the wrapped input.
    const combinedCursorPos = PROMPT_WIDTH + cursorPos;
    const cursorVisualRow = Math.floor(combinedCursorPos / cols);
    const cursorVisualCol = combinedCursorPos % cols;
    const cursorTermRow = Math.min(inputStartRow + cursorVisualRow, rows - 1);
    const cursorTermCol = cursorVisualCol + 1; // 1-indexed
    process.stdout.write(`\x1b[${cursorTermRow};${cursorTermCol}H`);

    // Persist geometry for enterOutputMode / done().
    this.currentScrollBottom = scrollBottom;
    this.currentTopBorderRow = topBorderRow;
    this.currentInputLines = inputLines;
    this.cursorInBox = true;
  }

  // ── Output ──────────────────────────────────────────────────────────────────

  private enterOutputMode(): void {
    if (this.cursorInBox) {
      process.stdout.write(`\x1b[${this.currentScrollBottom};1H`);
      this.cursorInBox = false;
    }
  }

  write(text: string): void {
    this.enterOutputMode();
    process.stdout.write(text);
  }

  // ── Interactive input ───────────────────────────────────────────────────────

  readLine(): Promise<string> {
    this.liveBuffer = '';
    this.liveCursor = 0;
    this.drawBox('', 0);

    return new Promise<string>((resolve) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }

      const onData = (data: Buffer) => {
        const str = data.toString('utf-8');

        if (str === '\r' || str === '\n') { done(this.liveBuffer); return; }
        if (str === '\x03' || str === '\x04') { this.cleanup(); process.stdout.write('Goodbye!\n'); process.exit(0); }

        if (str === '\x7f') { // Backspace
          if (this.liveCursor > 0) {
            this.liveBuffer = this.liveBuffer.slice(0, this.liveCursor - 1) + this.liveBuffer.slice(this.liveCursor);
            this.liveCursor--;
            this.drawBox(this.liveBuffer, this.liveCursor);
          }
          return;
        }

        if (str === '\x1b[3~') { // Delete
          if (this.liveCursor < this.liveBuffer.length) {
            this.liveBuffer = this.liveBuffer.slice(0, this.liveCursor) + this.liveBuffer.slice(this.liveCursor + 1);
            this.drawBox(this.liveBuffer, this.liveCursor);
          }
          return;
        }

        // Arrow keys / Home / End
        if (str === '\x1b[D') { this.liveCursor = Math.max(0, this.liveCursor - 1); this.drawBox(this.liveBuffer, this.liveCursor); return; }
        if (str === '\x1b[C') { this.liveCursor = Math.min(this.liveBuffer.length, this.liveCursor + 1); this.drawBox(this.liveBuffer, this.liveCursor); return; }
        if (str === '\x1b[A') { // Up — jump to start of previous visual line
          this.liveCursor = Math.max(0, this.liveCursor - this.cols);
          this.drawBox(this.liveBuffer, this.liveCursor);
          return;
        }
        if (str === '\x1b[B') { // Down — jump to start of next visual line
          this.liveCursor = Math.min(this.liveBuffer.length, this.liveCursor + this.cols);
          this.drawBox(this.liveBuffer, this.liveCursor);
          return;
        }
        if (str === '\x1b[H' || str === '\x01') { this.liveCursor = 0; this.drawBox(this.liveBuffer, this.liveCursor); return; }
        if (str === '\x1b[F' || str === '\x05') { this.liveCursor = this.liveBuffer.length; this.drawBox(this.liveBuffer, this.liveCursor); return; }

        if (str.startsWith('\x1b')) return; // ignore other escape sequences

        // Printable characters only (tab excluded)
        if (str >= ' ') {
          this.liveBuffer = this.liveBuffer.slice(0, this.liveCursor) + str + this.liveBuffer.slice(this.liveCursor);
          this.liveCursor += str.length;
          this.drawBox(this.liveBuffer, this.liveCursor);
        }
      };

      const done = (result: string) => {
        process.stdin.off('data', onData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
          process.stdin.pause();
        }
        // Redraw the box empty so it stays visible during streaming.
        this.drawBox('', 0);
        // Move cursor into the output area; output will scroll above the box.
        process.stdout.write(`\x1b[${this.currentScrollBottom};1H`);
        this.cursorInBox = false;
        resolve(result);
      };

      process.stdin.on('data', onData);
    });
  }

  readChoice(label: string, choices: string[]): Promise<number> {
    const choiceList = choices.map((c, i) => `${chalk.bold(`[${i + 1}]`)} ${c}`).join('  ');
    this.write(`\n${chalk.yellow('  ✦ ' + label)}\n  ${choiceList}\n`);

    // Always draw as a single-line box for choices.
    const singleTopBorder = this.rows - 2;
    const hr = chalk.dim('─'.repeat(this.cols));
    process.stdout.write(`\x1b[${singleTopBorder};1H\x1b[2K${hr}`);
    process.stdout.write(`\x1b[${this.rows - 1};1H\x1b[2K${chalk.yellow('? ')}Press ${choices.map((_, i) => i + 1).join('/')} `);
    process.stdout.write(`\x1b[${this.bottomBorderRow};1H\x1b[2K${hr}`);
    this.currentTopBorderRow = singleTopBorder;
    this.cursorInBox = true;

    return new Promise<number>((resolve) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }

      const onData = (data: Buffer) => {
        const str = data.toString();
        if (str === '\x03' || str === '\x04') { this.cleanup(); process.stdout.write('Goodbye!\n'); process.exit(0); }

        const n = parseInt(str, 10);
        if (n >= 1 && n <= choices.length) {
          process.stdin.off('data', onData);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
          }
          this.write(chalk.dim(`  → ${choices[n - 1] ?? ''}\n`));
          this.drawBox('', 0);
          resolve(n);
        }
      };

      process.stdin.on('data', onData);
    });
  }
}

export const terminal = new TerminalUI();
