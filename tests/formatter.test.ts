/**
 * @file tests/formatter.test.ts
 * @version 0.1.0
 * @description Tests for ResponseFormatter streaming line buffering and $ literal handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseFormatter } from '../src/formatter';

describe('ResponseFormatter', () => {
  let fmt: ResponseFormatter;

  beforeEach(() => {
    fmt = new ResponseFormatter();
  });

  it('formats a complete line with indent and italic markers', () => {
    const out = fmt.push('Hello world\n');
    // Should contain the text indented (chalk italic wraps with ANSI codes)
    expect(out).toContain('Hello world');
    expect(out).toContain('  '); // 2-space indent
    expect(out.endsWith('\n')).toBe(true);
  });

  it('buffers incomplete lines and does not emit them yet', () => {
    const out = fmt.push('partial line');
    expect(out).toBe('');
  });

  it('emits buffered line once newline arrives', () => {
    fmt.push('partial');
    const out = fmt.push(' line\n');
    expect(out).toContain('partial line');
  });

  it('flush emits remaining buffer without trailing newline', () => {
    fmt.push('no newline');
    const flushed = fmt.flush();
    expect(flushed).toContain('no newline');
  });

  it('flush on empty buffer returns empty string', () => {
    expect(fmt.flush()).toBe('');
  });

  it('handles multiple newlines in one chunk', () => {
    const out = fmt.push('line1\nline2\nline3\n');
    const lines = out.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
    expect(out).toContain('line1');
    expect(out).toContain('line2');
    expect(out).toContain('line3');
  });

  it('handles $ characters without corrupting output', () => {
    const out = fmt.push('price is $& and $1 and $$\n');
    expect(out).toContain('price is $& and $1 and $$');
  });

  it('handles empty lines', () => {
    const out = fmt.push('\n');
    expect(out).toBe('  \n'); // indent applied to empty line
  });

  it('flush clears the buffer so subsequent calls return empty', () => {
    fmt.push('something');
    fmt.flush();
    expect(fmt.flush()).toBe('');
  });
});
