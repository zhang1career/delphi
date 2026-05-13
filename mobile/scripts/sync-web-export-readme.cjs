/**
 * Copies `web/readme.txt` into the Expo web export output (nginx: `/delphi/readme` → `readme.txt`).
 * Usage: node scripts/sync-web-export-readme.cjs <outputDir>
 * Default outputDir: dist — must match `expo export --output-dir`.
 */

const fs = require("fs");
const path = require("path");

const destDirRaw = (
  process.argv[2]?.trim() ||
  process.env.EXPO_WEB_EXPORT_DIR ||
  "dist"
).trim();
const destDir = destDirRaw || "dist";

const projectRoot = path.join(__dirname, "..");
const src = path.join(projectRoot, "web", "readme.txt");
const dest = path.join(projectRoot, destDir, "readme.txt");

if (!fs.existsSync(src)) {
  console.error("sync-web-export-readme: missing source file", src);
  process.exit(1);
}
if (!fs.existsSync(path.join(projectRoot, destDir))) {
  console.error(
    "sync-web-export-readme: output directory does not exist (run expo export first):",
    path.join(projectRoot, destDir),
  );
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log("sync-web-export-readme:", path.relative(projectRoot, dest));
