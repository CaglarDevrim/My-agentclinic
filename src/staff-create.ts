import { pathToFileURL } from "node:url";

import { hashStaffPassword, isValidStaffEmail, isValidStaffName, isValidStaffPassword, normalizeStaffEmail } from "./auth/security.js";
import { createStaffUser } from "./auth/store.js";
import { getDatabaseConfig, openDatabase } from "./db/index.js";

interface StaffCreateOptions {
  email: string;
  name: string;
}

function parseArguments(args: string[]): StaffCreateOptions | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if ((key !== "--email" && key !== "--name") || !value || values.has(key)) return undefined;
    values.set(key, value);
  }
  const email = values.get("--email");
  const name = values.get("--name");
  return email && name ? { email, name } : undefined;
}

export async function runStaffCreate(args: string[], environment: NodeJS.ProcessEnv = process.env): Promise<string> {
  const options = parseArguments(args);
  if (!options) throw new Error("Usage: npm run staff:create -- --email <email> --name <display-name>");
  const email = normalizeStaffEmail(options.email);
  const displayName = options.name.trim();
  const password = environment.AGENTCLINIC_STAFF_PASSWORD ?? "";
  if (!isValidStaffEmail(email)) throw new Error("Enter a valid staff email address.");
  if (!isValidStaffName(displayName)) throw new Error("Staff display name must be between 1 and 100 characters.");
  if (!isValidStaffPassword(password)) throw new Error("AGENTCLINIC_STAFF_PASSWORD must be between 12 and 128 characters.");

  const database = await openDatabase(getDatabaseConfig(environment));
  try {
    const passwordHash = await hashStaffPassword(password);
    await createStaffUser(database, { email, displayName, passwordHash });
    return `Created staff account for ${email}.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) throw new Error("A staff account with that email already exists.");
    throw error;
  } finally {
    database.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStaffCreate(process.argv.slice(2)).then(console.log).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Staff account creation failed.");
    process.exitCode = 1;
  });
}
