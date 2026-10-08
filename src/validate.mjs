// Post-build checks: every internal link resolves, JSON-LD parses, data is well-formed.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/.generated.json'), 'utf8'));
const errors = [];
const exists = (u) => {
  const p = u.split(/[?#]/)[0];
  const f = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  return fs.existsSync(f);
};
for (const f of files.filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const [, u] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) if (!exists(u)) errors.push(`${f}: broken link ${u}`);
  for (const [, j] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(j); } catch { errors.push(`${f}: invalid JSON-LD`); } }
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${f}: missing title`);
}
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/restaurants.json'), 'utf8'));
const slugs = new Set();
for (const r of data) {
  if (slugs.has(r.slug)) errors.push(`duplicate slug ${r.slug}`);
  slugs.add(r.slug);
  if (!/^[a-z0-9-]+$/.test(r.slug)) errors.push(`bad slug ${r.slug}`);
  if (!['open', 'closed', 'temporarily-closed'].includes(r.status)) errors.push(`${r.slug}: bad status`);
  if (!r.verified) errors.push(`${r.slug}: missing verified date`);
  if (r.hours) for (const [d, v] of Object.entries(r.hours)) for (const rg of v) if (!/^\d\d:\d\d$/.test(rg[0]) || !/^\d\d:\d\d$/.test(rg[1])) errors.push(`${r.slug}: bad hours ${d}`);
}
if (errors.length) { console.error(errors.slice(0, 50).join('\n')); process.exit(1); }
console.log(`Validated ${files.length} generated files.`);
