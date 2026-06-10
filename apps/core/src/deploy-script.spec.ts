import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const deployScriptPath = fileURLToPath(new URL("../../../deploy.sh", import.meta.url));

describe("root deploy helper", () => {
  it("documents the supported Docker Compose commands and has valid Bash syntax", async () => {
    const script = await readFile(deployScriptPath, "utf8");

    expect(script).toContain("Usage: ./deploy.sh [command]");
    for (const command of ["deploy", "build", "up", "down", "restart", "status", "logs", "test", "help"]) {
      expect(script).toContain(`${command}`);
    }

    execFileSync("bash", ["-n", deployScriptPath]);
    const help = execFileSync("bash", [deployScriptPath, "help"], { encoding: "utf8" });
    expect(help).toContain("Build runtime service images");
    expect(help).toContain("Run the pnpm test suite");
  });
});
