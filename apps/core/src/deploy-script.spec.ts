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

  it("copies package-level pnpm node_modules into the runtime image", async () => {
    const dockerfilePath = fileURLToPath(new URL("../../../Dockerfile", import.meta.url));
    const packageJsonPath = fileURLToPath(new URL("../../../package.json", import.meta.url));
    const dockerfile = await readFile(dockerfilePath, "utf8");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      pnpm?: { onlyBuiltDependencies?: string[] };
    };

    const allowedBuilds = packageJson.pnpm?.onlyBuiltDependencies ?? [];

    expect(allowedBuilds).toContain("better-sqlite3");
    expect(allowedBuilds).toContain("esbuild");
    expect(dockerfile).toContain("pnpm rebuild better-sqlite3");
    expect(dockerfile).toContain("COPY --from=build /app/apps/core/node_modules ./apps/core/node_modules");
    expect(dockerfile).toContain(
      "COPY --from=build /app/packages/agents-sdk/node_modules ./packages/agents-sdk/node_modules"
    );
  });

  it("defines a dashboard Compose service with same-origin API proxying", async () => {
    const composePath = fileURLToPath(new URL("../../../compose.yaml", import.meta.url));
    const nginxPath = fileURLToPath(new URL("../../../docker/dash.nginx.conf", import.meta.url));
    const script = await readFile(deployScriptPath, "utf8");
    const compose = await readFile(composePath, "utf8");
    const nginx = await readFile(nginxPath, "utf8");

    expect(compose).toContain("dash:");
    expect(compose).toContain("target: dash-runtime");
    expect(compose).toContain("${CLI2API_DASH_PUBLISHED_PORT:-5173}:80");
    expect(nginx).toContain("proxy_pass http://api:3000/api/");
    expect(nginx).toContain("proxy_pass http://api:3000/v1/");
    expect(script).toContain("DASH_HEALTH_URL");
  });
});
