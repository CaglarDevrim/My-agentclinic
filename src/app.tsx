import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { jsxRenderer } from "hono/jsx-renderer";

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

export default app;
