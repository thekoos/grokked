#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file index.ts
 * @version 0.1.0
 * @description CLI entry point; loads .env, initialises the terminal UI, and starts the REPL.
 */
const dotenv_1 = require("dotenv");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = require("./config");
const terminal_1 = require("./terminal");
const ui_1 = require("./ui");
const repl_1 = require("./repl");
function findAndLoadDotenv() {
    const locations = [
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '..', '.env'),
    ];
    for (const loc of locations) {
        if (fs.existsSync(loc)) {
            (0, dotenv_1.config)({ path: loc });
            return;
        }
    }
    (0, dotenv_1.config)();
}
async function main() {
    findAndLoadDotenv();
    let config;
    try {
        config = (0, config_1.loadConfig)();
    }
    catch (err) {
        // Not yet in TUI mode — plain stderr is fine here
        process.stderr.write(`Error: ${err.message}\n`);
        process.stderr.write('  Copy .env.example to .env and add your XAI_API_KEY.\n');
        process.exit(1);
    }
    terminal_1.terminal.init();
    (0, ui_1.printBanner)(config.model);
    process.on('SIGINT', () => {
        terminal_1.terminal.cleanup();
        process.stdout.write('Goodbye!\n');
        process.exit(0);
    });
    await (0, repl_1.startRepl)(config);
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map