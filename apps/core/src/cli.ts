import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openCoreDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";
import { createServices } from "./services/index.js";

/** Runs the cli2api management CLI. */
export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command] = argv;
  const subcommand = command === "admin" || command === "key" ? argv[1] : undefined;
  const rest = command === "admin" || command === "key" ? argv.slice(2) : argv.slice(1);
  const options = parseOptions(rest);
  const config = loadConfig({
    host: options.host,
    port: options.port ? Number(options.port) : undefined,
    databasePath: options.db ?? options.config,
    authHomeBase: options["auth-home-base"],
    runtimeWorkspaceBase: options["runtime-workspace-base"]
  });
  const database = openCoreDatabase(config.databasePath);
  migrateDatabase(database);
  const services = createServices(database, {
    authHomeBase: config.authHomeBase,
    runtimeWorkspaceBase: config.runtimeWorkspaceBase
  });

  if (command === "migrate") {
    console.log(`Migrated ${config.databasePath}`);
    database.sqlite.close();
    return;
  }

  if (command === "admin" && subcommand === "create") {
    services.users.createAdmin(required(options.email, "--email"), required(options.password, "--password"));
    console.log(`Created admin ${options.email}`);
    database.sqlite.close();
    return;
  }

  if (command === "admin" && subcommand === "reset-password") {
    services.users.resetPassword(required(options.email, "--email"), required(options.password, "--password"));
    console.log(`Reset password for ${options.email}`);
    database.sqlite.close();
    return;
  }

  if (command === "key" && subcommand === "create") {
    const user = services.users.verifyLogin(required(options.email, "--email"), required(options.password, "--password"));
    const created = services.apiKeys.create({ userId: user.id, name: options.name ?? "CLI key" });
    console.log(created.token);
    database.sqlite.close();
    return;
  }

  if (command === "key" && subcommand === "revoke") {
    services.apiKeys.revoke(required(options.id, "--id"));
    console.log(`Revoked key ${options.id}`);
    database.sqlite.close();
    return;
  }

  if (command === "serve") {
    new Elysia({ adapter: node() }).use(createApp({ database, services })).listen({
      hostname: config.host,
      port: config.port
    });
    console.log(`cli2api core listening on http://${config.host}:${config.port}`);
    return;
  }

  usage();
  database.sqlite.close();
}

function parseOptions(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      options[arg.slice(2)] = args[index + 1] ?? "";
      index += 1;
    }
  }
  return options;
}

function required(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`${flag} is required`);
  }
  return value;
}

function usage(): void {
  console.log(`Usage:
  cli2api serve --host 127.0.0.1 --port 3000 --db data/cli2api.sqlite --auth-home-base /data/codex-homes --runtime-workspace-base /data/runtime-workspaces
  cli2api migrate --db data/cli2api.sqlite
  cli2api admin create --email admin@example.com --password change-me
  cli2api admin reset-password --email admin@example.com --password change-me
  cli2api key create --email admin@example.com --password change-me --name dev
  cli2api key revoke --id <key-id>`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
