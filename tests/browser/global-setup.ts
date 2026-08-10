import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 3100;

export default async function startProductionServer() {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "agentclinic-browser-"));
  const databasePath = join(temporaryDirectory, "clinic.sqlite");
  const environment = {
    ...process.env,
    AGENTCLINIC_DB: databasePath,
    AGENTCLINIC_STAFF_PASSWORD: "Browser staff password 2026!",
    AGENTCLINIC_THERAPIST_PASSWORD: "Browser therapist password 2026!",
    PORT: String(port),
  };
  const provisioning = spawnSync(process.execPath, ["dist/staff-create.js", "--email", "browser.staff@example.com", "--name", "Browser Staff"], {
    env: environment,
    encoding: "utf8",
    windowsHide: true,
  });
  if (provisioning.status !== 0) {
    rmSync(temporaryDirectory, { force: true, recursive: true });
    throw new Error(`Browser staff provisioning failed.\n${provisioning.stderr}`);
  }
  const therapistProvisioning = spawnSync(process.execPath, ["dist/therapist-create.js", "--email", "browser.therapist@example.com", "--name", "Dr Browser Therapist"], {
    env: environment,
    encoding: "utf8",
    windowsHide: true,
  });
  if (therapistProvisioning.status !== 0) {
    rmSync(temporaryDirectory, { force: true, recursive: true });
    throw new Error(`Browser therapist provisioning failed.\n${therapistProvisioning.stderr}`);
  }
  const server = spawn(process.execPath, ["dist/server.js"], {
    env: environment,
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });

  let stderr = "";
  server.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
      throw new Error(`Production server exited before startup.\n${stderr}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The server has not started listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!ready) {
    server.kill();
    rmSync(temporaryDirectory, { force: true, recursive: true });
    throw new Error(`Production server did not become ready.\n${stderr}`);
  }

  return async () => {
    if (server.exitCode !== null) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
      return;
    }

    server.kill();
    await new Promise<void>((resolve) => {
      const forceStop = setTimeout(() => {
        server.kill("SIGKILL");
        resolve();
      }, 2_000);

      server.once("exit", () => {
        clearTimeout(forceStop);
        rmSync(temporaryDirectory, { force: true, recursive: true });
        resolve();
      });
    });
  };
}
