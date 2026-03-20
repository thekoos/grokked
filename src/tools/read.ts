/**
 * @file tools/read.ts
 * @version 0.1.0
 * @description File reading tool with line numbers, 1-indexed offset, and line limit support.
 */

import * as fs from 'fs';
import { Config } from '../config';
import { resolvePath } from './utils';

export function executeReadFile(
  args: { file_path: string; offset?: number; limit?: number },
  config: Config,
): string {
  const filePath = resolvePath(args.file_path, config.workingDir);

  if (!fs.existsSync(filePath)) {
    return `Error: File not found: ${args.file_path}`;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return `Error: ${args.file_path} is a directory. Use glob to list files.`;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const offset = args.offset ? args.offset - 1 : 0; // convert 1-indexed to 0-indexed
  const limit = args.limit ?? lines.length;
  const slice = lines.slice(offset, offset + limit);

  const numbered = slice.map((line, i) => {
    const lineNum = String(offset + i + 1).padStart(4, ' ');
    return `${lineNum}\t${line}`;
  });

  const header = `File: ${args.file_path} (${lines.length} lines total, showing ${offset + 1}–${offset + slice.length})`;
  return `${header}\n${'─'.repeat(60)}\n${numbered.join('\n')}`;
}
