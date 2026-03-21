"use strict";
/**
 * @file tools/write.ts
 * @version 0.1.0
 * @description File creation and overwrite tool with approval prompt and automatic directory creation.
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
exports.executeWriteFile = executeWriteFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const approval_1 = require("../approval");
const utils_1 = require("./utils");
async function executeWriteFile(args, config) {
    const filePath = (0, utils_1.resolvePath)(args.file_path, config.workingDir);
    const isNew = !fs.existsSync(filePath);
    const action = isNew ? 'Create' : 'Overwrite';
    const approved = await (0, approval_1.approveEdit)(`${action} ${args.file_path}`);
    if (!approved)
        return `Write denied: ${args.file_path}`;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, args.content, 'utf-8');
    const lineCount = args.content.split('\n').length;
    return isNew
        ? `Created: ${args.file_path} (${lineCount} lines)`
        : `Updated: ${args.file_path} (${lineCount} lines)`;
}
//# sourceMappingURL=write.js.map