/**
 * Builds the OBS lecture-production course, part B: Modules 2 to 4, the five
 * graded items, the module checklists, the job aids, and the announcement.
 *
 * Usage: LAMAKU_COURSE=8238 node scripts/build-obs-course-b.mjs
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
    console.log(`    ! ${args.title ?? args.name}: ${p.willDo.styleWarnings.join(' | ')}`);
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
const mins = (n, what) =>
  `<div class="jumbotron"><p><strong>About ${n} minutes.</strong> ${what}</p></div>`;

// ── Module 2 ──────────────────────────────────────────────────────────────
log('Module 2: Remote Guests Through CoreVideo');
const m2 = await run('create_content_module', {
  title: 'Module 2: Remote Guests Through CoreVideo',
  description: 'Two guests, two framed sources, two independent faders. 68 minutes.',
  hidden: false,
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'Module 2: before you join anything',
  hidden: false,
  html: `
<h2>Module 2: before you join anything</h2>

${mins(68, 'Six segments. This module adds to the collection you built in Module 1 rather than starting a new one.')}

<h3>What this module assumes</h3>

<p>Your exported Module 1 scene collection, the scene and source distinction, and the shot
vocabulary. If you do not have the collection, go back and build it, because everything
here goes into it.</p>

<p>If you are on the OBS-only path, everything in this module works the same way. You use
the supplied recordings rather than a live meeting. <strong>No graded task here requires a
live session.</strong></p>

<h3>Two questions from Module 1</h3>

<p>Answer both from memory before you read on.</p>

<p><em>One.</em> A collection lists three source objects, and seven source entries appear
across its three scenes. How many distinct objects does it hold?</p>

<p><em>Two.</em> You rename Podium Mic to Lav Mic in the Slides scene. What happens in the
Talking head scene, which also uses it?</p>

<p>Three, and the name changes there too. If you counted seven, you counted entries. A
scene lists references, not private copies.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'Working out your stream budget',
  hidden: false,
  html: `
<h2>Working out your stream budget</h2>

${mins(10, 'Arithmetic first, judgment second. Do this before you join a meeting, not after a feed fails.')}

<h3>The two figures</h3>

<p>A standard Zoom account typically carries about 30 Mbps of incoming bandwidth. Each
1080p participant stream costs roughly 4 to 6 Mbps. Enhanced Media raises the envelope to
about 100 Mbps, which is roughly 16 standard 1080p feeds. <strong>If you do not know which
envelope your account has, use the standard figure and say that is what you used.</strong></p>

<h3>Worked example</h3>

<p>Your ceiling is 30 Mbps. You plan for 5 Mbps per stream, the middle of the range. Thirty
divided by five is six, so six 1080p streams is your arithmetic ceiling. You are bringing
two guests, which costs 10 Mbps and leaves 20 Mbps of margin. You keep that margin on
purpose: your own outgoing video, a screen share arriving from a guest, and anything else
in the building on the same connection all draw on it.</p>

<p>Your budget statement reads: six streams supported at 1080p, two used, 20 Mbps margin
retained.</p>

<h3>A non-example</h3>

<p>"I have good internet, so two guests will be fine." No ceiling, no per-stream cost, and
no number to compare against when the second guest starts stuttering forty minutes in.
Nothing there can be checked, including by you.</p>

<h3>The judgment half</h3>

<p>How much margin a lecture warrants, and what you would give up first if the ceiling
turned out lower, depend on the lecture. <strong>Write your own answer down before you read
the three below.</strong> They disagree with each other on purpose.</p>

<p><em>One view.</em> Resolution first, every time. Take both guests from 1080p to 720p and
you cut the per-stream cost substantially while keeping both faces on screen. Two guests at
720p beats one guest at 1080p, because the shot list you built assumed two people.</p>

<p><em>A second view.</em> Drop a stream, not the resolution. A degraded picture reads to a
student as a broken lecture. Take the second guest to audio only, keep the first sharp, and
cut to slides while the second guest is speaking.</p>

<p><em>A third, arguing with both.</em> Before shedding anything, ask whether the ceiling is
real or contended, because a home connection at six in the evening is a different number
from the same connection at ten in the morning. And ask whether the guest needs to be on
camera during the twelve minutes you are showing a deck. Most of the time the budget
problem was a design problem, and the cheapest stream is the one you never requested.</p>

<p><em>If your reason names only the number and not what the lecture loses, it is not yet a
budget decision.</em></p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'What CoreVideo is, and what it is not',
  hidden: false,
  html: `
<h2>What CoreVideo is, and what it is not</h2>

${mins(8, 'A contrasting case. The thing most people assume is happening is not what is happening.')}

<div class="two-col-panels"><div class="row">
<div class="col-sm card bg-light"><div class="card-body">
<h5>What it is not</h5>
<p>Not NDI. Not a virtual camera. Not screen capture, and it does not point a Window
Capture source at your Zoom client.</p>
</div></div>
<div class="col-sm card bg-light"><div class="card-body">
<h5>What it is</h5>
<p>A client that joins your Zoom meeting through the Meeting SDK, the same way a person
joins, and hands OBS each participant as an individual video source and an individual
audio source.</p>
</div></div>
</div></div>

<h3>Why the distinction is not academic</h3>

<p>A screen capture of a Zoom window gives you one rectangle containing everybody, at
whatever size Zoom decided to draw them, with one mixed audio track. You cannot reframe one
person inside it and you cannot turn one person down. <strong>CoreVideo gives you separate
objects, and that difference is the entire reason this module exists.</strong></p>

<h3>What it requires, and who controls it</h3>

<p>OBS 30 or later, Windows 10 or 11 on x64, and Zoom Meeting SDK raw data access. The
third is an account entitlement a Zoom administrator switches on. No amount of expertise
with OBS substitutes for it, and learners who do not have it are on the OBS-only path,
which is supported rather than lesser.</p>

<h3>What arrives</h3>

<p>Video is I420 YUV at a resolution you select per source: 360p, 720p, or 1080p. Audio is
48 kHz PCM, isolated per participant. Before the first frame of a source arrives you see a
colour-bar placeholder. If frames stop mid-lecture, the video loss mode you chose either
holds the last frame or shows black.</p>

<p><em>That last sentence matters more than it looks. A held last frame and a live picture
of someone sitting still are indistinguishable on screen.</em></p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'The four assignment modes',
  hidden: false,
  html: `
<h2>The four assignment modes</h2>

${mins(8, 'Four ways to tell a source whose picture to carry, and one thing that looks like a fifth and is not.')}

<div class="table-responsive">
<table class="table table-bordered">
<caption>Assignment modes and the shot each one serves</caption>
<thead><tr><th scope="col">Mode</th><th scope="col">What it binds to</th><th scope="col">A shot that needs it</th></tr></thead>
<tbody>
<tr><th scope="row">Fixed participant</th><td>One named person on the roster</td><td>A guest sits in a lower-third box for eight minutes while you talk over slides, whether or not she is speaking.</td></tr>
<tr><th scope="row">Active speaker</th><td>Whoever the meeting says is speaking</td><td>A four-minute exchange between two guests, where the frame should follow the answer without you touching anything.</td></tr>
<tr><th scope="row">Spotlight slot, 1 to 8</th><td>A position, not a person</td><td>The host has spotlighted the visiting archivist in position 1, and your programme should carry whoever is in that position when the host moves it.</td></tr>
<tr><th scope="row">Active screen share</th><td>Whatever share is active</td><td>Your co-presenter shares a slide from their machine, and the slide rather than their face must fill the frame.</td></tr>
</tbody>
</table>
</div>

<h3>Where active speaker goes wrong</h3>

<p>Two people talking over each other makes that source swap mid-sentence. It is the wrong
choice for any shot you intend to hold still.</p>

<h3>CoreVideo Tiles is not a fifth mode</h3>

<p>Tiles renders the whole participant gallery as <strong>one source</strong>. It is a
single object in your Sources list. You cannot crop one person out of it and treat them as a
shot, and you cannot pull one person's level, because there is one source and therefore one
fader.</p>

<p><em>The test that settles it: ask what you would drag to reframe the second guest, and
what fader you would pull if only that guest is loud. In Tiles the answer to both is that
there is nothing to drag and nothing to pull.</em></p>

<h3>Match these five before you build anything</h3>

<p>Five shots from one lecture. Four take a mode. One takes none of them.</p>

<ol class="medium-number">
<li>Dr. Kealoha stays in a lower-third box for the whole eight-minute segment.</li>
<li>During the question and answer, the main frame follows whichever guest is answering.</li>
<li>Your programme carries whoever the host has placed in spotlight position 1.</li>
<li>Your co-presenter in Hilo shares a slide, and the slide must fill the frame.</li>
<li>An "everyone" shot with all four participants in a grid, and you want to punch in on the second guest and pull only her level.</li>
</ol>

<p>One is fixed participant. Two is active speaker. Three is spotlight slot 1. Four is
active screen share. <strong>Five is the trap</strong>, and the answer is that no per-guest
source serves it.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'Joining, assigning, and setting failover',
  hidden: false,
  html: `
<h2>Joining, assigning, and setting failover</h2>

${mins(11, 'Guided, then on your own. Do the first guest with the steps open, then the second without them.')}

<h3>Joining a session</h3>

<ol class="medium-number">
<li>Open OBS. Confirm CoreVideo is listed under the Docks menu.</li>
<li>Open the CoreVideo Control dock. Join, leave, the roster and the status line all live here.</li>
<li>Enter the meeting details and your display name, then select Join.</li>
<li>Watch the status line until it reports you are in the meeting. If it stays on connecting, either the SDK process did not start or your account lacks raw data access. Neither is fixable from inside OBS.</li>
<li>Check the roster. Anyone you intend to use should be listed. If somebody is missing, no source can be bound to them.</li>
</ol>

<div class="jumbotron">
<p><strong>On the OBS-only path:</strong> skip those five steps. Add each supplied video
file as a Media Source and each supplied audio file as a separate Media Source, so every
guest has one video object and one audio object, exactly as a live session would deliver.</p>
</div>

<h3>Assigning a source to a guest</h3>

<ol class="medium-number">
<li>In the Sources list for the scene you are building, add a CoreVideo source.</li>
<li>Name it for the shot as well as the person, such as <code>Guest 1 lower third</code>, so a source you have not touched in a month still tells you what it was for.</li>
<li>Choose the mode the shot requires.</li>
<li>For fixed participant, select the person from the roster. For spotlight slot, select the slot number. For active speaker and active screen share there is nothing to select, because the meeting decides.</li>
<li>Set the requested resolution from the budget you wrote, not from habit.</li>
<li>Frame the source on its own with the transform and crop controls. This is the step Tiles cannot offer you.</li>
<li>Repeat for the second guest, using a different mode, because the two shots have different requirements.</li>
</ol>

<h3>Setting a failover participant</h3>

<p>Open the properties of the source whose dropout would leave you with nothing to cut to,
and set a failover participant. It activates automatically when the primary leaves.</p>

<p><em>Decide deliberately which source gets it.</em> A source carrying your only picture
of a speaker mid-answer is unrecoverable. A decorative second angle is not. Write one
sentence naming why that source and not the other, because the criterion asks for it.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'Reading the Diagnostics dock',
  hidden: false,
  html: `
<h2>Reading the Diagnostics dock</h2>

${mins(4, 'Four numbers per source. Read them while things are working, so a bad reading is legible later.')}

<div class="table-responsive">
<table class="table table-bordered">
<caption>What each Diagnostics field is evidence of</caption>
<thead><tr><th scope="col">Field</th><th scope="col">What it tells you</th><th scope="col">What a bad reading looks like</th></tr></thead>
<tbody>
<tr><th scope="row">Requested against observed resolution</th><td>Whether you are getting the picture you asked for</td><td>Requested 1080p, observed 720p. Something downgraded the stream, and this does not say which side.</td></tr>
<tr><th scope="row">Observed FPS</th><td>Whether motion will look right</td><td>Requested 30, observed 12, which reads as stutter rather than blur. Zero means nothing is arriving at all.</td></tr>
<tr><th scope="row">Frame age</th><td>How long since the last frame landed</td><td>Tens of milliseconds is healthy. A number climbing while you watch is a stopped feed, whatever the picture shows.</td></tr>
<tr><th scope="row">Retry count</th><td>Whether the plugin is re-establishing the stream</td><td>Climbing means it knows the source is gone. <strong>Zero on a frozen picture is the most useful reading in the dock</strong>, because it means nothing thinks anything is wrong, so nothing is going to fix itself.</td></tr>
</tbody>
</table>
</div>

<p>Record all four per source now, while everything is healthy. That is your baseline, and
Module 3 is where you use it.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m2.moduleId,
  title: 'One track, or one per person',
  hidden: false,
  html: `
<h2>One track, or one per person</h2>

${mins(12, 'The single most common failure in this whole workflow, and how not to make it.')}

<div class="two-col-panels"><div class="row">
<div class="col-sm card bg-light"><div class="card-body">
<h5>What you already know</h5>
<p>You record a Zoom meeting and one audio file comes back. Every voice was mixed together
before the file reached your disk. If one guest was too loud, they are still too loud,
permanently. There is nothing left to pull apart.</p>
</div></div>
<div class="col-sm card bg-light"><div class="card-body">
<h5>What CoreVideo delivers</h5>
<p>Each participant arrives as their own audio source, isolated per person. Three voices,
three sources, three faders. A guest 8 dB hotter than everyone else is fixed by moving one
fader.</p>
</div></div>
</div></div>

<h3>The failure this prevents</h3>

<p>The natural move for someone fluent in Zoom is to add Desktop Audio so that "the meeting"
is captured. <strong>Desktop Audio captures your machine's own output, and your machine's
own output is the Zoom client playing the mixed meeting audio.</strong></p>

<p>You now have every guest twice: once from their participant source, and once through the
mix, arriving a few milliseconds apart. It sounds hollow or doubled, it cannot be fixed
afterwards, and your faders stop working, because pulling Guest 2 down still leaves Guest 2
in the desktop path at full level.</p>

<h3>Enumerate before you set</h3>

<p>List every path carrying audio into your production and name what is on each one. If two
paths carry the same voice, one of them is wrong, and it is almost always the one that came
from your own machine rather than from a participant.</p>

<p><em>Desktop Audio is not banned.</em> It is wrong when it duplicates a voice a
participant source already carries. If you are playing a video clip through your machine and
need its sound, it is carrying something no participant source carries, and you say so in
one line.</p>

<h3>Set levels by the number</h3>

<p>Set each guest's fader so their speech peaks <strong>between −12 and −6 dBFS</strong>.
Read the number. Do not set levels by ear, and do not set them by the colour of the meter:
OBS signals green, yellow and red, and colour alone fails for anyone with a colour vision
deficiency and for everyone working on laptop speakers, which is most people most of the
time.</p>

<p>Set the level against normal speaking, not against laughter. A guest peaking at −3 dBFS
is close to clipping and the fader comes down. At −24 dBFS the fader comes up, and if it is
already at the top the problem is at their end.</p>
`.trim(),
});

// ── Module 3 ──────────────────────────────────────────────────────────────
log('Module 3: Recording and Feed Diagnosis');
const m3 = await run('create_content_module', {
  title: 'Module 3: Recording and Feed Diagnosis',
  description: 'Record it, verify it, and learn to read why a feed failed. 60 minutes.',
  hidden: false,
});

await run('create_content_page', {
  moduleId: m3.moduleId,
  title: 'Module 3: what this one assumes',
  hidden: false,
  html: `
<h2>Module 3: what this one assumes</h2>

${mins(60, 'Two graded items in this module: an assignment and a discussion.')}

<p>You need three things: the collection from Module 1, the two guest sources you added in
Module 2, and the stream budget you computed. Nothing is locked, but the capture task needs
all three.</p>

<h3>Two questions from Module 2</h3>

<p><em>One.</em> An account states a 30 Mbps ceiling and a 1080p stream costs roughly 4 to
6 Mbps. How many streams does that support at the top of the range, and how many would you
actually plan for?</p>

<p><em>Two.</em> A production carries four audio paths: Guest A as a participant source,
Guest B as a participant source, your own microphone, and a desktop audio capture. Which one
puts a guest's voice into the recorder twice?</p>

<p>Five at the top of the range, and fewer than five in practice, because a budget planned
to the ceiling has no margin. The desktop audio capture is the doubled path: follow the
arrows backward from the recorder and two of them arrive carrying the same voice.</p>

<h3>The skill this module is really for</h3>

<p>Diagnosing a failed feed is the highest-transfer thing in this course. It is the one
skill that survives a change of tool, plugin version, or institution, and it is what turns a
failed session from an ending into a recoverable event.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m3.moduleId,
  title: 'Program or ISO: read the panel first',
  hidden: false,
  html: `
<h2>Program or ISO: read the panel first</h2>

${mins(12, 'A decision made before you press record, from a number your own machine reports.')}

<h3>Two kinds of recording</h3>

<p><strong>OBS records the program</strong>: whatever your scenes were showing. One file, one
composition, the thing a viewer would have seen.</p>

<p>CoreVideo can also write each assigned output as an <strong>ISO recording</strong>: a
separate MP4 with a matching WAV holding that person's audio on its own. You can keep the
program recording alongside them or turn it off.</p>

<p>Each ISO output is its own encode. Two guests in isolation plus a program recording is
three simultaneous encodes. Eight isolated 1080p participants plus a program recording is
nine, and a laptop will drop frames doing it.</p>

<h3>The panel estimates before you fail</h3>

<p>The recorder panel counts the encode paths your configuration implies, estimates the cost,
and warns when encoder pressure is likely. <strong>Read it before you press record.</strong>
A problem found in the panel costs you a setting change. The same problem found in the file
costs you the lecture.</p>

<p>Write the headroom figure down exactly as the panel shows it. You need it twice: in your
capture log, and in the discussion at the end of this module.</p>

<h3>What to shed, in order</h3>

<ol class="medium-number">
<li><strong>ISO output count.</strong> Every output you remove is a whole encode removed. Largest single reduction available.</li>
<li><strong>Resolution.</strong> Dropping 1080p to 720p roughly halves the pixels every encode processes.</li>
<li><strong>Encoder.</strong> Moving from CPU to a hardware GPU encoder moves the work rather than removing it. Helps when the CPU is the constraint, not at all when the GPU is.</li>
</ol>

<p><em>"I would lower the settings" is not a plan, because it does not say which setting or
why that one.</em></p>

<h3>Three machines, three readings</h3>

<p>Decide each before reading the reasoning.</p>

<p><strong>Machine A.</strong> Four cores, integrated graphics, no hardware encoder. Three
encode paths at 720p30, <strong>6 percent headroom</strong>, CPU pressure warning showing.
Six percent is not margin, it is noise. Program-only, and shed ISO count first because there
is no encoder to move work to.</p>

<p><strong>Machine B.</strong> Eight cores, discrete GPU with a hardware encoder. Three encode
paths, <strong>62 percent GPU and 41 percent CPU headroom</strong>, no warning. ISO, with room
to spare. The interesting question is whether you need it, not whether you can.</p>

<p><strong>Machine C.</strong> Six cores, hardware encoder, <strong>19 percent headroom</strong>,
no warning but flagged marginal. <em>This one is genuinely ambiguous and two experienced people
will split on it.</em> For ISO: the panel did not warn, and if the recording drops a few frames
you still have the ISO files. For program-only: 19 percent does not survive a notification or a
backup client waking up, and the failure is not gradual. What actually decides it is whether the
session is repeatable. A demonstration you can re-record takes the risk. A visiting speaker's
one-time lecture does not. The number does not answer this. The stake does.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m3.moduleId,
  title: 'Before you press record: consent, records, retention',
  hidden: false,
  html: `
<h2>Before you press record: consent, records, retention</h2>

${mins(2, 'Short, required, and done before recording rather than after.')}

<p><strong>ISO recording writes each person to their own individually identifiable
file.</strong> That is what makes it useful and it is also what makes it a records question.
Where the person in that file is an enrolled student, the file is an education record, and it
carries obligations a program recording of a whole meeting does not.</p>

<h3>The default this course teaches</h3>

<p>Instructor and invited guests only. Assign ISO outputs to yourself and to people you asked
to present: a guest lecturer, a co-presenter, a panellist from another campus. Do not assign
an ISO output to an enrolled student as a matter of routine.</p>

<h3>If you have an instructional reason to capture a student</h3>

<p>Three things have to be true before you press record, and all three before rather than
after.</p>

<ol class="medium-number">
<li>The student has agreed, knowing they are being recorded to a file of their own, separate from the class recording.</li>
<li>You have somewhere controlled to keep it, which is not a shared drive and not a synced folder.</li>
<li>You have a date on which you delete it, and you have written the date down.</li>
</ol>

<h3>Say it out loud at the start</h3>

<div class="jumbotron">
<p>"I am recording this session. My own feed and each invited guest's feed are being recorded
to separate files so that I can edit the recording afterward. Students in the meeting are not
being recorded to individual files. The recording will be posted in our course site and I will
delete the working files after the end of the semester."</p>
</div>

<p><em>Where you are unsure whether a particular capture is permitted, the recording is not
the place to resolve it.</em> Ask the office that answers this before you record. It takes
less time than a re-recorded lecture does.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m3.moduleId,
  title: 'Running the capture, and verifying what you got',
  hidden: false,
  html: `
<h2>Running the capture, and verifying what you got</h2>

${mins(18, 'The one block in this module you cannot pause. Start it when you have a clear quarter of an hour.')}

<h3>Before you record</h3>

<ol class="medium-number">
<li>Set the recording destination to a local, non-synced folder. Type the path yourself.</li>
<li>Announce the recording and set your retention date.</li>
<li>Set the ceiling: two guest sources, 1280 by 720, 30 fps. Do not exceed it.</li>
<li>Open the recorder panel. Read the encode-path count and the headroom figure. Write it down as it appears.</li>
<li>Choose program-only or program plus ISO against that figure.</li>
<li>Predict your files. At the ceiling with ISO on, two guests produce five: one program MP4, two ISO MP4s, two WAVs. Program-only produces one.</li>
<li>Check both guests speaking, peaks between −12 and −6 dBFS, read as numbers.</li>
</ol>

<h3>While it runs, and how to stop</h3>

<ol class="medium-number">
<li>Start recording and note the wall-clock time. You compare file duration against it later.</li>
<li>Switch scenes at least twice, using scenes from your Module 1 collection. Note each timecode.</li>
<li>Watch the audio meters. A guest whose fader was pulled down stays silent for the whole recording and nothing announces it.</li>
<li>Watch the Diagnostics dock. You are looking for a number that moves, not a number that is wrong.</li>
<li>Stop, and wait. The recorder panel reports when every file is finalized. Closing OBS before that is what produces a file that will not open.</li>
</ol>

<h3>Verify before you close anything</h3>

<p><em>An unverified capture is discovered to be empty on the day you sit down to edit it,
which is the day it is too late.</em></p>

<ol class="medium-number">
<li><strong>Exists.</strong> List every file and compare against your prediction. A missing file is a configuration problem, not a disk problem.</li>
<li><strong>Plays.</strong> Open each one and confirm picture and sound start. Name the player in your log.</li>
<li><strong>Carries the right audio.</strong> Open each track and say whose voice is on it. A track that should hold Guest B and is silent gets written down, not left out.</li>
<li><strong>Runs to length.</strong> Compare duration against the wall time you noted. A file that stops early was finalized by a crash, and the frames after that point do not exist.</li>
</ol>
`.trim(),
});

await run('create_content_page', {
  moduleId: m3.moduleId,
  title: 'Symptom to cause: the table to keep',
  hidden: false,
  html: `
<h2>Symptom to cause: the table to keep</h2>

${mins(4, 'Read the four fields in order rather than scanning for a matching symptom. Keep this page.')}

<p>Read the fields in this order and each one closes off a family of causes:
<strong>resolution, then frame rate, then frame age, then retry count.</strong></p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>Symptom, reading, cause, remedy, and whether it is yours to fix</caption>
<thead><tr><th scope="col">Symptom</th><th scope="col">Diagnostics reading</th><th scope="col">Probable causes</th><th scope="col">Remedy</th><th scope="col">Fix or escalate</th></tr></thead>
<tbody>
<tr><th scope="row">Source is black</th><td>Observed blank; FPS 0; frame age climbing; retry count climbing</td><td>Camera off; assigned participant not in the meeting; spotlight slot empty; feed dropped with loss mode set to black</td><td>Confirm the participant is present with camera on; reassign; fill the slot; trigger failover</td><td><strong>Fix.</strong> Every cause is a state you can see and change</td></tr>
<tr><th scope="row">Frozen or stale frame</th><td>Observed matches requested; FPS 0; frame age climbing past seconds; <strong>retry count 0</strong></td><td>Participant stopped sending and loss mode is holding the last frame; participant rejoined under a new ID; participant renamed</td><td>Set loss mode to black or bars so the failure is visible next time; reassign; trigger failover</td><td><strong>Fix.</strong> Retry count 0 is the tell: nothing is reconnecting because nothing thinks it disconnected</td></tr>
<tr><th scope="row">Colour bars that never clear</th><td>No observed values; no frame received; retry count climbing steadily</td><td>Meeting not started; host has not approved raw data; the account entitlement is not enabled or was revoked</td><td>Confirm the meeting is live and raw data approved, then read the debug events</td><td><strong>Escalate</strong> if debug events show a subscription rejection. The only row here that can end outside your control</td></tr>
<tr><th scope="row">Wrong person in frame</th><td>All four fields healthy</td><td>Source is on active speaker and someone else spoke; spotlight index points elsewhere; fixed binding resolved to a changed ID</td><td>Reassign by the mode the shot actually needs; re-bind after any rejoin</td><td><strong>Fix.</strong> Healthy fields rule out transport only, not which of the three assignment causes it was</td></tr>
<tr><th scope="row">Observed resolution below requested</th><td>Observed below requested; FPS below requested; frame age elevated; retry count elevated</td><td>Your incoming ceiling is reached; or the sender's upstream is constrained and Zoom downgraded their send</td><td>Cut stream count or requested resolution. Ask the guest to close other uploads. Compare against your own budget</td><td><strong>Fix, or the guest's network.</strong> Not a Zoom administrator matter, which is the confusion this row prevents</td></tr>
<tr><th scope="row">Missing audio on a track</th><td>Video normal; the WAV was created and opens silent</td><td>Source added without its audio path; fader at minimum; participant muted at source; audio routed to monitoring only</td><td>Enumerate every path and confirm exactly one per guest reaches the recorder; restore the fader</td><td><strong>Fix.</strong> This is the Module 2 fader work reappearing under recording conditions</td></tr>
<tr><th scope="row">Doubled audio</th><td>Video normal; a voice on two tracks, or one track with an echo behind it</td><td>Desktop audio is picking up the Zoom client's output while the participant source delivers the same voice</td><td>Remove or mute the desktop audio capture so each guest reaches the recorder on exactly one path</td><td><strong>Fix.</strong> The most common single fault, and the cheapest to prevent</td></tr>
<tr><th scope="row">Dropped frames</th><td>Source fields all healthy. The drop is reported by output stats and the recorder panel, not by the source</td><td>Encode pressure beyond what the machine carries; or a synced recording folder stalling writes</td><td>Cut ISO count, then resolution, then move to a hardware encoder. Move the destination to a local folder and re-run</td><td><strong>Fix.</strong> Healthy source fields are what tell you the fault is downstream of the feed</td></tr>
</tbody>
</table>
</div>

<h3>A fourth case, worked</h3>

<p>Guest 2's picture stops on a still frame mid-gesture. Their audio keeps arriving and they
are clearly still talking. Requested and observed both 1280 by 720. FPS 30 requested,
<strong>0.0 observed</strong>. Frame age <strong>21,400 ms and rising</strong>. Retry count
<strong>0</strong>.</p>

<p><em>Commit your own cause, remedy, and fix-or-escalate call before reading on.</em></p>

<p>Resolution first: observed matches requested, so nothing negotiated this stream down and
the whole bandwidth family is out. Frame rate second: zero, not low, so this is a stop rather
than congestion. Frame age third: twenty-one seconds and climbing, which dates the stop and
tells you the picture on screen is loss mode holding the last frame. <strong>Retry count
fourth, and it is decisive</strong>: zero means the plugin does not think the source has gone
away, which rules out the participant having left, because that drives retries up. What is
left is that they are still in the meeting and simply stopped sending video.</p>

<p>Frame age told you it stopped. Every stopped-feed cause produces a climbing frame age, so
alone it separates nothing. Retry count told you <em>which kind</em> of stop, because it is
the only field reporting what the plugin believes rather than what arrived. Fixable in OBS.</p>
`.trim(),
});

// ── Module 4 ──────────────────────────────────────────────────────────────
log('Module 4: Publishing in Lamakū');
const m4 = await run('create_content_module', {
  title: 'Module 4: Publishing in Lamakū',
  description: 'Get the lecture to students, with captions, where they will look. 45 minutes.',
  hidden: false,
});

await run('create_content_page', {
  moduleId: m4.moduleId,
  title: 'The delivery path, and where it stops being automatic',
  hidden: false,
  html: `
<h2>The delivery path, and where it stops being automatic</h2>

${mins(10, 'Study the whole path first, then find the gaps.')}

<h3>Two questions from Module 3</h3>

<p><em>One.</em> Your last capture ran the program recording plus two ISO pairs. How many
files should have landed, and what is on each? <em>Two.</em> One guest must hold the same
frame even while the other is speaking. Which mode?</p>

<p>Five files: a pair is a video file and an audio file, so two guests is four, plus the
program. Fixed participant, because active speaker would follow the interruption.</p>

<figure>
<svg viewBox="0 0 660 300" role="img" aria-labelledby="t-path d-path" style="max-width:100%;height:auto">
<title id="t-path">The delivery path from recorded file to student playback</title>
<desc id="d-path">Zoom feeds CoreVideo through the Meeting SDK, and CoreVideo feeds OBS. A second arrow from CoreVideo toward Lamaku is struck through, because no connection of that kind exists. OBS writes files to your disk. Three junctions follow before a student presses play: getting the file to the video service, turning it into a stream, and creating the content topic in Lamaku. Two of those three have no software performing them.</desc>
<rect x="14" y="14" width="120" height="40" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="74" y="39" text-anchor="middle" font-size="13" fill="currentColor">Zoom meeting</text>
<rect x="174" y="14" width="120" height="40" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="234" y="39" text-anchor="middle" font-size="13" fill="currentColor">CoreVideo</text>
<path d="M134 34 L174 34" stroke="currentColor" stroke-width="2" fill="none"/>
<path d="M334 34 L470 34" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
<line x1="392" y1="20" x2="412" y2="48" stroke="currentColor" stroke-width="3"/>
<line x1="412" y1="20" x2="392" y2="48" stroke="currentColor" stroke-width="3"/>
<text x="402" y="66" text-anchor="middle" font-size="11" fill="currentColor">no connection of this kind exists</text>
<rect x="174" y="96" width="120" height="40" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="234" y="121" text-anchor="middle" font-size="13" fill="currentColor">OBS writes files</text>
<path d="M234 54 L234 96" stroke="currentColor" stroke-width="2" fill="none"/>
<rect x="174" y="168" width="120" height="40" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="234" y="193" text-anchor="middle" font-size="13" fill="currentColor">files on your disk</text>
<path d="M234 136 L234 168" stroke="currentColor" stroke-width="2" fill="none"/>
<polygon points="360,188 392,168 424,188 392,208" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="392" y="193" text-anchor="middle" font-size="12" fill="currentColor">1</text>
<path d="M294 188 L360 188" stroke="currentColor" stroke-width="2" fill="none"/>
<rect x="452" y="168" width="120" height="40" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="512" y="187" text-anchor="middle" font-size="12" fill="currentColor">video service</text>
<text x="512" y="201" text-anchor="middle" font-size="12" fill="currentColor">holds the file</text>
<path d="M424 188 L452 188" stroke="currentColor" stroke-width="2" fill="none"/>
<polygon points="330,262 362,242 394,262 362,282" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="362" y="267" text-anchor="middle" font-size="12" fill="currentColor">2</text>
<path d="M512 208 L512 262 L394 262" stroke="currentColor" stroke-width="2" fill="none"/>
<polygon points="176,262 208,242 240,262 208,282" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="208" y="267" text-anchor="middle" font-size="12" fill="currentColor">3</text>
<path d="M330 262 L240 262" stroke="currentColor" stroke-width="2" fill="none"/>
<rect x="20" y="242" width="140" height="40" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="90" y="261" text-anchor="middle" font-size="12" fill="currentColor">student opens</text>
<text x="90" y="275" text-anchor="middle" font-size="12" fill="currentColor">the module, presses play</text>
<path d="M176 262 L160 262" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>
<figcaption>Three junctions. <strong>Two of them have no software performing them.</strong>
Work out which two before you read on.</figcaption>
</figure>

<h3>The two gaps</h3>

<p><strong>Junction 1 is manual.</strong> No process watches your recording folder. The
upload is performed by you, or by a person you name who has access.</p>

<p><strong>Junction 3 is manual.</strong> Nothing on the video service knows which Lamakū
course, which module, or which week the link belongs to. Only a person in Lamakū supplies
that.</p>

<p><strong>Junction 2 is not a gap.</strong> The video service produces streaming renditions
on ingest, with no request from you. That is the reason for hosting there rather than
dropping a one-hour MP4 into Brightspace content storage.</p>

<p><em>The misconception this displaces:</em> because CoreVideo joins a Zoom meeting and Zoom
is used for teaching, instructors assume the recording arrives in the LMS by some route they
have not found yet. It does not. There is no route, and the absence produces no error
message, which is why a finished lecture can sit in a folder for a semester.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m4.moduleId,
  title: 'Where the video lives, and captions that say what you said',
  hidden: false,
  html: `
<h2>Where the video lives, and captions that say what you said</h2>

${mins(9, 'Two decisions and one editing task.')}

<h3>Do not put the MP4 in course storage</h3>

<p>Brightspace content storage holds course files. It is not built to stream a one-hour
lecture, and a student on a fluctuating connection gets slow starts and a scrub bar that does
not seek. <strong>Host the video on the institution's video service and add a link as a
content topic.</strong> Students get a player that seeks properly.</p>

<p>Permissions are the step most often skipped, and they fail in both directions: a video open
to anyone with the link, or one the class cannot open at all. The permission model belongs to
the video service, not to Lamakū, and making the topic visible does not set it.</p>

<h3>Captions are an editing task, not an acceptance task</h3>

<p>Auto-generated captions are a starting point. Automatic speech recognition reliably fails on
names, on technical terms, and on anything said over a cough. Budget 10 to 15 minutes to
correct a one-hour transcript.</p>

<p>It mangles ʻōlelo Hawaiʻi predictably: splitting Hawaiian words into English syllables,
dropping the ʻokina and the kahakō, or substituting a typographic apostrophe for the ʻokina.
<strong>The ʻokina is its own character. Write the character.</strong></p>

<div class="table-responsive">
<table class="table table-bordered">
<caption>Four lines of draft output beside the corrected line</caption>
<thead><tr><th scope="col">Draft output</th><th scope="col">Corrected</th><th scope="col">What failed</th></tr></thead>
<tbody>
<tr><td>"the a hoo pooah system in Kah nay oh hey"</td><td>"the ahupuaʻa system in Kāneʻohe"</td><td>Hawaiian word split into English syllables; place name unrecognised</td></tr>
<tr><td>"how the cone o hiki managed water rights on Oahu"</td><td>"how the konohiki managed water rights on Oʻahu"</td><td>Term unrecognised; ʻokina dropped from a place name</td></tr>
<tr><td>"The o Lelo Hawaii term here is Malama Aina"</td><td>"The ʻōlelo Hawaiʻi term here is mālama ʻāina"</td><td>ʻOkina and kahakō both dropped; word boundaries wrong</td></tr>
<tr><td>"the [inaudible] gradient drives 80 P synthase"</td><td>"the proton gradient drives ATP synthase"</td><td>Speech over a cough; initialism heard as a number</td></tr>
</tbody>
</table>
</div>

<p>Two things to notice. These are not typographical tidying: a student searching the
transcript for <em>ahupuaʻa</em> finds nothing in the draft, and a student reading "80 P
synthase" learns a term that does not exist. And the same characters have to survive into the
title and description, because that is where the search runs.</p>

<p><em>Where captioning capacity is not available to you</em>, evidence of the request meets
the criterion. An obligation issued with no means of meeting it produces a learner who stops.</p>
`.trim(),
});

await run('create_content_page', {
  moduleId: m4.moduleId,
  title: 'Publish it, then verify from the student view',
  hidden: false,
  html: `
<h2>Publish it, then verify from the student view</h2>

${mins(20, 'The last block of the course. Upload waits are not counted; close the page and come back.')}

<h3>Get the file to the service</h3>

<ol class="medium-number">
<li>Decide what you are publishing: the program file as recorded, or an edit assembled from your ISO outputs. Write one sentence of reason drawn from your Module 3 verification record.</li>
<li>Check the recording against the consent decision you made in Module 3.</li>
<li>Play the file from your own disk once, from the middle rather than the start.</li>
<li>Upload it to the institution's video service. Do not upload the MP4 into course storage.</li>
<li>Wait for processing to report complete before doing anything else with it.</li>
</ol>

<h3>Make it usable, then place it</h3>

<ol class="medium-number">
<li>Correct the draft caption track against what was said. Every name, every technical term, every Hawaiian word, with the ʻokina typed as the character.</li>
<li>Attach a transcript reachable without playing the file.</li>
<li>Set permissions on the service so your students can play it and others cannot.</li>
<li>In Lamakū, add the video as a link in a content topic, in the module a student would open first. Write down which module that is.</li>
<li>Give it a title and description a reader who was not there could use to say what the lecture covers.</li>
<li>Release the topic, then send the title and description to one colleague or student and note what they said it was about.</li>
</ol>

<h3>Can a student tell what this is?</h3>

<p><em>Lecture 7 Recording</em> tells a student their position in a sequence, not the content.
<em>Zoom_Recording_2026-03-14.mp4</em> gives a date Lamakū already shows. Compare:
<em>Photosynthesis: light reactions and the electron transport chain (Week 7)</em>, with a
description naming the photosystems and the guest segment. A student who missed the class can
tell whether it covers what they need, and can find it in week twelve by searching a term from
it.</p>

<p>No page can score your title. <strong>The test is to hand it to one person who was not
there and ask what they think the lecture covers.</strong> If they answer with a week number, a
date, or a course code, it is not doing the work yet.</p>

<h3>Verify, from the student view</h3>

<p>Instructor view routinely shows content students cannot see. A verification performed from
instructor view is not verification.</p>

<ol class="medium-number">
<li><strong>Visible.</strong> Open the module a student opens and find the item without a direct link.</li>
<li><strong>Plays.</strong> Press play, then scrub to the middle and confirm it resumes there with audio.</li>
<li><strong>Captions display.</strong> Turn them on, read one line against what you hear, and confirm any ʻokina renders as the character rather than as a box.</li>
<li><strong>Title and description match.</strong> Read them against the recording and against the module heading above them.</li>
</ol>
`.trim(),
});

await run('create_content_page', {
  moduleId: m4.moduleId,
  title: 'What you can do now, and what you keep',
  hidden: false,
  html: `
<h2>What you can do now, and what you keep</h2>

${mins(4, 'The end of the course.')}

<h3>What changed</h3>

<p>You can build a scene set fitted to a lecture you are actually teaching, reusing source
objects rather than copying them. You can bring two remote guests in as separately framed,
separately faded sources instead of a single mixed tile. You can decide between program-only
and ISO recording against a number your own machine reported, run the capture to a clean stop,
and confirm afterwards that every file exists, plays, and carries the voice it should. And you
can publish the result where students find it, with captions that say what was said.</p>

<h3>Two things are yours to keep</h3>

<div class="two-col-panels"><div class="row">
<div class="col-sm card bg-light"><div class="card-body">
<h5>The setup checklist</h5>
<p>Installing OBS, installing CoreVideo, signing in to Zoom. You will need it the next time
you set up a machine, which may be a year from now, and it assumes nothing.</p>
</div></div>
<div class="col-sm card bg-light"><div class="card-body">
<h5>The symptom-to-cause table</h5>
<p>What you see in the Diagnostics dock, what is probably wrong, and what to do. Keep it where
you record, not where you study.</p>
</div></div>
</div></div>

<h3>Three things worth writing down before you close this</h3>

<p>Which office you would contact for captioning. What your recorder panel reported as headroom
on your own machine. And the module you published into. All three are things you will otherwise
re-derive from scratch.</p>

<p><em>One last line for yourself: name one thing about this path you could not do again without
looking it up, and say where you would look. If the answer is a page in this course, download it
now.</em></p>
`.trim(),
});

// ── Assessments ───────────────────────────────────────────────────────────
log('Assignments');
const A = [
  {
    name: 'A1 — Scene Set and Inventory',
    outOf: 10,
    instructions:
      '<p><strong>Build the OBS scene set for one lecture you are scheduled to teach this term.</strong> Use that lecture\'s real slides, your own webcam, and your own microphone.</p>' +
      '<p>Plan the shots first. Pick at least four your lecture actually needs, and note the moment each one serves. Then pick one you are not going to build, and note why not.</p>' +
      '<p>Build one scene per shot. When a scene needs your microphone, webcam or slide window, add the source that already exists instead of creating a second one. Export the collection, fill in the inventory, then open the supplied duplicate-demo collection, rename the microphone in Scene 1, look at Scene 2, and write one paragraph saying why Scene 2 did not change.</p>' +
      '<p>Upload four files individually, named lastname-collection.json, lastname-inventory.md, lastname-account.md and lastname-preview.png. No archives.</p>' +
      '<p><strong>Your work is checked against these seven criteria and nothing else:</strong></p><ol>' +
      '<li>The inventory lists every source object in your exported collection exactly once, and names every scene that object appears in.</li>' +
      '<li>Your paragraph explains why renaming the microphone in duplicate-demo Scene 1 left Scene 2 unchanged, by naming what the two entries are as objects. Restating what you saw on screen does not meet this criterion.</li>' +
      '<li>Your shot list contains at least four shots, and each is tied to a named moment in your own lecture.</li>' +
      '<li>Your shot list names one shot you excluded, with a reason. "Not needed" is not a reason.</li>' +
      '<li>The exported collection contains one scene per shot on your list.</li>' +
      '<li>The exported collection contains no duplicate source objects.</li>' +
      '<li>In your preview screenshot, taken at the stated output resolution with the preview at 100 percent scale, the smallest line of body text on your busiest slide is readable.</li>' +
      '</ol><p>Feedback within 3 working days, one comment per criterion. You may resubmit within 14 days of the day it is returned. If you used an AI assistant on the written parts, add one line at the top saying what for.</p>',
  },
  {
    name: 'A2 — Guest Sources and Audio',
    outOf: 10,
    instructions:
      '<p><strong>Start with the budget, before you join anything.</strong> Find your account\'s stated incoming ceiling, or use the standard-account figure and say that is what you used.</p>' +
      '<p>Then open the collection you exported in Module 1. You are adding to it, not starting again. Bring in two guests as two separate video sources, assigned by the mode each shot requires, framed independently. Set a failover participant on the guest whose dropout would leave you with nothing to cut to. Read the Diagnostics dock per source. In the Audio Mixer, give each guest their own fader, peaking between −12 and −6 dBFS.</p>' +
      '<p>Upload three files: one Audio Mixer screenshot with both guests speaking, one Diagnostics screenshot per source, and one document holding your budget, mode choices, failover choice, and one sentence on why CoreVideo Tiles cannot serve a per-guest shot.</p>' +
      '<p><strong>Checked against these ten criteria:</strong></p><ol>' +
      '<li>Your stated supported stream count is arithmetically consistent with the ceiling and per-stream figure you reported. If you used the standard-account figure, you say so.</li>' +
      '<li>You state how much margin you kept and what the lecture would lose if you kept less.</li>' +
      '<li>You name what you would reduce first if the ceiling were lower, and that reduction would actually lower incoming bandwidth.</li>' +
      '<li>Each guest source is assigned by one of the four modes. For each, you name the shot that required it and what would have gone wrong under the other three. <em>OBS-only path: match each supplied shot to its required mode and defend the match in the same terms.</em></li>' +
      '<li>A failover participant is set on the source whose dropout would be unrecoverable, and you say in one sentence why that source and not the other. <em>OBS-only path: name that source and state what the dropout at 0:47 would have done to the shot.</em></li>' +
      '<li>Your Diagnostics reading per source shows observed resolution and frame rate matching the requested values, or you name the gap and what you changed. <em>OBS-only path: report the pack\'s stated values against what OBS reports on load.</em></li>' +
      '<li>Your Audio Mixer screenshot shows one fader per guest, at different positions, with both guests peaking between −12 and −6 dBFS.</li>' +
      '<li>No desktop audio capture appears in your mixer, or you state in one line what it is carrying that the participant sources are not.</li>' +
      '<li>Your guests are in the collection you exported in Module 1, and at least one Module 1 scene now includes a guest without a second copy of any source object you already had.</li>' +
      '<li>You state why CoreVideo Tiles cannot serve a per-guest shot, by naming what Tiles delivers as a source.</li>' +
      '</ol><p>Feedback within 2 working days, the fastest in this course, because this configuration is the direct input to Module 3. Resubmit within 14 days.</p>',
  },
  {
    name: 'A3 — Capture and Verification Record',
    outOf: 10,
    instructions:
      '<p><strong>Open the recorder panel and read the pressure estimate for your machine.</strong> Write the headroom figure down as it appears. Decide program-only or program plus ISO from that figure, not from what sounds more thorough. If your machine is tight, program-only is the right answer and it is graded as one.</p>' +
      '<p>Set the ceiling at two guest sources, 1280 by 720, 30 fps. Record on the collection you have been building since Module 1, switching scenes at least twice. Watch the meters and the Diagnostics dock while it runs. Stop cleanly and wait for finalization.</p>' +
      '<p>Then verify before you close anything: list every file, play each one, note whose voice is on each track, and compare durations against the wall time. Upload the produced files, or a directory listing plus the program file if size is a problem, and one capture log.</p>' +
      '<p><strong>Checked against these eight criteria:</strong></p><ol>' +
      '<li>Your capture log names the recorder panel\'s headroom figure for your machine, as you read it.</li>' +
      '<li>Your log states whether you recorded program-only or ISO, and the choice is consistent with the figure you reported.</li>' +
      '<li>Your log names the load you would shed first if the figure had been worse, and that load would actually reduce encode work. Program-only is a correct answer here, not a failed one.</li>' +
      '<li>The capture stayed inside the stated ceiling.</li>' +
      '<li>You switched scenes at least twice, using scenes from your Module 1 collection, and your log names the timecodes.</li>' +
      '<li>Every file the recording was supposed to produce exists. You list them by filename.</li>' +
      '<li>Each file plays. Your log names the player you opened it in.</li>' +
      '<li>Each audio track carries the audio it should. Your log names, per track, whose voice is on it. A track that is silent when it should not be is reported rather than omitted.</li>' +
      '</ol><p>Feedback within 3 working days. You may re-run the capture within 14 days; a re-run replaces the original files.</p>',
  },
  {
    name: 'A4 — Published Lecture Package',
    outOf: 10,
    instructions:
      '<p><strong>Start with the delivery-path diagram.</strong> It shows three junctions between your recorded file and a student pressing play. Two of them have no software doing the work. Mark them, and write one sentence per junction naming the person who does it.</p>' +
      '<p>Then publish. Pick the deliverable, give one reason drawn from your own Module 3 verification record, and publish a file your own capture produced and verified. Attach captions so they display on playback and a transcript reachable without playing. Put it in the module a student would open first. Give it a title and description a reader who was not there could use, and hand them to one colleague or student to test that. Then switch to student view and run the four-item verification list.</p>' +
      '<p><strong>Checked against these nine criteria:</strong></p><ol>' +
      '<li>On the supplied diagram you have marked the two junctions where no automation exists, with one sentence per junction naming who performs that step. The diagram shows three; two are the answer.</li>' +
      '<li>You name which deliverable you published and give one reason drawn from your own Module 3 verification record.</li>' +
      '<li>The file you published is one your own Module 3 capture produced and verified.</li>' +
      '<li>Captions are attached and display on playback, or you evidence a captioning request where institutional capacity is not available to you.</li>' +
      '<li>A transcript is attached and reachable without playing the file.</li>' +
      '<li>The item sits in the module a student working through your course opens first, and you name that module.</li>' +
      '<li>Your title and description let a reader who was not there say what the lecture covers. You name who read them and what they said it was about.</li>' +
      '<li>You submit one screenshot per check on the verification list, taken in student view with the banner in frame.</li>' +
      '<li>Where a check failed, you submit the before screenshot, what you changed, and the after screenshot. Where nothing failed, you say so.</li>' +
      '</ol><p>Feedback within 5 working days, paired with the revision window rather than issued as a score. Resubmit within 21 days. <strong>Reporting a hand-off that did not happen is the one thing here that is never acceptable.</strong></p>',
  },
];

for (const a of A) {
  await run('create_assignment', {
    name: a.name,
    outOf: a.outOf,
    instructions: a.instructions,
    hidden: false,
  });
  log(`  ${a.name}`);
}

log('Grade items');
for (const a of A) {
  await run('create_grade_item', {
    name: a.name,
    maxPoints: 10,
    hidden: false,
    description: `Criterion-referenced. Comments carry the per-criterion detail the score cannot.`,
  });
}
await run('create_grade_item', {
  name: 'D1 — Three Failure Cases',
  maxPoints: 10,
  hidden: false,
  description: 'Graded discussion. Scored on the evidence chain, not on answer matching.',
});

log('Discussion');
const forum = await run('create_discussion_forum', {
  name: 'Module 3: diagnosing failed feeds',
  description: 'Rolling. This topic never closes and archived posts count.',
  hidden: false,
});

await run('create_discussion_topic', {
  forumId: forum.forumId,
  name: 'D1 — Three failure cases',
  hidden: false,
  scoreOutOf: 10,
  description:
    'Read the three cases below. Post once, working through all three. For each, name the cause the reading points to, the remedy, and whether you could fix it inside OBS or would have to escalate. If two causes fit the same reading, say so and say which you would act on first. ' +
    'One of the three cannot be fixed in OBS. Say which, and what in the reading told you. In at least one diagnosis, use a figure you produced yourself: your Module 2 stream budget or your Module 3 headroom reading, and say how it separated one cause from another. ' +
    'Then reply to one other post, from any time. This topic does not close and old posts count. Your reply is about how that person used the evidence, not whether they reached your conclusion. If yours is the first post here, reply to the archived worked case instead and say you took that route. ' +
    'CASE 1, the program file stutters. Forty-minute two-guest segment, ISO on, all five files present, all playing with visible stutter, worse when both guests were on screen. OBS reported frames dropped due to encoding lag. Both guests read 1280x720 observed against 1280x720 requested, 30fps against 30, frame age 48ms and 52ms, retry count 0. Recorder panel: three encode paths, x264 on all three, headroom 11 percent at start. Recording destination was a OneDrive-synced Documents folder. ' +
    'CASE 2, a guest is soft and small. Guest 2 visibly softer than Guest 1 and lagging behind their own audio, worsening about ten minutes in. Guest 2: requested 1920x1080, observed 640x360, 30fps requested against 8 observed, frame age 2100ms, retry count 41. Guest 1 in the same session: 1920x1080 observed, 30fps, frame age 44ms, retry count 0. ' +
    'CASE 3, bars that never clear. Both guest sources show colour bars for six minutes. Both guests confirm on audio they are in the meeting with cameras on. No observed values, no frame received, retry counts 213 and 209 and rising. Engine debug events repeating: raw video subscription denied (code 3013), retry scheduled, raw video subscription denied (code 3013). ' +
    'Scored against: one diagnosis per case in a single post; each cause consistent with the reading, naming both where two are consistent; each remedy addressing the cause you named; the escalation case identified with what told you; at least one diagnosis using a figure you produced yourself; a reply addressing evidence use rather than conclusions; and if you were first, a reply to the archived case saying so.',
});

log('Checklists');
const checklists = [
  ['Module 1 checklist', [
    ['Work through it', ['Watched the comparison and made a 30-second recording', 'Read the object model page', 'Worked the six-collection self-check', 'Read the seven shots', 'Committed to a shot list before reading the commentary']],
    ['Produce it', ['Drafted my own shot list with a named exclusion', 'Built one scene per shot, reusing sources', 'Exported the collection', 'Measured the slide text at 100 percent preview', 'Wrote the inventory and the propagation account', 'Submitted A1']],
  ]],
  ['Module 2 checklist', [
    ['Before joining', ['Answered the two Module 1 questions', 'Computed my stream budget and wrote the statement', 'Committed my own shed-first answer before reading the three views']],
    ['Build it', ['Read what CoreVideo is and is not', 'Matched the five shots to the four modes', 'Joined, or loaded the supplied recordings', 'Assigned both guests by the mode each shot required', 'Set a failover participant and said why that source', 'Read Diagnostics per source', 'Set one fader per guest between −12 and −6 dBFS', 'Submitted A2']],
  ]],
  ['Module 3 checklist', [
    ['Decide', ['Answered the two Module 2 questions', 'Read the recorder panel and wrote down my headroom figure', 'Chose program-only or ISO from that figure', 'Read the consent and retention page']],
    ['Record and diagnose', ['Predicted my file count before recording', 'Ran the capture with two scene switches', 'Verified every file: exists, plays, right audio, right length', 'Submitted A3', 'Read the symptom-to-cause table', 'Worked the fourth case before posting', 'Posted three diagnoses to D1', 'Replied to one post or to the archived case']],
  ]],
  ['Module 4 checklist', [
    ['Trace and publish', ['Answered the two Module 3 questions', 'Found the two manual junctions on the delivery path', 'Chose my deliverable and gave a reason from my Module 3 record', 'Uploaded to the video service', 'Corrected the captions, including any ʻokina and kahakō', 'Attached a transcript', 'Placed it in the module a student opens first']],
    ['Verify', ['Handed the title to someone who was not there', 'Ran all four checks from student view with the banner in frame', 'Corrected anything that failed and recorded before and after', 'Submitted A4']],
  ]],
];
for (const [name, cats] of checklists) {
  await run('create_checklist', {
    name,
    description: 'Items map one to one to what the pages ask you to do. Nothing here is graded.',
    categories: cats.map(([n, items]) => ({ name: n, items: items.map((i) => ({ name: i })) })),
  });
  log(`  ${name}`);
}

log('Announcement');
await run('create_announcement', {
  title: 'Start here: producing online lectures with OBS',
  publish: true,
  body:
    '<p>This course takes you from a plain Zoom recording to a composed lecture with remote guests framed and mixed individually, published in Lamakū with captions. About 3.8 hours across four modules, plus setup.</p>' +
    '<p><strong>Check one thing before you begin.</strong> The CoreVideo plugin needs Windows 10 or 11 and a Zoom account with Meeting SDK raw data access, which is an entitlement a Zoom administrator controls. The second page of Start here settles which path you are on in two minutes, before you install anything. The OBS-only path does all four modules and all five graded tasks.</p>' +
    '<p>Nothing is locked and no module is gated on another. Every page states its time cost, and each of the five graded tasks publishes the exact criteria it is marked against.</p>',
});

log('\nPart B complete.');
await client.close();
process.exit(0);
