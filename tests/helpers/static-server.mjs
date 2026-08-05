/**
 * Test-only static server that reproduces the approved production routing from
 * frontend/.htaccess. It exists so browser QA exercises the same URL shapes the
 * live cPanel host serves, instead of a plain file server that only understands
 * /page.html.
 *
 * Rules mirrored from frontend/.htaccess, in the same order:
 *   4a. /index.html                      -> 301 /
 *       /{page}.html for the six public   -> 301 /{page}
 *   4b. /{path} with no matching file or  -> internal rewrite to {path}.html
 *       directory, when {path}.html exists   (200, address bar keeps /{path})
 *   3b. anything else                     -> 404 with the body of /404.html
 *   2c. text/html is never cached; css/js get a long max-age (they are
 *       cache-busted with ?v=).
 *
 * Deliberately NOT mirrored: TLS redirects (disabled in production) and the
 * CSP/security headers, which are irrelevant to route behaviour and would only
 * make the harness brittle.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

/** The six pages .htaccess rule 4a redirects from .html to the clean URL. */
export const CLEAN_URL_PAGES = [
  "products",
  "about",
  "contact",
  "enquiry",
  "compare",
  "product-detail",
];

const CONTENT_TYPES = new Map(Object.entries({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
}));

const LONG_CACHE_EXTENSIONS = new Set([
  ".css", ".js", ".mjs", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".ico", ".woff", ".woff2",
]);

function contentTypeFor(filePath) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

/** Mirrors .htaccess 2c: HTML is always fresh, cache-busted assets are not. */
function cacheControlFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html" || extension === ".json") {
    return "no-cache, no-store, must-revalidate";
  }
  return LONG_CACHE_EXTENSIONS.has(extension) ? "public, max-age=604800" : "no-cache";
}

/** Blocks path traversal: the resolved file must stay inside the served root. */
function resolveWithinRoot(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  const resolved = path.resolve(root, "." + decoded);
  const rootWithSeparator = root.endsWith(path.sep) ? root : root + path.sep;
  return resolved === root || resolved.startsWith(rootWithSeparator) ? resolved : null;
}

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function isDirectory(candidate) {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolves a request path exactly the way the production rewrites do.
 * Returns { kind: "redirect", location } | { kind: "file", filePath }
 *        | { kind: "notFound" }.
 * Exported so route tests can assert the decision without a live socket.
 */
export function resolveRoute(root, pathname) {
  // 4a. .html requests redirect to the canonical clean URL.
  if (pathname === "/index.html") {
    return { kind: "redirect", location: "/" };
  }
  const htmlRedirect = /^\/([A-Za-z0-9-]+)\.html$/.exec(pathname);
  if (htmlRedirect && CLEAN_URL_PAGES.includes(htmlRedirect[1])) {
    return { kind: "redirect", location: "/" + htmlRedirect[1] };
  }

  const target = resolveWithinRoot(root, pathname);
  if (target === null) {
    return { kind: "notFound" };
  }

  // DirectoryIndex: "/" and any real directory serve index.html.
  if (isDirectory(target)) {
    const index = path.join(target, "index.html");
    if (isFile(index)) {
      return { kind: "file", filePath: index };
    }
  }

  // A real file (404.html, /css/products.css, /js/...) is served as-is.
  if (isFile(target)) {
    return { kind: "file", filePath: target };
  }

  // 4b. RewriteRule ^(.+?)/?$ $1.html  -- the trailing slash is optional, so
  // /about and /about/ both resolve to about.html.
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  if (withoutTrailingSlash !== "") {
    const rewritten = resolveWithinRoot(root, withoutTrailingSlash + ".html");
    if (rewritten !== null && isFile(rewritten)) {
      return { kind: "file", filePath: rewritten };
    }
  }

  return { kind: "notFound" };
}

/**
 * Starts the server and resolves with { url, port, close() }.
 * Port 0 lets the OS pick a free port so parallel runs never collide.
 */
export function startStaticServer(root, { port = 0, host = "127.0.0.1" } = {}) {
  const rootPath = path.resolve(root);
  const notFoundPage = path.join(rootPath, "404.html");

  const server = http.createServer((request, response) => {
    let pathname = "/";
    try {
      pathname = new URL(request.url, "http://" + host).pathname;
    } catch {
      pathname = "/";
    }

    const route = resolveRoute(rootPath, pathname);

    if (route.kind === "redirect") {
      response.writeHead(301, { Location: route.location, "Cache-Control": "no-cache" });
      response.end();
      return;
    }

    const filePath = route.kind === "file" ? route.filePath : notFoundPage;
    const status = route.kind === "file" ? 200 : 404;

    let body;
    try {
      body = fs.readFileSync(filePath);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(status, {
      "Content-Type": contentTypeFor(filePath),
      "Content-Length": body.length,
      "Cache-Control": cacheControlFor(filePath),
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(body);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        url: `http://${host}:${address.port}`,
        port: address.port,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}
