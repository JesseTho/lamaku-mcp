# Scripts

Everything here needs a stored session except `list-tools.mjs`. Run `node dist/cli.js login`
first, and `pnpm build` before any of them, since they import from `dist`.

## Safe to run against any course

| Script | What it does |
|---|---|
| `list-tools.mjs` | Prints every registered tool with its signature. No session needed, no network. |
| `verify.mjs` | Exercises the read path end to end, then dry-runs both write tools to prove they preview instead of writing. |
| `verify-privacy.mjs` | Asserts the FERPA guard emits no student identity. Pairs with the unit tests in `tests/`. |
| `verify-content.mjs` | Reads content modules and topics, including file extraction. |
| `verify-discussions.mjs` | Reads forums, topics and posts. |
| `evaluate-course.mjs` | Audits a built course against the OSCQR items that can be checked mechanically. Read-only. |

```bash
LAMAKU_COURSE=<courseId> node scripts/evaluate-course.mjs
```

## Creates and deletes real objects

`verify-writes.mjs` is the only script that writes. It creates one of each object type and
deletes it again, which is how the capability table in the README was established.

It refuses to run without an explicit course id, deliberately. Point it at a sandbox.

```bash
LAMAKU_SANDBOX=<courseId> node scripts/verify-writes.mjs
```

## Development aids

`diag.mjs` and `analyze-terms.mjs` are ad-hoc. `diag` pokes at the live API while working on
something; `analyze-terms` looks at the shape of an enrolment list, which is how the default
course scope was tuned. Neither is part of the tool surface, and both will change shape
whenever they are next useful.

## Personal automation

`fall-check.mjs` and `run-term-check.ps1` watch for a new term's courses appearing and write a
dated report, driven by a Windows Scheduled Task. They exit `0` for nothing new, `1` for needs
attention, `2` for new courses found, so the wrapper can decide whether to interrupt.

They are specific to one person's setup and kept here because the exit-code pattern is worth
stealing. The reports directory they write to is gitignored, since it contains real course
names.
