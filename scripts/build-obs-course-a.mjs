/**
 * Builds the OBS lecture-production course from the instructional design
 * document, part A: the Start here module, the setup job aid, and Module 1.
 *
 * Follows the design rather than improvising against it. In particular:
 *
 *  - No release condition is created anywhere (DI-4). Dependencies are stated
 *    as content at the top of each module.
 *  - The eligibility page precedes the setup checklist, so a Group B learner
 *    finds out before installing anything (Part IV, Onboarding).
 *  - SC1.1 is built as the fully interactive exemplar. Part IV, Phase 1
 *    requires one self-check to be built and accessibility-reviewed before the
 *    other eleven, because twelve components sharing one construction pattern
 *    means one pattern defect is twelve fixes.
 *  - Every self-check carries its static fallback, which is the required
 *    scripting-disabled path (DI-3) rather than a placeholder.
 *
 * Usage: LAMAKU_COURSE=8238 node scripts/build-obs-course-a.mjs
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../dist/index.js';

const COURSE = Number(process.env.LAMAKU_COURSE ?? process.argv[2]);
if (!Number.isInteger(COURSE)) {
  console.error('Set LAMAKU_COURSE to the target courseId.');
  process.exit(2);
}

const { server } = createServer();
const [ct, st] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: 'course-builder', version: '0' }, { capabilities: {} });
await Promise.all([client.connect(ct), server.connect(st)]);

async function run(name, args) {
  const preview = await client.callTool({ name, arguments: { ...args, course: COURSE } });
  const p = JSON.parse(preview.content[0].text);
  if (p.status !== 'confirmation_required') {
    throw new Error(`${name}: ${preview.content[0].text.slice(0, 300)}`);
  }
  if (p.willDo?.styleWarnings) {
    console.log(`    ! ${args.title ?? name}: ${p.willDo.styleWarnings.join(' | ')}`);
  }
  const res = await client.callTool({
    name,
    arguments: { ...args, course: COURSE, confirmToken: p.confirmToken },
  });
  const r = JSON.parse(res.content[0].text);
  if (r.status !== 'created') throw new Error(`${name}: ${res.content[0].text.slice(0, 300)}`);
  return r;
}

const log = (m) => console.log(m);

/** Time estimate banner. Every page carries one, unrounded (DI-9). */
const mins = (n, what) =>
  `<div class="jumbotron"><p><strong>About ${n} minutes.</strong> ${what}</p></div>`;

// ─────────────────────────────────────────────────────────────────────────
// Start here
// ─────────────────────────────────────────────────────────────────────────
log('Start here');
const start = await run('create_content_module', {
  title: 'Start here',
  description: 'What this course gives you, whether your machine and account can run it, and how to set up.',
  hidden: false,
});

await run('create_content_page', {
  moduleId: start.moduleId,
  title: 'What you will have at the end',
  hidden: false,
  html: `
<h2>What you will have at the end</h2>

<p>A recorded lecture, composed the way you decided rather than the way Zoom decided,
with each remote guest framed on their own and mixed on their own fader, published in
Lamakū where your students will find it, with captions that say what you said.</p>

${mins('228 minutes across four modules, plus setup', 'That is 3.8 hours of work. The estimate is not rounded down, and each page tells you its own share.')}

<h3>Before you spend any time on this</h3>

<p>Two things decide whether you can do the whole course or most of it, and both are
worth checking now rather than in week two. The next page takes two minutes and settles
it. <strong>Nothing is installed until after you have checked.</strong></p>

<h3>How the course is put together</h3>

<ol class="medium-number">
<li><strong>Module 1, Scenes and sources.</strong> Build a scene set for a lecture you are actually teaching.</li>
<li><strong>Module 2, Remote guests.</strong> Bring two guests in as separate video sources with separate faders.</li>
<li><strong>Module 3, Recording and diagnosis.</strong> Record it, verify it, and learn to read why a feed failed.</li>
<li><strong>Module 4, Publishing.</strong> Get it to students, with captions, where they will look.</li>
</ol>

<p>Nothing is locked and no module is gated on another. Each one says at the top what it
assumes you have. Every page tells you its time cost and ends where you can close OBS
without losing work.</p>

<p><a href="#">Next: can your machine and account run this?</a></p>
`.trim(),
});

