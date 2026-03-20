/**
 * @file tests/tools/edit.test.ts
 * @version 0.1.0
 * @description Tests for find-and-replace editing including $ literal safety, uniqueness checks, and denial.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('../../src/approval', () => ({
  approveEdit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/terminal', () => ({
  terminal: { write: vi.fn(), readChoice: vi.fn() },
}));

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-edit-'));
const TEST_FILE = path.join(TEST_DIR, 'test.ts');
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {});
afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  fs.writeFileSync(TEST_FILE, 'const x = "hello";\nconst y = "world";\n');
});

describe('executeEditFile', () => {
  it('replaces a unique string', async () => {
    const { executeEditFile } = await import('../../src/tools/edit');
    const result = await executeEditFile(
      { file_path: 'test.ts', old_string: '"hello"', new_string: '"hi"' },
      config,
    );
    expect(result).toMatch(/Edited/);
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe('const x = "hi";\nconst y = "world";\n');
  });

  it('treats $& in new_string as a literal string, not a back-reference', async () => {
    const { executeEditFile } = await import('../../src/tools/edit');
    await executeEditFile(
      { file_path: 'test.ts', old_string: '"hello"', new_string: '$& world $1 $$' },
      config,
    );
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('$& world $1 $$');
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).not.toContain('"hello" world');
  });

  it('treats $$ in new_string as literal $$', async () => {
    const { executeEditFile } = await import('../../src/tools/edit');
    await executeEditFile(
      { file_path: 'test.ts', old_string: '"hello"', new_string: 'cost is $$5' },
      config,
    );
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('cost is $$5');
  });

  it('returns error when old_string not found', async () => {
    const { executeEditFile } = await import('../../src/tools/edit');
    const result = await executeEditFile(
      { file_path: 'test.ts', old_string: 'nonexistent', new_string: 'x' },
      config,
    );
    expect(result).toMatch(/not found/i);
    // File should be unchanged
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('"hello"');
  });

  it('returns error when old_string appears more than once', async () => {
    fs.writeFileSync(TEST_FILE, 'foo\nfoo\n');
    const { executeEditFile } = await import('../../src/tools/edit');
    const result = await executeEditFile(
      { file_path: 'test.ts', old_string: 'foo', new_string: 'bar' },
      config,
    );
    expect(result).toMatch(/appears \d+ times/i);
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe('foo\nfoo\n');
  });

  it('returns error for missing file', async () => {
    const { executeEditFile } = await import('../../src/tools/edit');
    const result = await executeEditFile(
      { file_path: 'missing.ts', old_string: 'x', new_string: 'y' },
      config,
    );
    expect(result).toMatch(/not found/i);
  });

  it('returns denial message when not approved', async () => {
    const { approveEdit } = await import('../../src/approval');
    vi.mocked(approveEdit).mockResolvedValueOnce(false);
    const { executeEditFile } = await import('../../src/tools/edit');
    const result = await executeEditFile(
      { file_path: 'test.ts', old_string: '"hello"', new_string: 'denied' },
      config,
    );
    expect(result).toMatch(/denied/i);
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('"hello"');
  });
});
