// Headless pass: every car, plus a rapid FL5 → Toyota switch.
// Serves nothing; point BASE_URL at a static server of the repo root.
//   node scripts/verify-viewer.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const OUT = process.env.OUT_DIR || '/opt/cursor/artifacts/car-viewer';
mkdirSync(OUT, { recursive: true });

const CARS = [
  { id: 'fl5', timeout: 240000 },
  { id: 't4runner', timeout: 120000 },
  { id: 'camry', timeout: 180000 },
  { id: 'supra', timeout: 120000 },
  { id: 'lc250', timeout: 180000 },
  { id: 'rav4h', timeout: 150000 }
];

function attach(page, bag) {
  page.on('console', (msg) => {
    bag.console.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    bag.pageerrors.push(String(err && err.stack || err));
  });
  page.on('requestfailed', (req) => {
    bag.failed.push({ url: req.url(), error: req.failure() && req.failure().errorText });
  });
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    const len = Number(res.headers()['content-length'] || 0) || 0;
    bag.responses.push({ url, status, len, t: Date.now() });
    if (status >= 400) bag.httpErrors.push({ url, status });
  });
}

async function glInfo(page) {
  return page.evaluate(() => window.__glRenderer || null);
}

async function state(page) {
  return page.evaluate(() => (window.__viewerState ? window.__viewerState() : null));
}

async function waitActive(page, id, timeout) {
  await page.waitForFunction((want) => {
    const err = document.getElementById('errbox');
    if (err && !err.hidden && err.textContent) throw new Error(err.textContent);
    const s = window.__viewerState && window.__viewerState();
    const loader = document.getElementById('loader');
    const hidden = loader && loader.style.display === 'none';
    return !!(s && s.activeId === want && s.cached.indexOf(want) >= 0 && hidden);
  }, id, { timeout, polling: 250 });
  const result = await page.evaluate((want) => {
    const s = window.__viewerState();
    const loader = document.getElementById('loader');
    return { s, loaderDisplay: loader && loader.style.display };
  }, id);
  return result;
}

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
    '--no-sandbox'
  ]
});

const report = { base: BASE, cars: {}, rapid: null, gl: null };

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const bag = { console: [], pageerrors: [], failed: [], responses: [], httpErrors: [] };
  attach(page, bag);
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const gl = orig.call(this, type, attrs);
      if (gl && (type === 'webgl' || type === 'webgl2')) {
        try {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          if (ext) window.__glRenderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
        } catch (e) { /* ignore */ }
      }
      return gl;
    };
  });
  return { page, bag };
}

function summarize(bag, t0) {
  const interesting = bag.responses.filter((r) => !r.url.startsWith('data:'));
  const errors = bag.httpErrors.filter((e) => !/favicon\.ico$/.test(e.url));
  const consoleErrors = bag.console.filter((c) => c.type === 'error').map((c) => c.text);
  return {
    httpErrors: errors,
    requestFailed: bag.failed,
    pageerrors: bag.pageerrors,
    consoleErrors,
    bytes: interesting.reduce((s, r) => s + (r.status < 400 ? r.len : 0), 0),
    responses: interesting.map((r) => ({ status: r.status, len: r.len, url: r.url.replace(BASE, '/') }))
  };
}

