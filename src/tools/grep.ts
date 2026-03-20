/**
 * @file tools/grep.ts
 * @version 0.1.0
 * @description Regex content search tool with file-glob filtering, ignore patterns, and a 500-match ceiling.
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { Config } from '../config';

const DEFAULT_IGNORE = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '.cache/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
];

export async function executeGrep(
  args: {
    pattern: string;
    path?: string;
    glob?: string;
    case_insensitive?: boolean;
  },
  config: Config,
): Promise<string> {
  const searchDir = args.path
    ? path.resolve(config.workingDir, args.path)
    : config.workingDir;

  const filePattern = args.glob ?? '**/*';

  let files: string[];
  try {
    files = await fg(filePattern, {
      cwd: searchDir,
      dot: true,
      followSymbolicLinks: false,
      onlyFiles: true,
      ignore: DEFAULT_IGNORE,
    });
  } catch (err: any) {
    return `Error finding files: ${err.message}`;
  }

  if (files.length > 2000) {
    return `Error: Pattern matches ${files.length} files — too broad. Use the glob parameter to narrow the search.`;
  }

  const flags = args.case_insensitive ? 'gi' : 'g';
  let regex: RegExp;
  try {
    regex = new RegExp(args.pattern, flags);
  } catch (err: any) {
    return `Error: Invalid regex: ${err.message}`;
  }

  const results: string[] = [];
  let totalMatches = 0;

  for (const file of files) {
    const filePath = path.join(searchDir, file);
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    const matches: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      regex.lastIndex = 0;
      if (regex.test(lines[i] ?? '')) {
        matches.push(`  ${String(i + 1).padStart(4)}: ${lines[i] ?? ''}`);
        totalMatches++;
      }
    }

    if (matches.length > 0) {
      results.push(`${file}:\n${matches.join('\n')}`);
    }

    if (totalMatches >= 500) {
      results.push('... (truncated — too many matches, narrow your search)');
      break;
    }
  }

  if (results.length === 0) {
    return `No matches found for: ${args.pattern}`;
  }

  return results.join('\n\n');
}
