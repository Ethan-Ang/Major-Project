/**
 * Route behaviour for the public site, asserted against the test server that
 * mirrors frontend/.htaccess (tests/helpers/static-server.mjs).
 *
 * This is the contract browser QA depends on: /about must serve about.html at
 * status 200 with the clean URL intact, and /about.html must 301 to /about. If
 * these fail, a Swup navigation to a clean URL is being tested against routing
 * the production host does not actually have.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { startStaticServer, resolveRoute, CLEAN_URL_PAGES } from "./helpers/static-server.mjs";

const FRONTEND_DIR = fileURLToPath(new URL("../frontend", import.meta.url));

let server;
test.before(async () => {
  server = await startStaticServer(FRONTEND_DIR);
});
test.after(async () => {
  if (server) await server.close();
});

/** Fetch without following redirects, so a 301 is observable. */
async function raw(pathname) {
  const response = await fetch(server.url + pathname, { redirect: "manual" });
  return {
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"),
    body: await response.text(),
  };
}

// ─── Canonical clean URLs serve their physical .html file ──────────

const CLEAN_ROUTES = [
  { route: "/", physical: "index.html", marker: /<html/i },
  { route: "/about", physical: "about.html", marker: /<html/i },
  { route: "/about/", physical: "about.html", marker: /<html/i },
  { route: "/products", physical: "products.html", marker: /<html/i },
  { route: "/products/", physical: "products.html", marker: /<html/i },
  { route: "/product-detail", physical: "product-detail.html", marker: /<html/i },
  { route: "/enquiry", physical: "enquiry.html", marker: /<html/i },
  { route: "/enquiry/", physical: "enquiry.html", marker: /<html/i },
  { route: "/contact", physical: "contact.html", marker: /<html/i },
  { route: "/compare", physical: "compare.html", marker: /<html/i },
];

for (const { route, physical, marker } of CLEAN_ROUTES) {
  test(`${route} serves ${physical} at 200 without redirecting`, async () => {
    const response = await raw(route);
    assert.equal(response.status, 200, `${route} must be served directly`);
    assert.equal(response.location, null, `${route} must not redirect`);
    assert.match(response.contentType, /text\/html/);
    assert.match(response.body, marker);

    const onDisk = fs.readFileSync(path.join(FRONTEND_DIR, physical), "utf8");
    assert.equal(response.body, onDisk, `${route} must serve exactly ${physical}`);
  });
}

// ─── .html requests redirect to the canonical clean URL ────────────

test("/index.html redirects to / rather than /index", async () => {
  const response = await raw("/index.html");
  assert.equal(response.status, 301);
  assert.equal(response.location, "/");
});

for (const page of CLEAN_URL_PAGES) {
  test(`/${page}.html redirects 301 to /${page}`, async () => {
    const response = await raw(`/${page}.html`);
    assert.equal(response.status, 301);
    assert.equal(response.location, `/${page}`);
  });
}

// ─── 404 ───────────────────────────────────────────────────────────

test("/404.html is a real file and is served directly at 200", async () => {
  // .htaccess deliberately leaves 404.html as a real file so ErrorDocument can
  // return it; it is not in the clean-URL redirect list.
  const response = await raw("/404.html");
  assert.equal(response.status, 200);
  assert.match(response.contentType, /text\/html/);
});

test("an unknown route returns 404 carrying the 404 page body", async () => {
  const response = await raw("/this-route-does-not-exist");
  assert.equal(response.status, 404);
  const notFoundPage = fs.readFileSync(path.join(FRONTEND_DIR, "404.html"), "utf8");
  assert.equal(response.body, notFoundPage);
});

test("a clean URL with a query string still resolves", async () => {
  const response = await raw("/product-detail?id=1");
  assert.equal(response.status, 200);
  assert.match(response.body, /<html/i);
});

// ─── Cache headers (.htaccess rule 2c) ─────────────────────────────

test("HTML is served uncacheable so a clean URL never serves stale markup", async () => {
  for (const route of ["/", "/products", "/enquiry"]) {
    const response = await raw(route);
    assert.match(response.cacheControl, /no-cache|no-store/, `${route} must not be cached`);
  }
});

test("cache-busted assets are served with a long max-age", async () => {
  const response = await raw("/css/products.css");
  assert.equal(response.status, 200);
  assert.match(response.contentType, /text\/css/);
  assert.match(response.cacheControl, /max-age=\d{4,}/);
});

test("a versioned asset URL serves the same bytes as the unversioned path", async () => {
  const plain = await raw("/css/products.css");
  const versioned = await raw("/css/products.css?v=134");
  assert.equal(versioned.status, 200);
  assert.equal(versioned.body, plain.body);
});

// ─── Traversal safety ──────────────────────────────────────────────

test("the server refuses to escape the frontend root", async () => {
  const response = await raw("/../deploy_all.sh");
  assert.notEqual(response.status, 200);
});

// ─── Pure resolver (no socket) ─────────────────────────────────────

test("resolveRoute maps clean URLs to their .html file", () => {
  const decision = resolveRoute(FRONTEND_DIR, "/products");
  assert.equal(decision.kind, "file");
  assert.equal(path.basename(decision.filePath), "products.html");
});

test("resolveRoute prefers a real file over the .html rewrite", () => {
  const decision = resolveRoute(FRONTEND_DIR, "/css/products.css");
  assert.equal(decision.kind, "file");
  assert.equal(path.basename(decision.filePath), "products.css");
});

test("every clean-URL page listed in the redirect rule has a physical file", () => {
  for (const page of CLEAN_URL_PAGES) {
    const filePath = path.join(FRONTEND_DIR, `${page}.html`);
    assert.ok(fs.existsSync(filePath), `${page}.html must exist for /${page} to resolve`);
  }
});
