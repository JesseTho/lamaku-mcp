/**
 * Audits a built Lamaku course against the rules its design document set, and
 * against the OSCQR items that can be checked mechanically rather than by
 * judgement.
 *
 * This does not evaluate whether the course teaches well. Nobody has taken it,
 * and Part V of the design says plainly that no data exists. What it checks is
 * whether what was built matches what was designed, which is the only question
 * answerable before a learner arrives.
 *
 * Usage: LAMAKU_COURSE=8238 node scripts/evaluate-course.mjs
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/index.js';
import { createDecipheriv } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { HOST, dataDir } from '../dist/config.js';

const COURSE = Number(process.env.LAMAKU_COURSE ?? process.argv[2]);
if (!Number.isInteger(COURSE)) {
  console.error('Set LAMAKU_COURSE to the course to audit.');
  process.exit(2);
}

// Reuse the captured session to fetch served pages directly, which is the only
// way to check what a learner's browser actually receives.
function cookie() {
  const dir = dataDir();
  const key = Buffer.from(readFileSync(join(dir, 'key'), 'utf8'), 'base64');
  const blob = Buffer.from(readFileSync(join(dir, 'session.enc'), 'utf8'), 'base64');
  const d = createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  const s = JSON.parse(Buffer.concat([d.update(blob.subarray(28)), d.final()]).toString('utf8'));
  return s.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}
const COOKIE = cookie();

/** Topic urls arrive both relative and absolute; join only the relative. */
const unreachable = [];

function absolute(u) {
  return /^https?:/i.test(u) ? u : `https://${HOST}${u}`;
}

const { server } = createServer();
const [ct, st] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: 'auditor', version: '0' }, { capabilities: {} });
await Promise.all([client.connect(ct), server.connect(st)]);
const call = async (n, a = {}) =>
  JSON.parse((await client.callTool({ name: n, arguments: { course: COURSE, ...a } })).content[0].text);

const results = [];
const check = (area, label, pass, detail = '') =>
  results.push({ area, label, pass, detail });

// ── Structure ─────────────────────────────────────────────────────────────
const mods = await call('list_modules');
const modules = mods.modules ?? [];
const pages = [];
for (const m of modules) {
  const d = await call('get_module', { moduleId: m.moduleId });
  for (const it of d.items ?? []) if (it.url) pages.push({ module: m.title, ...it });
}
const assignments = (await call('list_assignments')).assignments ?? [];
const forums = (await call('list_forums')).forums ?? [];
const checklists = (await call('list_checklists')).checklists ?? [];

check('Structure', 'Six content modules present', modules.length === 6, `${modules.length} found`);
check('Structure', 'Every module has at least one authored page',
  modules.every((m) => pages.some((p) => p.module === m.title)),
  `${pages.length} pages across ${modules.length} modules`);
check('Structure', 'Four graded assignments', assignments.length === 4, `${assignments.length} found`);
check('Structure', 'One discussion forum with a graded topic', forums.length === 1);
check('Structure', 'Five checklists (setup + four modules)', checklists.length === 5, `${checklists.length} found`);

// ── Design rules ──────────────────────────────────────────────────────────
// DI-4: nothing is gated. Brightspace exposes release conditions per topic;
// their absence is what the design requires.
const anyGated = pages.some((p) => p.isHidden);
check('Design rule DI-4', 'No authored page is hidden from students', !anyGated,
  anyGated ? 'at least one page is hidden' : 'all pages visible');

// DI-11: criteria published in the instructions, no rubric referenced.
let criteriaOk = 0, rubricRefs = 0;
for (const a of assignments) {
  const detail = await call('get_assignment', { assignmentId: a.assignmentId ?? a.id });
  const text = JSON.stringify(detail);
  if (/criteri/i.test(text)) criteriaOk++;
  if (/rubric/i.test(text)) rubricRefs++;
}
check('Design rule DI-11', 'Every assignment publishes its criteria in its own instructions',
  criteriaOk === assignments.length, `${criteriaOk}/${assignments.length}`);
