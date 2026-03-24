/**
 * @file tools/screenshot.ts
 * @version 0.1.9
 * @description Region screenshot capture — routes to platform-specific helpers and returns base64 JPEG.
 *              Windows: PowerShell WinForms overlay. macOS: screencapture -i. Linux: scrot -s.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Launches an interactive region selector and returns a base64-encoded JPEG,
 * null if the user cancelled, or throws on unexpected errors.
 */
export async function captureRegion(): Promise<string | null> {
  if (process.platform === 'win32') return await captureWindows();
  if (process.platform === 'darwin') return await captureMac();
  return await captureLinux();
}

async function captureWindows(): Promise<string | null> {
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'capture-region.ps1');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Capture script not found: ${scriptPath}`);
  }

  // Use spawn with windowsHide:true (CREATE_NO_WINDOW) instead of
  // "-WindowStyle Hidden". The latter hides the inherited console window
  // which causes Windows Terminal to minimize; CREATE_NO_WINDOW never
  // creates a console window in the first place so the parent is untouched.
  const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve, reject) => {
      const ps = spawn(
        'powershell.exe',
        ['-ExecutionPolicy', 'Bypass', '-NonInteractive', '-File', scriptPath],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let out = '';
      let err = '';
      ps.stdout.on('data', (d: Buffer) => (out += d));
      ps.stderr.on('data', (d: Buffer) => (err += d));
      ps.on('close', (c) => resolve({ stdout: out, stderr: err, code: c ?? 1 }));
      ps.on('error', reject);
    },
  );

  const errMsg = stderr.trim();
  if (errMsg.includes('antivirus') || errMsg.includes('ScriptContainedMaliciousContent')) {
    throw new Error(
      'Windows Defender is blocking the screenshot script.\n' +
      '  Run this once in an admin PowerShell to allow it:\n' +
      `  Add-MpPreference -ExclusionPath "${scriptPath}"`,
    );
  }
  if (code === 1 && !errMsg) return null;
  if (code !== 0) throw new Error(`Screenshot script failed (code ${code}): ${errMsg}`);
  return readAndDelete(stdout.trim());
}

async function captureMac(): Promise<string | null> {
  const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
  await runCmd('screencapture', ['-i', '-s', '-t', 'jpg', tmpFile]);
  return readAndDelete(tmpFile);
}

async function captureLinux(): Promise<string | null> {
  const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
  await runCmd('scrot', ['-s', tmpFile]);
  return readAndDelete(tmpFile);
}

function runCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on('error', reject);
  });
}

function readAndDelete(filePath: string): string | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath).toString('base64');
  fs.unlinkSync(filePath);
  return data;
}
