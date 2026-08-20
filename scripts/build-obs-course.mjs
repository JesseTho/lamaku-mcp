/**
 * Builds the OBS lecture-production mini course directly in Lamaku through the
 * MCP tools, rather than exporting a Common Cartridge and importing it.
 *
 * Design follows instructional-design-skills/course-builder:
 *
 *  - Step 0 gate. Installing OBS and CoreVideo is performed once and then never
 *    again, which learning-design.md calls out as a job-aid problem rather than
 *    a training problem. Setup ships as a checklist; the course teaches only the
 *    recurring skill.
 *  - Objectives are typed before authoring. One concept, three procedures.
 *    content-types.md is explicit that a procedure cannot be assessed by quiz,
 *    so every procedure module ends in an assignment with a stated standard.
 *  - Quiz shells are deliberately not used. The API cannot create questions, so
 *    a quiz here would be an empty container pretending to assess something.
 *
 * Usage: LAMAKU_COURSE=8238 node scripts/build-obs-course.mjs
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

/** Runs a two-step tool: preview, then confirm with the returned token. */
async function run(name, args) {
  const preview = await client.callTool({ name, arguments: { ...args, course: COURSE } });
  const p = JSON.parse(preview.content[0].text);
  if (p.status !== 'confirmation_required') {
    throw new Error(`${name}: expected a preview, got ${preview.content[0].text.slice(0, 200)}`);
  }
  const res = await client.callTool({
    name,
    arguments: { ...args, course: COURSE, confirmToken: p.confirmToken },
  });
  const r = JSON.parse(res.content[0].text);
  if (r.status !== 'created') {
    throw new Error(`${name}: ${res.content[0].text.slice(0, 200)}`);
  }
  return r;
}

const log = (msg) => console.log(msg);

// ── Setup checklist. The Step 0 finding, shipped as a job aid. ─────────────
log('Checklist: one-time setup');
const checklist = await run('create_checklist', {
  name: 'Before you start: OBS and CoreVideo setup',
  description:
    'One-time setup. Work through this once, then keep it as a reference. ' +
    'You do not need to memorise any of it.',
  categories: [
    {
      name: 'Check you can run this at all',
      items: [
        { name: 'Windows 10 or 11, 64-bit (macOS builds are beta and unsupported)' },
        { name: 'OBS Studio 30 or newer installed' },
        { name: 'Confirm your Zoom account has Meeting SDK raw data access' },
      ],
    },
    {
      name: 'Install',
      items: [
        { name: 'Download CoreVideo from corevideo.io/download' },
        { name: 'Install into OBS, then restart OBS' },
        { name: 'Open Tools then Zoom Plugin Settings and sign in to Zoom' },
      ],
    },
    {
      name: 'Prove it works before you need it',
      items: [
        { name: 'Join a test meeting from the Zoom Control dock' },
        { name: 'Add one Zoom Participant source and see your own video in it' },
        { name: 'Record 30 seconds and open the file' },
      ],
    },
  ],
});
log(`  checklist ${checklist.checklistId}, ${checklist.categories.length} categories`);

