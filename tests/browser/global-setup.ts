import { spawn } from "node:child_process";

const port = 3100;

export default async function startProductionServer() {
  const server = spawn(process.execPath, ["dist/index.js"], {
    env: {
      ...process.env,
      PORT: String(port),
    },
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
    throw new Error(`Production server did not become ready.\n${stderr}`);
  }

  return async () => {
    if (server.exitCode !== null) {
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
        resolve();
      });
    });
  };
}
