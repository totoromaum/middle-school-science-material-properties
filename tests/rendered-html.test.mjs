import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the finished lesson wrapper", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /중2 과학 Ⅰ\. 물질의 특성/);
  assert.match(html, /src="\/index\.html"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/i);
});

test("static GitHub Pages lesson contains every topic and simulation", async () => {
  const [html, css, javascript] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /data-slide="9"/);
  assert.match(html, /밀도 측정소/);
  assert.match(html, /용해도 곡선 판독기/);
  assert.match(html, /가열 곡선 실험실/);
  assert.match(html, /분별 깔때기 조작/);
  assert.match(html, /붕산 결정 만들기/);
  assert.match(html, /물–에탄올 증류/);
  assert.match(html, /혼합물 분리 설계/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media print/);
  assert.match(javascript, /updateDensityLab/);
  assert.match(javascript, /updateSolubilityLab/);
  assert.match(javascript, /renderDistillation/);
  assert.match(javascript, /renderMission/);
});
