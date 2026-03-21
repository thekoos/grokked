"use strict";
/**
 * @file repl.ts
 * @version 0.1.0
 * @description Main REPL loop and agentic tool-execution loop with conversation history management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRepl = startRepl;
const chalk_1 = __importDefault(require("chalk"));
const client_1 = require("./client");
const index_1 = require("./tools/index");
const ui_1 = require("./ui");
const terminal_1 = require("./terminal");
async function startRepl(config) {
    const client = new client_1.GrokClient(config);
    const history = [{ role: 'system', content: config.systemPrompt }];
    const commands = {
        '/help': () => (0, ui_1.printHelp)(),
        '/clear': () => {
            history.splice(1);
            terminal_1.terminal.write(chalk_1.default.dim('  History cleared.\n'));
        },
        '/exit': () => {
            terminal_1.terminal.cleanup();
            process.stdout.write('Goodbye!\n');
            process.exit(0);
        },
        '/model': () => terminal_1.terminal.write(chalk_1.default.dim(`  Model: ${config.model}\n`)),
    };
    while (true) {
        const input = (await terminal_1.terminal.readLine()).trim();
        if (!input)
            continue;
        if (input.startsWith('/')) {
            const cmd = commands[input];
            if (cmd)
                cmd();
            else
                terminal_1.terminal.write(chalk_1.default.red(`  Unknown command: ${input}. Type /help for commands.\n`));
            continue;
        }
        history.push({ role: 'user', content: input });
        // Snapshot length after user message — restore here on failure so any
        // partial assistant/tool messages added during the loop are rolled back.
        const historySnapshot = history.length;
        try {
            await runAgentLoop(client, history, config);
        }
        catch (err) {
            (0, ui_1.printError)(err.message);
            history.splice(historySnapshot);
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