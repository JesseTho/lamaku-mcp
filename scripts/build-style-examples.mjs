/**
 * Renders one example course page per template into docs/examples/, using the
 * same wrapHtml the server uses. Run after `pnpm build` whenever a template
 * changes, so the documentation cannot drift from what the tool produces.
 *
 *   node scripts/build-style-examples.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { wrapHtml } from '../dist/tools/instructor/pages.js';

const BODY = `
<h2>Module 2: Reading a 12-lead ECG</h2>

<p>By the end of this module you can identify the rate, rhythm and axis on a
12-lead ECG, and say which of the three needs a second opinion before you act
on it.</p>

<h3>Watch first</h3>

<p>Fifteen minutes, then come back. Watch for how the presenter counts the rate
before looking at anything else.</p>

<h3>Read</h3>

<ul>
  <li>Chapter 4 of the course pack, pages 61 to 78.</li>
  <li>The rhythm strip worksheet, which you will need for the discussion.</li>
</ul>

<blockquote>
  <p>An ECG is a snapshot of a moving thing. A normal trace on an unwell
  patient is a normal trace, not a well patient.</p>
</blockquote>

<h3>Practise</h3>

<p>Work through the six strips in the worksheet. For each one write the rate,
the rhythm and whether the axis is normal, then check yourself against the key
on the last page. <strong>Do all six before reading the key.</strong></p>

<div class="table-wrap">
<table>
  <caption>What to record for each strip</caption>
  <thead>
    <tr><th>Field</th><th>What counts as an answer</th></tr>
  </thead>
  <tbody>
    <tr><td>Rate</td><td>A number in beats per minute, not "fast" or "slow".</td></tr>
    <tr><td>Rhythm</td><td>Named, and whether it is regular.</td></tr>
    <tr><td>Axis</td><td>Normal, left, right, or indeterminate.</td></tr>
  </tbody>
</table>
</div>

<h3>Complete when you can</h3>

<ul>
  <li>Calculate a rate from a strip in under ten seconds.</li>
  <li>Name a rhythm without looking it up.</li>
  <li>Say which findings need a second opinion before you act.</li>
</ul>
`.trim();

await mkdir(new URL('../docs/examples/', import.meta.url), { recursive: true });

for (const t of ['uh', 'jabsom', 'plain']) {
  const html = wrapHtml('Module 2: Reading a 12-lead ECG', BODY, t);
  const out = new URL(`../docs/examples/${t}.html`, import.meta.url);
  await writeFile(out, html, 'utf8');
  console.log(t.padEnd(7), html.length, 'bytes');
}
