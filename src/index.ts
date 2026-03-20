#!/usr/bin/env node
/**
 * @file index.ts
 * @version 0.1.0
 * @description CLI entry point; loads .env, initialises the terminal UI, and starts the REPL.
 */
import { config as loadDotenv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { loadConfig } from './config';
import { terminal } from './terminal';
import { printBanner, printError } from './ui';
import { startRepl } from './repl';

function findAndLoadDotenv(): void {
  const locations = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      loadDotenv({ path: loc });
      return;
    }
  }
  loadDotenv();
}

async function main(): Promise<void> {
  findAndLoadDotenv();

  let config;
  try {
    config = loadConfig();
  } catch (err: any) {
    // Not yet in TUI mode — plain stderr is fine here
    process.stderr.write(`Error: ${err.message}\n`);
    process.stderr.write('  Copy .env.example to .env and add your XAI_API_KEY.\n');
    process.exit(1);
  }

  terminal.init();
  printBanner(config.model);

  process.on('SIGINT', () => {
    terminal.cleanup();
    process.stdout.write('Goodbye!\n');
    process.exit(0);
  });

  await startRepl(config);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
