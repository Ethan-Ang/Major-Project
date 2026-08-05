/**
 * A local stand-in for an OpenAI-compatible provider.
 *
 * It exists so a browser test can drive the REAL advisor.php -> advisor_logic.php
 * -> advisor_ai.php path, including a genuine outbound HTTP call from PHP, with
 * no key, no vendor and no token spend. Point the adapter at it with:
 *
 *   LLM_PROVIDER=openai
 *   LLM_BASE_URL=<this server's url>
 *   LLM_API_KEY=<any non-empty test string>
 *
 * Scripted replies are queued; each POST /chat/completions shifts one off. When
 * the queue is empty it answers with `fallback`, so a test never hangs on an
 * unscripted turn.
 */

import http from "node:http";

export function startStubProvider({ fallback = null } = {}) {
  const queue = [];
  const calls = [];

  const server = http.createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      calls.push({
        url: request.url,
        authorization: typeof request.headers.authorization === "string",
        payload: parsed,
      });

      const scripted = queue.shift() || fallback;
      if (!scripted) {
        response.writeHead(503, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: { message: "no scripted reply" } }));
        return;
      }
      if (scripted.status && scripted.status >= 400) {
        response.writeHead(scripted.status, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: { message: "stubbed upstream failure" } }));
        return;
      }
      if (scripted.hang) {
        return; // Never respond: exercises the adapter's timeout.
      }

      const content = typeof scripted.raw === "string"
        ? scripted.raw
        : JSON.stringify(scripted.structured);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        calls,
        queueReply: (structured) => queue.push({ structured }),
        queueRaw: (raw) => queue.push({ raw }),
        queueStatus: (status) => queue.push({ status }),
        reset: () => { queue.length = 0; calls.length = 0; },
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}
