import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openCoreDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";
import { createServices } from "./services/index.js";

const config = loadConfig();
const database = openCoreDatabase(config.databasePath);
migrateDatabase(database);
const services = createServices(database, { authHomeBase: config.authHomeBase });

const app = new Elysia({ adapter: node() }).use(createApp({ database, services })).listen({
  hostname: config.host,
  port: config.port
});

console.log(`cli2api core listening on http://${config.host}:${config.port}`);

process.on("SIGINT", () => {
  app.stop();
  database.sqlite.close();
  process.exit(0);
});
