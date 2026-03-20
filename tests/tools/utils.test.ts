/**
 * @file tests/tools/utils.test.ts
 * @version 0.1.0
 * @description Tests for the resolvePath shared utility.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { resolvePath } from '../../src/tools/utils';

describe('resolvePath', () => {
  const workingDir = '/home/user/project';

  it('returns absolute paths unchanged', () => {
    expect(resolvePath('/etc/hosts', workingDir)).toBe('/etc/hosts');
  });

  it('resolves relative paths against workingDir', () => {
    expect(resolvePath('src/index.ts', workingDir)).toBe(
      path.join(workingDir, 'src/index.ts'),
    );
  });

  it('resolves bare filename against workingDir', () => {
    expect(resolvePath('README.md', workingDir)).toBe(
      path.join(workingDir, 'README.md'),
    );
  });

  it('handles nested relative paths', () => {
    expect(resolvePath('a/b/c.txt', workingDir)).toBe(
      path.join(workingDir, 'a/b/c.txt'),
    );
  });
});
