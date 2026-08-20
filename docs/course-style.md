# Authoring course pages for Lamakū

House style for pages this server uploads into Lamakū, derived by reading the
**Course Starter Template** (course 6835) that UH ships as the reference course.

Everything here was checked against the live instance rather than inferred: the
class inventory comes from `SYS_custom.css` as served, and every asset path
below was fetched and returned 200.

This file covers **how a page should look and be marked up**. It does not cover
what a page should say — density limits, prose rules, and the read-aloud test
live in the `course-builder` skill's `writing-style.md`, and both apply.

---

## The template exists, and pages should use it

UH hosts a shared template library on the Lamakū instance itself:

```
/shared/HTML-Template-Library/_assets/
```

It is served from the same origin as course content, so an authored page under
`/content/enforced/{orgUnitId}-{CourseCode}/` can link to it with an absolute
path and it resolves. Four stylesheets, all confirmed reachable:

| Asset | Path under `/shared/HTML-Template-Library/_assets/` |
|---|---|
| Bootstrap 4.3.1 | `thirdpartylib/bootstrap-4.3.1/css/bootstrap.min.css` |
| Font Awesome 5.9.0 | `thirdpartylib/fontawesome-free-5.9.0-web/css/all.min.css` |
| UH template styles | `css/styles.min.css` |
| UH system custom | `css/SYS_custom.css` |
| Banner image | `img/SYS_banner.png` |
| UH seal (footer) | `img/SYS_seal.png` |

**Link these rather than writing your own CSS.** A page with bespoke styling
looks like a page from a different course, and the whole point of the shared
library is that it does not.

Note this is the one exception to "self-contained." Inline JavaScript and inline
SVG stay inline — they must work with the network unavailable after load — but
the stylesheets come from the instance's own shared directory, not a CDN.

---

## Page skeleton

Every content page in the template follows one structure. Reproduce it.

```html
<div class="container-fluid">
<div class="content-wrapper">
<div class="row">

  <div class="col-12 banner-img">
    <p><img src="/shared/HTML-Template-Library/_assets/img/SYS_banner.png" alt=""></p>
  </div>

  <div class="col-sm-10 offset-sm-1">
    <h2>Page title</h2>
    <p>Body content goes here.</p>
  </div>

</div>
<div class="col-12"><footer>
  <p><img src="/shared/HTML-Template-Library/_assets/img/SYS_seal.png"
          alt="University of Hawaiʻi seal"></p>
</footer></div>
</div>
</div>
```

Three things to keep:

- **`col-sm-10 offset-sm-1` is the content column.** It sets the measure. Text
  that runs the full width of the viewport is harder to read and does not match
  any other course on the instance.
- **`h2` is the page title.** `h1` belongs to Brightspace's own chrome. Start at
  `h2` and descend without skipping levels.
- **The banner is decorative.** Give it `alt=""` so a screen reader skips it.
  The template's own pages sometimes use `alt="banner"`, which is worse than
  empty — it announces a word that carries nothing.

---

## Components available

These come from `SYS_custom.css` and Bootstrap. Prefer them over hand-rolled
markup, because they already carry the instance's spacing, color and focus
styles.

### Callout — `jumbotron`

For a point that must stand apart from body text. One per page at most; a page
where three things are called out has called out nothing.

```html
<div class="jumbotron">
  <p>The Zoom entitlement is set by an administrator. If this step fails, you
  have hit an administrative wall, not a skill problem.</p>
</div>
```

### Table — always wrapped

```html
<div class="table-responsive">
<table class="table table-bordered">
  <caption>What each Diagnostics field tells you</caption>
  <thead>
    <tr><th scope="col">Field</th><th scope="col">What a rise means</th></tr>
  </thead>
  <tbody>
    <tr><td>Frame age</td><td>Frames have stopped arriving.</td></tr>
  </tbody>
</table>
</div>
```

`table-responsive` is not optional — without it a wide table breaks the page on
a phone. `<caption>` and `scope="col"` are not optional either; they are what
makes the table navigable non-visually.

### Side-by-side panels — `two-col-panels`

```html
<div class="two-col-panels">
<div class="row">
  <div class="col-sm card bg-light"><div class="card-body">
    <h5>Program recording</h5>
    <p>What you publish.</p>
  </div></div>
  <div class="col-sm card bg-light"><div class="card-body">
    <h5>ISO recording</h5>
    <p>What saves you when it goes wrong.</p>
  </div></div>
</div>
</div>
```

Good for a genuine two-way contrast. Not a layout device for unrelated content.

### Embedded video — `video-wrapper`

