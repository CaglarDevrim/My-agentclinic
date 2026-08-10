import { getDatabaseConfig, openDatabase } from "./index.js";

const config = getDatabaseConfig();
const database = await openDatabase(config);
database.close();

console.log(`AgentClinic database is ready at ${config.url.startsWith("file:") ? config.url : "the configured remote Turso database"}.`);
