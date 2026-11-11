// Static checks for the single-flight loader and the assets it fetches.
// Run: node scripts/check-loader-flight.mjs
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const lines = html.split('\n');
let failed = 0;
function check(ok, msg) {
  if (!ok) { failed++; console.error('FAIL', msg); }
  else console.log('ok', msg);
}

const call = lines
  .map((line, i) => ({ line, n: i + 1 }))
  .filter((x) => x.line.includes("activateVehicle('fl5')") && !x.line.includes('cannot call'));
check(call.length === 1, 'one activateVehicle(\'fl5\') call');
if (call.length === 1) {
  const n = call[0].n;
  const window = lines.slice(n - 8, n).join('\n');
  check(window.includes("requestedVehicle === 'fl5'") && window.includes('gen === fl5Gen'),
    'FL5 activate is guarded by requestedVehicle and fl5Gen (line ' + n + ')');
}

check(html.includes('var fl5Gen = 0'), 'fl5Gen exists');
check(html.includes('var requestedVehicle = \'fl5\''), 'requestedVehicle exists');
check(html.includes('token !== loadToken || requestedVehicle !== id'), 'Toyota completion checks token and current pick');
check(!html.includes('data:application/octet-stream;base64'), 'no embedded GLB data URLs');

const m = html.match(/var MODEL_TOTAL = (\d+), MODEL_PARTS = (\d+)/);
check(!!m, 'MODEL_TOTAL declaration');
if (m) {
  const total = Number(m[1]);
  const parts = Number(m[2]);
  let sum = 0;
  for (let i = 0; i < parts; i++) {
    const name = '../assets/model/part-' + String(i).padStart(2, '0') + '.bin';
    sum += statSync(new URL(name, import.meta.url)).size;
  }
  check(sum === total, 'part bytes ' + sum + ' equal MODEL_TOTAL ' + total);
  const extra = readdirSync(new URL('../assets/model/', import.meta.url)).filter((f) => /^part-\d+\.bin$/.test(f));
  check(extra.length === parts, 'part file count ' + extra.length + ' equals MODEL_PARTS ' + parts);
}

for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js', 'draco_decoder.js']) {
  const buf = readFileSync(new URL('../assets/draco/' + f, import.meta.url));
  check(buf.length > 1000, f + ' present (' + buf.length + ' bytes)');
}
const wasm = readFileSync(new URL('../assets/draco/draco_decoder.wasm', import.meta.url));
check(createHash('sha256').update(wasm).digest('hex') ===
  'a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac',
  'draco_decoder.wasm sha256 matches three.js r186 glTF decoder');

for (const f of ['4runner.glb', 'camry.glb', 'supra.glb', 'land-cruiser-250.glb', 'rav4-hybrid.glb', 'eight-spoke.glb']) {
  const buf = readFileSync(new URL('../assets/models/' + f, import.meta.url));
  check(buf.subarray(0, 4).toString() === 'glTF', f + ' is a GLB (' + buf.length + ' bytes)');
  check(html.includes('assets/models/' + f), 'page references ' + f);
}

check(html.includes('CC BY-NC-ND 4.0'), 'FL5 CC BY-NC-ND credit remains');
check(html.includes('CC BY-NC-SA 4.0'), 'Toyota CC BY-NC-SA credit remains');
check(html.includes('CC BY-NC 4.0'), 'Supra CC BY-NC credit remains');
check(html.includes('blakebella'), 'FL5 author credit remains');

if (failed) {
  console.error(failed + ' check(s) failed');
  process.exit(1);
}
console.log('loader flight checks passed');
