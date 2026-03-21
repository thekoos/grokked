#!/usr/bin/env node
"use strict";
/**
 * @file terminal.ts
 * @version 0.1.4
 * @description Fixed-bottom terminal UI with raw mode input, ANSI scroll region output, and approval prompts.
 *              Input box wraps to multiple lines when text exceeds terminal width.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminal = void 0;
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
const chalk_1 = __importDefault(require("chalk"));
const PROMPT = '> ';
const PROMPT_WIDTH = PROMPT.length; // 2
// Maximum fraction of terminal height the input box may occupy.
const MAX_INPUT_FRACTION = 0.4;
class TerminalUI {
    liveBuffer = '';
    liveCursor = 0;
    cursorInBox = false;
    workingDir = '';
    spinnerTimer = null;
    spinnerIndex = 0;
    spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    // Track the current input area geometry so enterOutputMode and done() know
    // which rows to target and clear.
    currentScrollBottom;
    currentTopBorderRow;
    currentInputLines;
    constructor() {
        const rows = process.stdout.rows ?? 24;
        this.currentInputLines = 1;
        this.currentTopBorderRow = rows - 2;
        this.currentScrollBottom = Math.max(3, rows - 3);
    }
    // ── Dimensions ─────────────────────────────────────────────────────────────
    get rows() { return process.stdout.rows ?? 24; }
    get cols() { return process.stdout.columns ?? 80; }
    get bottomBorderRow() { return this.rows; }
    // Named resize handler so it can be removed in cleanup().
    onResize = () => {
        this.drawBox(this.liveBuffer, this.liveCursor);
    };
    // ── Initialisation ──────────────────────────────────────────────────────────
    setWorkingDir(dir) {
        this.workingDir = dir;
    }
    init() {
        process.stdout.write('\x1b[2J\x1b[H');
        this.drawBox('', 0); // sets scroll region as part of drawing
        process.stdout.on('resize', this.onResize);
        process.on('exit', () => this.restoreTerminal());
    }
    cleanup() {
        process.stdout.off('resize', this.onResize);
        this.restoreTerminal();
    }
    restoreTerminal() {
        try {
            if (process.stdin.isTTY)
                process.stdin.setRawMode(false);
            process.stdout.write('\x1b[r');
            process.stdout.write('\x1b[?25h');
            process.stdout.write(`\x1b[${this.rows};1H\n`);
        }
        catch {
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
    drawBottomBorder() {
        const cols = this.cols;
        const label = this.workingDir ? ` Folder: ${this.workingDir} ` : '';
        const maxLabelLen = cols - 4; // leave room for at least ── on each side
        const truncated = label.length > maxLabelLen
            ? ` Folder: ...${this.workingDir.slice(-(maxLabelLen - 12))} `
            : label;
        const remaining = cols - truncated.length;
        const left = '──';
        const right = '─'.repeat(Math.max(0, remaining - left.length));
        return chalk_1.default.dim(left) + chalk_1.default.dim.cyan(truncated) + chalk_1.default.dim(right);
    }
    drawBox(input, cursorPos) {
        const cols = this.cols;
        const rows = this.rows;
        // The full visual string: prompt on the first "line", then text wraps.
        const combined = PROMPT + input;
        // How many terminal rows the input needs (cap to avoid eating the screen).
        const maxInputLines = Math.max(1, Math.floor(rows * MAX_INPUT_FRACTION));
        const rawLines = Math.max(1, Math.ceil(combined.length / cols));
        const inputLines = Math.min(rawLines, maxInputLines);
        const topBorderRow = rows - 1 - inputLines; // row for ─── above input
        const inputStartRow = topBorderRow + 1; // first row of actual text
        const scrollBottom = Math.max(2, topBorderRow - 1);
        // Clear every row that is, or was, part of the input area.
        const clearFrom = Math.min(topBorderRow, this.currentTopBorderRow);
        for (let r = clearFrom; r <= rows; r++) {
            process.stdout.write(`\x1b[${r};1H\x1b[2K`);
        }
        // Update the ANSI scroll region.
        process.stdout.write(`\x1b[1;${scrollBottom}r`);
        // Draw top border.
        const hr = chalk_1.default.dim('─'.repeat(cols));
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
                process.stdout.write(chalk_1.default.bold.green(promptPart) + textPart);
            }
            else {
                process.stdout.write(lineContent);
            }
        }
        // Draw bottom border (always fixed to last row).
        process.stdout.write(`\x1b[${this.bottomBorderRow};1H${this.drawBottomBorder()}`);
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
    enterOutputMode() {
        if (this.cursorInBox) {
            process.stdout.write(`\x1b[${this.currentScrollBottom};1H`);
            this.cursorInBox = false;
        }
    }
    write(text) {
        this.enterOutputMode();
        process.stdout.write(text);
    }
    startSpinner(label = 'thinking') {
        this.enterOutputMode();
        this.spinnerIndex = 0;
        process.stdout.write('\n');
        this.spinnerTimer = setInterval(() => {
            const frame = this.spinnerFrames[this.spinnerIndex % this.spinnerFrames.length] ?? '⠋';
            process.stdout.write(`\r  ${chalk_1.default.dim(frame + ' ' + label)}`);
            this.spinnerIndex++;
        }, 80);
    }
    stopSpinner() {
        if (this.spinnerTimer) {
            clearInterval(this.spinnerTimer);
            this.spinnerTimer = null;
            process.stdout.write('\r\x1b[2K'); // clear spinner line
        }
    }
    // ── Interactive input ───────────────────────────────────────────────────────
    readLine() {
        this.liveBuffer = '';
        this.liveCursor = 0;
        this.drawBox('', 0);
        return new Promise((resolve) => {
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
                process.stdin.resume();
            }
            const onData = (data) => {
                const str = data.toString('utf-8');
                if (str === '\r' || str === '\n') {
                    done(this.liveBuffer);
                    return;
                }
                if (str === '\x03' || str === '\x04') {
                    this.cleanup();
                    process.stdout.write('Goodbye!\n');
                    process.exit(0);
                }
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
                if (str === '\x1b[D') {
                    this.liveCursor = Math.max(0, this.liveCursor - 1);
                    this.drawBox(this.liveBuffer, this.liveCursor);
                    return;
                }
                if (str === '\x1b[C') {
                    this.liveCursor = Math.min(this.liveBuffer.length, this.liveCursor + 1);
                    this.drawBox(this.liveBuffer, this.liveCursor);
                    return;
                }
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
                if (str === '\x1b[H' || str === '\x01') {
                    this.liveCursor = 0;
                    this.drawBox(this.liveBuffer, this.liveCursor);
                    return;
                }
                if (str === '\x1b[F' || str === '\x05') {
                    this.liveCursor = this.liveBuffer.length;
                    this.drawBox(this.liveBuffer, this.liveCursor);
                    return;
                }
                if (str.startsWith('\x1b'))
                    return; // ignore other escape sequences
                // Printable characters only (tab excluded)
                if (str >= ' ') {
                    this.liveBuffer = this.liveBuffer.slice(0, this.liveCursor) + str + this.liveBuffer.slice(this.liveCursor);
                    this.liveCursor += str.length;
                    this.drawBox(this.liveBuffer, this.liveCursor);
                }
            };
            const done = (result) => {
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
    readChoice(label, choices) {
        const choiceList = choices.map((c, i) => `${chalk_1.default.bold(`[${i + 1}]`)} ${c}`).join('  ');
        this.write(`\n${chalk_1.default.yellow('  ✦ ' + label)}\n  ${choiceList}\n`);
        // Always draw as a single-line box for choices.
        const singleTopBorder = this.rows - 2;
        const hr = chalk_1.default.dim('─'.repeat(this.cols));
        process.stdout.write(`\x1b[${singleTopBorder};1H\x1b[2K${hr}`);
        process.stdout.write(`\x1b[${this.rows - 1};1H\x1b[2K${chalk_1.default.yellow('? ')}Press ${choices.map((_, i) => i + 1).join('/')} `);
        process.stdout.write(`\x1b[${this.bottomBorderRow};1H\x1b[2K${this.drawBottomBorder()}`);
        this.currentTopBorderRow = singleTopBorder;
        this.cursorInBox = true;
        return new Promise((resolve) => {
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
                process.stdin.resume();
            }
            const onData = (data) => {
                const str = data.toString();
                if (str === '\x03' || str === '\x04') {
                    this.cleanup();
                    process.stdout.write('Goodbye!\n');
                    process.exit(0);
                }
                const n = parseInt(str, 10);
                if (n >= 1 && n <= choices.length) {
                    process.stdin.off('data', onData);
                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                    }
                    this.write(chalk_1.default.dim(`  → ${choices[n - 1] ?? ''}\n`));
                    this.drawBox('', 0);
                    resolve(n);
                }
            };
            process.stdin.on('data', onData);
        });
    }
}
exports.terminal = new TerminalUI();
//# sourceMappingURL=terminal.js.map