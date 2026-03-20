/**
 * @file session.ts
 * @version 0.1.0
 * @description Mutable session state shared across tools; resets on process exit.
 */

/** Mutable session state shared across all tools. */
export const session = {
  autoApproveEdits: false,
};