// ── Module 1. Concept. ────────────────────────────────────────────────────
log('Module 1: scenes and sources');
const m1 = await run('create_content_module', {
  title: 'Module 1: Scenes and sources',
  description: 'What OBS is actually made of, and why the distinction decides your layout.',
  hidden: false,
});
await run('create_content_page', {
  moduleId: m1.moduleId,
  title: 'Scenes and sources',
  hidden: false,
  html: `
<p><em>Before you read on, answer this from memory: you want to show your slides,
then cut to your face, then show both together. How many scenes is that, and how
many sources?</em></p>

<h2>The distinction</h2>
<p>A source is one thing OBS can capture. Your webcam is a source. A window on
your screen is a source. One Zoom participant, delivered by CoreVideo, is a
source. Sources do not know about each other.</p>
<p>A scene is an arrangement of sources. <strong>The same source can appear in
many scenes, and it stays one source.</strong> Your webcam in the corner of your
slide scene and your webcam full-frame in your talking-head scene are one camera
used twice, not two cameras.</p>
<p>The answer to the question above is three scenes and two sources. People
usually guess three of each, because the word "scene" sounds like a thing you
build from scratch each time.</p>

<h2>Why it decides your layout</h2>
<p>Because sources are shared, you set your camera up once and every scene
inherits it. Change the exposure and it changes everywhere. If you build three
independent copies instead, you will fix the same problem three times and miss
one of them during a lecture.</p>
<p>Switching scenes is instant and switching sources is not. Anything you want to
cut to mid-lecture needs to already exist as its own scene.</p>

<h2>Sorting things you have not seen yet</h2>
<p>Try these before the answers. A PDF of your syllabus open in a reader. The
Zoom screen share coming from a guest speaker. A layout showing four students in
a grid. A lower-third title bar with your name.</p>
<p>The reader window is a source. The guest screen share is a source, and
CoreVideo gives it to you as its own dedicated one. The four-student grid is a
scene, unless you use the CoreVideo Tiles source, which builds the whole gallery
wall inside a single source. The title bar is a source.</p>
<p><em>The Tiles case is the one that catches people, and it is worth
remembering: something that looks like a layout is sometimes a source.</em></p>

<h2>A working three-scene layout</h2>
<ol>
<li><strong>Talking head.</strong> Camera full frame. Use it to open and close.</li>
<li><strong>Content.</strong> Slides or application capture, camera small in a
corner.</li>
<li><strong>Guest.</strong> Your camera and one Zoom participant side by side.</li>
</ol>
<p>Three scenes covers most lectures. Add a fourth only when you catch yourself
wanting it twice in the same session.</p>
`.trim(),
});

// ── Module 2. Procedure. ──────────────────────────────────────────────────
log('Module 2: CoreVideo');
const m2 = await run('create_content_module', {
  title: 'Module 2: Bringing Zoom into OBS with CoreVideo',
  description: 'Join a meeting and give every participant their own video and audio source.',
  hidden: false,
});
await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'Bringing Zoom participants into OBS',
  hidden: false,
  html: `
<p>The usual ways of getting Zoom into OBS all cost you something. Screen capture
gives you Zoom's grid with its own decorations baked in. A virtual camera gives
you one combined image. In both, everyone shares one audio track, so you cannot
fix one quiet guest without changing everyone.</p>
<p>CoreVideo joins the meeting through the Zoom Meeting SDK and hands OBS each
participant separately. <strong>Each person arrives as their own video source and
their own audio fader.</strong></p>

<h2>Before you start</h2>
<p>Work through the setup checklist first. The step that stops people is the Zoom
side: raw data access is an account entitlement, not a setting you can switch on
yourself. If your account does not have it, nothing in this module will work and
you need your Zoom administrator, not more troubleshooting.</p>

<h2>Join and assign</h2>
<ol>
<li>Open the Zoom Control dock in OBS.</li>
<li>Enter the meeting ID and your display name, then join. Tick Webinar first if
it is a webinar, because that uses a different entry point.</li>
<li>Watch the status dot settle and the participant roster fill.</li>
<li>Add a Zoom Participant source to your scene.</li>
<li>In its properties, set what it follows: a fixed person, the active speaker,
a spotlight slot, or the screen share.</li>
<li>Add a Zoom Participant Audio source for anyone you need to control
separately.</li>
</ol>
<p>Assignment mode is the decision that matters. Fixed is right for a co-host who
is always there. Active speaker suits a panel where you cannot predict who talks.
Spotlight slots let the meeting host drive your layout from inside Zoom.</p>

<h2>When it goes wrong</h2>
<p>A source showing colour bars has not received its first frame yet, which
usually means the participant has their camera off. A source that freezes on the
last frame has lost its feed, and that behaviour is a setting you chose, so it is
working as configured.</p>
<p>If several 1080p feeds arrive but later ones do not, you have most likely hit
the account bandwidth ceiling. A standard account is typically capped around
30 Mbps incoming and each 1080p stream costs roughly 4 to 6 Mbps. Drop the
capture resolution to 720p before you assume the plugin is broken.</p>
<p><em>Check the Diagnostics dock rather than guessing. It shows requested
against observed resolution, frame age, and retry counts, which is usually enough
to tell a Zoom problem from an OBS problem.</em></p>
`.trim(),
});

