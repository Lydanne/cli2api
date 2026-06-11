import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChildProcessAgentProcessRunner,
  type AgentProcessCommand,
  type AgentProcessEvent
} from "./index.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("ChildProcessAgentProcessRunner", () => {
  it("streams JSONL records split across stdout chunks and captures stderr", async () => {
    const script = await writeScript(
      "jsonl-chunks",
      [
        "process.stdout.write('{\"type\":\"alpha\",\"value\":1}\\n{\"type\"');",
        "process.stderr.write('warn-one\\n');",
        "setTimeout(() => {",
        "  process.stdout.write(':\"beta\",\"value\":2}\\n');",
        "}, 5);"
      ].join("\n")
    );

    const events = await collectProcessEvents({
      executable: process.execPath,
      args: [script],
      timeoutMs: 1_000
    });

    expect(events).toEqual([
      { type: "json", value: { type: "alpha", value: 1 }, line: '{"type":"alpha","value":1}' },
      { type: "stderr", chunk: "warn-one\n" },
      { type: "json", value: { type: "beta", value: 2 }, line: '{"type":"beta","value":2}' },
      expect.objectContaining({ type: "exit", exitCode: 0, timedOut: false, stderr: "warn-one\n" })
    ]);
  });

  it("reports bad JSON lines without hiding later process exit state", async () => {
    const script = await writeScript(
      "bad-json",
      [
        "process.stdout.write('{bad json}\\n');",
        "process.stdout.write('{\"type\":\"after\"}\\n');"
      ].join("\n")
    );

    const events = await collectProcessEvents({
      executable: process.execPath,
      args: [script],
      timeoutMs: 1_000
    });

    expect(events).toEqual([
      expect.objectContaining({ type: "error", code: "PROCESS_BAD_JSON", line: "{bad json}" }),
      { type: "json", value: { type: "after" }, line: '{"type":"after"}' },
      expect.objectContaining({ type: "exit", exitCode: 0, timedOut: false })
    ]);
  });

  it("reports non-zero process exits with captured stderr", async () => {
    const script = await writeScript(
      "non-zero",
      ["process.stderr.write('provider failed\\n');", "process.exit(7);"].join("\n")
    );

    const events = await collectProcessEvents({
      executable: process.execPath,
      args: [script],
      timeoutMs: 1_000
    });

    expect(events).toEqual([
      { type: "stderr", chunk: "provider failed\n" },
      expect.objectContaining({
        type: "exit",
        exitCode: 7,
        timedOut: false,
        stderr: "provider failed\n"
      })
    ]);
  });

  it("kills timed out processes and marks the exit event", async () => {
    const script = await writeScript("timeout", "setInterval(() => {}, 100);");

    const events = await collectProcessEvents({
      executable: process.execPath,
      args: [script],
      timeoutMs: 20
    });

    expect(events.at(-1)).toMatchObject({
      type: "exit",
      timedOut: true
    });
  });
});

async function collectProcessEvents(command: AgentProcessCommand): Promise<AgentProcessEvent[]> {
  const runner = new ChildProcessAgentProcessRunner();
  const events: AgentProcessEvent[] = [];
  for await (const event of runner.runJsonLines(command)) {
    events.push(event);
  }
  return events;
}

async function writeScript(name: string, source: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cli2api-process-runner-"));
  tempRoots.push(root);
  const scriptPath = join(root, `${name}.mjs`);
  await writeFile(scriptPath, source);
  return scriptPath;
}