await run('create_content_page', {
  moduleId: start.moduleId,
  title: 'Can your machine and account run this?',
  hidden: false,
  html: `
<h2>Can your machine and account run this?</h2>

${mins(2, 'Nothing here is recorded and nothing is scored. Read three statements and decide which path you are on.')}

<p>The CoreVideo plugin is what brings each Zoom guest into OBS as their own source.
It has two requirements that are not up to you, and it is better to know now.</p>

<h3>Statement one: your operating system</h3>

<p>CoreVideo runs on Windows 10 or 11, 64-bit. The macOS and Linux builds are
experimental and unsupported. <strong>If you are on a Mac, you are on the OBS-only path,
and there is no workaround to teach you.</strong></p>

<h3>Statement two: your Zoom account</h3>

<p>CoreVideo joins your meeting through the Zoom Meeting SDK, and that needs raw data
access on your Zoom account. This is an account entitlement a Zoom administrator
switches on. It is not a setting in your Zoom preferences, and no amount of expertise
with OBS substitutes for it.</p>

<p>Ask for it now, before you install anything, using the request on the setup page.
Then start Module 1 while you wait, because Module 1 needs no entitlement, no plugin and
no guest.</p>

<h3>Statement three: your machine's capacity</h3>

<p>Recording several people to separate files at once is demanding. This course sets a
deliberate ceiling of two guests at 1280 by 720 and 30 frames per second, which a
mid-range laptop finishes. In Module 3 you will read your own machine's headroom figure
and decide from it. <em>Recording program-only is a correct answer, not a failed one.</em></p>

<h3>Which path are you on?</h3>

<div class="two-col-panels"><div class="row">
<div class="col-sm card bg-light"><div class="card-body">
<h5>Full path</h5>
<p>Windows, and your Zoom account has raw data access. You will do the guest work in a
live session.</p>
</div></div>
<div class="col-sm card bg-light"><div class="card-body">
<h5>OBS-only path</h5>
<p>A Mac, or no entitlement, or a machine that cannot carry it. You will do the guest
work against a supplied set of recordings.</p>
</div></div>
</div></div>

<p><strong>The OBS-only path is not a reduced version of this course.</strong> You do all
four modules, all five graded tasks, and eleven of the twelve objectives at full
strength. The twelfth, assigning a source to a live participant, you reason about and
defend rather than perform. No graded task in this course requires a live CoreVideo
session from anyone.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: start.moduleId,
  title: 'How this course works',
  hidden: false,
  html: `
<h2>How this course works</h2>

${mins(3, 'Read once. It explains the shape of every module and what you can expect from us.')}

<h3>Nothing is locked</h3>

<p>No module is gated on another and no page requires you to finish a previous one. Each
module opens by saying what it assumes you already have and where to get it. You can
skip, and the course would rather you skipped knowingly than were blocked.</p>

<h3>Every module has the same shape</h3>

<p>Two quick questions on an earlier module, then segments of 10 to 15 minutes, then one
task that is graded, then one line asking what is still unclear. Once you have done
Module 1 you know the shape of the other three.</p>

<h3>Checks in the pages are not tests</h3>

<p><strong>The self-checks record nothing, score nothing, and never lock.</strong> They
exist because trying to remember something is better for you than reading it again. When
you get one wrong, the page tells you what you missed rather than what the answer was, so
you get another attempt at retrieving it.</p>

<h3>What is graded, and against what</h3>

<p>Four assignments and one discussion. Every one publishes its criteria as a numbered
list inside its own instructions, and that list is exactly what your work is checked
against. There is no hidden rubric, and no criterion is used in grading that you were not
shown.</p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>What we commit to, and when</caption>
<thead><tr><th scope="col">Task</th><th scope="col">Feedback returned</th><th scope="col">You can revise</th></tr></thead>
<tbody>
<tr><td>Module 1 assignment</td><td>3 working days</td><td>Within 14 days</td></tr>
<tr><td>Module 2 assignment</td><td>2 working days</td><td>Within 14 days</td></tr>
<tr><td>Module 3 assignment</td><td>3 working days</td><td>Re-run within 14 days</td></tr>
<tr><td>Module 3 discussion</td><td>Held, then 5 working days</td><td>Edit within 14 days</td></tr>
<tr><td>Module 4 assignment</td><td>5 working days</td><td>Within 21 days</td></tr>
<tr><td>Any question you ask</td><td>2 working days</td><td>—</td></tr>
</tbody>
</table>
</div>

<p><em>The Module 3 discussion is the one that waits deliberately.</em> If an instructor
posts a diagnosis into an open thread it becomes the answer key, and the thing that
discussion is assessing stops existing. We reply once you have posted in full.</p>

<h3>Using an AI assistant</h3>

<p>Permitted on the written parts, and you add one line saying what you used it for.
Disclosure never costs you anything. Most of what you submit is a file your own machine
produced, which no assistant can make for you. The one thing that is never acceptable is
reporting something that did not happen: a reading your recorder panel did not show, or
a colleague's response to a title you never sent them.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: start.moduleId,
  title: 'Setting up: OBS, CoreVideo, and your Zoom account',
  hidden: false,
  html: `
<h2>Setting up: OBS, CoreVideo, and your Zoom account</h2>

${mins('30 to 45', 'Once per machine, then never again. Work the checklist beside this page. Keep this page; you will want it the next time you set up a machine.')}

<p>This is a job aid, not a lesson. You do it once, and by the time you need it again you
will have forgotten the course, which is why it assumes nothing.</p>

<h3>Gate one: can this machine run it</h3>

<ol class="medium-number">
<li>Confirm Windows 10 or 11, 64-bit.</li>
<li>Install OBS Studio 30 or later from obsproject.com, and open it once.</li>
</ol>

<p>Stop here if you are on a Mac. OBS is still worth having and Modules 1, 3 and 4 all
use it. You are on the OBS-only path.</p>

<h3>Gate two: ask for the Zoom entitlement, then carry on without it</h3>

<p><strong>Send the request before you install the plugin, and do not wait for the
answer.</strong> It is decided by someone else, on mainland hours, and Module 1 needs
none of it.</p>

<div class="jumbotron">
<p>Send to the UH ITS Zoom service owner:</p>
<p>"I am using the CoreVideo plugin for OBS Studio to produce recorded lectures with
remote guest speakers. It joins a meeting through the Zoom Meeting SDK and requires raw
data access on my account. Could you confirm whether raw data access is enabled for my
account, and if not, what the request process is? My UH username is [your username]."</p>
</div>

<h3>Gate three: install the plugin, after the answer arrives</h3>

<ol class="medium-number">
<li>Download CoreVideo from corevideo.io and install it into OBS.</li>
<li>Restart OBS. Confirm the Zoom Control dock appears under the Docks menu.</li>
<li>Open it and sign in to the Zoom account that has raw data access.</li>
</ol>

<p>If installing needs administrator rights you do not have, hand this section to your
desktop support. It is written so somebody else can run it for you.</p>

<h3>Prove it works before you need it</h3>

<ol class="medium-number">
<li>Join a test meeting from the Zoom Control dock, with a phone or a second machine as the other participant.</li>
<li>Add one Zoom Participant source and confirm you can see the other participant.</li>
<li>Record 30 seconds, stop, and open the file.</li>
</ol>

<p><em>If any of this fails, the symptom-to-cause table in the "Keep these" module is the
first place to look, not the help desk.</em> UH ITS does not support CoreVideo and will
correctly tell you so.</p>
`.trim(),
});

