/**
 * @file tests/tools/glob.test.ts
 * @version 0.1.0
 * @description Tests for file pattern matching including dotfiles and subdirectory scoping.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { executeGlob } from '../../src/tools/glob';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-glob-'));
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {
  fs.writeFileSync(path.join(TEST_DIR, 'index.ts'), '');
  fs.writeFileSync(path.join(TEST_DIR, 'util.ts'), '');
  fs.writeFileSync(path.join(TEST_DIR, 'README.md'), '');
  fs.writeFileSync(path.join(TEST_DIR, '.eslintrc'), '');
  fs.mkdirSync(path.join(TEST_DIR, 'src'));
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'app.ts'), '');
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'app.test.ts'), '');
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('executeGlob', () => {
  it('finds files matching a pattern', async () => {
    const result = await executeGlob({ pattern: '*.ts' }, config);
    expect(result).toContain('index.ts');
    expect(result).toContain('util.ts');
    expect(result).not.toContain('README.md');
  });

  it('finds files recursively with **', async () => {
    const result = await executeGlob({ pattern: '**/*.ts' }, config);
    expect(result).toContain('index.ts');
    expect(result).toContain('src/app.ts');
  });

  it('finds dotfiles (dot: true)', async () => {
    const result = await executeGlob({ pattern: '.*' }, config);
    expect(result).toContain('.eslintrc');
  });

  it('returns no-match message when nothing found', async () => {
    const result = await executeGlob({ pattern: '*.xyz' }, config);
    expect(result).toMatch(/no files found/i);
  });

  it('searches within a subdirectory when path is provided', async () => {
    const result = await executeGlob({ pattern: '*.ts', path: 'src' }, config);
    expect(result).toContain('app.ts');
    expect(result).toContain('app.test.ts');
    expect(result).not.toContain('index.ts');
  });

  it('finds markdown files', async () => {
    const result = await executeGlob({ pattern: '*.md' }, config);
    expect(result).toContain('README.md');
  });
});