try {
  // --- rapid switch: FL5 starts, immediately pick 4Runner, FL5 must not reclaim ---
  {
    const { page, bag } = await newPage();
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-vehicle="t4runner"]', { timeout: 20000 });
    report.gl = await glInfo(page);
    await page.click('[data-vehicle="t4runner"]');
    await waitActive(page, 't4runner', 120000);
    const mid = await state(page);
    // Wait until the background FL5 build has either cached or clearly finished.
    const deadline = Date.now() + 240000;
    let last = mid;
    while (Date.now() < deadline) {
      last = await state(page);
      if (last && last.cached.indexOf('fl5') >= 0 && last.fl5InFlight === false) break;
      if (last && last.activeId !== 't4runner') break;
      await page.waitForTimeout(500);
    }
    // Hold a little longer so a late activate would have fired.
    await page.waitForTimeout(2000);
    last = await state(page);
    const shot = OUT + '/rapid-t4runner.png';
    await page.screenshot({ path: shot });
    report.rapid = {
      gl: report.gl,
      mid,
      final: last,
      stayedOnToyota: !!(last && last.activeId === 't4runner' && last.requested === 't4runner'),
      fl5CachedWithoutSteal: !!(last && last.cached.indexOf('fl5') >= 0 && last.activeId === 't4runner'),
      shot,
      net: summarize(bag, t0),
      ms: Date.now() - t0
    };
    await page.close();
  }

  // --- every car, fresh page, in lineup order (FL5 is the boot load) ---
  {
    const { page, bag } = await newPage();
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-vehicle="fl5"]', { timeout: 20000 });
    if (!report.gl) report.gl = await glInfo(page);
    let mark = 0;
    for (const car of CARS) {
      const before = bag.responses.length;
      if (car.id !== 'fl5') await page.click('[data-vehicle="' + car.id + '"]');
      await waitActive(page, car.id, car.timeout);
      const st = await state(page);
      const shot = OUT + '/' + car.id + '.png';
      await page.screenshot({ path: shot });
      const fresh = bag.responses.slice(before);
      const bytes = fresh.filter((r) => r.status < 400).reduce((s, r) => s + r.len, 0);
      report.cars[car.id] = {
        state: st,
        shot,
        bytesSincePrevious: bytes,
        httpErrors: fresh.filter((r) => r.status >= 400).map((r) => ({ url: r.url, status: r.status })),
        ms: Date.now() - t0 - mark
      };
      mark = Date.now() - t0;
    }
    report.lineupNet = summarize(bag, t0);
    report.lineupMs = Date.now() - t0;
    await page.close();
  }
} catch (err) {
  report.fatal = String(err && err.stack || err);
  console.error(report.fatal);
} finally {
  await browser.close();
}

writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
const bad = [];
if (report.fatal) bad.push('fatal: ' + report.fatal.split('\n')[0]);
if (!report.rapid || !report.rapid.stayedOnToyota) bad.push('rapid switch did not keep the Toyota');
if (!report.rapid || !report.rapid.fl5CachedWithoutSteal) bad.push('FL5 did not finish in the background without taking over');
for (const car of CARS) {
  const row = report.cars[car.id];
  if (!row) { bad.push('missing car ' + car.id); continue; }
  if (!row.state || row.state.activeId !== car.id) bad.push(car.id + ' activeId ' + (row.state && row.state.activeId));
  if (row.httpErrors && row.httpErrors.length) bad.push(car.id + ' http ' + JSON.stringify(row.httpErrors));
}
const netErrs = []
  .concat((report.rapid && report.rapid.net && report.rapid.net.httpErrors) || [])
  .concat((report.lineupNet && report.lineupNet.httpErrors) || []);
const pageErrs = []
  .concat((report.rapid && report.rapid.net && report.rapid.net.pageerrors) || [])
  .concat((report.lineupNet && report.lineupNet.pageerrors) || []);
if (netErrs.length) bad.push('http errors ' + JSON.stringify(netErrs));
if (pageErrs.length) bad.push('page errors ' + JSON.stringify(pageErrs));
console.log(JSON.stringify({
  gl: report.gl,
  rapid: report.rapid && {
    stayedOnToyota: report.rapid.stayedOnToyota,
    fl5CachedWithoutSteal: report.rapid.fl5CachedWithoutSteal,
    final: report.rapid.final,
    ms: report.rapid.ms,
    httpErrors: report.rapid.net.httpErrors,
    pageerrors: report.rapid.net.pageerrors
  },
  cars: Object.fromEntries(Object.entries(report.cars).map(([k, v]) => [k, {
    activeId: v.state && v.state.activeId,
    cached: v.state && v.state.cached,
    bytes: v.bytesSincePrevious,
    ms: v.ms,
    httpErrors: v.httpErrors
  }])),
  bad
}, null, 2));
if (bad.length) process.exit(1);
