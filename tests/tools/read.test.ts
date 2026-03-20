/**
 * @file tests/tools/read.test.ts
 * @version 0.1.0
 * @description Tests for file reading with offset, limit, line numbers, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { executeReadFile } from '../../src/tools/read';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-read-'));
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {
  fs.writeFileSync(path.join(TEST_DIR, 'sample.txt'), 'line1\nline2\nline3\nline4\nline5\n');
  fs.writeFileSync(path.join(TEST_DIR, 'single.txt'), 'only one line');
  fs.mkdirSync(path.join(TEST_DIR, 'subdir'));
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('executeReadFile', () => {
  it('reads entire file with line numbers', () => {
    const result = executeReadFile({ file_path: 'sample.txt' }, config);
    expect(result).toContain('line1');
    expect(result).toContain('line5');
    expect(result).toContain('1\t'); // line number
    expect(result).toContain('5\t');
  });

  it('respects offset (1-indexed)', () => {
    const result = executeReadFile({ file_path: 'sample.txt', offset: 3 }, config);
    expect(result).toContain('line3');
    expect(result).toContain('line5');
    expect(result).not.toContain('line1');
    expect(result).not.toContain('line2');
  });

  it('respects limit', () => {
    const result = executeReadFile({ file_path: 'sample.txt', limit: 2 }, config);
    expect(result).toContain('line1');
    expect(result).toContain('line2');
    expect(result).not.toContain('line3');
  });

  it('respects offset + limit together', () => {
    const result = executeReadFile({ file_path: 'sample.txt', offset: 2, limit: 2 }, config);
    expect(result).toContain('line2');
    expect(result).toContain('line3');
    expect(result).not.toContain('line1');
    expect(result).not.toContain('line4');
  });

  it('returns error for missing file', () => {
    const result = executeReadFile({ file_path: 'nonexistent.txt' }, config);
    expect(result).toMatch(/Error.*not found/i);
  });

  it('returns error for directory', () => {
    const result = executeReadFile({ file_path: 'subdir' }, config);
    expect(result).toMatch(/Error.*directory/i);
  });

  it('includes total line count in header', () => {
    const result = executeReadFile({ file_path: 'sample.txt' }, config);
    // trailing newline produces an empty final element, so split gives 6 parts
    expect(result).toContain('6 lines total');
  });

  it('handles file without trailing newline', () => {
    const result = executeReadFile({ file_path: 'single.txt' }, config);
    expect(result).toContain('only one line');
  });
});
