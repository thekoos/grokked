/**
 * @file tools/index.ts
 * @version 0.1.1
 * @description OpenAI-format tool definitions and dispatcher for all available tools.
 */

import OpenAI from 'openai';
import { Config } from '../config';
import { executeBash } from './bash';
import { executeReadFile } from './read';
import { executeWriteFile } from './write';
import { executeEditFile } from './edit';
import { executeGlob } from './glob';
import { executeGrep } from './grep';
import { executeListDir } from './list_dir';

export const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'bash',
      description:
        'Execute a shell command. The user will be prompted for approval before each execution. Use for running tests, installing packages, git operations, compiling, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute.',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the contents of a file. Line numbers are included in the output. Use offset and limit to read specific sections of large files.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the file (relative to working directory or absolute).',
          },
          offset: {
            type: 'number',
            description: 'Line number to start reading from (1-indexed). Omit to start from beginning.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of lines to read. Omit to read the whole file.',
          },
        },
        required: ['file_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create or overwrite a file with the given content. Creates parent directories automatically.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the file to write.',
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file.',
          },
        },
        required: ['file_path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Make a precise text replacement in a file. The old_string must match exactly (including whitespace and indentation) and must appear exactly once in the file. Always read the file first before editing.',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the file to edit.',
          },
          old_string: {
            type: 'string',
            description:
              'The exact text to find. Must be unique in the file. Include surrounding context if needed to make it unique.',
          },
          new_string: {
            type: 'string',
            description: 'The text to replace old_string with.',
          },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description:
        'Find files matching a glob pattern. Returns matching file paths. Useful for exploring project structure.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Glob pattern to match (e.g. "**/*.ts", "src/**/*.json", "*.md").',
          },
          path: {
            type: 'string',
            description:
              'Directory to search in, relative to working directory. Defaults to working directory.',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description:
        'List the contents of a directory. Shows directories (d) and files (f) with file sizes. Directories are listed first, then files, both sorted alphabetically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Directory path to list, relative to working directory. Defaults to working directory.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description:
        'Search file contents using a regex pattern. Returns matching lines with file paths and line numbers.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Regular expression pattern to search for.',
          },
          path: {
            type: 'string',
            description: 'Directory to search in, relative to working directory.',
          },
          glob: {
            type: 'string',
            description:
              'File glob to filter which files are searched (e.g. "*.ts", "**/*.json").',
          },
          case_insensitive: {
            type: 'boolean',
            description: 'If true, search case-insensitively.',
          },
        },
        required: ['pattern'],
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  config: Config,
): Promise<string> {
  try {
    switch (name) {
      case 'bash':
        return await executeBash(args as { command: string }, config);
      case 'read_file':
        return executeReadFile(
          args as { file_path: string; offset?: number; limit?: number },
          config,
        );
      case 'write_file':
        return await executeWriteFile(args as { file_path: string; content: string }, config);
      case 'edit_file':
        return await executeEditFile(
          args as { file_path: string; old_string: string; new_string: string },
          config,
        );
      case 'list_dir':
        return executeListDir(args as { path?: string }, config);
      case 'glob':
        return await executeGlob(args as { pattern: string; path?: string }, config);
      case 'grep':
        return await executeGrep(
          args as {
            pattern: string;
            path?: string;
            glob?: string;
            case_insensitive?: boolean;
          },
          config,
        );
      default:
        return `Error: Unknown tool "${name}"`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err.message}`;
  }
}
