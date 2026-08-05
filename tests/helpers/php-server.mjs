/**
 * Starts PHP's built-in server over frontend/ with the production-shaped
 * router (tests/helpers/router.php), so browser QA exercises real .php
 * endpoints behind real clean URLs.
 */

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(HERE, "..", "..", "frontend");
const ROUTER = path.join(HERE, "router.php");

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForReady(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.status < 500) return true;
    } catch {
      // Server not accepting connections yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

/**
 * Resolves with { url, port, close(), stderr }.
 * Throws if PHP is unavailable or the server never becomes ready, so a QA run
 * can never silently pass against a dead server.
 */
export async function startPhpServer({ port, env = {} } = {}) {
  const chosenPort = port || (await freePort());
  const url = `http://127.0.0.1:${chosenPort}`;

  const child = spawn(
    "php",
    ["-S", `127.0.0.1:${chosenPort}`, "-t", FRONTEND_DIR, ROUTER],
    {
      cwd: FRONTEND_DIR,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      // LLM_* here outranks config.php (see advisorAiSetting), which is how a
      // test points the real adapter at a local stub provider without touching
      // the real configuration or spending a token.
      env: { ...process.env, ...env },
    }
  );

  const stderr = [];
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  child.stdout.on("data", () => {});

  let exited = false;
  child.once("exit", () => { exited = true; });

  const ready = await waitForReady(url + "/");
  if (!ready || exited) {
    child.kill();
    throw new Error(
      `PHP dev server failed to start on ${url}.\n${stderr.join("").slice(0, 2000)}`
    );
  }

  return {
    url,
    port: chosenPort,
    stderr,
    close: () => new Promise((resolve) => {
      if (exited) return resolve();
      child.once("exit", () => resolve());
      child.kill();
      setTimeout(resolve, 2000).unref?.();
    }),
  };
}
