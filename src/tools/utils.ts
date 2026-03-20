/**
 * @file tools/utils.ts
 * @version 0.1.0
 * @description Shared utilities for tool implementations.
 */

import * as path from 'path';

/** Resolve a file path relative to the working directory, or return it as-is if absolute. */
export function resolvePath(filePath: string, workingDir: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workingDir, filePath);
}
