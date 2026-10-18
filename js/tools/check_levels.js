// tools/check_levels.js — development helper.
// Loads levels.js outside the browser and sanity-checks every map:
// ragged rows, missing spawn, missing brazier, floating entities.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'js', 'levels.js');
const src = fs.readFileSync(file, 'utf8');
const LEVELS = new Function(src + '\nreturn LEVELS;')();

const SOLID = new Set(['#', '-', '=']);
const SUPPORTED = new Set(['@', 'e', 'w', 'B', 'T', 'L', 'o']);
let problems = 0;

LEVELS.forEach((lvl, i) => {
  const w = Math.max(...lvl.map.map(r => r.length));
  const grid = lvl.map.map(r => r.padEnd(w, '.').split(''));
  const h = grid.length;

  const counts = {};
  const flags = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid[y][x];
      counts[c] = (counts[c] || 0) + 1;
      if (!SUPPORTED.has(c)) continue;
      // is there anything solid within 4 tiles below?
      let found = false;
      for (let d = 1; d <= 4; d++) {
        if (y + d >= h) break;
        if (SOLID.has(grid[y + d][x])) { found = true; break; }
      }
      if (!found && c !== 'o' && c !== 'w') flags.push(`${c} at (${x},${y}) has no floor within 4 tiles`);
    }
  }

  console.log(`\n=== chapter ${i + 1}: ${lvl.title} === ${w}x${h}`);
  console.log('  ' + Object.entries(counts)
    .filter(([c]) => c !== '.')
    .map(([c, n]) => `${c}:${n}`).join('  '));

  const widths = new Set(lvl.map.map(r => r.length));
  if (widths.size > 1) console.log('  row widths:', [...widths].sort((a, b) => a - b).join(', '));

  if (!counts['@']) { console.log('  !! no spawn'); problems++; }
  if (!counts['B']) { console.log('  !! no brazier'); problems++; }
  if ((counts['@'] || 0) > 1) { console.log('  !! more than one spawn'); problems++; }
  flags.forEach(f => { console.log('  ?? ' + f); problems++; });

  // show the top-left 100 columns with a ruler
  if (process.argv.includes('--print')) {
    let ruler = '';
    for (let x = 0; x < Math.min(w, 100); x++) ruler += (x % 10 === 0) ? String(Math.floor(x / 10) % 10) : ' ';
    console.log('   ' + ruler);
    grid.forEach((row, y) => console.log(String(y).padStart(2) + ' ' + row.join('')));
  }
});

console.log(`\n${LEVELS.length} chapters, ${problems} problem(s)`);
