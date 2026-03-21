"use strict";
/**
 * @file formatter.ts
 * @version 0.1.1
 * @description Buffers streaming response text and emits indented, italic-formatted lines as they complete.
 *              Renders markdown code fences as visual blocks instead of literal backticks.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseFormatter = void 0;
const chalk_1 = __importDefault(require("chalk"));
const INDENT = '  ';
/**
 * Buffers streaming text and emits formatted lines as they complete.
 * Keeps raw text separately so conversation history is unaffected.
 */
class ResponseFormatter {
    buffer = '';
    inCodeBlock = false;
    /** Feed a chunk of streamed text. Returns ready-to-print formatted output. */
    push(chunk) {
        this.buffer += chunk;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() ?? ''; // keep the incomplete trailing line
        return lines.map((line) => this.formatLine(line) + '\n').join('');
    }
    /** Flush any remaining buffered text at end of stream. */
    flush() {
        if (!this.buffer)
            return '';
        const result = this.formatLine(this.buffer);
        this.buffer = '';
        return result;
    }
    formatLine(line) {
        if (line.startsWith('```')) {
            this.inCodeBlock = !this.inCodeBlock;
            return INDENT + chalk_1.default.dim('─'.repeat(40));
        }
        if (this.inCodeBlock) {
            return INDENT + chalk_1.default.cyan(line);
        }
        return INDENT + chalk_1.default.italic(line);
    }
}
exports.ResponseFormatter = ResponseFormatter;
//# sourceMappingURL=formatter.js.map