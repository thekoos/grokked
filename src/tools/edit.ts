/**
 * @file tools/edit.ts
 * @version 0.1.1
 * @description Precise find-and-replace file editing tool; treats replacement as a literal string to avoid $ pattern corruption.
 */

import * as fs from 'fs';
import { Config } from '../config';
import { approveEdit } from '../approval';
import { printEditDiff } from '../ui';
import { resolvePath } from './utils';

export async function executeEditFile(
  args: { file_path: string; old_string: string; new_string: string },
  config: Config,
): Promise<string> {
  const filePath = resolvePath(args.file_path, config.workingDir);

  if (!fs.existsSync(filePath)) {
    return `Error: File not found: ${args.file_path}`;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const occurrences = countOccurrences(content, args.old_string);

  if (occurrences === 0) {
    return `Error: old_string not found in ${args.file_path}. Read the file first and copy the exact text including whitespace.`;
  }

  if (occurrences > 1) {
    return `Error: old_string appears ${occurrences} times in ${args.file_path}. Add more surrounding context to make it unique.`;
  }

  const startLine = content.slice(0, content.indexOf(args.old_string)).split('\n').length;
  printEditDiff(args.file_path, args.old_string, args.new_string, startLine);

  const approved = await approveEdit(`Edit ${args.file_path}`);
  if (!approved) return `Edit denied: ${args.file_path}`;

  // Use a replacer function so new_string is treated as a literal string,
  // not a replacement pattern — prevents $& $1 $$ etc. from corrupting output.
  const newContent = content.replace(args.old_string, () => args.new_string);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return `Edited: ${args.file_path}`;
}

function countOccurrences(text: string, substring: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(substring, pos)) !== -1) {
    count++;
    pos += substring.length;
  }
  return count;
}
