/**
 * @file tools/bash.ts
 * @version 0.1.0
 * @description Shell command execution tool with per-command user approval and Windows shell detection.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { terminal } from '../terminal';
import { Config } from '../config';

const execAsync = promisify(exec);

// On Windows, prefer the shell the user is actually running in (e.g. Git Bash),
// falling back to cmd.exe. On other platforms, let Node pick the default shell.
const SHELL =
  process.platform === 'win32'
    ? (process.env.SHELL ?? process.env.ComSpec ?? 'cmd.exe')
    : undefined;

export async function executeBash(
  args: { command: string },
  config: Config,
): Promise<string> {
  const choice = await terminal.readChoice(`Run: ${args.command}`, ['Yes', 'No']);

  if (choice === 2) return 'Command execution denied by user.';

  try {
    const { stdout, stderr } = await execAsync(args.command, {
      cwd: config.workingDir,
      shell: SHELL,
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 10,
    });
    const output = [stdout, stderr].filter(Boolean).join('\n');
    return output || '(no output)';
  } catch (err: any) {
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n');
    return `Error (exit ${err.code ?? 1}):\n${output}`;
  }
}
