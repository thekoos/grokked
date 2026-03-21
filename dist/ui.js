"use strict";
/**
 * @file ui.ts
 * @version 0.1.1
 * @description Terminal output helpers for banners, help text, tool display, and error messages.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBanner = printBanner;
exports.printHelp = printHelp;
exports.printError = printError;
exports.printToolStart = printToolStart;
exports.printEditDiff = printEditDiff;
exports.printToolResult = printToolResult;
const chalk_1 = __importDefault(require("chalk"));
const terminal_1 = require("./terminal");
function printBanner(model) {
    terminal_1.terminal.write(chalk_1.default.bold.magenta('grokked') +
        chalk_1.default.dim(` — powered by Grok (${model})\n`) +
        chalk_1.default.dim('Type /help for commands, Ctrl+C to exit.\n'));
}
function printHelp() {
    terminal_1.terminal.write(chalk_1.default.bold('\nCommands:\n') +
        `  ${chalk_1.default.cyan('/clear')}   Clear conversation history\n` +
        `  ${chalk_1.default.cyan('/exit')}    Exit grokked\n` +
        `  ${chalk_1.default.cyan('/help')}    Show this help\n` +
        `  ${chalk_1.default.cyan('/model')}   Show current model\n`);
}
function printError(msg) {
    terminal_1.terminal.write(chalk_1.default.red('\nError: ') + msg + '\n');
}
function printToolStart(name, args) {
    const preview = formatArgs(args);
    terminal_1.terminal.write('\n' + chalk_1.default.yellow('◆ ') + chalk_1.default.bold(name) + chalk_1.default.dim(`(${preview})\n`));
}
function printEditDiff(filePath, oldString, newString, startLine) {
    const oldLines = oldString.split('\n');
    const newLines = newString.split('\n');
    const maxLineNo = startLine + Math.max(oldLines.length, newLines.length);
    const lineNoWidth = String(maxLineNo).length;
    terminal_1.terminal.write(chalk_1.default.bold.dim(`\n  ${filePath}\n`));
    let lineNo = startLine;
    for (const line of oldLines) {
        const num = String(lineNo).padStart(lineNoWidth);
        terminal_1.terminal.write(chalk_1.default.red(`  ${num} - ${line}\n`));
        lineNo++;
    }
    lineNo = startLine;
    for (const line of newLines) {
        const num = String(lineNo).padStart(lineNoWidth);
        terminal_1.terminal.write(chalk_1.default.green(`  ${num} + ${line}\n`));
        lineNo++;
    }
}
function printToolResult(result) {
    const trimmed = result.length > 400 ? result.substring(0, 400) + '...' : result;
    const lines = trimmed.split('\n').slice(0, 10).join('\n');
    terminal_1.terminal.write(chalk_1.default.dim('  → ' + lines.replace(/\n/g, '\n    ')) + '\n');
}
function formatArgs(args) {
    const entries = Object.entries(args);
    if (entries.length === 0)
        return '';
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
//# sourceMappingURL=ui.js.map