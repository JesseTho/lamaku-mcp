# lamaku-mcp

An MCP server for **Lamakū**, the University of Hawaiʻi's D2L Brightspace LMS.

Reads your course data and lets an
instructor **author** course material: announcements, content modules, links,
assignments, grade items and categories, discussion forums and topics.

Student identities are pseudonymised by default. See [FERPA guard](#ferpa-guard).

---

## Status

Every write route below was verified against a real Lamakū sandbox course by
creating an object and deleting it again. Nothing here is inferred from the
D2L documentation alone — the docs turned out to be wrong or incomplete on
several payload shapes.

| Capability | Status |
|---|---|
| Announcements — create, delete | ✅ verified |
| Content modules — create, nest, delete | ✅ verified |
| Content links (URL topics) | ✅ verified |
| Assignment folders + categories | ✅ verified |
| Grade items + categories | ✅ verified |
| Discussion forums + topics | ✅ verified |
| Quizzes — create, delete | ✅ verified (shell only; see below) |
| Checklists — create with nested categories and items, append, delete | ✅ verified |
| **Content pages** — authored HTML, three templates | ✅ verified |
| **Media upload** — video, audio, images, PDF, captions into course files | ✅ verified |
| Reading everything above, plus surveys, calendar, classlist | ✅ verified |
| **Quiz questions** | ❌ Brightspace exposes `GET` for questions but no create/update route. Quizzes are created empty and questions added in the UI. |
| **Rubric authoring** | ⛔ Route exists but needs `le 1.97+` (LMS v20.26.8). Lamakū serves `le 1.96` — one version short, so this arrives with the next Brightspace upgrade. |
| **Rubric assessment** (scoring a student against an existing rubric) | ⚠️ Available — `/assessment` needs only `le 1.93+` and the route answers on 1.96. Unverified end-to-end because the sandbox has no rubrics to score against. |
| **Course creation** | ❌ Org-level admin. Not available to an instructor account; ask UH ITS. |
| **Discussion delete** | ❌ No route. Forums and topics can be created but only removed in the UI. |
| **Grade item listing** | ❌ Only `get_grades`, which returns the caller's own grades. Items can be created and deleted by id but never enumerated. |
| **Grade value writing** | ⚠️ Untested. The sandbox has no student enrolments to grade, and testing it in a live section would alter a real student's record. |

### Reading a 404 against a 400

Brightspace distinguishes the two in a way worth relying on when probing:
`404` means the route does not exist at that API version, `400` means it exists
and rejected your input. That is how the rubric split above was established —
`/rubrics/` returns 404 on 1.96 while `/assessment` returns 400, exactly
matching the documented 1.97 and 1.93 minimums.

### Roles matter more than you'd expect

The same person holds different roles per course, and the API enforces them
differently. Observed on one account: `Instructor` on sandboxes, `Designer` on
one section, `Teaching Assistant` on another, `Participant` elsewhere, and
`Instructor-Content Copy Only` on a template — the last of which passes on
announcements but is refused by the assignment routes.

Every authoring tool therefore runs a **role preflight** before spending the
call, so you get a straight explanation instead of a bare 403.

---

## Setup

```bash
pnpm install
pnpm build
node dist/cli.js login          # opens a browser; complete UH login + Duo yourself
```

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

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `LAMAKU_HOST` | `lamaku.hawaii.edu` | Brightspace hostname. Any D2L instance works. |
| `LAMAKU_FERPA` | `strict` | `off` disables student pseudonymisation. |
| `LAMAKU_BROWSER` | auto | Force `chrome`, `msedge`, or `chromium` at login. |
| `LAMAKU_DOWNLOAD_DIR` | under app data | Where downloaded files land. |
| `LAMAKU_LE_VERSION` / `LAMAKU_LP_VERSION` | latest | Pin an API version. |

---

## FERPA guard

Student names, usernames, emails and institutional IDs are protected education
records. This server is handing data to a language model, and from there into a
vendor's logs — so by default it does not emit them.

- Students become a stable handle: `student:4f2a91`
- Handles are an HMAC under a salt generated on your machine and never
  transmitted, so they are **not reversible** and not comparable across installs
- Handles are **stable across calls**, so an assistant can still reason about
  "the same student who missed lab 3" without knowing who that is
- The raw `userId` is dropped too, since it is a direct key back into
  Brightspace and any system sharing the same institutional ID
- **Course staff are not redacted** — a co-instructor's name is not a protected
  record, and hiding it makes rosters unreadable for no gain
- `revealStudents: true` on a tool call returns real names, for when you have
  actually asked for them

This is a disclosure control, not an access control. You can always read your
roster in Brightspace itself; the point is to keep it out of prompts and model
retention unless you deliberately ask.

```bash
node scripts/verify-privacy.mjs   # asserts nothing leaks
```

---

## Safety model

Writes are irreversible and land in a real course, so every authoring tool is
gated twice:

1. **Role preflight** — refuses before the call if your role in that course
   cannot perform the action.
2. **Confirmation token** — the first call only ever returns a *preview* of
   what would be sent. Nothing reaches Brightspace until you call again with
   the token. Tokens are single-use and expire in five minutes.

New objects are created **hidden from students by default**. Unhide them
deliberately.

```bash
LAMAKU_SANDBOX=<courseId> node scripts/verify-writes.mjs
```

That script creates and deletes real objects, so point it only at a sandbox.
It refuses to run without an explicit course id.

---

## Tools

**Session** `auth_status`, `whoami`

**Reading** `list_courses`, `list_assignments`, `get_assignment`,
`list_my_submissions`, `download_submission_file`, `get_grades`,
`get_final_grade`, `get_upcoming_deadlines`, `list_modules`, `get_module`,
`get_topic`, `download_topic_file`, `get_announcements`, `list_forums`,
`list_topics`, `read_posts`, `list_quizzes`, `list_checklists`

**Authoring** `create_announcement`, `delete_announcement`,
`create_content_module`, `create_content_link`, `delete_content_module`,
`create_assignment`, `create_assignment_category`, `delete_assignment`,
`create_grade_item`, `create_grade_category`, `delete_grade_item`,
`create_discussion_forum`, `create_discussion_topic`, `create_quiz`,
`delete_quiz`, `create_checklist`, `add_checklist_item`, `delete_checklist`,
`create_content_page`, `update_content_page`, `create_content_file`,
`set_module_description`

**Student-side** `submit_assignment`, `create_discussion_post`, `reply_to_post`

```bash
pnpm tools    # print the live list with signatures
```

## Authoring a course end to end

The three content tools are meant to be used together, in this order.

1. **`create_content_module`** — one per module.
2. **`create_content_file`** — upload the video, audio and images first. Each call returns the
   enforced content path and an `embedAs` snippet.
3. **`create_content_page`** — write the page, pasting the `embedAs` snippets where the media
   belongs. Doing it the other way round means rewriting every page once you know the paths.
4. **`create_content_link`** for external sources, then `create_discussion_forum` /
   `create_discussion_topic` and `create_assignment` for the parts a Common Cartridge cannot
   carry at all.

Page chrome comes from `template`:

| Template | What it does |
|---|---|
| `uh` (default) | Links the UH shared HTML Template Library — banner, content column, seal footer. Correct on a UH instance and nowhere else. |
| `jabsom` | JABSOM Design System with tokens inlined: Mānoa Green headings in Inter, Source Serif 4 body. Self-contained, so it also renders correctly off-instance. |
| `plain` | A bare document with no institutional styling. |

See [`docs/course-style.md`](docs/course-style.md) for the UH template and
[`docs/jabsom-style.md`](docs/jabsom-style.md) for the JABSOM one, covering what a page should look like, including the available components and the accessibility obligations that come
with them.

**When the cartridge is still the better route.** Quiz questions have no create route, so
`create_quiz` produces an empty shell. A course whose assessment is quizzes should be built as
an IMS Common Cartridge and imported, then have its forums and assignments added through this
server afterwards.

---

## Notes for anyone extending this

Rich text is **not one shape**. Which one an endpoint accepts is not derivable
from the API version, the product code, or the parent object:

| Shape | Used by |
|---|---|
| `{Content, Type}` | grades, content modules, dropbox folders, discussion **topics** |
| `{Text, Html}` | discussion **forums**, announcements |

A forum and a topic *inside that forum* disagree. Sending the wrong one yields a
bare `400 Invalid Parameters` naming no field. The shapes are pinned per
endpoint in [`src/api/richtext.ts`](src/api/richtext.ts).

Other traps:

- Announcements need `multipart/mixed`, not JSON or `form-data`, and `StartDate`
  is mandatory even for an unpublished draft
- `GradeSchemeId` must be `0` for "course default" — `null` is rejected
- Discussion `RatingType` is a string enum; `0` is rejected
- **Quiz creation rejects partial bodies.** Every documented field must be
  present. A nearly-complete payload, `{}`, `[]` and malformed JSON all return
  the *same* opaque `Provided JSON is invalid` with no field named, so an
  incomplete body is indistinguishable from an unsupported endpoint. The full
  field set is in [`src/tools/instructor/quizzes.ts`](src/tools/instructor/quizzes.ts).
- Checklists need `SortOrder` (>= 1) on both categories and items, and an
  item's `CategoryId` is required and non-nullable — a checklist is not usable
  until it has a category
- **Collection shapes are inconsistent within one feature.** `GET /checklists/`
  returns a bare array while its own `/categories/` and `/items/` sub-routes
  wrap the same data in `{Objects, Next}`. Normalise both.
- A `400` does **not** imply you have permission. Many routes validate the body
  before checking the role, so probing with a malformed payload over-reports
  access. Only a real create proves anything.

---

## Acknowledgements

Derived from [mycourses-mcp](https://github.com/sahildayal/mycourses-mcp) by
Sahil Dayal (MIT), which contributed the browser-session auth, the confirmation
gate, and the client and multipart layers. The instructor authoring tools, the
FERPA guard, the role preflight and the Lamakū targeting are new here.

Not affiliated with or endorsed by the University of Hawaiʻi or D2L. Check UH's
acceptable-use policy before pointing this at your account.

MIT licensed.
