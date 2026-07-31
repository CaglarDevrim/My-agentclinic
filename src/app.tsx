import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { jsxRenderer } from "hono/jsx-renderer";

import { findAgentBySlug } from "./domain/care.js";
import { AgentPage } from "./pages/AgentPage.js";
import { HomePage } from "./pages/HomePage.js";

const app = new Hono();

app.use(jsxRenderer());
app.use("/static/*", serveStatic({ root: "./" }));

app.get("/health", (context) => {
  return context.json({ status: "ok" });
});

app.get("/", (context) => {
  return context.render(<HomePage />);
});

app.get("/agents/:slug", (context) => {
  const agent = findAgentBySlug(context.req.param("slug"));

  if (!agent) {
    return context.notFound();
  }

  return context.render(<AgentPage agent={agent} />);
});

export default app;
