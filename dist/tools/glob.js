"use strict";
/**
 * @file tools/glob.ts
 * @version 0.1.0
 * @description File pattern matching tool using fast-glob; includes dotfiles, excludes node_modules and .git.
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
exports.executeGlob = executeGlob;
const fast_glob_1 = __importDefault(require("fast-glob"));
const path = __importStar(require("path"));
async function executeGlob(args, config) {
    const searchDir = args.path
        ? path.resolve(config.workingDir, args.path)
        : config.workingDir;
    try {
        const files = await (0, fast_glob_1.default)(args.pattern, {
            cwd: searchDir,
            dot: true, // include dotfiles (.eslintrc, .github/, etc.)
            followSymbolicLinks: false,
            onlyFiles: true,
            ignore: ['node_modules/**', '.git/**'],
        });
        if (files.length === 0) {
            return `No files found matching: ${args.pattern}`;
        }
        return files.sort().join('\n');
    }
    catch (err) {
        return `Error: ${err.message}`;
    }
}
//# sourceMappingURL=glob.js.map