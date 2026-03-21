"use strict";
/**
 * @file client.ts
 * @version 0.1.2
 * @description Grok API client wrapping the OpenAI-compatible SDK with streaming and tool-call accumulation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrokClient = void 0;
const openai_1 = __importDefault(require("openai"));
const terminal_1 = require("./terminal");
const formatter_1 = require("./formatter");
class GrokClient {
    openai;
    config;
    constructor(config) {
        this.config = config;
        this.openai = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: 'https://api.x.ai/v1',
        });
    }
    async streamCompletion(messages, tools) {
        const stream = await this.openai.chat.completions.create({
            model: this.config.model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined,
            stream: true,
        });
        let text = '';
        let reasoning = '';
        const toolCallsAccumulator = new Map();
        let hasOutputText = false;
        const fmt = new formatter_1.ResponseFormatter();
        terminal_1.terminal.startSpinner();
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta)
                continue;
            // Reasoning models stream thinking tokens in reasoning_content.
            const reasoningChunk = delta.reasoning_content;
            if (reasoningChunk) {
                reasoning += reasoningChunk;
                terminal_1.terminal.updateSpinnerText(reasoning);
            }
            if (delta.content) {
                if (!hasOutputText) {
                    terminal_1.terminal.stopSpinner();
                    hasOutputText = true;
                }
                terminal_1.terminal.write(fmt.push(delta.content));
                text += delta.content;
            }
            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (!toolCallsAccumulator.has(tc.index)) {
                        toolCallsAccumulator.set(tc.index, { id: '', name: '', arguments: '' });
                    }
                    const entry = toolCallsAccumulator.get(tc.index);
                    if (tc.id)
                        entry.id = tc.id;
                    if (tc.function?.name)
                        entry.name = tc.function.name;
                    if (tc.function?.arguments)
                        entry.arguments += tc.function.arguments;
                }
            }
        }
        terminal_1.terminal.stopSpinner();
        if (hasOutputText)
            terminal_1.terminal.write(fmt.flush() + '\n');
        const toolCalls = Array.from(toolCallsAccumulator.entries())
            .sort(([a], [b]) => a - b)
            .map(([, tc]) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
        }));
        return { text, toolCalls };
    }
}
exports.GrokClient = GrokClient;
//# sourceMappingURL=client.js.map