```html
<div class="video-wrapper">
  <div class="embed-responsive embed-responsive-16by9">
    <iframe class="embed-responsive-item" src="https://www.youtube.com/embed/VIDEO_ID"
            title="Descriptive title of the video" allowfullscreen></iframe>
  </div>
  <div class="video-text">
    <p>Direct link:
      <a href="https://youtu.be/VIDEO_ID" class="new-window" target="_blank" rel="noopener">
        Video title<span class="sr-only"> (this link opens in a new window/tab)</span>
      </a>
    </p>
  </div>
</div>
```

Always give the iframe a `title`, and always give the direct link as well — an
embed that fails leaves a learner with nothing otherwise.

### Links that leave the page — `new-window`

The template's convention, and it carries an accessibility obligation:

```html
<a href="https://corevideo.io/download/" class="new-window" target="_blank" rel="noopener">
  CoreVideo download<span class="sr-only"> (this link opens in a new window/tab)</span>
</a>
```

The `sr-only` span is what tells a screen reader user the context is about to
change. `rel="noopener"` is required with `target="_blank"`.

### Numbered lists with emphasis

`sm-number`, `medium-number`, `large-number` on an `<ol>` scale the numerals.
The template uses `medium-number` for course learning outcomes.

```html
<ol class="medium-number">
  <li>Build a scene set for a lecture you are teaching.</li>
</ol>
```

### Full custom-class inventory

From `SYS_custom.css`, for reference:

`accordion` · `bg-img-wrapper` · `card` · `card-body` · `card-graphic` ·
`card-icon` · `card-standard` · `card-title` · `content-wrap-bg` ·
`content-wrapper` · `download` · `figure-alt` · `fullscreen-splash-sm` ·
`intersect-content` · `jumbotron` · `large-number` · `list-group-item` ·
`medium-number` · `new-window` · `overlay-content` · `sm-number`

---

## Course and module structure

The starter template's shape is worth copying, because it is what UH learners
will already have seen in other courses.

**Course level**, in order: Welina Mai (Welcome) → Getting Started (Course
Introduction, About Your Instructor, Course Navigation, Course Technology,
Getting Help, Next Steps) → Syllabus → Modules.

**Each module**: Introduction → lesson pages → activities → Conclusion.

The Introduction and Conclusion pages are doing real work. The Introduction
states what the learner will be able to do and how long it takes; the Conclusion
closes the loop and points at the next module. In a self-paced course with no
cohort, they are most of the pacing structure a learner gets.

---

## Instructor notes

The template marks author-facing guidance in purple, italic, bold:

```html
<p><span style="color: #8000db;"><em><strong>Instructor Note.</strong>
Delete this before publishing.</em></span></p>
```

This is the one place inline `style` is conventional, because the note is
temporary by definition. **A published page must contain none of these.** Grep
for `8000db` before you consider a page finished.

---

## Accessibility, which is not a separate pass

- **Never signal by color alone.** OBS's own meters use green, yellow and red,
  so a page teaching audio levels must give a number — "peaks between −12 and
  −6 dBFS" — with the color as redundant reinforcement.
- **ʻŌlelo Hawaiʻi renders correctly or the page is wrong.** ʻOkina (ʻ, U+02BB)
  and kahakō (ā ē ī ō ū) must survive into the page, into OBS text sources, and
  into captions. Write the character, never an apostrophe standing in for an
  ʻokina.
- **Every image carries `alt`.** Decorative images take `alt=""`. An image that
  carries meaning takes a description of the meaning, not of the picture.
- **Every inline SVG carries a text alternative** — `role="img"`, an
  `aria-label` or `<title>`, and a `<desc>` where the diagram is doing real
  explanatory work.
- **No unscaled full-desktop screenshots.** OBS is a dense, dark, small-text
  interface and a full-desktop capture scaled into a content column is
  illegible. Crop to the region, and name the panel in text so the image is not
  the only locator.
- **Heading order descends without gaps.** `h2` then `h3` then `h4`.
- Target WCAG 2.2 AA.

---

## Working with `create_content_page`

The tool wraps your body HTML in a full document, so pass body content only —
no `<html>`, `<head>` or `<body>` tags. Pass `template: "uh"` (the default) to
get the UH template head, skeleton and footer; pass `template: "plain"` for a
bare document when you deliberately want no institutional styling.

Two things the tool will not do for you:

- It does not check your markup against this file. `8000db` notes, missing
  `alt`, and skipped heading levels all publish happily.
- It warns past 900 words but does not enforce it. That limit is from
  `writing-style.md` and it is about working memory, not about file size.
