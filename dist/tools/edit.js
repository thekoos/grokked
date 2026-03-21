"use strict";
/**
 * @file tools/edit.ts
 * @version 0.1.0
 * @description Precise find-and-replace file editing tool; treats replacement as a literal string to avoid $ pattern corruption.
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
exports.executeEditFile = executeEditFile;
const fs = __importStar(require("fs"));
const approval_1 = require("../approval");
const utils_1 = require("./utils");
async function executeEditFile(args, config) {
    const filePath = (0, utils_1.resolvePath)(args.file_path, config.workingDir);
    if (!fs.existsSync(filePath)) {
        return `Error: File not found: ${args.file_path}`;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const occurrences = countOccurrences(content, args.old_string);
    if (occurrences === 0) {
        return `Error: old_string not found in ${args.file_path}. Read the file first and copy the exact text including whitespace.`;
    }
    if (occurrences > 1) {
        return `Error: old_string appears ${occurrences} times in ${args.file_path}. Add more surrounding context to make it unique.`;
    }
    const approved = await (0, approval_1.approveEdit)(`Edit ${args.file_path}`);
    if (!approved)
        return `Edit denied: ${args.file_path}`;
    // Use a replacer function so new_string is treated as a literal string,
    // not a replacement pattern — prevents $& $1 $$ etc. from corrupting output.
    const newContent = content.replace(args.old_string, () => args.new_string);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return `Edited: ${args.file_path}`;
}
function countOccurrences(text, substring) {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(substring, pos)) !== -1) {
        count++;
        pos += substring.length;
    }
    return count;
}
//# sourceMappingURL=edit.js.map