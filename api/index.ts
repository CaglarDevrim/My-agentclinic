import type sourceApp from "../src/index.js";

const compiledEntry = "../dist/index.js";
const { default: app } = (await import(compiledEntry)) as { default: typeof sourceApp };

export default app;
