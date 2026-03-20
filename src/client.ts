/**
 * @file client.ts
 * @version 0.1.0
 * @description Grok API client wrapping the OpenAI-compatible SDK with streaming and tool-call accumulation.
 */

import OpenAI from 'openai';
import { Config } from './config';
import { terminal } from './terminal';
import { ResponseFormatter } from './formatter';

export interface StreamResult {
  text: string;
  toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[];
}

export class GrokClient {
  private openai: OpenAI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  async streamCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.ChatCompletionTool[],
  ): Promise<StreamResult> {
    const stream = await this.openai.chat.completions.create({
      model: this.config.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: true,
    });

    let text = '';
    const toolCallsAccumulator = new Map<number, { id: string; name: string; arguments: string }>();
    let hasOutputText = false;
    const fmt = new ResponseFormatter();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        if (!hasOutputText) {
          terminal.write('\n');
          hasOutputText = true;
        }
        terminal.write(fmt.push(delta.content));
        text += delta.content;
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallsAccumulator.has(tc.index)) {
            toolCallsAccumulator.set(tc.index, { id: '', name: '', arguments: '' });
          }
          const entry = toolCallsAccumulator.get(tc.index)!;
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.arguments += tc.function.arguments;
        }
      }
    }

    if (hasOutputText) terminal.write(fmt.flush() + '\n');

    const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = Array.from(
      toolCallsAccumulator.entries(),
    )
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));

    return { text, toolCalls };
  }
}
