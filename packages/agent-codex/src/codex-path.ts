import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolves the bundled Codex CLI shim before falling back to PATH lookup. */
export function resolveBundledCodexPath(): string {
  try {
    const sdkEntry = fileURLToPath(import.meta.resolve("@openai/codex-sdk"));
    const sdkRoot = dirname(dirname(sdkEntry));
    const executable = join(sdkRoot, "node_modules", ".bin", process.platform === "win32" ? "codex.cmd" : "codex");
    if (existsSync(executable)) {
      return executable;
    }
  } catch {
    // Fall through to PATH lookup for custom installs.
  }
  return "codex";
}
