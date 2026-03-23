/**
 * @file tools/screenshot.ts
 * @version 0.1.0
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
 * or null if the user cancelled or an error occurred.
 */
export async function captureRegion(): Promise<string | null> {
  try {
    if (process.platform === 'win32') return await captureWindows();
    if (process.platform === 'darwin') return await captureMac();
    return await captureLinux();
  } catch {
    return null;
  }
}

async function captureWindows(): Promise<string | null> {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'capture-region.ps1');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Capture script not found: ${scriptPath}`);
  }
  const { stdout } = await execAsync(
    `powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`,
    { timeout: 60000 },
  );
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
