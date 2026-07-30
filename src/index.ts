import { serve } from "@hono/node-server";

import app from "./app.js";

const DEFAULT_PORT = 3000;
const requestedPort = Number(process.env.PORT);
const port =
  Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65_535
    ? requestedPort
    : DEFAULT_PORT;

serve({ fetch: app.fetch, port }, (serverInfo) => {
  console.log(`AgentClinic is running at http://localhost:${serverInfo.port}`);
});
