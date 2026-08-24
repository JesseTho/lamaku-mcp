---
version: 1
slug: "docs-index-html"
primary_target: "docs/index.html"
related_targets: ["docs/site.css","docs/site.js"]
---

## Scope

`docs/index.html`, the site's front door. The manual moved to `docs/guide/index.html` when this
page took the root.

Visitor mode: Persuade. The visitor decides whether this is worth installing, and installs it
without leaving.

## Audience and job

A University of Hawaiʻi instructor or instructional designer arriving cold, usually from a
colleague. They know Brightspace. They have not heard of MCP and should not have to look it up.

The job is a decision: is this for me, will it break my live section, what does an hour of trying
it cost. Ruling it out quickly is a good outcome. The page earns the ones who stay by being the
kind of page that lets people leave.

The visitor ends on the install commands. Convinced readers do not get sent elsewhere to start.

## Proof and content

Only what has been verified: 54 tools, 50 tests, the import result (4 quizzes, 17 questions,
answer keys and feedback intact), media to 36 MB at 24 seconds. No adoption claims, no user
counts, no testimonials. Nobody outside the author has used this.

Every limitation names its workaround in the same entry.

## Constraints

- The world is DESIGN.md's and does not change here. Same masthead, palette, system stack,
  hairlines, notes. No sidebar or rail, because there is nothing to navigate.
- DESIGN.md's "no hero, no feature grid, no call to action" is a rule for the manual's
  composition. It holds here too, by choice rather than by inheritance: the ledger is the hero.
- Prose caps at 38rem, roughly 70 characters. The manual keeps 46rem because its tables need the
  width, and that difference is deliberate.

## Chosen direction

**The Ledger**, locked by the user from three structures dealt at surface scope (seed `5994eeef`,
code-led). Two facing inventories, what it does and what it does not, at equal weight, above the
fold-line of the argument and before anything asks for an install.

The memorable moment is the second column. Most tool pages hide their limits in a FAQ; this one
gives them half the page and the same typographic rank, and each one says what to do instead.
The inventory breaks out wider than the prose column so it reads as the centrepiece rather than
a list inside an article.

## Unresolved

- No screenshot of a real write preview. The strongest available proof is a picture of the
  confirmation gate, and the page currently describes it in prose instead. Worth adding when a
  clean capture exists that carries no student data.
- The install path is still clone-and-build. If this is ever published to npm, steps one and
  three collapse into one and the page's cost claim drops.
