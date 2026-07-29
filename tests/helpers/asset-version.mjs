// Shared cache-busting assertions for the ?v= query strings in the HTML.
//
// These tests used to pin an EXACT version, e.g. `products.js?v=50`, which meant
// every legitimate cache bump broke a test that had nothing to do with the change.
// The intent was never "this must always be v50"; it was "this must not regress
// below the version that fixed the bug". So assert a FLOOR instead.
//
// The companion guard `qa/check-cache-versions.js` still enforces the other half
// of the rule (contents changed => version must be bumped, and a shared file must
// carry the same version on every page), so nothing is lost by relaxing this.

import assert from "node:assert/strict";

// Read the ?v= a page requests for one asset. Returns null when absent.
export function assetVersion(html, assetPath) {
  const escaped = assetPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:src|href)="${escaped}\\?v=(\\d+)"`).exec(html);
  return match ? Number(match[1]) : null;
}

// Assert a page requests `assetPath` at `minVersion` or later.
export function assertAssetAtLeast(html, assetPath, minVersion, label) {
  const found = assetVersion(html, assetPath);
  const where = label ? `${label}: ` : "";
  assert.notEqual(
    found,
    null,
    `${where}must request ${assetPath} with a ?v= cache-busting version`
  );
  assert.ok(
    found >= minVersion,
    `${where}must request ${assetPath} at v${minVersion} or later, found v${found}`
  );
}
