import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** Service-owned runtime workspace allocator for model-serving execution. */
export class RuntimeWorkspaceService {
  private readonly baseDir: string;

  /** Creates a runtime workspace service rooted at the provided base directory. */
  public constructor(baseDir = join(homedir(), ".cli2api", "runtime-workspaces")) {
    this.baseDir = resolve(baseDir);
    mkdirSync(this.baseDir, { recursive: true });
  }

  /** Returns and creates the internal workspace for one public model profile. */
  public profileWorkspace(profileId: string): string {
    return this.ensure("profiles", profileId);
  }

  /** Returns and creates the internal workspace for one upstream execution instance. */
  public instanceWorkspace(instanceId: string): string {
    return this.ensure("instances", instanceId);
  }

  private ensure(kind: "profiles" | "instances", id: string): string {
    const path = join(this.baseDir, kind, workspaceSegment(id));
    mkdirSync(path, { recursive: true });
    return path;
  }
}

function workspaceSegment(id: string): string {
  const readable = id.replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/^-|-$/gu, "") || "workspace";
  const digest = createHash("sha256").update(id).digest("hex").slice(0, 12);
  return `${readable.slice(0, 48)}-${digest}`;
}
