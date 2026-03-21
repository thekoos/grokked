"use strict";
/**
 * @file approval.ts
 * @version 0.1.0
 * @description User approval prompts for file edits, with session-wide auto-approve support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveEdit = approveEdit;
const terminal_1 = require("./terminal");
const session_1 = require("./session");
/**
 * Prompt the user to approve a file edit.
 * Returns true if approved (immediately or via session-wide approval).
 */
async function approveEdit(description) {
    if (session_1.session.autoApproveEdits)
        return true;
    const choice = await terminal_1.terminal.readChoice(description, [
        'Yes',
        'Yes to all (this session)',
        'No',
    ]);
    if (choice === 2) {
        session_1.session.autoApproveEdits = true;
        return true;
    }
    return choice === 1;
}
//# sourceMappingURL=approval.js.map