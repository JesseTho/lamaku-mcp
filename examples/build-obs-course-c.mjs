/**
 * Part C: the "Keep these" module.
 *
 * The audit caught this as missing. Part IV's shell architecture specifies six
 * content modules, the last of which holds the job aids deliberately outside
 * the instructional sequence, because a job aid that lives inside Module 3 is
 * a job aid that ends when the course does. Every page here is written for
 * someone who has forgotten the course, which is the state they will be in the
 * next time they need it.
 *
 * Usage: LAMAKU_COURSE=8238 node scripts/build-obs-course-c.mjs
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/index.js';

const COURSE = Number(process.env.LAMAKU_COURSE ?? process.argv[2]);
if (!Number.isInteger(COURSE)) process.exit(2);

const { server } = createServer();
const [ct, st] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: 'course-builder', version: '0' }, { capabilities: {} });
await Promise.all([client.connect(ct), server.connect(st)]);

async function run(name, args) {
  const p = JSON.parse((await client.callTool({ name, arguments: { ...args, course: COURSE } })).content[0].text);
  if (p.status !== 'confirmation_required') throw new Error(`${name}: ${JSON.stringify(p).slice(0, 200)}`);
  if (p.willDo?.styleWarnings) console.log(`    ! ${args.title}: ${p.willDo.styleWarnings.join(' | ')}`);
  const r = JSON.parse((await client.callTool({
    name, arguments: { ...args, course: COURSE, confirmToken: p.confirmToken },
  })).content[0].text);
  if (r.status !== 'created') throw new Error(`${name}: ${JSON.stringify(r).slice(0, 200)}`);
  return r;
}
const mins = (n, what) =>
  `<div class="jumbotron"><p><strong>About ${n} minutes.</strong> ${what}</p></div>`;

console.log('Keep these: job aids and reference');
const keep = await run('create_content_module', {
  title: 'Keep these: job aids and reference',
  description: 'The parts worth having after the course ends. Written for someone who has forgotten it.',
  hidden: false,
});

await run('create_content_page', {
  moduleId: keep.moduleId,
  title: 'What is in here, and why it is separate',
  hidden: false,
  html: `
<h2>What is in here, and why it is separate</h2>

${mins(1, 'Orientation only. Everything else in this module is reference.')}

<p>These pages are not part of the four modules and they carry no objective. They are here
because you will need them a year from now, when you set up a new machine or a feed fails
ten minutes into a lecture, and by then you will have forgotten this course entirely.</p>

<p><strong>Each page assumes nothing.</strong> No page in here says "as you learned in
Module 2", because at the moment you need it you will not have learned anything in Module
2 for eleven months.</p>

<ol class="medium-number">
<li>Setting up a new machine, which is the checklist in Start here</li>
<li>Symptom to cause, when a feed fails</li>
<li>The pre-flight card, for the five minutes before you record</li>
<li>A known-good configuration to compare yours against</li>
<li>Words this course uses precisely</li>
<li>What version this was checked against</li>
</ol>

<p><em>Download or print the ones you will need where you record.</em> A troubleshooting
table that lives in a browser tab on the machine that is currently failing is not much use.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: keep.moduleId,
  title: 'Symptom to cause: when a feed fails',
  hidden: false,
  html: `
<h2>Symptom to cause: when a feed fails</h2>

${mins(2, 'Reference. Read the four Diagnostics fields in order rather than scanning for your symptom.')}

<p>The Diagnostics dock reports four things per source. Read them in this order and each
one closes off a family of causes.</p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>The four fields, and what each is evidence of</caption>
<thead><tr><th scope="col">Read this</th><th scope="col">It tells you</th></tr></thead>
<tbody>
<tr><th scope="row">1. Requested against observed resolution</th><td>Whether you got the picture you asked for. A gap means something downgraded the stream, and it does not say which side.</td></tr>
<tr><th scope="row">2. Observed frame rate</th><td>Zero means nothing is arriving. Low but non-zero means frames are arriving and being thinned. Those are different problems.</td></tr>
<tr><th scope="row">3. Frame age</th><td>Tens of milliseconds is healthy. A number climbing while you watch is a stopped feed, whatever the picture is showing you.</td></tr>
<tr><th scope="row">4. Retry count</th><td>Climbing means the plugin knows the source is gone. <strong>Zero on a frozen picture is the most useful reading in the dock</strong>, because nothing thinks anything is wrong, so nothing will fix itself.</td></tr>
</tbody>
</table>
</div>

<p>Two behaviours change what you see and neither is a fault. Video loss mode either holds
the last frame or shows black, so a dead feed can look like a working one. Colour bars
display before the first frame arrives, so bars mean the feed never started rather than
that it stopped.</p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>Symptom, reading, cause, remedy, and whether it is yours to fix</caption>
<thead><tr><th scope="col">Symptom</th><th scope="col">Reading</th><th scope="col">Probable causes</th><th scope="col">Remedy</th><th scope="col">Yours?</th></tr></thead>
<tbody>
<tr><th scope="row">Black source</th><td>Observed blank, FPS 0, frame age climbing, retries climbing</td><td>Camera off; assigned participant absent; spotlight slot empty; feed dropped with loss mode black</td><td>Confirm the participant is present with camera on; reassign; fill the slot; trigger failover</td><td>Yours</td></tr>
<tr><th scope="row">Frozen frame</th><td>Observed matches requested, FPS 0, frame age climbing, <strong>retries 0</strong></td><td>Participant stopped sending and loss mode is holding; rejoined under a new ID; renamed</td><td>Set loss mode to black so it looks dead next time; reassign; trigger failover</td><td>Yours</td></tr>
<tr><th scope="row">Bars that never clear</th><td>No observed values, no frame received, retries climbing steadily</td><td>Meeting not started; host has not approved raw data; account entitlement absent or revoked</td><td>Confirm the meeting is live and raw data approved, then read the debug events</td><td><strong>Escalate</strong> if the events show a subscription rejection</td></tr>
<tr><th scope="row">Wrong person</th><td>All four fields healthy</td><td>Active speaker and someone else spoke; spotlight index points elsewhere; fixed binding resolved to a changed ID</td><td>Reassign by the mode the shot needs; re-bind after any rejoin</td><td>Yours</td></tr>
<tr><th scope="row">Resolution below requested</th><td>Observed below requested, FPS low, frame age elevated, retries elevated</td><td>Your incoming ceiling reached; or the sender's upstream constrained</td><td>Cut stream count or requested resolution; ask the guest to close other uploads</td><td>Yours, or the guest's network</td></tr>
<tr><th scope="row">Missing audio</th><td>Video normal, the WAV exists and opens silent</td><td>Source added without its audio path; fader at minimum; muted at source; routed to monitoring only</td><td>Confirm exactly one path per guest reaches the recorder; restore the fader</td><td>Yours</td></tr>
<tr><th scope="row">Doubled audio</th><td>Video normal, a voice on two tracks or one track with an echo</td><td>Desktop audio is capturing the Zoom client's output while the participant source carries the same voice</td><td>Remove or mute the desktop audio capture</td><td>Yours</td></tr>
<tr><th scope="row">Dropped frames</th><td>Source fields healthy; the drop is reported by output stats, not by the source</td><td>Encode pressure beyond what the machine carries; or a synced recording folder stalling writes</td><td>Cut ISO count, then resolution, then move to a hardware encoder; move the folder somewhere local</td><td>Yours</td></tr>
</tbody>
</table>
</div>

<p><em>If your reading matches no row here, that is worth reporting rather than working
around.</em> A symptom nobody has seen before means this table needs another row, and the
next person to hit it should find one.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: keep.moduleId,
  title: 'Pre-flight card: the five minutes before you record',
  hidden: false,
  html: `
<h2>Pre-flight card: the five minutes before you record</h2>

${mins(1, 'Print this. Run it before every session that matters.')}

<h3>Destination and settings</h3>

<ol class="medium-number">
<li>Recording folder is local and nothing syncs it. Not Documents, if Documents is OneDrive.</li>
<li>Output resolution is what you expect. Write the number down.</li>
<li>Recorder panel open. Headroom figure read and written down.</li>
<li>Program-only or ISO chosen from that figure, not from habit.</li>
</ol>

<h3>Sources</h3>

<ol class="medium-number">
<li>Every guest is on the mode their shot needs, not the one you used last time.</li>
<li>Failover set on the source you could not lose.</li>
<li>Diagnostics read per source: observed matches requested, frame age low, retries zero.</li>
</ol>

<h3>Audio, by the numbers</h3>

<ol class="medium-number">
<li>One fader per guest, and they move independently.</li>
<li>Both guests peaking between −12 and −6 dBFS while actually speaking.</li>
<li>No desktop audio capture carrying a voice a participant source already carries.</li>
</ol>

<h3>Consent, if anyone is being recorded to their own file</h3>

<ol class="medium-number">
<li>Said out loud at the start what is being recorded and to what.</li>
<li>Somewhere controlled to keep the files.</li>
<li>A deletion date, written down.</li>
</ol>

<h3>Afterwards, before you close anything</h3>

<p><strong>List the files, play each one, and say whose voice is on each track.</strong>
An unverified capture is discovered to be empty on the day you sit down to edit it.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: keep.moduleId,
  title: 'A known-good configuration',
  hidden: false,
  html: `
<h2>A known-good configuration</h2>

${mins(2, 'Something to compare yours against when you are not sure what normal looks like.')}

<p>This is one configuration that works on a mid-range machine. It is not optimal, and
nothing here is optimal without naming the machine it was optimal on. It is a baseline you
can diff against when something is wrong and you cannot tell what.</p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>A working two-guest configuration</caption>
<thead><tr><th scope="col">Setting</th><th scope="col">Value</th><th scope="col">Why this one</th></tr></thead>
<tbody>
<tr><th scope="row">Base and output resolution</th><td>1920 x 1080</td><td>Slide text at 18 point lands near 25 pixels of cap height, above this course's floor of 20</td></tr>
<tr><th scope="row">Frame rate</th><td>30 fps</td><td>Sixty doubles encode work and buys nothing for slides and talking heads</td></tr>
<tr><th scope="row">Guest source resolution</th><td>1280 x 720 each</td><td>Two guests at roughly 3 Mbps each, comfortably inside a standard 30 Mbps ceiling</td></tr>
<tr><th scope="row">Recording format</th><td>MP4</td><td>Opens anywhere. Note that an interrupted MP4 can be unrecoverable, which is why you stop cleanly</td></tr>
<tr><th scope="row">Encoder</th><td>Hardware if the machine has one, x264 otherwise</td><td>Moves work off the CPU. If the GPU is the constraint this does not help</td></tr>
<tr><th scope="row">ISO outputs</th><td>Two, one per guest</td><td>Three simultaneous encodes with the program recording. Above roughly 20 percent headroom this is comfortable</td></tr>
<tr><th scope="row">Recording folder</th><td>A local path, nothing syncing it</td><td>The single most common cause of dropped frames and files that will not open</td></tr>
<tr><th scope="row">Guest levels</th><td>Peaks between −12 and −6 dBFS</td><td>Read the number. Do not judge by ear and do not judge by meter colour</td></tr>
<tr><th scope="row">Video loss mode</th><td>Black, not hold-last-frame</td><td>A held frame makes a dead feed look alive, which is how you lose ten minutes before noticing</td></tr>
</tbody>
</table>
</div>

<p><em>The last row is a deliberate departure from the default</em>, and it is worth
understanding rather than copying. Holding the last frame looks better to an audience. It
also means the only thing that tells you a guest has gone is the Diagnostics dock, and you
will not be looking at it.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: keep.moduleId,
  title: 'Words this course uses precisely',
  hidden: false,
  html: `
<h2>Words this course uses precisely</h2>

${mins(2, 'Reference. Several of these have a loose everyday meaning and a precise one here.')}

<div class="table-responsive">
<table class="table table-bordered">
<caption>Glossary</caption>
<thead><tr><th scope="col">Term</th><th scope="col">What it means here</th></tr></thead>
<tbody>
<tr><th scope="row">Source</th><td>One capturable thing, and an object that exists in the collection. A window, a display, a camera, a microphone, an image.</td></tr>
<tr><th scope="row">Scene</th><td>An arrangement of sources on the canvas. It holds entries pointing at source objects; it is not the thing being captured.</td></tr>
<tr><th scope="row">Scene item</th><td>One appearance of a source object inside one scene. Position, size and crop live here.</td></tr>
<tr><th scope="row">Scene collection</th><td>The scenes and the source objects together, exportable as one file. This is the artifact the whole course builds.</td></tr>
<tr><th scope="row">Canvas</th><td>The composition area at your base resolution. Not the recording, and not what any one scene shows.</td></tr>
<tr><th scope="row">Filter chain</th><td>Processing attached to a source object. A reused object carries one chain everywhere, which is why reuse matters.</td></tr>
<tr><th scope="row">Program recording</th><td>What your scenes showed. One file, one composition, what a viewer would have seen.</td></tr>
<tr><th scope="row">ISO recording</th><td>One assigned output written to its own file, with its own audio. The raw material a composition could be assembled from later.</td></tr>
<tr><th scope="row">Headroom</th><td>The recorder panel's estimate of encode capacity left. Read before recording, not after failing.</td></tr>
<tr><th scope="row">dBFS</th><td>Decibels relative to full scale. Zero is the ceiling and everything else is negative. Speech peaks between −12 and −6.</td></tr>
<tr><th scope="row">Raw data access</th><td>A Zoom account entitlement that lets a Meeting SDK client receive per-participant streams. An administrator grants it.</td></tr>
<tr><th scope="row">Assignment mode</th><td>How a CoreVideo source decides whose picture to carry: fixed participant, active speaker, spotlight slot, or active screen share.</td></tr>
<tr><th scope="row">Failover participant</th><td>Who a source falls back to when its primary leaves. Set it on the source you could not lose.</td></tr>
<tr><th scope="row">Tiles</th><td>A single source rendering the whole participant gallery. One object, one fader, and no way to reframe one person.</td></tr>
<tr><th scope="row">Frame age</th><td>How long since the last frame arrived. Climbing means stopped, whatever the picture shows.</td></tr>
<tr><th scope="row">ʻOkina</th><td>A consonant in ʻōlelo Hawaiʻi and its own character, U+02BB. Not an apostrophe, and a search for one does not match the other.</td></tr>
</tbody>
</table>
</div>
`.trim(),
});

await run('create_content_page', {
  moduleId: keep.moduleId,
  title: 'What this was checked against',
  hidden: false,
  html: `
<h2>What this was checked against</h2>

${mins(1, 'Version stamp. If your interface does not match the steps, start here.')}

<p>Software moves and courses go stale. This page says what these pages were verified
against, so that when a step does not match what you see, you can tell whether the course
is wrong or you are.</p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>Versions and status</caption>
<thead><tr><th scope="col">Component</th><th scope="col">Verified against</th><th scope="col">Status</th></tr></thead>
<tbody>
<tr><th scope="row">OBS Studio</th><td>To be stamped at first build verification</td><td>Menu labels and step sequences need re-checking at each major release</td></tr>
<tr><th scope="row">CoreVideo</th><td>To be stamped at first build verification</td><td>Tracks two moving APIs, Zoom's Meeting SDK and OBS's plugin API. A break in either is outside this course's control</td></tr>
<tr><th scope="row">Lamakū (Brightspace)</th><td>Learning Environment API 1.96</td><td>Rubric authoring needs 1.97, which is why this course publishes criteria as numbered lists instead</td></tr>
</tbody>
</table>
</div>

<h3>Things this course states plainly rather than glossing</h3>

<p><strong>UH ITS does not support CoreVideo</strong> and will correctly decline. The
symptom-to-cause table is the first line, and the course contact is the escalation, not the
help desk.</p>

<p><strong>Neither OBS Studio nor CoreVideo publishes an accessibility statement.</strong>
OBS's own interface accessibility has not been assessed by anyone. If you use a screen
reader, parts of the procedure taught here may not be workable as written, and captioning
the demonstrations does not address that. The accommodation route is through the usual
institutional channels, and a supported session working alongside someone is available. That
is a workaround and not an equivalent alternative, and calling it one would be dishonest.</p>

<p><strong>The Zoom raw data entitlement is an account permission</strong> a Zoom
administrator grants. If you cannot get it, that is an administrative outcome and not a
failure on your part.</p>
`.trim(),
});

console.log('\nPart C complete.');
await client.close();
process.exit(0);
