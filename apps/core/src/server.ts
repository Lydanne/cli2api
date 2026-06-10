import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openCoreDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";

const config = loadConfig();
const database = openCoreDatabase(config.databasePath);
migrateDatabase(database);

const app = new Elysia({ adapter: node() }).use(createApp({ database })).listen({
  hostname: config.host,
  port: config.port
});

console.log(`cli2api core listening on http://${config.host}:${config.port}`);

process.on("SIGINT", () => {
  app.stop();
  database.sqlite.close();
  process.exit(0);
});
