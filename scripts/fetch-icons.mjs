// One-off helper: fetch Lucide static SVG icons and recolor them to the
// NB Feedback Kit brand orange so they render crisply in both GitHub
// light and dark themes. Output: assets/icons/<name>.svg
import { mkdir, writeFile, rm } from 'node:fs/promises';

const ICONS = [
  'github', 'shield', 'shield-check', 'lock', 'lock-keyhole', 'key-round',
  'package', 'server', 'server-off', 'database', 'cloud', 'cloud-upload',
  'camera', 'image', 'message-square', 'bug', 'upload', 'download',
  'git-branch', 'git-pull-request', 'check', 'check-check', 'rocket',
  'code', 'code-xml', 'book-open', 'arrow-right', 'gauge', 'smartphone',
  'atom', 'heart', 'folder-git-2', 'users', 'map', 'file-text', 'settings',
  'terminal', 'zap', 'globe', 'layers',
];

const OUT = 'assets/icons';
const BRAND = '#f97316';
const BASE = 'https://unpkg.com/lucide-static@latest/icons/';

await mkdir(OUT, { recursive: true });

let ok = 0;
const failed = [];

for (const name of ICONS) {
  try {
    const res = await fetch(BASE + name + '.svg', { redirect: 'follow' });
    if (!res.ok) { failed.push(`${name}(HTTP ${res.status})`); continue; }
    let svg = await res.text();
    if (!svg.includes('<svg')) { failed.push(`${name}(not-svg)`); continue; }
    svg = svg.split('currentColor').join(BRAND);
    // ensure an explicit width/height isn't forced huge; keep lucide defaults (24x24)
    await writeFile(`${OUT}/${name}.svg`, svg, 'utf8');
    ok++;
  } catch (e) {
    failed.push(`${name}(${e.message})`);
  }
}

console.log(`Saved ${ok}/${ICONS.length} icons to ${OUT}/`);
if (failed.length) console.log('Failed: ' + failed.join(', '));