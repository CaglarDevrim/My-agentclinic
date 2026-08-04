import { pathToFileURL } from "node:url";

import { getDatabaseConfig, openDatabase } from "./db/index.js";
import { LocalPreviewTransport, processDueNotifications } from "./notifications.js";

export async function runNotificationProcessor(environment: NodeJS.ProcessEnv = process.env, now = new Date()): Promise<string> {
  const database = await openDatabase(getDatabaseConfig(environment));
  try {
    const transport = new LocalPreviewTransport(environment.AGENTCLINIC_NOTIFICATION_PREVIEW_DIR);
    const result = await processDueNotifications(database, transport, now);
    const summary = `Notification preview complete: ${result.processed} processed, ${result.failed} failed.`;
    if (result.failed > 0) throw new Error(summary);
    return summary;
  } finally {
    database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runNotificationProcessor().then(console.log).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Notification preview failed.");
    process.exitCode = 1;
  });
}
