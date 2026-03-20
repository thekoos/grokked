/**
 * @file tests/tools/grep.test.ts
 * @version 0.1.0
 * @description Tests for regex content search including case sensitivity, glob filtering, and ignore patterns.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { executeGrep } from '../../src/tools/grep';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'grokked-grep-'));
const config = { workingDir: TEST_DIR } as any;

beforeAll(() => {
  fs.writeFileSync(
    path.join(TEST_DIR, 'alpha.ts'),
    'export function hello() {}\nexport function world() {}\n',
  );
  fs.writeFileSync(
    path.join(TEST_DIR, 'beta.ts'),
    'import { hello } from "./alpha";\nconst x = hello();\n',
  );
  fs.writeFileSync(
    path.join(TEST_DIR, 'notes.md'),
    'Hello World\nThis is a note.\nHELLO again.\n',
  );
  fs.mkdirSync(path.join(TEST_DIR, 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, 'node_modules', 'lib.ts'), 'export const hello = 1;');
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('executeGrep', () => {
  it('finds pattern across all files', async () => {
    const result = await executeGrep({ pattern: 'hello' }, config);
    expect(result).toContain('alpha.ts');
    expect(result).toContain('beta.ts');
  });

  it('returns line numbers with matches', async () => {
    const result = await executeGrep({ pattern: 'hello' }, config);
    expect(result).toMatch(/\d+:/);
  });

  it('is case-sensitive by default', async () => {
    const result = await executeGrep({ pattern: 'Hello' }, config);
    expect(result).toContain('notes.md');
    expect(result).not.toContain('alpha.ts'); // 'hello' != 'Hello'
  });

  it('case-insensitive search with case_insensitive: true', async () => {
    const result = await executeGrep({ pattern: 'hello', case_insensitive: true }, config);
    expect(result).toContain('alpha.ts');
    expect(result).toContain('notes.md');
  });

  it('filters by file glob', async () => {
    const result = await executeGrep({ pattern: 'hello', glob: '*.ts' }, config);
    expect(result).toContain('alpha.ts');
    expect(result).not.toContain('notes.md');
  });

  it('ignores node_modules', async () => {
    const result = await executeGrep({ pattern: 'hello' }, config);
    expect(result).not.toContain('node_modules');
  });

  it('returns no-match message when nothing found', async () => {
    const result = await executeGrep({ pattern: 'zzznomatch' }, config);
    expect(result).toMatch(/no matches found/i);
  });

  it('returns error for invalid regex', async () => {
    const result = await executeGrep({ pattern: '[invalid' }, config);
    expect(result).toMatch(/invalid regex/i);
  });
});
