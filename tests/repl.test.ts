/**
 * @file tests/repl.test.ts
 * @version 0.1.0
 * @description Tests for stripImagesFromHistory and runAgentLoop in repl.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GrokClient } from '../src/client';

vi.mock('../src/tools/index', () => ({
  toolDefinitions: [],
  executeTool: vi.fn(),
}));

vi.mock('../src/ui', () => ({
  printToolStart: vi.fn(),
  printToolResult: vi.fn(),
}));

import { stripImagesFromHistory, runAgentLoop } from '../src/repl';
import { executeTool } from '../src/tools/index';

// ---------------------------------------------------------------------------
// stripImagesFromHistory
// ---------------------------------------------------------------------------

describe('stripImagesFromHistory', () => {
  it('leaves string content unchanged', () => {
    const history: any[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'world' },
    ];
    stripImagesFromHistory(history);
    expect(history[0].content).toBe('hello');
    expect(history[1].content).toBe('world');
  });

  it('strips image_url parts and keeps text', () => {
    const history: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' } },
        ],
      },
    ];
    stripImagesFromHistory(history);
    expect(history[0].content).toBe('What is this?');
  });

  it('joins multiple text parts with a space', () => {
    const history: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Part one.' },
          { type: 'text', text: 'Part two.' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,xyz' } },
        ],
      },
    ];
    stripImagesFromHistory(history);
    expect(history[0].content).toBe('Part one. Part two.');
  });

  it('leaves image-only content arrays unchanged (no text to preserve)', () => {
    const history: any[] = [
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,xyz' } }],
      },
    ];
    stripImagesFromHistory(history);
    // No text parts → content stays as array
    expect(Array.isArray(history[0].content)).toBe(true);
  });

  it('handles null content without throwing', () => {
    const history: any[] = [{ role: 'assistant', content: null }];
    expect(() => stripImagesFromHistory(history)).not.toThrow();
    expect(history[0].content).toBeNull();
  });

  it('does not touch system or tool messages', () => {
    const history: any[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'tool', tool_call_id: 'x', content: 'result' },
    ];
    stripImagesFromHistory(history);
    expect(history[0].content).toBe('You are helpful.');
    expect(history[1].content).toBe('result');
  });
});

// ---------------------------------------------------------------------------
// runAgentLoop
// ---------------------------------------------------------------------------

function makeClient(responses: Array<{ text: string; toolCalls: any[] }>): GrokClient {
  let call = 0;
  return {
    streamCompletion: vi.fn(async () => {
      const r = responses[call] ?? { text: '', toolCalls: [] };
      call++;
      return r;
    }),
  } as unknown as GrokClient;
}

const config: any = { workingDir: '/tmp', model: 'test', systemPrompt: '', apiKey: 'x' };

beforeEach(() => {
  vi.mocked(executeTool).mockReset();
});

describe('runAgentLoop', () => {
  it('pushes assistant message and returns when no tool calls', async () => {
    const client = makeClient([{ text: 'Hello!', toolCalls: [] }]);
    const history: any[] = [{ role: 'user', content: 'hi' }];

    await runAgentLoop(client, history, config);

    expect(history).toHaveLength(2);
    expect(history[1]).toEqual({ role: 'assistant', content: 'Hello!' });
  });

  it('executes tool calls and loops until no more tool calls', async () => {
    vi.mocked(executeTool).mockResolvedValue('file contents');

    const client = makeClient([
      {
        text: '',
        toolCalls: [{ id: 'tc1', type: 'function', function: { name: 'read_file', arguments: '{"file_path":"foo.ts"}' } }],
      },
      { text: 'Done.', toolCalls: [] },
    ]);

    const history: any[] = [{ role: 'user', content: 'read foo.ts' }];
    await runAgentLoop(client, history, config);

    // turn 1: assistant (with tool_calls) + tool result
    // turn 2: final assistant text
    expect(history).toHaveLength(4);
    expect(history[1].role).toBe('assistant');
    expect(history[1].tool_calls).toHaveLength(1);
    expect(history[2]).toEqual({ role: 'tool', tool_call_id: 'tc1', content: 'file contents' });
    expect(history[3]).toEqual({ role: 'assistant', content: 'Done.' });

    expect(executeTool).toHaveBeenCalledWith('read_file', { file_path: 'foo.ts' }, config);
  });

  it('falls back to empty args when tool call arguments are invalid JSON', async () => {
    vi.mocked(executeTool).mockResolvedValue('ok');

    const client = makeClient([
      {
        text: '',
        toolCalls: [{ id: 'tc2', type: 'function', function: { name: 'bash', arguments: '<<<bad json>>>' } }],
      },
      { text: 'Done.', toolCalls: [] },
    ]);

    const history: any[] = [{ role: 'user', content: 'do something' }];
    await runAgentLoop(client, history, config);

    expect(executeTool).toHaveBeenCalledWith('bash', {}, config);
  });

  it('handles multiple tool calls in a single turn', async () => {
    vi.mocked(executeTool).mockResolvedValue('result');

    const client = makeClient([
      {
        text: '',
        toolCalls: [
          { id: 'a', type: 'function', function: { name: 'read_file', arguments: '{"file_path":"a.ts"}' } },
          { id: 'b', type: 'function', function: { name: 'read_file', arguments: '{"file_path":"b.ts"}' } },
        ],
      },
      { text: 'Got both.', toolCalls: [] },
    ]);

    const history: any[] = [{ role: 'user', content: 'read two files' }];
    await runAgentLoop(client, history, config);

    expect(executeTool).toHaveBeenCalledTimes(2);
    // Two tool result messages
    expect(history[2]).toMatchObject({ role: 'tool', tool_call_id: 'a' });
    expect(history[3]).toMatchObject({ role: 'tool', tool_call_id: 'b' });
    expect(history[4]).toEqual({ role: 'assistant', content: 'Got both.' });
  });

  it('stores null content on assistant message when text is empty and tools are called', async () => {
    vi.mocked(executeTool).mockResolvedValue('res');

    const client = makeClient([
      {
        text: '',
        toolCalls: [{ id: 'x', type: 'function', function: { name: 'bash', arguments: '{"command":"ls"}' } }],
      },
      { text: 'Listed.', toolCalls: [] },
    ]);

    const history: any[] = [];
    await runAgentLoop(client, history, config);

    expect(history[0].content).toBeNull();
  });
});
