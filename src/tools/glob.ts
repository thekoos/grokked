/**
 * @file tools/glob.ts
 * @version 0.1.0
 * @description File pattern matching tool using fast-glob; includes dotfiles, excludes node_modules and .git.
 */

import fg from 'fast-glob';
import * as path from 'path';
import { Config } from '../config';

export async function executeGlob(
  args: { pattern: string; path?: string },
  config: Config,
): Promise<string> {
  const searchDir = args.path
    ? path.resolve(config.workingDir, args.path)
    : config.workingDir;

  try {
    const files = await fg(args.pattern, {
      cwd: searchDir,
      dot: true, // include dotfiles (.eslintrc, .github/, etc.)
      followSymbolicLinks: false,
      onlyFiles: true,
      ignore: ['node_modules/**', '.git/**'],
    });

    if (files.length === 0) {
      return `No files found matching: ${args.pattern}`;
    }

    return files.sort().join('\n');
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}
