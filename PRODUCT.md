# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML and CSS in `docs/`, served by GitHub Pages from the `main` branch. No build step,
no framework, no JavaScript dependency for content. The server itself is TypeScript on Node 20+,
but the site is deliberately separate from it and must stay buildless so it cannot rot.

## Users

**Primary: University of Hawaiʻi faculty and instructional designers**, at Mānoa and JABSOM, who
already hold Lamakū accounts and already know Brightspace.

They are not confused by "content module", "topic" or "release conditions". They are likely
unfamiliar with MCP, with what it means for an agent to hold a session, and with why a tool would
preview a write instead of performing it. The explaining goes there, not into LMS vocabulary.

They arrive with a course to build or maintain and limited patience. Many are clinicians or
researchers for whom course building is not the main job.

## Product Purpose

An MCP server that lets an agent read a Brightspace course and write to it: content modules,
authored HTML pages, uploaded media, links, discussions, assignments, grade items, and whole
course packages.

The site's job is **getting one person from nothing to a course that exists in Lamakū**. Not
comprehension for its own sake, and not recruiting contributors. If a reader installs it and
finishes a course without opening the README, the site worked.

## Positioning

Every other D2L MCP server is read-only: they check grades and due dates. This one authors.

The consequence a neighbouring product cannot copy without doing the same work: because it
writes, it has to be trustworthy near a live course, so every write previews before it lands,
role permission is checked before the call is spent, and student identities never reach the model
by default.

## Operating Context

The reader works on their own machine, signed into UH SSO with Duo. Sessions are captured through
a real browser window and expire after about a day of idleness, so re-authentication is a routine
part of use rather than an error.

Course building happens in a sandbox course first. Sandboxes are per-instructor and requested from
UH ITS. Mistakes in a live section affect real students, which is why the sandbox habit matters
enough to state.

Media lives in the course's enforced content space, at a path derived from the course code, which
is not guessable before the upload happens. Order of operations follows from that.

## Capabilities and Constraints

54 tools. Every write route verified against a real sandbox by creating an object and deleting it
again.

Hard limits that shape what the site can promise:

- **Quiz questions cannot be created directly.** Brightspace exposes `GET` and no create route.
  A Common Cartridge import creates them, verified with 17 questions, their answer keys and their
  feedback.
- **Rubric authoring needs `le 1.97+`.** Lamakū serves `1.96`. A Brightspace `.zip` import carries
  rubrics today.
- **Grade value writing is untested**, because the sandbox has no student enrolments and trying it
  live would alter a real record.
- **Course creation is org-level admin**, not available to an instructor account.
- **Groups, sections, attendance and awards** are absent and not expressible in a course package.
- **OAuth against a non-UH instance is unproven.** The session path assumes an interactive browser,
  which rules out CI and headless use.

Everything is created hidden from students on purpose. Releasing is a deliberate separate step.

## Brand Commitments

Named for **Lamakū**, UH's Brightspace instance. Hawaiian orthography is binding: the ʻokina
(U+02BB) and kahakō in Lamakū, Hawaiʻi, Mānoa and JABSOM must render correctly and must never be
substituted with an apostrophe or a bare vowel.

MIT licensed. Derived from `mycourses-mcp` by Sahil Dayal, which is credited.

**The documentation is a reference manual, not a product page.** The visual world was chosen
deliberately over an assigned alternative: the category standard for documentation, held to the
bar MDN, the Django docs and the PostgreSQL manual set. It is built to be correct and scanned
for years rather than to look current. That commits the site to a system font stack with no
webfonts, a flat surface with no shadows, and no hero, feature grid or call to action. See
DESIGN.md.

The author works at UH, so the project is affiliated in the ordinary sense and must not claim
otherwise. What it is not is **endorsed**: it does not speak for the University of Hawaiʻi or for
D2L, and the site must not imply that it does. No UH logos, seals or wordmarks.

## Evidence on Hand

Real and citable, no invention:

- 54 tools, 50 unit tests passing on Node 20 and 22, CI green.
- The import test: 4 quizzes, 17 questions, every answer key and every feedback string intact.
- Media upload verified to 36 MB, largest single upload taking 24 seconds.
- `release_course_content` verified: 10 hidden topics released, 0 failures.

No user counts, no testimonials, no adoption claims. Nobody outside the author has used this.

## Accessibility

**WCAG 2.2 AA is a hard requirement**, not an aspiration. This is UH-adjacent educational
software and is held to the same bar as the course pages it produces.

That means verified contrast ratios rather than assumed ones, full keyboard operation with a
visible focus state, `prefers-reduced-motion` respected, correct heading order, and no meaning
carried by colour alone.
