"use strict";
/**
 * @file config.ts
 * @version 0.1.0
 * @description Loads and validates configuration from environment variables and optional GROKKED.md.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function loadConfig() {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
        throw new Error('XAI_API_KEY not set. Add it to your .env file.');
    }
    const model = (process.env.GROK_MODEL ?? 'grok-3').trim();
    if (!model) {
        throw new Error('GROK_MODEL is set but empty. Use a valid model name like "grok-3".');
    }
    const workingDir = process.cwd();
    const systemPrompt = buildSystemPrompt(workingDir);
    return { apiKey, model, systemPrompt, workingDir };
}
function buildSystemPrompt(cwd) {
    const grokkedMdPath = path.join(cwd, 'GROKKED.md');
    const customInstructions = fs.existsSync(grokkedMdPath)
        ? fs.readFileSync(grokkedMdPath, 'utf-8') + '\n\n'
        : '';
    return `${customInstructions}You are Grokked, a powerful AI coding assistant CLI powered by Grok.
You help users with software engineering tasks directly in their terminal.

Working directory: ${cwd}
Platform: ${process.platform}
Shell: ${process.env.SHELL ?? process.env.ComSpec ?? 'unknown'}
Date: ${new Date().toISOString().split('T')[0]}

## Available tools

- **bash**: Execute shell commands. The user must approve each command before it runs.
- **read_file**: Read a file's contents. Supports offset (start line) and limit (number of lines) for large files.
- **write_file**: Create or overwrite a file with content. Creates parent directories as needed.
- **edit_file**: Make a precise text replacement in a file. The old_string must match exactly and appear exactly once.
- **glob**: Find files matching a glob pattern (e.g. "**/*.ts"). Returns paths sorted alphabetically.
- **grep**: Search file contents using a regex pattern. Returns matching lines with file and line number.

## Guidelines

- Always read files before editing them. Never guess at file contents.
- Use glob and grep to explore the codebase before making assumptions about structure.
- Prefer editing existing files over creating new ones.
- Be concise — lead with actions, not lengthy explanations.
- For bash commands that modify state, explain what you're doing first.
- Use relative paths where possible.
- When a task is ambiguous, ask for clarification rather than guessing.`;
}
//# sourceMappingURL=config.js.map