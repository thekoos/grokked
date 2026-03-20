/**
 * @file approval.ts
 * @version 0.1.0
 * @description User approval prompts for file edits, with session-wide auto-approve support.
 */

import { terminal } from './terminal';
import { session } from './session';

/**
 * Prompt the user to approve a file edit.
 * Returns true if approved (immediately or via session-wide approval).
 */
export async function approveEdit(description: string): Promise<boolean> {
  if (session.autoApproveEdits) return true;

  const choice = await terminal.readChoice(description, [
    'Yes',
    'Yes to all (this session)',
    'No',
  ]);

  if (choice === 2) {
    session.autoApproveEdits = true;
    return true;
  }

  return choice === 1;
}
