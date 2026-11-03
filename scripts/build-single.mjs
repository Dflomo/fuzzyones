// Builds the playground as one self-contained HTML file (for sharing or embedding).
// Usage: node scripts/build-single.mjs [out.html]
import { build } from 'vite';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const outDir = resolve('dist-single');
await build({ configFile: false, base: './', logLevel: 'warn', build: { outDir, emptyOutDir: true, rollupOptions: { input: resolve('index.html') } } });
const html = readFileSync(join(outDir, 'index.html'), 'utf8');
const assets = join(outDir, 'assets');
const files = readdirSync(assets);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
let out = html
  .replace(/<script type="module"[^>]*src="[^"]*"><\/script>/, '')
  .replace(/<link rel="stylesheet" crossorigin href="\.\/assets\/[^"]*">/, '')
  .replace('</head>', `<style>${css}</style>\n</head>`)
  .replace('</body>', `<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>\n</body>`);
writeFileSync(process.argv[2] ?? join(outDir, 'fuzzy-buddies.html'), out);
console.log('wrote', process.argv[2] ?? join(outDir, 'fuzzy-buddies.html'), out.length, 'bytes');
