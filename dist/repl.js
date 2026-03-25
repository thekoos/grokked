"use strict";
/**
 * @file repl.ts
 * @version 0.1.12
 * @description Main REPL loop and agentic tool-execution loop with conversation history management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRepl = startRepl;
exports.stripImagesFromHistory = stripImagesFromHistory;
exports.runAgentLoop = runAgentLoop;
const chalk_1 = __importDefault(require("chalk"));
const client_1 = require("./client");
const index_1 = require("./tools/index");
const ui_1 = require("./ui");
const terminal_1 = require("./terminal");
const context_1 = require("./context");
const screenshot_1 = require("./tools/screenshot");
async function startRepl(config) {
    const client = new client_1.GrokClient(config);
    const history = [{ role: 'system', content: config.systemPrompt }];
    const shutdown = (clearHistory = false) => {
        terminal_1.terminal.cleanup();
        process.stdout.write('  Saving session context...\n');
        const historyToSave = clearHistory ? [history[0]] : history;
        (0, context_1.saveContext)(client, historyToSave, config.workingDir)
            .catch(() => { })
            .finally(() => {
            process.stdout.write('Goodbye!\n');
            process.exit(0);
        });
    };
    process.on('SIGINT', () => shutdown());
    terminal_1.terminal.setCtrlCHandler(() => shutdown());
    // When non-null, the next user input is treated as a model selection number.
    let pendingModelList = null;
    const commands = {
        '/help': () => (0, ui_1.printHelp)(),
        '/clear': () => {
            terminal_1.terminal.clearScreen();
        },
        '/reset': () => {
            history.splice(1);
            (0, context_1.clearContext)(config.workingDir);
            terminal_1.terminal.clearScreen();
            terminal_1.terminal.write(chalk_1.default.dim('  Conversation history and context cleared.\n'));
        },
        '/exit': () => shutdown(),
        '/model': () => {
            terminal_1.terminal.clearScreen();
            terminal_1.terminal.write(chalk_1.default.bold('\n  Select a model:\n\n'));
            config.models.forEach((m, i) => {
                const current = m === config.model ? chalk_1.default.dim('  ← current') : '';
                terminal_1.terminal.write(`  ${chalk_1.default.bold(`[${i + 1}]`)}  ${m}${current}\n`);
            });
            terminal_1.terminal.write(chalk_1.default.yellow(`\n  Type a number (1–${config.models.length}) and press Enter:\n`));
            pendingModelList = config.models;
        },
    };
    const commandDescriptions = {
        '/clip': 'Attach a clipboard screenshot to your next message',
        '/clear': 'Clear the screen',
        '/exit': 'Exit grokked',
        '/help': 'Show available commands',
        '/model': 'Select a model from the available xAI models',
        '/reset': 'Clear the screen and conversation history',
    };
    terminal_1.terminal.setCompletionProvider((input) => {
        const filter = input.toLowerCase();
        return Object.entries(commandDescriptions)
            .filter(([name]) => name.startsWith(filter))
            .map(([name, description]) => ({ name, description }));
    });
    while (true) {
        const input = (await terminal_1.terminal.readLine()).trim();
        if (!input)
            continue;
        // Model selection mode — next input after /model is a number choice.
        if (pendingModelList) {
            const models = pendingModelList;
            const n = parseInt(input, 10);
            if (n >= 1 && n <= models.length) {
                config.model = models[n - 1];
                terminal_1.terminal.write(chalk_1.default.dim(`  ✓ Model set to ${chalk_1.default.bold(config.model)}\n`));
                pendingModelList = null;
            }
            else {
                terminal_1.terminal.write(chalk_1.default.red(`  Invalid — enter a number between 1 and ${models.length}:\n`));
            }
            continue;
        }
        // /clip must be checked before the generic command handler so that
        // "/clip" alone (which starts with '/') is not caught as an unknown command.
        if (input.includes('/clip')) {
            const text = input.replace('/clip', '').trim() || 'Analyze this screenshot.';
            terminal_1.terminal.write(chalk_1.default.dim('  Reading screenshot from clipboard...\n'));
            let base64 = null;
            try {
                base64 = await (0, screenshot_1.captureRegion)();
            }
            catch (err) {
                terminal_1.terminal.write(chalk_1.default.red(`  Screenshot error: ${err.message}\n`));
                continue;
            }
            if (!base64) {
                terminal_1.terminal.write(chalk_1.default.yellow('  No image in clipboard. Press Win+Shift+S to capture a region first.\n'));
                continue;
            }
            terminal_1.terminal.write(chalk_1.default.dim('  Screenshot captured.\n'));
            history.push({
                role: 'user',
                content: [
                    { type: 'text', text },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
                ],
            });
        }
        else if (input.startsWith('/')) {
            const cmd = commands[input];
            if (cmd) {
                try {
                    await cmd();
                }
                catch (err) {
                    terminal_1.terminal.write(chalk_1.default.red(`  Error: ${err.message}\n`));
                }
            }
            else {
                terminal_1.terminal.write(chalk_1.default.red(`  Unknown command: ${input}. Type /help for commands.\n`));
            }
            continue;
        }
        else {
            history.push({ role: 'user', content: input });
        }
        // Snapshot length after user message — restore here on failure so any
        // partial assistant/tool messages added during the loop are rolled back.
        const historySnapshot = history.length;
        try {
            await runAgentLoop(client, history, config);
            // Strip images from history after response to avoid token bloat on future turns.
            stripImagesFromHistory(history);
        }
        catch (err) {
            (0, ui_1.printError)(err.message);
            history.splice(historySnapshot);
        }
    }
}
function stripImagesFromHistory(history) {
    for (const msg of history) {
        if (Array.isArray(msg.content)) {
            const textParts = msg.content.filter((p) => p.type === 'text');
            if (textParts.length > 0) {
                msg.content = textParts.map((p) => p.text).join(' ');
            }
        }
    }
}
async function runAgentLoop(client, history, config) {
    while (true) {
        const { text, toolCalls } = await client.streamCompletion(history, index_1.toolDefinitions);
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
            let args;
            try {
                args = JSON.parse(toolCall.function.arguments);
            }
            catch {
                args = {};
            }
            (0, ui_1.printToolStart)(toolCall.function.name, args);
            const result = await (0, index_1.executeTool)(toolCall.function.name, args, config);
            if (toolCall.function.name !== 'read_file')
                (0, ui_1.printToolResult)(result);
            history.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result,
            });
        }
    }
}
//# sourceMappingURL=repl.js.map