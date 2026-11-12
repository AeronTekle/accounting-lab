const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('dist/exams.html', 'utf8');
const code = fs.readFileSync('dist/exams.js', 'utf8').split("el('examsTab').onclick=")[0];
const catalog = JSON.parse(fs.readFileSync('dist/assets/catalog.json', 'utf8'));
const practice = JSON.parse(fs.readFileSync('dist/assets/practice.json', 'utf8'));

async function check(mode) {
 const elements = {};
 let abortLoad;
 let intervalCount = 0;
 const pendingResponses = [];
 const succeeds = mode === 'success' || mode === 'slow';
 const element = () => ({ hidden: false, append() {}, replaceChildren() {}, setAttribute() {} });
 const context = vm.createContext({
  AbortController, URLSearchParams,
  document: { getElementById: id => elements[id] ||= element(), createElement: element },
  localStorage: { getItem: () => null },
  location: { search: '' },
  console: { error() {} },
  setTimeout(callback) { abortLoad = callback; return 1; },
  clearTimeout() {},
  setInterval() { intervalCount++; },
  fetch(url, { signal }) {
   if (mode === 'pending') return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
   if (mode === 'http-error') return Promise.resolve({ ok: false });
   if (mode === 'json-error') return Promise.resolve({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } });
   const response = { ok: true, json: async () => url.includes('catalog') ? catalog : practice };
   if (mode === 'slow') return new Promise(resolve => pendingResponses.push(() => resolve(response)));
   return Promise.resolve(response);
  }
 });
 vm.runInContext(code + ';renderCards=()=>{};show=()=>{};', context);
 const loading = context.init();
 if (mode === 'slow') {
  assert.equal(elements.loadFallback?.hidden ?? false, false);
  assert.equal(intervalCount, 0);
  pendingResponses.forEach(resolve => resolve());
 }
 if (mode === 'pending') {
  assert.equal(elements.loadFallback?.hidden ?? false, false);
  abortLoad();
 }
 await loading;
 assert.equal(elements.loadFallback?.hidden ?? false, succeeds);
 assert.equal(elements.loading.hidden, succeeds);
 if (mode === 'pending') assert.match(elements.loading.textContent, /Loading took too long/);
 if (mode.endsWith('error')) assert.match(elements.loading.textContent, /could not load/);
 assert.equal(intervalCount, succeeds ? 1 : 0);
}

(async () => {
 // Static downloads and exercises are present in the HTML before scripts run.
 const fallback = html.slice(html.indexOf('<section id="loadFallback"'), html.indexOf('<section id="home"'));
 assert(fallback && !/^<section[^>]*\bhidden\b/.test(fallback));
 assert.match(fallback, /<noscript>/);
 assert.equal((fallback.match(/<article>/g) || []).length, 3);
 for (const match of fallback.matchAll(/href="([^"]+)"/g)) assert(fs.existsSync('dist/' + match[1]), match[1]);
 for (const mode of ['success', 'slow', 'http-error', 'json-error', 'pending']) await check(mode);
 console.log('Loading checks passed for static fallback, successful load, delayed success, HTTP failure, invalid JSON and timeout.');
})().catch(error => { console.error(error); process.exitCode = 1; });
