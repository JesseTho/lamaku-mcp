# lamaku-mcp

An MCP server for **Lamakū**, the University of Hawaiʻi's D2L Brightspace LMS.

It reads your course data, and unlike the other Brightspace MCP servers I know of, it also
**writes**: announcements, content modules, authored HTML pages, uploaded media, links,
assignments, grade items, discussion forums and topics, and whole course packages.

Student identities are pseudonymised by default. See [FERPA guard](#ferpa-guard).

**[Overview](https://jessetho.github.io/lamaku-mcp/)** states what it does and what it does not
do, then installs in four commands. The
**[manual](https://jessetho.github.io/lamaku-mcp/guide/)** covers the safety model, building a
course end to end, the page templates, and all 54 tools.

---

## What this is for

Building and maintaining a course from an agent, without clicking through Brightspace.

The three D2L MCP servers I could find are read-only. They check grades and due dates, which is
useful, and it is a different job from this one. If you want to ask what is due on Thursday,
those are simpler. If you want to construct a course and put it in Lamakū, this is the one that
can.

The trade is that writes land in a real course, so most of the design here is about not doing
that carelessly. See [Safety model](#safety-model).

---

## Status

Every write route below was verified against a real Lamakū sandbox course by creating an object
and deleting it again. None of it is inferred from the D2L documentation alone, which turned out
to be wrong or incomplete on several payload shapes.

| Capability | Status |
|---|---|
| Announcements, create and delete | verified |
| Content modules, create, nest, delete | verified |
| Content links (URL topics) | verified |
| Assignment folders and categories | verified |
| Grade items and categories | verified |
| Discussion forums and topics | verified |
| Discussion delete, forums and topics | verified, with the blast radius named in the preview |
| Checklists, nested categories and items, append, delete | verified |
| Quizzes, create and delete | verified, but see quiz questions below |
| **Content pages**, authored HTML, three templates | verified |
| **Media upload**, video, audio, images, PDF, captions | verified up to 36 MB |
| **Content visibility**, release to students, reorder, rename | verified |
| **Course package import**, `.imscc` or Brightspace `.zip` | verified |
| **Quiz questions, by import** | verified: 17 questions with answer keys and feedback |
| Reading everything above, plus surveys, calendar, classlist | verified |
| **Quiz questions, directly** | Not possible. Brightspace exposes `GET` but no create route, so `create_quiz` makes an empty shell. Import a cartridge instead. |
| **Rubric authoring** | Blocked. The route needs `le 1.97+` and Lamakū serves `1.96`, one version short. A Brightspace `.zip` import carries rubrics today, which routes around it. |
| **Rubric assessment** (scoring against an existing rubric) | Available but unproven. `/assessment` needs only `le 1.93+` and answers on 1.96. Untested because the sandbox has no rubrics to score against. |
| **Grade value writing** | Untested. The sandbox has no student enrolments, and trying it in a live section would alter a real student's record. |
| **Grade item listing** | Not possible. `get_grades` returns the caller's own grades, so an item can be created and deleted by id but never enumerated. |
| **Course creation** | Org-level admin, not available to an instructor account. Ask UH ITS. |

### Reading a 404 against a 400

Brightspace separates these in a way worth relying on when probing. A `404` means the route does
not exist at that API version. A `400` means it exists and rejected your input. That is how the
rubric split above was settled: `/rubrics/` returns 404 on 1.96 while `/assessment` returns 400,
matching the documented 1.97 and 1.93 minimums exactly.

One caveat on the same theme. A `400` does not prove you have permission. Several routes validate
the body before checking the role, so probing with a malformed payload over-reports your access.
Only a real create proves anything.

### Roles matter more than you would expect

The same person holds different roles in different courses, and the API enforces them
differently. On one account: `Instructor` on sandboxes, `Designer` on one section,
`Teaching Assistant` on another, `Participant` elsewhere, and `Instructor-Content Copy Only` on a
template. That last one passes on announcements and is refused by the assignment routes.

Every authoring tool runs a role preflight before spending the call, so you get a straight
explanation instead of a bare 403.

---

## Setup

```bash
pnpm install
pnpm build
node dist/cli.js login          # opens a browser; complete UH login and Duo yourself
```

The committed lockfile is pnpm's, and CI installs with `--frozen-lockfile`. `npm` works fine
locally if you prefer it, but do not commit the `package-lock.json` it generates.

Register with Claude Code:

```bash
claude mcp add lamaku -- node /absolute/path/to/lamaku-mcp/dist/index.js
```

Or for any MCP client that speaks stdio:

```jsonc
{
  "mcpServers": {
    "lamaku": {
      "command": "node",
      "args": ["/absolute/path/to/lamaku-mcp/dist/index.js"],
      "env": { "LAMAKU_HOST": "lamaku.hawaii.edu" }
    }
  }
}
```

The login opens a real browser window because UH requires Duo. Sessions last about a day of
idleness and expire hard after a few days, at which point you run `login` again.

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `LAMAKU_HOST` | `lamaku.hawaii.edu` | Brightspace hostname. Any D2L instance should work, though only Lamakū is tested. |
| `BRIGHTSPACE_HOST` | unset | Neutral alias for the same thing. `LAMAKU_HOST` wins if both are set. |
| `LAMAKU_FERPA` | `strict` | `off` disables student pseudonymisation. |
| `LAMAKU_AUTH` | `session` | `oauth` uses a registered client instead of a captured browser session. Scaffolded, not proven. |
| `LAMAKU_BROWSER` | auto | Force `chrome`, `msedge`, or `chromium` at login. |
| `LAMAKU_DOWNLOAD_DIR` | under app data | Where downloaded files land. |
| `LAMAKU_LE_VERSION`, `LAMAKU_LP_VERSION` | latest | Pin an API version. |

---

## FERPA guard

Student names, usernames, emails and institutional IDs are protected education records. This
server hands data to a language model, and from there into a vendor's logs, so by default it does
not emit them.

Students become a stable handle like `student:4f2a91`. The handle is an HMAC under a salt
generated on your machine and never transmitted, so it is not reversible and not comparable
across installs. It stays stable across calls, which means an assistant can still reason about
"the same student who missed lab 3" without knowing who that is.

The raw `userId` is dropped as well. It is a direct key back into Brightspace and into anything
sharing the same institutional ID, so pseudonymising the name alone would not be enough.

Course staff are not redacted. A co-instructor's name is not a protected record, and hiding it
makes a roster unreadable for no gain. Passing `revealStudents: true` on a call returns real
names, for when you have deliberately asked.

This is a disclosure control rather than an access control. You can read your roster in
Brightspace whenever you like. The point is keeping it out of prompts and model retention unless
you meant to put it there.

```bash
pnpm test                         # includes the guard's unit tests
node scripts/verify-privacy.mjs   # asserts nothing leaks end to end
```

[SECURITY.md](SECURITY.md) covers what the guard does and does not protect, and how session
storage actually works.

---

## Safety model

Writes are irreversible and land in a real course, so every authoring tool is gated twice.

First, a role preflight refuses before the call if your role in that course cannot perform the
action. Second, the first call returns only a preview of what would be sent. Nothing reaches
Brightspace until you call again with the token that preview carries. Tokens are single use,
expire in five minutes, and are scoped to the action they were minted for, so a token approved
for one preview cannot authorise a different operation.

New objects are created hidden from students. `release_course_content` is the deliberate step
that publishes them, and it previews exactly what becomes visible first.

Deletes are permanent and cannot be undone through this API. The previews say so, and name what
goes with the object. A forum preview lists every topic that will go with it.

```bash
LAMAKU_SANDBOX=<courseId> node scripts/verify-writes.mjs
```

That script creates and deletes real objects, so point it only at a sandbox. It refuses to run
without an explicit course id. [`scripts/README.md`](scripts/README.md) says which of the others
need a live session and which are safe anywhere.

---

## Tests

```bash
pnpm test         # unit tests, no Brightspace needed
pnpm typecheck
```

The unit tests cover the places where a bug is silent rather than loud: multipart framing, the
two rich-text shapes, the confirmation gate's single use and action scoping, and the FERPA guard.
They need no credentials and run in CI on Node 20 and 22.

The tests are plain `.mjs` against the compiled output in `dist`, so building is part of
testing and there are no experimental flags to keep working. That is also what keeps the Node 20
floor honest: type stripping needs 22.6, and the package claims 20.

Writing them found a real bug, which is the argument for having them. `scrubNames` anchored every
name part with a trailing `\b`, so a part ending in punctuation never matched. Brightspace display
names are frequently "Last, First", which meant `Smith,` went through unscrubbed. It had looked
fine for months.

The `verify-*.mjs` scripts are integration checks and stay manual. They need a live session, and
`verify-writes.mjs` creates real objects.

---

## Tools

**Session** `auth_status`, `whoami`, `check_capabilities`

**Reading** `list_courses`, `list_assignments`, `get_assignment`, `list_my_submissions`,
`download_submission_file`, `get_grades`, `get_final_grade`, `get_upcoming_deadlines`,
`list_modules`, `get_module`, `get_topic`, `download_topic_file`, `get_announcements`,
`list_forums`, `list_topics`, `read_posts`, `list_quizzes`, `list_checklists`

**Authoring** `create_announcement`, `delete_announcement`, `create_content_module`,
`create_content_link`, `delete_content_module`, `create_assignment`,
`create_assignment_category`, `delete_assignment`, `create_grade_item`, `create_grade_category`,
`delete_grade_item`, `create_discussion_forum`, `create_discussion_topic`, `create_quiz`,
`delete_quiz`, `create_checklist`, `add_checklist_item`, `delete_checklist`,
`create_content_page`, `update_content_page`, `create_content_file`, `update_content_module`,
`update_content_topic`, `set_module_description`, `release_course_content`,
`delete_content_topic`, `delete_discussion_forum`, `delete_discussion_topic`,
`import_course_package`, `get_import_status`

**Student side** `submit_assignment`, `create_discussion_post`, `reply_to_post`

```bash
pnpm tools    # print the live list with signatures
```

---

## Authoring a course end to end

Order matters here, mostly because media paths are not guessable until the media exists.

1. `create_content_module`, one per module.
2. `create_content_file` to upload video, audio and images. Each call returns the enforced
   content path and an `embedAs` snippet.
3. `create_content_page`, pasting those snippets where the media belongs. Doing this before the
   upload means rewriting every page once you know the paths.
4. `create_content_link` for external sources. Then `create_discussion_forum`,
   `create_discussion_topic` and `create_assignment` for the parts a Common Cartridge cannot
   carry at all.
5. `set_module_description` to give each module a cover image, once its header image is
   uploaded. Brightspace renders an image in a module description as that module's cover.
6. `import_course_package` for anything the API cannot author. Quiz questions are the clearest
   case. Poll `get_import_status` until it reports `COMPLETED`.
7. `release_course_content` last, since everything above was created hidden on purpose.

### Page templates

`create_content_page` and `update_content_page` take a `template`:

| Template | What it does |
|---|---|
| `uh` (default) | Links the UH shared HTML Template Library: banner, content column, seal footer. Correct on a UH instance and nowhere else. |
| `jabsom` | JABSOM Design System with its tokens inlined. Mānoa Green headings in Inter, Source Serif 4 body. Self-contained, so it renders correctly off-instance too. |
| `plain` | A bare document with no institutional styling. |

[`docs/course-style.md`](docs/course-style.md) covers the UH template and
[`docs/jabsom-style.md`](docs/jabsom-style.md) the JABSOM one, including the available components
and the accessibility obligations that come with them.

### What an import can carry

A Common Cartridge brings pages, weblinks, files, QTI quizzes and question banks, discussion
topics and LTI links. A Brightspace `.zip` export brings all of that plus D2L-native objects:
rubrics, release conditions, grade schemes. That is the practical way to move a rubric between
courses while the rubric API waits on `le 1.97`. Groups, sections, attendance and awards cannot be
expressed in either format.

Import adds, it does not replace. Importing the same package twice produces two copies of
everything, so import into an empty course or check for overlap first.

---

## Notes for anyone extending this

Rich text is not one shape, and which one an endpoint accepts is not derivable from the API
version, the product code, or the parent object:

| Shape | Used by |
|---|---|
| `{Content, Type}` | grades, content modules, dropbox folders, discussion **topics** |
| `{Text, Html}` | discussion **forums**, announcements |

A forum and a topic inside that forum disagree. Sending the wrong one yields a bare
`400 Invalid Parameters` naming no field. The shapes are pinned per endpoint in
[`src/api/richtext.ts`](src/api/richtext.ts).

Other traps, all of which cost an afternoon at some point:

- Announcements need `multipart/mixed`, not JSON and not `form-data`, and `StartDate` is
  mandatory even for an unpublished draft.
- `GradeSchemeId` must be `0` for "course default". Sending `null` is rejected.
- Discussion `RatingType` is a string enum. Sending `0` is rejected.
- Quiz creation rejects partial bodies. Every documented field has to be present, and a
  nearly-complete payload, `{}`, `[]` and malformed JSON all return the same opaque
  `Provided JSON is invalid` with no field named. An incomplete body is therefore
  indistinguishable from an unsupported endpoint. The full field set is in
  [`src/tools/instructor/quizzes.ts`](src/tools/instructor/quizzes.ts).
- Checklists need `SortOrder` of at least 1 on both categories and items, and an item's
  `CategoryId` is required and non-nullable. A checklist is not usable until it has a category.
- Collection shapes are inconsistent within a single feature. `GET /checklists/` returns a bare
  array while its own `/categories/` and `/items/` sub-routes wrap the same data in
  `{Objects, Next}`. Normalise both.
- `PUT` replaces rather than patches. Read the object first and send it back with your changes
  applied, or the fields you omitted are silently blanked.

---

## Acknowledgements

Derived from [mycourses-mcp](https://github.com/sahildayal/mycourses-mcp) by Sahil Dayal (MIT),
which contributed the browser-session auth, the confirmation gate, and the client and multipart
layers. The instructor authoring tools, the FERPA guard, the role preflight and the Lamakū
targeting are new here.

Not endorsed by the University of Hawaiʻi or D2L. Check UH's acceptable-use
policy before pointing this at your account.

MIT licensed.
