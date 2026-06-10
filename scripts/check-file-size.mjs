import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = ["apps", "packages", "scripts"];
const extensions = new Set([".ts", ".tsx", ".vue", ".mjs", ".js"]);
const maxLines = 1300;
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "dist", "coverage", ".vite"].includes(entry.name)) {
        await walk(path);
      }
      continue;
    }

    const ext = entry.name.slice(entry.name.lastIndexOf("."));
    if (!extensions.has(ext)) {
      continue;
    }

    const content = await readFile(path, "utf8");
    const lineCount = content.split(/\r?\n/).length;
    if (lineCount > maxLines) {
      violations.push(`${path}: ${lineCount} lines`);
    }
  }
}

for (const root of roots) {
  await walk(root).catch((error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

if (violations.length > 0) {
  console.error(`Files exceed ${maxLines} lines:`);
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`All checked source files are <= ${maxLines} lines.`);