log('  setup checklist');
await run('create_checklist', {
  name: 'Before you start: OBS and CoreVideo setup',
  description: 'One time per machine. Nothing here is graded and nothing is timed.',
  displayInCalendar: false,
  categories: [
    {
      name: 'Gate one: can this machine run it',
      items: [
        { name: 'Windows 10 or 11, 64-bit confirmed' },
        { name: 'OBS Studio 30 or later installed and opened once' },
        { name: 'I know which path I am on: FULL path (Windows + Zoom raw data access)' },
        { name: 'I know which path I am on: OBS-ONLY path (Mac, no entitlement, or hardware)' },
      ],
    },
    {
      name: 'Gate two: the Zoom entitlement',
      items: [
        { name: 'Raw data access request sent to the UH ITS Zoom service owner' },
        { name: 'Started Module 1 without waiting for the answer' },
        { name: 'Answer received' },
      ],
    },
    {
      name: 'Gate three: install, then prove it',
      items: [
        { name: 'CoreVideo installed into OBS and OBS restarted' },
        { name: 'Signed in to Zoom from the Control dock' },
        { name: 'Test meeting joined, one participant source visible' },
        { name: 'Recorded 30 seconds and opened the file' },
      ],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────
// Module 1
// ─────────────────────────────────────────────────────────────────────────
log('Module 1: Scenes and Sources');
const m1 = await run('create_content_module', {
  title: 'Module 1: Scenes and Sources',
  description: 'Build the scene set every later module works on. 55 minutes.',
  hidden: false,
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Module 1: what you will have at the end',
  hidden: false,
  html: `
<h2>Module 1: what you will have at the end</h2>

${mins(55, 'Six segments. Each ends where you can close OBS without losing work.')}

<p>A scene set built for a lecture you are actually teaching this term, exported as one
file. Modules 2, 3 and 4 all add to it, record it, and publish it, so this is the
artifact the rest of the course operates on.</p>

<h3>What this module assumes</h3>

<p>Nothing. It is the first one. You need OBS Studio installed, your own slides, a
webcam and a microphone.</p>

<h3>The six segments</h3>

<ol class="medium-number">
<li>Why this looks different from a Zoom recording, and your first recording (9 min)</li>
<li>Scenes, sources, and what a rename does (10 min)</li>
<li>The shot list for your lecture (12 min)</li>
<li>Worked example, completion problem, and the two defects (6 min)</li>
<li>Build your own set (12 min)</li>
<li>Document it, measure it, submit it (6 min)</li>
</ol>

<p>Segment 5 is the one most likely to run over a session boundary. It says so on the
page and tells you how to save.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Why this looks different from a Zoom recording',
  hidden: false,
  html: `
<h2>Why this looks different from a Zoom recording</h2>

${mins(4, 'Watch the comparison, then read the two paragraphs under it.')}

<div class="jumbotron">
<p><strong>Demonstration to be produced.</strong> A 4-minute screencast placing the same
90 seconds of a real lecture twice: once as a single-webcam Zoom recording where the
slide text is unreadable and the presenter is a small tile, once composed, cutting
between a full-frame slide, a slide with the presenter inset, and a full-frame presenter.
Captioned, with a transcript, and with the recording machine's specifications stated on
this page.</p>
</div>

<h3>What actually changed</h3>

<p>Zoom recorded one framing, chosen by Zoom, for the whole session. The composed version
recorded a framing chosen by the instructor, and changed it mid-sentence when the content
changed. That is the whole difference, and it is worth about four minutes of your
attention to see it rather than read about it.</p>

<h3>What it cost</h3>

<p><strong>Being honest about this matters more than selling you the result.</strong> For
a single-presenter lecture with no guests, Zoom cloud recording is the right tool and
this course is overhead you do not need. The difference shows up when you have slides
that must stay readable, or a guest whose audio needs its own fader, or a demonstration
window that cannot survive being scaled into a corner.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Your first recording',
  hidden: false,
  html: `
<h2>Your first recording</h2>

${mins(5, 'Every step is given. You will finish with a file that plays.')}

<div class="jumbotron">
<p><strong>Set the recording destination before you record anything.</strong> Your
Documents folder on a UH-managed machine is usually OneDrive-synced. Syncing while OBS is
writing a video file drops frames and can leave you with a file that will not open.
Record to a local folder that nothing syncs, such as
<code>C:\\Users\\yourname\\Videos\\lecture-capture</code>.</p>
</div>

<h3>Set the destination and read your output resolution</h3>

<ol class="medium-number">
<li>Open OBS Studio. If the Auto-Configuration Wizard opens, choose <strong>Optimize just for recording</strong>, accept the resolution it proposes, and click Apply Settings.</li>
<li>Open <strong>Settings &gt; Output</strong>. Set Recording Path to a local folder that nothing syncs. Click Apply.</li>
<li>Open <strong>Settings &gt; Video</strong>. Read the Output (Scaled) Resolution and write it down. You need that number in segment 6.</li>
<li>Click OK to close Settings.</li>
</ol>

<h3>One scene, one source, thirty seconds</h3>

<ol class="medium-number">
<li>In the <strong>Scenes</strong> panel, click <strong>+</strong>, name the scene <code>Slides full</code>, and click OK.</li>
<li>Open your slide show so OBS has a window to capture.</li>
<li>In the <strong>Sources</strong> panel, click <strong>+</strong>, choose <strong>Window Capture</strong>, leave Create new selected, name it <code>Slides</code>, and click OK.</li>
<li>In the properties dialog, set Window to your slide show window, then click OK.</li>
<li>Click <strong>Start Recording</strong>, talk for 30 seconds, then click <strong>Stop Recording</strong>.</li>
<li>Choose <strong>File &gt; Show Recordings</strong> and play the file.</li>
</ol>

<p>You now have a scene, a source, and a file that plays. That is a working capture
pipeline, and everything after this makes it deliberate rather than making it work.</p>

<p><em>If the file will not open, two things cause it: a synced recording folder, or OBS
closed before the file finished writing.</em></p>
`.trim(),
});

log('  P1.3 object model, with the entry test');
await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Scenes, sources, and what a rename does',
  hidden: false,
  html: `
<h2>Scenes, sources, and what a rename does</h2>

${mins(6, 'The distinction the rest of the course depends on.')}

<h3>Can you already do this?</h3>

<p>If both of these are true for you, skip to the shot list page. Nothing is recorded and
nothing is locked either way.</p>

<div class="jumbotron">
<p>You can already say what happens to Scene 2 when you rename a source that appears in
both Scene 1 and Scene 2, and why the answer is different when the two entries were
created separately.</p>
<p>You can already look at a scene collection export and say how many distinct source
objects it holds, as opposed to how many source entries appear across its scenes.</p>
</div>

<h3>Four words this course uses precisely</h3>

<p><strong>Source.</strong> One capturable thing: a window, a display, a camera, a
microphone, an image. It is an object that exists in the collection. It is what a
participant tile is in a Zoom gallery, with one difference that matters later: Zoom
decided where the tile went, and you decide where the source goes.</p>

<p><strong>Scene.</strong> An arrangement of sources on the canvas. A scene holds entries,
and each entry points at a source object and carries its own position, size and crop.</p>

<p><strong>Scene collection.</strong> The scenes and the source objects together, saved as
one file you can export. This is what you submit, and what Modules 2, 3 and 4 add to.</p>

<p><strong>Scene item.</strong> One appearance of a source object inside one scene.
Position, size and crop live here. The name, the capture target and the filter chain live
on the source object.</p>

<figure>
<svg viewBox="0 0 640 260" role="img" aria-labelledby="t-objmodel d-objmodel" style="max-width:100%;height:auto">
<title id="t-objmodel">Three scenes drawing on three shared source objects</title>
<desc id="d-objmodel">Three scenes sit above three source objects. Seven lines run from the scenes down to the objects. Deck is used by two scenes, Cam by two, Mic by all three, and each object is drawn once no matter how many lines arrive at it.</desc>
<rect x="20" y="16" width="160" height="44" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="100" y="43" text-anchor="middle" font-size="14" fill="currentColor">Slides full</text>
<rect x="240" y="16" width="160" height="44" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="320" y="43" text-anchor="middle" font-size="14" fill="currentColor">Slides + presenter</text>
<rect x="460" y="16" width="160" height="44" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="540" y="43" text-anchor="middle" font-size="14" fill="currentColor">Presenter full</text>
<rect x="60" y="196" width="120" height="44" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="120" y="223" text-anchor="middle" font-size="14" fill="currentColor">Deck</text>
<rect x="260" y="196" width="120" height="44" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="320" y="223" text-anchor="middle" font-size="14" fill="currentColor">Mic</text>
<rect x="460" y="196" width="120" height="44" fill="none" stroke="currentColor" stroke-width="3"/>
<text x="520" y="223" text-anchor="middle" font-size="14" fill="currentColor">Cam</text>
<g stroke="currentColor" stroke-width="1.5" fill="none">
<path d="M100 60 L120 196"/><path d="M100 60 L300 196"/>
<path d="M300 60 L140 196"/><path d="M320 60 L320 196"/><path d="M340 60 L500 196"/>
<path d="M540 60 L340 196"/><path d="M540 60 L520 196"/>
</g>
</svg>
<figcaption><strong>Each source object is drawn once</strong>, however many scenes point at
it. Seven lines, three objects. That is the whole idea.</figcaption>
</figure>

<h3>The pair that differs on one thing</h3>

<div class="table-responsive">
<table class="table table-bordered">
<caption>Two collections that look identical on screen</caption>
<thead><tr><th scope="col">&nbsp;</th><th scope="col">Reuse</th><th scope="col">Duplicate</th></tr></thead>
<tbody>
<tr><th scope="row">Source objects in the collection</th><td>Deck, Mic, Cam</td><td>Deck, Mic, Mic 2, Cam</td></tr>
<tr><th scope="row">Device the audio points at</th><td>Yeti USB, both entries</td><td>Yeti USB, both entries</td></tr>
<tr><th scope="row">What you see and hear</th><td colspan="2">Identical. The canvas is not evidence.</td></tr>
<tr><th scope="row">Rename Mic in Slides full</th><td>Both scenes change</td><td>Only Slides full changes</td></tr>
<tr><th scope="row">Add noise suppression to Mic</th><td>Both scenes get quieter</td><td>Only Slides full does</td></tr>
</tbody>
</table>
</div>

<p>Object identity is the discriminator, and you can see it in three places: how many
entries the source list holds, whether a filter chain is shared, and what a rename does
to the other scene.</p>

<h3>Why people make the duplicate by accident</h3>

<p>The <strong>Add Source</strong> dialog lists the sources that already exist above the
option to create a new one. Scroll past that list, create a new one every time, and you
end up maintaining four microphones and fixing the same filter four times.</p>
`.trim(),
});

log('  P1.4 SC1.1 — the fully interactive exemplar');
await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Same object, or a second object?',
  hidden: false,
  html: `
<h2>Same object, or a second object?</h2>

${mins(3, 'Six collections you have not seen. Nothing is recorded, nothing is scored, and it never locks.')}

<p>For each one, say how many distinct source objects it holds, then say what renaming
the first entry does to the other scene. Work all six, then check.</p>

<div id="sc11">
<noscript><p><strong>Scripting is off, so here are the six with their answers.</strong>
Read each collection, decide, then read the answer under it.</p></noscript>

<div class="table-responsive">
<table class="table table-bordered">
<caption>Six collections</caption>
<thead><tr><th scope="col">#</th><th scope="col">What the collection holds</th><th scope="col">Your call</th></tr></thead>
<tbody>
<tr><th scope="row">1</th><td>Objects: Slide Window, Webcam. Slides: Slide Window. Slides + presenter: Slide Window, Webcam.</td><td><fieldset><legend class="sr-only">Collection 1</legend><label><input type="radio" name="q1" value="one"> One object</label> <label><input type="radio" name="q1" value="two"> Two objects</label></fieldset></td></tr>
<tr><th scope="row">2</th><td>Objects: Room Mic, Microphone, both Audio Input Capture on the same Yeti USB. Presenter: Room Mic. Guest: Microphone.</td><td><fieldset><legend class="sr-only">Collection 2</legend><label><input type="radio" name="q2" value="one"> One object</label> <label><input type="radio" name="q2" value="two"> Two objects</label></fieldset></td></tr>
<tr><th scope="row">3</th><td>Objects: Deck, Cam. Slides full: Deck at full canvas width. Guest beside slides: Deck at half width, Cam.</td><td><fieldset><legend class="sr-only">Collection 3</legend><label><input type="radio" name="q3" value="one"> One object</label> <label><input type="radio" name="q3" value="two"> Two objects</label></fieldset></td></tr>
<tr><th scope="row">4</th><td>Objects: Slide Window, Slide Window 2, Webcam. Slides: Slide Window. Slides + presenter: Slide Window 2, Webcam.</td><td><fieldset><legend class="sr-only">Collection 4</legend><label><input type="radio" name="q4" value="one"> One object</label> <label><input type="radio" name="q4" value="two"> Two objects</label></fieldset></td></tr>
<tr><th scope="row">5</th><td>Objects: Deck, Deck small, Cam. Slides full: Deck. Guest beside slides: Deck small, Cam.</td><td><fieldset><legend class="sr-only">Collection 5</legend><label><input type="radio" name="q5" value="one"> One object</label> <label><input type="radio" name="q5" value="two"> Two objects</label></fieldset></td></tr>
<tr><th scope="row">6</th><td>Objects: Lav Mic, Deck, Cam. Slides full: Deck, Lav Mic. Presenter full: Cam, Lav Mic. Discussion: Cam, Deck, Lav Mic.</td><td><fieldset><legend class="sr-only">Collection 6</legend><label><input type="radio" name="q6" value="one"> One object</label> <label><input type="radio" name="q6" value="two"> Two objects</label></fieldset></td></tr>
</tbody>
</table>
</div>

<p><button type="button" id="sc11check">Check my six</button></p>
<div id="sc11out" role="status" aria-live="polite"></div>
</div>

<script>
(function () {
  var key = { q1: 'one', q2: 'two', q3: 'one', q4: 'two', q5: 'two', q6: 'one' };
  var miss = {
    q1: 'Count the objects in the list, then count the entries across the scenes. Those are two different numbers here, and only one of them tells you about identity.',
    q2: 'Both point at the same hardware. Hardware is not identity. Ask how many objects the collection is maintaining, and how many filter chains you would have to fix.',
    q3: 'Size and position live on the entry, not on the object. Something here changed without a second object being made. Work out which.',
    q4: 'This collection looks the same on the canvas as the first one. The canvas is not the evidence. The source list is.',
    q5: 'The trailing word tells you a second object was made, but its absence would tell you nothing, since a second object can be renamed to anything. Read the list, not the label.',
    q6: 'Seven entries appear across these scenes. That is not the number you were asked for.'
  };
  var btn = document.getElementById('sc11check');
  var out = document.getElementById('sc11out');
  btn.addEventListener('click', function () {
    var wrong = [];
    Object.keys(key).forEach(function (k) {
      var sel = document.querySelector('input[name="' + k + '"]:checked');
      if (!sel || sel.value !== key[k]) wrong.push(k);
    });
    if (wrong.length === 0) {
      out.innerHTML = '<div class="jumbotron"><p>All six. The discriminator you used is object identity, and you can read it off the source list every time. Run it once more before you move on, because retrieving it a second time is what makes it stick.</p></div>';
      return;
    }
    var html = '<div class="jumbotron"><p>Not all six yet. Here is what to look at again. All six are still selectable and nothing is recorded.</p><ul>';
    wrong.forEach(function (k) { html += '<li>' + miss[k] + '</li>'; });
    html += '</ul></div>';
    out.innerHTML = html;
    Object.keys(key).forEach(function (k) {
      var sel = document.querySelector('input[name="' + k + '"]:checked');
      if (sel) sel.checked = false;
    });
  });
})();
</script>

<h3>If scripting is off, or you want the answers</h3>

<p>One object: collections 1, 3 and 6. Two objects: collections 2, 4 and 5. Collection 3
is the one people miss most often, because the deck appears at two different sizes and
size lives on the entry rather than on the object. Collection 2 is the second most missed,
because two objects pointing at the same microphone feel like they must be one.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Seven shots, and the moment each one serves',
  hidden: false,
  html: `
<h2>Seven shots, and the moment each one serves</h2>

${mins(3, 'Vocabulary only. Which shots your lecture needs is your call, and the next page is where you make it.')}

<div class="table-responsive">
<table class="table table-bordered">
<caption>The seven shots this course uses</caption>
<thead><tr><th scope="col">Shot</th><th scope="col">What is on the canvas</th><th scope="col">The moment it serves</th></tr></thead>
<tbody>
<tr><th scope="row">Slides full-frame</th><td>The deck fills the canvas. Nothing else.</td><td>A derivation you write out line by line, where the only thing that must be readable is on the slide.</td></tr>
<tr><th scope="row">Slides with presenter inset</th><td>Deck full, webcam at about a quarter of the canvas width in a corner.</td><td>Twelve minutes of framing at the top of a class, where you are narrating and want to stay present.</td></tr>
<tr><th scope="row">Presenter full-frame</th><td>Webcam fills the canvas.</td><td>Answering a question the slide does not carry.</td></tr>
<tr><th scope="row">Guest full-frame</th><td>The guest fills the canvas.</td><td>A sustained answer in an interview, where expression carries meaning.</td></tr>
<tr><th scope="row">Guest beside slides</th><td>Guest and deck side by side, each near half the canvas width.</td><td>A guest walking through their own figure. <strong>Halving the deck's width halves its text height, so check this one against the legibility floor before you commit to it.</strong></td></tr>
<tr><th scope="row">Discussion view</th><td>You and the guest at equal size, deck absent or reduced to a strip.</td><td>Three exchanges in under a minute, where cutting per speaker would be worse than not cutting.</td></tr>
<tr><th scope="row">Hold card</th><td>A still image with one line of text.</td><td>Before you start, during a break, and when something fails live.</td></tr>
</tbody>
</table>
</div>

<p>Build the guest shots now with a placeholder image captioned "guest joins here". Real
guest sources arrive in Module 2, and nothing in Module 1 needs CoreVideo.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Two shot lists, one lecture',
  hidden: false,
  html: `
<h2>Two shot lists, one lecture</h2>

${mins(3, 'Two instructors, same lecture, different answers. Decide which you would defend before you read why.')}

<div class="jumbotron">
<p><strong>The lecture.</strong> A 50-minute upper-division class. Students settle for the
first 90 seconds. Minutes 2 to 12 are slides with you narrating. At minute 12 a remote
guest joins for a 10-minute interview conducted as back-and-forth. At minute 22 you run a
live software demonstration from a second window for 15 minutes, narrating over it. The
last 13 minutes are questions from the room, answered at the front with the deck still up.</p>
</div>

<div class="two-col-panels"><div class="row">
<div class="col-sm card bg-light"><div class="card-body">
<h5>List A, five shots</h5>
<p>Hold card, slides full-frame, slides with presenter inset, guest full-frame, discussion
view.</p>
<p>Excluded: presenter full-frame, guest beside slides.</p>
</div></div>
<div class="col-sm card bg-light"><div class="card-body">
<h5>List B, four shots</h5>
<p>Hold card, slides with presenter inset, guest beside slides, presenter full-frame.</p>
<p>Excluded: slides full-frame, guest full-frame, discussion view.</p>
</div></div>
</div></div>

<p><strong>Write down which you would defend, and one line saying why, before you read
on.</strong> The commentary below is worth something only against an answer you have
already committed to.</p>

<h3>Defending List A</h3>

<p>The demonstration is the moment this lecture can most easily be ruined, because a
software window scaled into a corner is unreadable at output resolution. List A gives the
demonstration a full-frame shot, which is the only shot that keeps the demo window at a
size students can read. Guest full-frame carries a 10-minute exchange where expression is
part of the content, and discussion view keeps the interview from becoming a cut every
eight seconds.</p>

<h3>Defending List B</h3>

<p>Four shots is four scenes to build and four to switch while also teaching, which is
what one person operating alone can actually run. List B never loses the instructor for
long: presenter full-frame carries 13 minutes of questions, and guest beside slides keeps
the deck on screen while the guest answers. A fifth shot that gets used twice is a scene
you will forget to switch to.</p>

<h3>What actually separates them</h3>

<p>Neither is wrong, and shot count is not the difference. Run both against the five
moments this lecture has: settle, slides, interview, demonstration, questions. List A
covers all five, and its full-frame slide shot answers the demonstration's legibility
problem directly. List B covers four, and has no shot that puts the demonstration window
at full width, so its 15 longest minutes are captured at a size that may fail the
legibility floor.</p>

<p><em>That is a defect in List B against this lecture, and it would not be a defect
against a lecture with no demonstration.</em> When you write your own list, that is what
the criteria are looking for. Not which four shots. Whether each one names the moment it
serves.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Build two scenes with me',
  hidden: false,
  html: `
<h2>Build two scenes with me</h2>

${mins(5, 'A worked example, then a completion problem. Each says when you can skip ahead.')}

<h3>Worked example: add a second scene that reuses your slide window</h3>

<ol class="medium-number">
<li>In <strong>Scenes</strong>, click <strong>+</strong>, name it <code>Slides + presenter</code>, and click OK.</li>
<li>In <strong>Sources</strong>, click <strong>+</strong>, choose <strong>Window Capture</strong>. <strong>The dialog lists sources that already exist above the Create new field.</strong> Select <code>Slides</code> from that list and click OK. Do not type a new name.</li>
<li>In <strong>Sources</strong>, click <strong>+</strong>, choose <strong>Video Capture Device</strong>, leave Create new selected, name it <code>Webcam</code>, choose your camera, and click OK.</li>
<li>Drag the <code>Webcam</code> corner handle until it sits in the lower right at about a quarter of the canvas width.</li>
<li>Click <code>Slides full</code> in the Scenes panel and confirm nothing there moved.</li>
</ol>

<p>Step 5 is the point of the exercise. Position and size live on the scene item, so
resizing the webcam in one scene changes nothing anywhere else, while renaming the slide
window changes its name everywhere.</p>

<div class="jumbotron">
<p><strong>Skip ahead if:</strong> you can do steps 1 to 5 without reading them. Go
straight to building your own set.</p>
</div>

<h3>Completion problem</h3>

<p>The supplied <code>completion-starter</code> collection has three scenes built with the
webcam and slide window placed, and no audio source at all. Add one audio input capture
so that all three scenes have sound and the export lists <strong>one</strong> audio object
with three scene items.</p>

<div class="jumbotron">
<p><strong>Skip ahead if:</strong> your export lists one audio input capture object and
all three scenes show it. If it lists two or three, open Add Source again and look at what
sits above the Create new field.</p>
</div>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Find the two defects',
  hidden: false,
  html: `
<h2>Find the two defects</h2>

${mins(1, "Somebody else's inventory. Two things in it are wrong.")}

<div class="table-responsive">
<table class="table table-bordered">
<caption>Inventory for a seven-scene collection, output resolution 1920 by 1080</caption>
<thead><tr><th scope="col">Source object</th><th scope="col">Kind</th><th scope="col">Filters</th><th scope="col">Appears in</th><th scope="col">Size in that scene</th></tr></thead>
<tbody>
<tr><th scope="row">Deck</th><td>Window Capture, PowerPoint</td><td>Scaling</td><td>Slides full, Slides + presenter, Discussion</td><td>1920 x 1080</td></tr>
<tr><th scope="row">Deck</th><td>(same object)</td><td>Scaling</td><td>Guest beside slides</td><td>940 x 529</td></tr>
<tr><th scope="row">Cam</th><td>Video Capture Device</td><td>None</td><td>Slides + presenter, Presenter full, Discussion</td><td>varies</td></tr>
<tr><th scope="row">Mic</th><td>Audio Input Capture, Yeti USB</td><td>Noise Suppression</td><td>Slides full, Slides + presenter, Presenter full</td><td>not applicable</td></tr>
<tr><th scope="row">Mic 2</th><td>Audio Input Capture, Yeti USB</td><td>None</td><td>Guest full, Guest beside slides, Discussion</td><td>not applicable</td></tr>
<tr><th scope="row">Guest placeholder</th><td>Image</td><td>None</td><td>Guest full, Guest beside slides</td><td>varies</td></tr>
<tr><th scope="row">Hold card</th><td>Image</td><td>None</td><td>Hold card</td><td>1920 x 1080</td></tr>
</tbody>
</table>
</div>

<p>Find both before you read on. One is about objects and one is about size.</p>

<h3>The two defects</h3>

<p><strong>A duplicate.</strong> Mic 2 is a second audio input capture on the same device
as Mic, with no filter chain. This collection maintains two microphones, and the noise
suppression applies to three scenes out of six. <em>Count the microphone entries, then
count the filter chains. A reused object has one chain.</em></p>

<p><strong>A legibility failure.</strong> The Deck entry in Guest beside slides is 940
pixels wide on a 1920-pixel canvas, so 18-point body text lands near 12 pixels of cap
height, below this course's floor of 20. <em>Measure the slide's body text against the
output resolution, not against your monitor.</em></p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Build your own set',
  hidden: false,
  html: `
<h2>Build your own set</h2>

${mins(12, 'The longest single block in this module. Start it when you have a clear quarter of an hour.')}

<p>Build one scene for each shot on the list you wrote, using your own slides, your own
webcam and your own microphone, for the lecture you are actually teaching.</p>

<h3>The one rule that the criteria check</h3>

<p>When a scene needs your microphone, your webcam or your slide window,
<strong>add the source that already exists instead of creating a second one.</strong> The
Add Source dialog lists them above the Create new field. A collection with two microphones
in it fails criterion 6, and more to the point it means you will fix the same filter
twice.</p>

<h3>Order that saves time</h3>

<ol class="medium-number">
<li>Build the scene with the most sources in it first. Everything else reuses from it.</li>
<li>Add the microphone to every scene as you build it, rather than at the end.</li>
<li>Use a placeholder image for guest shots, captioned "guest joins here".</li>
<li>Build the hold card last. It is one image and it takes a minute.</li>
</ol>

<div class="jumbotron">
<p><strong>If you have to stop partway.</strong> Choose <strong>Scene Collection &gt;
Export</strong> and save the file before you close OBS. Your work is in the collection,
not in the window, and exporting is what makes that true.</p>
</div>
`.trim(),
});

await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Document it, measure it, submit it',
  hidden: false,
  html: `
<h2>Document it, measure it, submit it</h2>

${mins(6, 'Four files. The measurement is the part people skip.')}

<h3>Export the collection</h3>

<p>Choose <strong>Scene Collection &gt; Export</strong> and save it as
<code>lastname-collection.json</code>.</p>

<h3>Measure the slide text, rather than judging it</h3>

<ol class="medium-number">
<li>Open your busiest slide scene.</li>
<li>Right-click the preview and set preview scaling to 100 percent, so one canvas pixel is one screen pixel.</li>
<li>Screenshot it as <code>lastname-preview.png</code>.</li>
<li>Open the screenshot in any image editor and measure the smallest line of body text, from the top of a capital letter to its baseline.</li>
</ol>

<div class="jumbotron">
<p><strong>The floor for this course is 20 pixels of cap height.</strong> At 1920 by 1080
with the slide filling the frame, 18-point body text lands near 25 pixels. Scale that
slide to half the canvas width and the same text lands near 12, which fails. Twenty pixels
is this course's own threshold, not a published standard.</p>
</div>

<h3>Write the inventory</h3>

<p>One row per source <em>object</em>, not one row per appearance, listing every scene it
appears in. Save it as <code>lastname-inventory.md</code>.</p>

<h3>Then the propagation account</h3>

<p>Open the supplied <code>duplicate-demo</code> collection. Rename the microphone in its
Scene 1. Look at Scene 2. Write one paragraph saying why Scene 2 did not change, in terms
of what the two entries <em>are as objects</em>. Save it as
<code>lastname-account.md</code>.</p>

<p><em>Describing what you saw on screen does not meet criterion 2.</em> The criterion is
asking you to name the cause, not the symptom.</p>

<h3>Before you go on</h3>

<p>Name one thing about scenes and sources that is still unclear. Write it down for
yourself. If it is the difference between an object and an entry, go back to the object
model page rather than into Module 2, because Module 2 adds guests to the collection you
just built.</p>
`.trim(),
});

log('\nPart A complete.');
await client.close();
process.exit(0);
