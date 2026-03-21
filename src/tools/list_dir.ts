/**
 * @file tools/list_dir.ts
 * @version 0.1.0
 * @description Lists the contents of a directory with type indicators and file sizes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../config';
import { resolvePath } from './utils';

export function executeListDir(
  args: { path?: string },
  config: Config,
): string {
  const targetPath = resolvePath(args.path ?? '.', config.workingDir);

  if (!fs.existsSync(targetPath)) {
    return `Error: Path not found: ${args.path ?? '.'}`;
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) {
    return `Error: Not a directory: ${args.path ?? '.'}`;
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });

  if (entries.length === 0) {
    return `(empty directory)`;
  }

  // Directories first, then files — each group sorted alphabetically.
  const dirs = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter((e) => !e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];

  for (const entry of dirs) {
    lines.push(`d  ${entry.name}/`);
  }

  for (const entry of files) {
    const fileStat = fs.statSync(path.join(targetPath, entry.name));
    lines.push(`f  ${entry.name}  (${formatSize(fileStat.size)})`);
  }

  const displayPath = args.path ?? '.';
  return `Contents of ${displayPath}:\n${lines.join('\n')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
