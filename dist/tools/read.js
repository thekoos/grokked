"use strict";
/**
 * @file tools/read.ts
 * @version 0.1.0
 * @description File reading tool with line numbers, 1-indexed offset, and line limit support.
 */
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
exports.executeReadFile = executeReadFile;
const fs = __importStar(require("fs"));
const utils_1 = require("./utils");
function executeReadFile(args, config) {
    const filePath = (0, utils_1.resolvePath)(args.file_path, config.workingDir);
    if (!fs.existsSync(filePath)) {
        return `Error: File not found: ${args.file_path}`;
    }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
        return `Error: ${args.file_path} is a directory. Use glob to list files.`;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const offset = args.offset ? args.offset - 1 : 0; // convert 1-indexed to 0-indexed
    const limit = args.limit ?? lines.length;
    const slice = lines.slice(offset, offset + limit);
    const numbered = slice.map((line, i) => {
        const lineNum = String(offset + i + 1).padStart(4, ' ');
        return `${lineNum}\t${line}`;
    });
    const header = `File: ${args.file_path} (${lines.length} lines total, showing ${offset + 1}–${offset + slice.length})`;
    return `${header}\n${'─'.repeat(60)}\n${numbered.join('\n')}`;
}
//# sourceMappingURL=read.js.map