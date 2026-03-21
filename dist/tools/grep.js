"use strict";
/**
 * @file tools/grep.ts
 * @version 0.1.0
 * @description Regex content search tool with file-glob filtering, ignore patterns, and a 500-match ceiling.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGrep = executeGrep;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fast_glob_1 = __importDefault(require("fast-glob"));
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
async function executeGrep(args, config) {
    const searchDir = args.path
        ? path.resolve(config.workingDir, args.path)
        : config.workingDir;
    const filePattern = args.glob ?? '**/*';
    let files;
    try {
        files = await (0, fast_glob_1.default)(filePattern, {
            cwd: searchDir,
            dot: true,
            followSymbolicLinks: false,
            onlyFiles: true,
            ignore: DEFAULT_IGNORE,
        });
    }
    catch (err) {
        return `Error finding files: ${err.message}`;
    }
    if (files.length > 2000) {
        return `Error: Pattern matches ${files.length} files — too broad. Use the glob parameter to narrow the search.`;
    }
    const flags = args.case_insensitive ? 'gi' : 'g';
    let regex;
    try {
        regex = new RegExp(args.pattern, flags);
    }
    catch (err) {
        return `Error: Invalid regex: ${err.message}`;
    }
    const results = [];
    let totalMatches = 0;
    for (const file of files) {
        const filePath = path.join(searchDir, file);
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        }
        catch {
            continue;
        }
        const lines = content.split('\n');
        const matches = [];
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
//# sourceMappingURL=grep.js.map