import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("builds Vinext through Nitro instead of the Next.js adapter on Vercel", async () => {
  const [vercelSource, viteConfig, workerAdapter] = await Promise.all([
    source("vercel.json"),
    source("vite.config.ts"),
    source("build/vercel-cloudflare-workers.ts"),
  ]);
  const vercel = JSON.parse(vercelSource);

  assert.equal(vercel.framework, null);
  assert.equal(vercel.buildCommand, "vite build");
  assert.equal(vercel.outputDirectory, ".output");
  assert.match(viteConfig, /NITRO_PRESET === "vercel"/);
  assert.match(viteConfig, /import\("nitro\/vite"\)/);
  assert.match(viteConfig, /"cloudflare:workers"/);
  assert.match(workerAdapter, /export const env = process\.env/);
});
