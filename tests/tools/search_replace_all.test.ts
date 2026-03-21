/**
 * @file tests/tools/search_replace_all.test.ts
 * @version 0.1.0
 * @description Tests for search_replace_all including multi-occurrence replacement, $ literal safety, and denial.
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

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-sra-'));
const TEST_FILE = path.join(TEST_DIR, 'test.ts');
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {});
afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  fs.writeFileSync(TEST_FILE, 'const foo = 1;\nconst foo = 2;\nlet foo = 3;\n');
});

describe('executeSearchReplaceAll', () => {
  it('replaces all occurrences', async () => {
    const { executeSearchReplaceAll } = await import('../../src/tools/edit');
    const result = await executeSearchReplaceAll(
      { file_path: 'test.ts', old_string: 'foo', new_string: 'bar' },
      config,
    );
    expect(result).toMatch(/3 occurrences/i);
    const content = fs.readFileSync(TEST_FILE, 'utf-8');
    expect(content).not.toContain('foo');
    expect(content.match(/bar/g)?.length).toBe(3);
  });

  it('replaces a single occurrence and reports correctly', async () => {
    fs.writeFileSync(TEST_FILE, 'only one here\n');
    const { executeSearchReplaceAll } = await import('../../src/tools/edit');
    const result = await executeSearchReplaceAll(
      { file_path: 'test.ts', old_string: 'one', new_string: '1' },
      config,
    );
    expect(result).toMatch(/1 occurrence/i);
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('only 1 here');
  });

  it('treats $& in new_string as literal', async () => {
    fs.writeFileSync(TEST_FILE, 'foo foo\n');
    const { executeSearchReplaceAll } = await import('../../src/tools/edit');
    await executeSearchReplaceAll(
      { file_path: 'test.ts', old_string: 'foo', new_string: '$& bar' },
      config,
    );
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('$& bar $& bar');
  });

  it('returns error when old_string not found', async () => {
    const { executeSearchReplaceAll } = await import('../../src/tools/edit');
    const result = await executeSearchReplaceAll(
      { file_path: 'test.ts', old_string: 'nonexistent', new_string: 'x' },
      config,
    );
    expect(result).toMatch(/not found/i);
  });

  it('returns error for missing file', async () => {
    const { executeSearchReplaceAll } = await import('../../src/tools/edit');
    const result = await executeSearchReplaceAll(
      { file_path: 'missing.ts', old_string: 'foo', new_string: 'bar' },
      config,
    );
    expect(result).toMatch(/not found/i);
  });

  it('returns denial message when not approved', async () => {
    const { approveEdit } = await import('../../src/approval');
    vi.mocked(approveEdit).mockResolvedValueOnce(false);
    const { executeSearchReplaceAll } = await import('../../src/tools/edit');
    const result = await executeSearchReplaceAll(
      { file_path: 'test.ts', old_string: 'foo', new_string: 'bar' },
      config,
    );
    expect(result).toMatch(/denied/i);
    expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('foo');
  });
});
