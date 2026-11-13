import { chromium } from 'playwright';
import fs from 'node:fs';
const [svgPath, out, ...sizes] = process.argv.slice(2);
const svg = fs.readFileSync(svgPath, 'utf8');
const b = await chromium.launch(); const p = await b.newPage();
for (const s of sizes) {
  await p.setViewportSize({ width: +s, height: +s });
  await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body></html>`);
  await p.screenshot({ path: `${out}/icon-${s}.png`, omitBackground: false });
}
await b.close();
