"use strict";
/**
 * @file tools/screenshot.ts
 * @version 0.1.9
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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
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
    // Use spawn with windowsHide:true (CREATE_NO_WINDOW) instead of
    // "-WindowStyle Hidden". The latter hides the inherited console window
    // which causes Windows Terminal to minimize; CREATE_NO_WINDOW never
    // creates a console window in the first place so the parent is untouched.
    const { stdout, stderr, code } = await new Promise((resolve, reject) => {
        const ps = (0, child_process_1.spawn)('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-NonInteractive', '-File', scriptPath], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        ps.stdout.on('data', (d) => (out += d));
        ps.stderr.on('data', (d) => (err += d));
        ps.on('close', (c) => resolve({ stdout: out, stderr: err, code: c ?? 1 }));
        ps.on('error', reject);
    });
    const errMsg = stderr.trim();
    if (errMsg.includes('antivirus') || errMsg.includes('ScriptContainedMaliciousContent')) {
        throw new Error('Windows Defender is blocking the screenshot script.\n' +
            '  Run this once in an admin PowerShell to allow it:\n' +
            `  Add-MpPreference -ExclusionPath "${scriptPath}"`);
    }
    if (code === 1 && !errMsg)
        return null;
    if (code !== 0)
        throw new Error(`Screenshot script failed (code ${code}): ${errMsg}`);
    return readAndDelete(stdout.trim());
}
async function captureMac() {
    const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
    await runCmd('screencapture', ['-i', '-s', '-t', 'jpg', tmpFile]);
    return readAndDelete(tmpFile);
}
async function captureLinux() {
    const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
    await runCmd('scrot', ['-s', tmpFile]);
    return readAndDelete(tmpFile);
}
function runCmd(cmd, args) {
    return new Promise((resolve, reject) => {
        const p = (0, child_process_1.spawn)(cmd, args);
        p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
        p.on('error', reject);
    });
}
function readAndDelete(filePath) {
    if (!filePath || !fs.existsSync(filePath))
        return null;
    const data = fs.readFileSync(filePath).toString('base64');
    fs.unlinkSync(filePath);
    return data;
}
//# sourceMappingURL=screenshot.js.map