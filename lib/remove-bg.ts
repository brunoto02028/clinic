import { execFile } from "child_process";
import { promisify } from "util";
import { copyFile, unlink, access } from "fs/promises";
import path from "path";
import { constants } from "fs";

const execFileAsync = promisify(execFile);

// Path to the rembg virtual environment python on the VPS
const REMBG_PYTHON = "/root/rembg-env/bin/python3";

/**
 * Remove background from a body assessment photo using rembg.
 * Saves the result (white background) back to the same filePath.
 * Non-fatal: if rembg fails, the original image is kept.
 * 
 * @param filePath - Path to the image file (will be overwritten with result)
 * @returns true if background was removed, false if skipped/failed
 */
export async function removeBackground(filePath: string): Promise<boolean> {
  try {
    // Check if rembg venv exists (only on VPS)
    try {
      await access(REMBG_PYTHON, constants.X_OK);
    } catch {
      // rembg not installed (local dev) — skip silently
      return false;
    }

    const scriptPath = path.join(process.cwd(), "scripts", "remove-bg.py");
    const tempOutput = filePath + ".nobg.jpg";

    await execFileAsync(REMBG_PYTHON, [scriptPath, filePath, tempOutput], {
      timeout: 120000, // 2 min timeout (first run downloads model ~170MB)
    });

    // Replace main file with bg-removed version
    await copyFile(tempOutput, filePath);
    await unlink(tempOutput).catch(() => {});

    console.log(`[remove-bg] Successfully removed background from ${path.basename(filePath)}`);
    return true;
  } catch (err: any) {
    console.warn(`[remove-bg] Failed (non-fatal), keeping original:`, err?.message || err);
    return false;
  }
}
