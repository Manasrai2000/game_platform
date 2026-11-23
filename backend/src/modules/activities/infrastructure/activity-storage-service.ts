import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { BadRequestError } from "../../../core/errors/app-error";

export interface ExtractedPackageInfo {
  storagePath: string; // relative to storage/activities
  entryFile: string;
  totalCheckpoints: number;
}

export class ActivityStorageService {
  private baseStorageDir: string;

  constructor() {
    this.baseStorageDir = path.resolve(__dirname, "../../../../storage/activities");
    if (!fs.existsSync(this.baseStorageDir)) {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    }
  }

  /**
   * Safely unpacks a ZIP file with Zip Slip and Zip Bomb validation.
   */
  async extractPackage(
    buffer: Buffer,
    classId: number
  ): Promise<ExtractedPackageInfo> {
    const destinationDir = path.join(this.baseStorageDir, `class_${classId}`);

    // Clean existing directory if it exists
    if (fs.existsSync(destinationDir)) {
      fs.rmSync(destinationDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destinationDir, { recursive: true });

    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestError("Invalid ZIP file format");
    }

    const zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
      throw new BadRequestError("The uploaded ZIP file is empty");
    }

    let totalUncompressedSize = 0;
    const MAX_SIZE = 150 * 1024 * 1024; // 150 MB max uncompressed

    // Security Scan: Zip Slip and Size Limit
    for (const entry of zipEntries) {
      totalUncompressedSize += entry.header.size;
      if (totalUncompressedSize > MAX_SIZE) {
        fs.rmSync(destinationDir, { recursive: true, force: true });
        throw new BadRequestError("Extracted package exceeds the 150MB limit (Zip Bomb protection)");
      }

      // Check for Zip Slip path traversal
      const targetPath = path.resolve(destinationDir, entry.entryName);
      if (!targetPath.startsWith(destinationDir)) {
        fs.rmSync(destinationDir, { recursive: true, force: true });
        throw new BadRequestError("Malicious ZIP entry detected: path traversal disallowed");
      }
    }

    // Extract all files
    zip.extractAllTo(destinationDir, true);

    // Verify index.html exists either at root or in top-level subdirectory
    let entryFile = "index.html";
    if (!fs.existsSync(path.join(destinationDir, "index.html"))) {
      // Check if wrapped in a single root folder (e.g. my-game/index.html)
      const subdirs = fs.readdirSync(destinationDir, { withFileTypes: true });
      const dirOnly = subdirs.filter((d) => d.isDirectory());
      let foundInSubdir = false;

      for (const d of dirOnly) {
        if (fs.existsSync(path.join(destinationDir, d.name, "index.html"))) {
          entryFile = `${d.name}/index.html`;
          foundInSubdir = true;
          break;
        }
      }

      if (!foundInSubdir) {
        fs.rmSync(destinationDir, { recursive: true, force: true });
        throw new BadRequestError("Package must contain an 'index.html' entry point");
      }
    }

    return {
      storagePath: `class_${classId}`,
      entryFile,
      totalCheckpoints: 3, // default checkpoints
    };
  }

  deletePackage(classId: number): void {
    const dir = path.join(this.baseStorageDir, `class_${classId}`);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

export const activityStorageService = new ActivityStorageService();