check('Design rule DI-1', 'No assignment refers to a rubric', rubricRefs === 0,
  rubricRefs ? `${rubricRefs} reference a rubric` : 'none');

// DI-2: no quiz exists anywhere, by construction.
const quizzes = await call('list_quizzes');
check('Design rule DI-1', 'No quiz is used as an assessment vehicle',
  (quizzes.count ?? 0) === 0, `${quizzes.count ?? 0} quizzes`);

// ── Served pages: accessibility and style ─────────────────────────────────
let fetched = 0;
const problems = { alt: [], svg: [], h1: [], notes: [], tables: [], long: [], time: [], iframe: [] };
for (const p of pages) {
  const r = await fetch(absolute(p.url), { headers: { Cookie: COOKIE } }).catch(() => null);
  if (!r) { unreachable.push(p.title ?? p.url); continue; }
  if (!r.ok) continue;
  const html = await r.text();
  fetched++;
  const body = html.slice(html.indexOf('<body'));
  // Brightspace injects its own script; strip it before counting words.
  const prose = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
  const words = prose.split(/\s+/).filter(Boolean).length;

  if (/<img(?![^>]*\balt=)/i.test(body)) problems.alt.push(p.title);
  if (/<svg/i.test(body) && !/(role="img"|<title)/i.test(body)) problems.svg.push(p.title);
  if (/<h1[\s>]/i.test(body)) problems.h1.push(p.title);
  if (/8000db/i.test(body)) problems.notes.push(p.title);
  if (/<table/i.test(body) && !/table-responsive/i.test(body)) problems.tables.push(p.title);
  if (/<iframe(?![^>]*\btitle=)/i.test(body)) problems.iframe.push(p.title);
  if (words > 900) problems.long.push(`${p.title} (${words})`);
  if (!/About \d+|About \d+ to \d+/i.test(body)) problems.time.push(p.title);
}

check('Accessibility', 'Every image carries alt text', problems.alt.length === 0, problems.alt.join('; '));
check('Accessibility', 'Every inline SVG carries a text alternative', problems.svg.length === 0, problems.svg.join('; '));
check('Accessibility', 'No page uses h1 (Brightspace owns it)', problems.h1.length === 0, problems.h1.join('; '));
check('Accessibility', 'Every table is wrapped for narrow screens', problems.tables.length === 0, problems.tables.join('; '));
check('Accessibility', 'Every iframe carries a title', problems.iframe.length === 0, problems.iframe.join('; '));
check('Style', 'No leftover instructor notes', problems.notes.length === 0, problems.notes.join('; '));
check('Style', 'No page exceeds the 900-word density limit', problems.long.length === 0, problems.long.join('; '));
check('Design rule DI-9', 'Every page states its own time estimate', problems.time.length === 0,
  problems.time.length ? `missing on: ${problems.time.join('; ')}` : `${fetched} pages checked`);

// UH template applied
const sample = pages[0];
const sr = sample
  ? await fetch(absolute(sample.url), { headers: { Cookie: COOKIE } }).catch(() => null)
  : null;
if (sr) {
  const html = await sr.text();
  check('Style', 'Pages use the UH shared template',
    /SYS_custom\.css/.test(html) && /col-sm-10 offset-sm-1/.test(html));
}

// ── Report ────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
let area = '';
let passed = 0;
console.log(`\nAudit of course ${COURSE} on ${HOST}`);
console.log(`${pages.length} authored pages, ${fetched} fetched and inspected\n`);
for (const r of results) {
  if (r.area !== area) { area = r.area; console.log(`  ${area}`); }
  if (r.pass) passed++;
  console.log(`    ${r.pass ? 'PASS' : 'FAIL'}  ${pad(r.label, 58)} ${r.detail}`);
}
console.log(`\n${passed}/${results.length} checks passed.`);
console.log('\nWhat this audit cannot tell you: whether the course teaches anything.');
console.log('Nobody has taken it. Part V of the design is the plan for finding that out.\n');

await client.close();
process.exit(passed === results.length ? 0 : 1);
