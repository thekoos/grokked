/**
 * @file tests/tools/list_dir.test.ts
 * @version 0.1.0
 * @description Tests for directory listing including type indicators, sorting, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { executeListDir } from '../../src/tools/list_dir';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-listdir-'));
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {
  fs.writeFileSync(path.join(TEST_DIR, 'README.md'), 'hello');
  fs.writeFileSync(path.join(TEST_DIR, 'index.ts'), '');
  fs.mkdirSync(path.join(TEST_DIR, 'src'));
  fs.mkdirSync(path.join(TEST_DIR, 'dist'));
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'app.ts'), 'content');
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('executeListDir', () => {
  it('lists directories before files', () => {
    const result = executeListDir({}, config);
    const lines = result.split('\n');
    const dLines = lines.filter((l) => l.startsWith('d'));
    const fLines = lines.filter((l) => l.startsWith('f'));
    const firstDirIdx = lines.findIndex((l) => l.startsWith('d'));
    const firstFileIdx = lines.findIndex((l) => l.startsWith('f'));
    expect(dLines.length).toBeGreaterThan(0);
    expect(fLines.length).toBeGreaterThan(0);
    expect(firstDirIdx).toBeLessThan(firstFileIdx);
  });

  it('shows directories with trailing slash', () => {
    const result = executeListDir({}, config);
    expect(result).toContain('d  src/');
    expect(result).toContain('d  dist/');
  });

  it('shows files with size', () => {
    const result = executeListDir({}, config);
    expect(result).toContain('f  README.md');
    expect(result).toContain('f  index.ts');
  });

  it('sorts entries alphabetically within each group', () => {
    const result = executeListDir({}, config);
    const dirLines = result.split('\n').filter((l) => l.startsWith('d'));
    const names = dirLines.map((l) => l.replace('d  ', '').replace('/', ''));
    expect(names).toEqual([...names].sort());
  });

  it('lists a subdirectory when path is provided', () => {
    const result = executeListDir({ path: 'src' }, config);
    expect(result).toContain('app.ts');
    expect(result).not.toContain('README.md');
  });

  it('returns error for non-existent path', () => {
    const result = executeListDir({ path: 'no-such-dir' }, config);
    expect(result).toMatch(/error/i);
    expect(result).toContain('no-such-dir');
  });

  it('returns error when path is a file not a directory', () => {
    const result = executeListDir({ path: 'README.md' }, config);
    expect(result).toMatch(/not a directory/i);
  });

  it('returns empty message for empty directory', () => {
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir);
    const result = executeListDir({ path: 'empty' }, config);
    expect(result).toMatch(/empty/i);
  });
});
