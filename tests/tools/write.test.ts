/**
 * @file tests/tools/write.test.ts
 * @version 0.1.0
 * @description Tests for file creation, overwriting, directory creation, and approval denial.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('../../src/approval', () => ({
  approveEdit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/terminal', () => ({
  terminal: { write: vi.fn(), readChoice: vi.fn() },
}));

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-write-'));
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {});
afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('executeWriteFile', () => {
  it('creates a new file', async () => {
    const { executeWriteFile } = await import('../../src/tools/write');
    const result = await executeWriteFile(
      { file_path: 'new.txt', content: 'hello\nworld\n' },
      config,
    );
    expect(result).toMatch(/Created/);
    expect(fs.readFileSync(path.join(TEST_DIR, 'new.txt'), 'utf-8')).toBe('hello\nworld\n');
  });

  it('overwrites an existing file', async () => {
    const { executeWriteFile } = await import('../../src/tools/write');
    fs.writeFileSync(path.join(TEST_DIR, 'existing.txt'), 'old content');
    const result = await executeWriteFile(
      { file_path: 'existing.txt', content: 'new content' },
      config,
    );
    expect(result).toMatch(/Updated/);
    expect(fs.readFileSync(path.join(TEST_DIR, 'existing.txt'), 'utf-8')).toBe('new content');
  });

  it('creates parent directories as needed', async () => {
    const { executeWriteFile } = await import('../../src/tools/write');
    await executeWriteFile(
      { file_path: 'deep/nested/file.txt', content: 'nested' },
      config,
    );
    expect(
      fs.existsSync(path.join(TEST_DIR, 'deep/nested/file.txt')),
    ).toBe(true);
  });

  it('includes line count in result', async () => {
    const { executeWriteFile } = await import('../../src/tools/write');
    const result = await executeWriteFile(
      { file_path: 'counted.txt', content: 'a\nb\nc\n' },
      config,
    );
    expect(result).toContain('4 lines'); // 3 lines + trailing newline = 4 parts
  });

  it('returns denial message when not approved', async () => {
    const { approveEdit } = await import('../../src/approval');
    vi.mocked(approveEdit).mockResolvedValueOnce(false);
    const { executeWriteFile } = await import('../../src/tools/write');
    const result = await executeWriteFile(
      { file_path: 'denied.txt', content: 'blocked' },
      config,
    );
    expect(result).toMatch(/denied/i);
    expect(fs.existsSync(path.join(TEST_DIR, 'denied.txt'))).toBe(false);
  });
});
