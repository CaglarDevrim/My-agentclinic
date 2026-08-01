import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { getDatabaseConfig, openDatabase } from "./db/index.js";

const requestedPort = Number(process.env.PORT);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65_535 ? requestedPort : 3000;
const database = await openDatabase(getDatabaseConfig());
const server = serve({ fetch: createApp(database).fetch, port }, (info) => {
  console.log(`AgentClinic is running at http://localhost:${info.port}`);
});

function shutdown(): void {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
