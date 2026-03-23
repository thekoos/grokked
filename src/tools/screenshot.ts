/**
 * @file tools/screenshot.ts
 * @version 0.1.5
 * @description Region screenshot capture — routes to platform-specific helpers and returns base64 JPEG.
 *              Windows: PowerShell WinForms overlay. macOS: screencapture -i. Linux: scrot -s.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

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
  let stdout: string;
  try {
    const result = await execAsync(
      `powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 60000 },
    );
    stdout = result.stdout;
  } catch (err: any) {
    const stderr = err.stderr?.trim() ?? '';
    if (stderr.includes('antivirus') || stderr.includes('ScriptContainedMaliciousContent')) {
      throw new Error(
        'Windows Defender is blocking the screenshot script.\n' +
        '  Run this once in an admin PowerShell to allow it:\n' +
        `  Add-MpPreference -ExclusionPath "${scriptPath}"`,
      );
    }
    if (err.code === 1 && !stderr) return null;
    throw new Error(`Screenshot script failed (code ${err.code}): ${stderr || err.message}`);
  }
  return readAndDelete(stdout.trim());
}

async function captureMac(): Promise<string | null> {
  const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
  await execAsync(`screencapture -i -s -t jpg "${tmpFile}"`, { timeout: 60000 });
  return readAndDelete(tmpFile);
}

async function captureLinux(): Promise<string | null> {
  const tmpFile = path.join(os.tmpdir(), `grokked-${Date.now()}.jpg`);
  await execAsync(`scrot -s "${tmpFile}"`, { timeout: 60000 });
  return readAndDelete(tmpFile);
}

function readAndDelete(filePath: string): string | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const data = fs.readFileSync(filePath).toString('base64');
  fs.unlinkSync(filePath);
  return data;
}
