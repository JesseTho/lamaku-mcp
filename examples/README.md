# Examples

Worked examples, kept because they show real payload shapes against a real instance. They are
not maintained, and they are not the recommended way to build a course any more.

## `build-obs-course*.mjs`

A four-part script that built a lecture-production course directly through the MCP tools:
content modules, authored pages, assignments, grade items, checklists and a discussion forum.
It ran against Lamakū sandbox 8238 in August 2026. The course it built has since been deleted.

Split across `a`, `b` and `c` only because one file grew unwieldy, not because the stages are
meaningfully separate.

**Read these for the payload shapes**, which are the part that took work to establish: what a
checklist wants for `SortOrder`, why an assignment needs a category first, how a discussion
forum and a topic inside it disagree about rich text.

**Do not copy the overall approach.** It predates `create_content_file`, `set_module_description`
and `import_course_package`. A course built today should follow the ordered walkthrough in the
main README, which uploads media before writing the pages that reference it, and imports a
cartridge for anything the API cannot author.

Two things they demonstrate that are still current:

- Driving the server in-process over `InMemoryTransport` rather than spawning a subprocess,
  which is the easiest way to script against it.
- The two-step confirmation dance: call once for a preview, read the `confirmToken`, call again
  with it. Every write goes through this.

```bash
LAMAKU_COURSE=<sandboxId> node examples/build-obs-course.mjs
```

It creates real objects in whatever course you point it at. Point it at a sandbox.
