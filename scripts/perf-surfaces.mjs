// Headless surface-discovery benchmark. Builds the site, serves it, and runs
// /perf.html in Chromium at a few page sizes.
// Usage: node scripts/perf-surfaces.mjs   (needs the `playwright` package)
import { build, preview } from 'vite';

let chromium;
try {
  // PLAYWRIGHT_PATH lets you point at a global install, e.g. /usr/lib/node_modules/playwright/index.js
  const pw = await import(process.env.PLAYWRIGHT_PATH ?? 'playwright');
  chromium = pw.chromium ?? pw.default.chromium;
} catch {
  console.error('This benchmark needs Playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 4199, strictPort: true }, logLevel: 'warn' });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const rows = [];
for (const [sections, inspect] of [[60, 1], [200, 1], [600, 1], [600, 0]]) {
  await page.goto(`http://localhost:4199/perf.html?sections=${sections}&inspect=${inspect}`);
  await page.waitForFunction(() => window.__perf, null, { timeout: 60000 });
  rows.push({ sections, ...(await page.evaluate(() => window.__perf)) });
}
console.table(rows);
await browser.close();
server.httpServer.close();