// ── Module 3. Procedure. ──────────────────────────────────────────────────
log('Module 3: recording');
const m3 = await run('create_content_module', {
  title: 'Module 3: Recording a lecture worth keeping',
  description: 'Program recording, isolated per-participant files, and what to check afterwards.',
  hidden: false,
});
await run('create_content_page', {
  moduleId: m3.moduleId,
  title: 'Recording, and what to check afterwards',
  hidden: false,
  html: `
<p><em>First, from Module 2: if a guest sounds quiet in your recording, what did
your setup have to include for you to be able to fix it later?</em></p>
<p>A separate audio source for that guest. If everyone shares one track, the
quiet guest is quiet forever.</p>

<h2>Two recordings, not one</h2>
<p>OBS records the program, which is whatever your scenes showed at the time.
CoreVideo can additionally record each assigned participant to its own MP4 with
matching WAV audio. That second kind is an ISO recording.</p>
<p><strong>The program recording is what you publish, and the ISO files are what
save you when it goes wrong.</strong> A guest who dropped out of frame, a slide
you cut away from too early, a co-host whose microphone clipped: all recoverable
from ISO files, none recoverable from the program alone.</p>

<h2>Recording a session</h2>
<ol>
<li>Open the recorder panel and check the ISO capacity estimate before you
start.</li>
<li>Choose which outputs record in isolation. Every participant is rarely the
right answer.</li>
<li>Enable the main program recording as well.</li>
<li>Start recording, then say something and check the audio meters move.</li>
<li>Stop, then open one ISO file and the program file before you close OBS.</li>
</ol>
<p>Step 5 is the one people skip and the only one that catches a silent
recording. Doing it while OBS is still open means you can re-record immediately
instead of rescheduling.</p>

<h2>What the capacity warning means</h2>
<p>Each ISO file is a separate encode. Eight isolated 1080p participants plus a
program recording is nine simultaneous encodes, and a laptop will drop frames
doing that. The recorder panel warns you when it expects CPU or GPU pressure.</p>
<p>Treat the warning as a limit rather than advice. Recording fewer people well
beats recording everyone badly, and you cannot repair dropped frames afterwards.</p>
`.trim(),
});

// ── Module 4. Procedure and principle. ────────────────────────────────────
log('Module 4: publishing');
const m4 = await run('create_content_module', {
  title: 'Module 4: Publishing your lecture in Lamaku',
  description: 'Getting the recording to students, with captions, in the place they will look.',
  hidden: false,
});
await run('create_content_page', {
  moduleId: m4.moduleId,
  title: 'Publishing your lecture in Lamaku',
  hidden: false,
  html: `
<p>CoreVideo does not talk to Lamaku, and nothing in OBS does either. What you
have at the end of Module 3 is a file. This module is about the gap between that
file and a student watching it.</p>

<h2>Do not upload the raw file to a content module</h2>
<p>A one-hour lecture recording is large, and Brightspace content storage is not
built to stream it well. Put the video where video belongs and link to it from
the module.</p>
<p><strong>Use your institution's video service and add the link as a content
topic.</strong> Students get a player that seeks properly, and your course keeps
working when the file is updated.</p>

<h2>Captions are not optional</h2>
<p>A recorded lecture published to students needs captions. Auto-generated
captions are a starting point and not a finish line, because they reliably fail
on the words that matter most: names, technical terms, and anything said over
a cough.</p>
<p>Budget ten to fifteen minutes to correct a one-hour transcript. Check the
first minute, every technical term, and anything you know you said quickly.</p>

<h2>Where it goes decides whether it gets watched</h2>
<p>A recording filed by date is a recording nobody finds in week nine. File it by
what it teaches, in the module the student is already working through.</p>
<p>Ask what a student is doing when they need this. Someone catching up on a
missed class wants it beside the readings. Someone revising for an exam wants the
fifteen-minute segment on one topic, not the full hour. Those are different
files, and cutting the second from the first takes a few minutes.</p>
<p><em>Where you cannot do both, publish the full recording and add timestamps in
the topic description. It is most of the benefit for a fraction of the work.</em></p>

<h2>Before you call it published</h2>
<ol>
<li>Open the link as a student, not as yourself.</li>
<li>Play thirty seconds with the sound on.</li>
<li>Turn captions on and read a line.</li>
<li>Check it is in the module a student would look in first.</li>
</ol>
`.trim(),
});

