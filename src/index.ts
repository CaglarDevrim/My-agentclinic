import { createApp } from "./app.js";
import { getDatabaseConfig, openDatabase } from "./db/index.js";

export const database = await openDatabase(getDatabaseConfig());
const app = createApp(database);

export default app;
