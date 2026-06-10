import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { createApp } from "../app.js";
import { openCoreDatabase } from "../db/client.js";
import { migrateDatabase } from "../db/migrate.js";
import { createServices } from "../services/index.js";

const database = openCoreDatabase(process.env.CLI2API_E2E_DB ?? ":memory:");
migrateDatabase(database);
const services = createServices(database);

new Elysia({ adapter: node() }).use(createApp({ database, services })).listen({
  hostname: "127.0.0.1",
  port: 4517
});

console.log("cli2api e2e server listening on http://127.0.0.1:4517");
