"use strict";
/**
 * @file context.ts
 * @version 0.1.0
 * @description Session context persistence — saves an AI-generated summary on exit and loads it on startup.
 *              Context is stored in .grokked/context.md in the working directory.
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
exports.contextPath = contextPath;
exports.loadContext = loadContext;
exports.clearContext = clearContext;
exports.saveContext = saveContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CONTEXT_DIR = '.grokked';
const CONTEXT_FILE = 'context.md';
function contextPath(workingDir) {
    return path.join(workingDir, CONTEXT_DIR, CONTEXT_FILE);
}
function loadContext(workingDir) {
    const p = contextPath(workingDir);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}
function clearContext(workingDir) {
    const p = contextPath(workingDir);
    if (fs.existsSync(p))
        fs.unlinkSync(p);
}
async function saveContext(client, history, workingDir) {
    if (history.length <= 1)
        return; // nothing beyond the system message
    const summary = await client.summarize(history);
    if (!summary)
        return;
    const p = contextPath(workingDir);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(p, `# Session Context — ${date}\n\n${summary}\n`, 'utf-8');
}
//# sourceMappingURL=context.js.map