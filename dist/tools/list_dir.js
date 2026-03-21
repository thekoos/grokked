"use strict";
/**
 * @file tools/list_dir.ts
 * @version 0.1.0
 * @description Lists the contents of a directory with type indicators and file sizes.
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
exports.executeListDir = executeListDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
function executeListDir(args, config) {
    const targetPath = (0, utils_1.resolvePath)(args.path ?? '.', config.workingDir);
    if (!fs.existsSync(targetPath)) {
        return `Error: Path not found: ${args.path ?? '.'}`;
    }
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
        return `Error: Not a directory: ${args.path ?? '.'}`;
    }
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    if (entries.length === 0) {
        return `(empty directory)`;
    }
    // Directories first, then files — each group sorted alphabetically.
    const dirs = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter((e) => !e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    const lines = [];
    for (const entry of dirs) {
        lines.push(`d  ${entry.name}/`);
    }
    for (const entry of files) {
        const fileStat = fs.statSync(path.join(targetPath, entry.name));
        lines.push(`f  ${entry.name}  (${formatSize(fileStat.size)})`);
    }
    const displayPath = args.path ?? '.';
    return `Contents of ${displayPath}:\n${lines.join('\n')}`;
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
//# sourceMappingURL=list_dir.js.map