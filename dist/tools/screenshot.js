"use strict";
/**
 * @file tools/screenshot.ts
 * @version 0.1.5
 * @description Region screenshot capture — routes to platform-specific helpers and returns base64 JPEG.
 *              Windows: PowerShell WinForms overlay. macOS: screencapture -i. Linux: scrot -s.
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
exports.captureRegion = captureRegion;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Launches an interactive region selector and returns a base64-encoded JPEG,
 * null if the user cancelled, or throws on unexpected errors.
 */
async function captureRegion() {
    if (process.platform === 'win32')
        return await captureWindows();
    if (process.platform === 'darwin')
        return await captureMac();
    return await captureLinux();
}
async function captureWindows() {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'capture-region.ps1');
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Capture script not found: ${scriptPath}`);
    }
    let stdout;
    try {
        const result = await execAsync(`powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 60000 });
        stdout = result.stdout;
    }
    catch (err) {
        const stderr = err.stderr?.trim() ?? '';
        if (stderr.includes('antivirus') || stderr.includes('ScriptContainedMaliciousContent')) {
            throw new Error('Windows Defender is blocking the screenshot script.\n' +
                '  Run this once in an admin PowerShell to allow it:\n' +
                `  Add-MpPreference -ExclusionPath "${scriptPath}"`);
        }
        if (err.code === 1 && !stderr)
            return null;
        throw new Error(`Screenshot script failed (code ${err.code}): ${stderr || err.message}`);
    }
    return readAndDelete(stdout.trim());
}
async function captureMac() {
    const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
    await execAsync(`screencapture -i -s -t jpg "${tmpFile}"`, { timeout: 60000 });
    return readAndDelete(tmpFile);
}
async function captureLinux() {
    const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
    await execAsync(`scrot -s "${tmpFile}"`, { timeout: 60000 });
    return readAndDelete(tmpFile);
}
function readAndDelete(filePath) {
    if (!filePath || !fs.existsSync(filePath))
        return null;
    const data = fs.readFileSync(filePath).toString('base64');
    fs.unlinkSync(filePath);
    return data;
}
//# sourceMappingURL=screenshot.js.map