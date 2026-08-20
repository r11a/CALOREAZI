import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the CALOREAZI loading shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="he" dir="rtl">/i);
  assert.match(html, /<title>CALOREAZI/);
  assert.match(html, /class="loading-screen"/);
  assert.match(html, /טוען את המסלול שלך/);
  assert.match(html, /manifest\.webmanifest/);
});

test("loading shell is product-owned, responsive and free of starter preview dependencies", async () => {
  const [page, layout, productCss, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /className="loading-screen"/);
  assert.match(productCss, /\.loading-screen\{[^}]*min-height:100vh/);
  assert.match(layout, /title:\s*"CALOREAZI/);
  assert.match(layout, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
