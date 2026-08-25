---
version: 1
slug: "docs-index-html"
primary_target: "docs/index.html"
related_targets: ["docs/site.css","docs/site.js"]
---

## Scope

`docs/index.html`, the site's front door. The manual lives at `docs/guide/index.html` and carries
everything that is not on this page.

Visitor mode: Persuade, but barely. The page's whole job is to say what this is and get someone
installed. It does not argue.

## Audience and job

A University of Hawaiʻi instructor or instructional designer arriving cold, usually from a
colleague. They know Brightspace. They have not heard of MCP and should not have to look it up.

They copy one block before deciding whether to read any further, which is the point.

## Constraints

- **Install block first, page about 300 words.** A tool page opens with a tagline and a
  copy-pastable command; everything below that is optional reading. A first version came in at 981
  words, over half the length of the entire manual, and read as a wall.
- **Written for an instructor, not a developer.** Change, not write. Anonymous label, not HMAC.
  The words on the Brightspace screen, not the words in the codebase.
- **Headings name the thing.** Features, How to install, Documentation. Not "What it does".
- One measure, no breakouts, no second column. The page is a single column from masthead to
  footer.
- No repeated bold-term-then-explanation rhythm. Sixteen of those in a row is what made the first
  version read as machine-written, and the pattern is the tell, not the words.
- The world is DESIGN.md's and does not change here.

## Content

A one-line tagline, one install block, seven one-line features. About 145 words.

Documentation is not a section at the bottom. It is the left sidebar, shared with the manual, so
it sits at the top of the page where someone looking for it will look.

**The overview lists and the manual explains.** That is the division, and it is not about length.
A feature here is one line: what it does, no how and no why. The FERPA guard gets seven words on
this page and a whole section on the other one, and a first attempt that gave it a card with four
lines of explanation was documentation wearing a feature's clothes.

Prerequisites and the sandbox warning share one small line under the install block. One small line
names what it cannot do and links to the full list.

Only verified claims. No adoption numbers.

## Chosen direction

A structural round was run and the user locked The Ledger, two facing inventories at equal weight.
Built, and it was wrong: giving the limitations half the page meant explaining sixteen entries,
which produced the wall. The structure was not the problem so much as the volume it invited.

What shipped is the plain version. The limitations still are not buried, they are one sentence
and a link, which turns out to be enough.

## Unresolved

- There is still no picture of a real write preview anywhere on the site. It stays out of the
  overview by the word budget, but the manual could carry one.
- Install is still clone-and-build. Publishing to npm would collapse steps one and three.