// ── Assessment. Procedures get performance tasks, not quizzes. ────────────
log('Assignments');
const a2 = await run('create_assignment', {
  name: 'Module 2 task: two participants, two audio faders',
  outOf: 10,
  hidden: false,
  instructions:
    'Join a Zoom test meeting through the CoreVideo dock with at least one other ' +
    'person, or a second device signed in as a guest. Build a scene containing ' +
    'two Zoom Participant video sources and two separate Zoom Participant Audio ' +
    'sources. Submit one screenshot of the OBS window showing the scene, the ' +
    'source list, and the audio mixer. Standard: each participant appears in ' +
    'their own video source, and the mixer shows a separate fader per person. ' +
    'A single combined feed does not meet the standard, however good it looks.',
});
const a3 = await run('create_assignment', {
  name: 'Module 3 task: a program file and an ISO file',
  outOf: 10,
  hidden: false,
  instructions:
    'Record two minutes with ISO recording enabled for at least one participant ' +
    'and the program recording on. Submit the first 30 seconds of the program ' +
    'recording and the matching 30 seconds of one ISO file. Standard: both files ' +
    'play, both have audio, and the ISO file contains one participant only. ' +
    'State in a sentence what the capacity estimate said before you recorded and ' +
    'whether you changed anything because of it.',
});
const a4 = await run('create_assignment', {
  name: 'Module 4 task: publish one lecture',
  outOf: 10,
  hidden: false,
  instructions:
    'Publish a recording, of any length over five minutes, into a Lamaku course ' +
    'you teach or a sandbox. Submit the link a student would click, plus two or ' +
    'three sentences on why you filed it where you did. Standard: the link opens ' +
    'for a student account, captions are present and you have corrected at least ' +
    'the technical terms, and your reasoning refers to what a student is doing ' +
    'when they need it rather than to the date it was recorded.',
});

log('Grade items');
for (const [name, id] of [['Module 2 task', a2], ['Module 3 task', a3], ['Module 4 task', a4]]) {
  await run('create_grade_item', { name, maxPoints: 10, hidden: false, description: `Performance task for ${name}.` });
}

// ── Module 1 assessment. Concept work belongs in discussion. ──────────────
log('Discussion');
const forum = await run('create_discussion_forum', {
  name: 'Module 1: classify these',
  description: 'Concept practice for scenes and sources, using cases the pages did not cover.',
  hidden: false,
});
await run('create_discussion_topic', {
  forumId: forum.forumId,
  name: 'Scene or source?',
  hidden: false,
  scoreOutOf: 10,
  description:
    'Post your classification of these four, with one sentence of reasoning each: ' +
    '(1) a document camera pointed at a worked problem, (2) a countdown timer ' +
    'before class starts, (3) a CoreVideo Tiles wall showing eight students, ' +
    '(4) a pre-recorded clip you play mid-lecture. Then reply to one other post ' +
    'and say where you disagree, or where their reasoning covers a case yours ' +
    'does not. Two of these are less obvious than they look.',
});

log('Announcement');
await run('create_announcement', {
  title: 'Start here: producing online lectures with OBS',
  publish: true,
  body:
    '<p>This mini course covers producing a lecture in OBS Studio and getting it ' +
    'to students in Lamaku, including bringing Zoom participants in as separate ' +
    'sources with CoreVideo.</p>' +
    '<p><strong>Check one thing before you begin.</strong> CoreVideo needs a Zoom ' +
    'account with Meeting SDK raw data access, and that is an account entitlement ' +
    'your Zoom administrator controls. Without it, Module 2 onward will not work. ' +
    'Work through the setup checklist first and confirm it there.</p>' +
    '<p>Modules 2, 3 and 4 are assessed by doing the thing, not by a quiz. Each ' +
    'task states the standard it is marked against.</p>',
});

log('\nDone.');
await client.close();
process.exit(0);
