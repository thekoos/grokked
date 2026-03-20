/**
 * @file tools/write.ts
 * @version 0.1.0
 * @description File creation and overwrite tool with approval prompt and automatic directory creation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../config';
import { approveEdit } from '../approval';
import { resolvePath } from './utils';

export async function executeWriteFile(
  args: { file_path: string; content: string },
  config: Config,
): Promise<string> {
  const filePath = resolvePath(args.file_path, config.workingDir);
  const isNew = !fs.existsSync(filePath);
  const action = isNew ? 'Create' : 'Overwrite';

  const approved = await approveEdit(`${action} ${args.file_path}`);
  if (!approved) return `Write denied: ${args.file_path}`;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, args.content, 'utf-8');
  const lineCount = args.content.split('\n').length;
  return isNew
    ? `Created: ${args.file_path} (${lineCount} lines)`
    : `Updated: ${args.file_path} (${lineCount} lines)`;
}
