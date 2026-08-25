---
name: lamaku-mcp site
description: The overview and the reference manual for an MCP server that authors Brightspace courses.
colors:
  terracotta: "#a9481d"
  terracotta-hover: "#8a3a16"
  terracotta-dark: "#f0a06a"
  band: "#a34620"
  band-dark: "#7a3617"
  band-ink: "#f9e6d8"
  cream: "#fbf7f1"
  cream-shade: "#f3ebe0"
  cream-code: "#f1e9dd"
  ink: "#33261e"
  ink-secondary: "#5c4636"
  ink-muted: "#78614f"
  hairline: "#e4d8c9"
  hairline-strong: "#9c8267"
  note-teal: "#1f5e6e"
  note-teal-bg: "#e9f1f2"
  caution-ochre: "#8a5a08"
  caution-ochre-bg: "#f7efdf"
  stop-red: "#9a2318"
  stop-red-bg: "#f9eae6"
  umber: "#201a16"
  umber-shade: "#2a211a"
  umber-code: "#2f251c"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.6
rounded:
  none: "0"
  code: "3px"
  block: "4px"
  pill: "50%"
spacing:
  hair: "0.35rem"
  tight: "0.5rem"
  base: "1rem"
  section: "1.4rem"
  gap: "2.5rem"
  break: "3rem"
components:
  note:
    backgroundColor: "{colors.note-teal-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.block}"
    padding: "0.8rem 1rem"
  note-caution:
    backgroundColor: "{colors.caution-ochre-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.block}"
    padding: "0.8rem 1rem"
  note-stop:
    backgroundColor: "{colors.stop-red-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.block}"
    padding: "0.8rem 1rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.body}"
    padding: "0.22rem 0 0.22rem 0.7rem"
  nav-link-current:
    backgroundColor: "transparent"
    textColor: "{colors.terracotta}"
    padding: "0.22rem 0 0.22rem 0.7rem"
  code-block:
    backgroundColor: "{colors.cream-code}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.block}"
    padding: "0.9rem 1rem"
  step-marker:
    backgroundColor: "{colors.cream-shade}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    size: "1.6rem"
  table-header:
    backgroundColor: "{colors.cream-shade}"
    textColor: "{colors.ink-secondary}"
    padding: "0.5rem 0.8rem"
  capability-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "0.35rem 0 0.35rem 1.4rem"
  copy-button:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.code}"
    padding: "0.4rem 0.55rem"
  copy-button-done:
    backgroundColor: "{colors.cream-shade}"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.code}"
    padding: "0.4rem 0.55rem"
---

# Design System: lamaku-mcp site

## Overview

**Creative North Star: "The Reference Manual"**

This is documentation for someone who will open it four times a year for five years. It is built
to be correct and scanned, not to look current. The bar was set explicitly by MDN, the Django
docs, and the PostgreSQL manual: three sites that have survived a decade of taste cycles by
never participating in one.

The category default for a developer tool is a marketing homepage with a gradient hero, a
feature grid, and a call to action. This system refuses that outright. There is no hero, no
pitch, no logo lockup. The first viewport carries the product name, one sentence saying what it
is, one paragraph saying what it does, and the install command. A reader who came to install
something can start in the first ten seconds.

The palette is Lamakū's own rather than a chosen one. Lamakū's identity is a cream ground, a
terracotta that draws the Hawaiian islands across its banner, warm brown text, and a lit torch.
The site takes those instead of inventing a scheme beside them, because a tool that writes into
Lamakū should look like it belongs there.

The terracotta, `#a9481d`, is the accent: links, the current-section marker, the focus ring, and
the header band. Everything around it is cream, warm brown and a sand hairline. This is a warm
palette that could drift into the cream-and-serif rut, and what keeps it out is that the type is a
system sans and every surface is flat. No serif display, no card shadows, no paper texture.

The site is two pages sharing one stylesheet, and they are deliberately unequal in weight. The
**overview** at `/` opens the way a tool page is supposed to: a one-line tagline, then one
copy-pastable block that installs it. Seven one-line features follow, and that is the whole page.
It runs about 145 words. The documentation lives in the left sidebar, at the top of the page,
because a reader who wants the manual should not have to reach the bottom of the overview to find
it. The **manual** at `/guide/` is where everything else
lives: three columns, dense tables, twelve sections, 1,800 words.

The division between them is not length, it is register. **The overview lists. The manual
explains.** A feature on the overview is one line: what it does, no how and no why. The moment it
needs a paragraph it has stopped being a feature listing and become documentation, and
documentation lives on the other page. This was learned by shipping a FERPA guard card with four
lines of explanation on it, which was documentation wearing a feature's clothes.

Both pages are written for a University of Hawaiʻi instructor, not for a developer. The overview
says *change* rather than *write*, *anonymous label* rather than *HMAC*, *content module* and
*grade item* because those are the words on the Brightspace screen. Product vocabulary that only
an engineer would use belongs in the manual, if anywhere.

**Key Characteristics:**

- Zero webfonts. The system stack renders instantly and cannot rot when a font host changes.
- Light ground by default, with a full dark palette under `prefers-color-scheme`.
- Hairline rules instead of shadows. The system is entirely flat.
- Tables and notes are first-class structure, not decoration.
- WCAG 2.2 AA verified by script, not assumed.

## Colors

A near-neutral palette biased faintly green, so the accent reads as belonging rather than
applied.

### Primary

- **Terracotta** (`#a9481d`): Links, the current-section marker in both nav columns, the focus
  ring, and the skip-link background. 5.4:1 on the cream ground. In dark mode it lifts to
  **Ember** (`#f0a06a`) at 8.1:1 on the umber ground, because the deep terracotta disappears
  there.

### Secondary

The three semantic note colours. They are signal, never decoration, and each pairs a label
colour with its own tinted ground.

- **Note Teal** (`#1f5e6e` on `#e9f1f2`): Something worth knowing before you continue. Teal rather
  than blue, so it sits inside the warm palette instead of on top of it.
- **Caution Ochre** (`#8a5a08` on `#f7efdf`): Something that will surprise you if you skip it.
- **Stop Red** (`#9a2318` on `#f9eae6`): Something that destroys data or affects real students.

Caution ochre and the terracotta accent are neighbours on the wheel, and that is the one real
weakness in this palette. It holds because the accent only ever appears as a link or a marker and
never fills a note, and because every note names its kind in words.

### Neutral

- **Cream** (`#fbf7f1`) and **Umber** (`#201a16`): The two grounds. Both are warm; neither is a
  neutral grey with a hue bolted on afterwards.
- **Cream Shade** (`#f3ebe0`) / **Umber Shade** (`#2a211a`): Table headers, captions, step
  markers, sidebar surfaces.
- **Cream Code** (`#f1e9dd`) / **Umber Code** (`#2f251c`): Code blocks and inline code.
- **Ink** (`#33261e` / `#efe6da`): Body text, 13.7:1 light and 13.9:1 dark.
- **Ink Secondary** (`#5c4636` / `#c3b4a3`): The tagline, table headers, nav links at rest.
- **Ink Muted** (`#78614f` / `#9c8b79`): Section labels, captions, the on-this-page rail.
- **Hairline** (`#e4d8c9` / `#3b2f26`): Every rule, border, and divider on the page.
- **Hairline Strong** (`#9c8267` / `#82705e`): Only the step-marker outline, where a UI boundary
  needs 3:1.

### Named Rules

**The Two Percent Rule.** The terracotta appears on links, the current-section marker, and the
focus ring. It is never a heading colour and never a border on a card. Its rarity is what makes a
link obvious.

**The One Band Exception.** The accent fills exactly one surface: the header band on the overview,
and nowhere else on either page. The band has its own token rather than reusing `--accent`,
because the dark-mode accent is a pale ember and a full band of it would glare; dark mode uses
`#7a3617` instead, which still reads as a band against the umber ground.

**The Verified Contrast Rule.** No colour pair ships on inspection. `contrast.py` checks all
seventeen pairs across both themes against 4.5:1 for text and 3:1 for boundaries. A failing pair
is a bug, not a judgement call. This rule already caught the step-marker outline at 1.9:1.

## Typography

**Display Font:** system-ui (with `-apple-system`, `Segoe UI`, `Roboto`, `Helvetica Neue`, Arial)

**Body Font:** the same stack

**Label/Mono Font:** ui-monospace (with `SFMono-Regular`, `SF Mono`, Menlo, Consolas)

**Character:** One sans for everything, one mono for anything you would type or paste. The
pairing has no personality on purpose. It is the reader's own operating system font, which means
the page looks native on their machine, loads with zero network requests, and will look the same
in 2036.

### Hierarchy

- **Display** (600, 2.125rem, 1.2, -0.01em): The page title. One per page.
- **Headline** (600, 1.5rem, 1.25, -0.005em): Section titles. Each carries a hairline rule above
  it, which is how the page's twelve sections read as separate at a glance.
- **Title** (600, 1.125rem, 1.35): Subsections.
- **Body** (400, 16px, 1.65): Running text, capped at 46rem so lines stay near 75 characters.
- **Label** (600, 0.6875rem, 0.08em, uppercase): Nav group headings only.
- **Mono** (0.8125rem, 1.6): Code blocks, inline code, the masthead product name, definition
  terms for configuration fields.

### Named Rules

**The Typed-Things Rule.** Mono marks anything the reader will type, paste, or see echoed back by
a machine: commands, tool names, environment variables, JSON, file paths. It is never used for
emphasis, and prose never sets a word in mono for flavour.

## Layout

A three-column grid: `17rem` sidebar, `48rem` content, `14rem` on-this-page rail, `2.5rem` gaps,
capped at `100rem` and centred with `justify-content: center` so the trio stays together on a
wide monitor instead of the rail drifting away from the text it indexes. `main` itself caps at
`46rem`.

Both nav columns are sticky at `top: 3.4rem`, under a sticky masthead, and scroll internally when
they exceed the viewport.

At `64rem` the grid collapses to one column. The rail is dropped entirely, since the sidebar
already carries the same twelve links. The sidebar becomes a closed `details` disclosure labelled
Contents, so the content leads on a phone rather than sitting under a full table of contents. The
disclosure ships open in the HTML and is closed by script, so a reader without JavaScript gets
the full list rather than a control that will not open.

Vertical rhythm runs on the type: `1rem` between paragraphs, `1.4rem` after a table or note,
`2rem` before a subsection, `3rem` before a section.

The overview shares that grid in a two-column variant, `.shell.duo`: the same `17rem` sidebar and
a `44rem` track, with no on-this-page rail. Nine sections is a page that needs a rail; four is a
page that does not. Its content column is `35rem`, tighter than the manual's `46rem` because the
manual's tables need room its prose does not.

The sidebar is the same component on both pages, and on the overview it carries the documentation:
Start, Documentation, Project. Nothing breaks the content column, which is most of why the page
reads quickly.

## Elevation & Depth

**There are no shadows anywhere in this system.** Depth is conveyed entirely by a 1px hairline
rule and a faint tonal shift in the ground. A code block is a hairline box on `paper-code`; a
table is a hairline box with a shaded header row; a note is a hairline box with a 4px coloured
left edge on a tinted ground.

This is not minimalism for its own sake. Shadows are the first thing that dates a page, and they
read as physical affordance on a surface where nothing is draggable, dismissible, or floating.

### Named Rules

**The Flat Rule.** No `box-shadow`, no `filter: drop-shadow`, no gradient used to fake a light
source. If something needs to separate from its surroundings, it gets a hairline and a tonal
step.

## Shapes

Radius is nearly absent and strictly functional. `3px` on inline code, `4px` on code blocks,
tables, and notes, so a long box does not look like an accidental full-bleed. `0` on the note's
left edge, where the coloured bar meets the corner square. `50%` on the step marker, the only
circle on the page.

Borders are always exactly 1px, always `hairline`, always solid. The two exceptions state
themselves: the note's 4px left edge, and the current-section marker's 2px left border in the
nav, which is transparent at rest so nothing shifts when it lights up.

## Components

### Masthead links

`ink-muted`, no underline, `1.4rem` apart. They take the accent and an underline on hover and on
focus. Three underlined accent links in the top corner shout at a reader who came for the page,
not the navigation.

### Navigation

Two columns of the same component at two weights. Links are `ink-secondary` at rest with no
underline, `terracotta` and underlined on hover, and `terracotta` with a 2px left border
and 600 weight when current. The rail is one step quieter: `0.8125rem` and `ink-muted`.

The current state is set by an IntersectionObserver with `rootMargin: 0px 0px -75% 0px`, so a
section becomes current once it reaches the top quarter of the viewport. It is progressive
enhancement: without JavaScript every link is still a working anchor.

### Notes

The signature component. A hairline box, a 4px coloured left edge, a tinted ground, and a bold
label in the semantic colour on its own line. Three variants: Note, Caution, Stop. The label text
is what carries the meaning; the colour reinforces it, so nothing is lost to a reader who cannot
distinguish the three.

### Tables

Every table is wrapped in a `.tw` div with `overflow-x: auto`, so a wide table scrolls inside its
own box and the page body never scrolls sideways. Every table carries a `caption` in `ink-muted`,
left-aligned, on the shaded ground, which doubles as the table's title. Header row is `0.75rem`
and 600 on `paper-shade`. Cells are top-aligned.

### Code blocks

`paper-code` ground, hairline border, `4px` radius, `overflow-x: auto`. Comment lines take a `.c`
class in `ink-muted`, which is the entire syntax highlighting vocabulary. There is no highlighter
library and no colour beyond that one dimmed grey.

### Numbered steps

A CSS counter drives a `1.6rem` circle on `paper-shade` with a `hairline-strong` outline. Used
once, for the seven-step course walkthrough, where the reader genuinely has to do things in
order. Numbers appear nowhere else on the page.

### Template previews

Live `<iframe>`s of the generated example pages, not screenshots, so a template change shows in
the manual the next time `node scripts/build-style-examples.mjs` runs. The examples themselves are
produced by the same `wrapHtml` the server calls, which is why it is exported.

No transform on the frame. The page renders at the column's own width, which is a real render at a
real text size rather than a shrunken one. Each frame is `17rem` tall with a gradient fade at the
bottom edge, so a cut-off page reads as continuing rather than as broken.

The `uh` preview is deliberately shown unstyled, because that is what it looks like off Lamakū,
and its caption says so. Its four stylesheet requests will 404 here; that is the demonstration,
not a defect.

### Copy button

Every `pre` gets one, injected by script so a reader without JavaScript never sees a control that
cannot work. Mono at `0.6875rem`, `ink-muted` on the page ground with a hairline border, parked
top-right inside a `5rem` gutter reserved in the block's padding.

Visible at rest rather than on hover: this audience should not have to discover an affordance by
sweeping the mouse, and hover does not exist on a phone at all. It brightens to `ink-secondary`
when the block is hovered, to `terracotta` on its own hover or focus, and holds `Copied` on the
shaded ground for two seconds. The word is the state; the colour only agrees with it. A visually
hidden `aria-live` region announces the same word.

### Icons

**Lucide v1.34.0, ISC licensed.** Path data is vendored verbatim into an inline SVG sprite at the
top of the page and referenced with `<use>`. Nothing is hand-drawn and nothing is an emoji, so
every icon shares one geometry.

Stroke width is set once in the stylesheet at `1.75`, lighter than Lucide's default `2`, because
`2` reads heavy beside a 16px system sans. `fill: none`, round caps and joins,
`stroke: currentColor` so a parent's `color` drives it and dark mode needs no second rule.

`1.25rem`, the size of a line of body text. Always `aria-hidden`, because the text beside an icon is
never a caption for it; the icon is the decoration and the sentence is the content.

The ISC notice rides in a comment above the sprite and, in a form a person can read, in the
footer.

### The product mark

**A torch.** *Lamakū* is the Hawaiian word for torch and Lamakū's own logo is a lit torch, so the
mark is one, in a terracotta rounded square: `1.15rem` in the masthead of both pages, `2.4rem` in
the band, and the same shape as `favicon.svg`.

Lucide has no `torch`. `flashlight` is an electric one and `flame-kindling` reads as a campfire,
so the mark is **composed rather than drawn from nothing**: Lucide's `flame`, scaled to 62% and
set at the top of the 24-unit grid, over a collar and a shaft drawn in the same grammar. Two
straight strokes, round caps, on the same grid.

The detail that makes it work is `vector-effect: non-scaling-stroke` on the flame. Without it the
scaled path draws at 62% of the stroke width and the flame is visibly thinner than the handle it
sits on, which is the tell that reads as wrong before anyone can name it. With it, both draw at
the same width and the torch is one line.

A fully hand-drawn torch was tried first and discarded. It was recognisable and it was worse: a
shape authored beside a sourced set never quite shares its geometry. Borrowing the flame and
adding only what Lucide lacks keeps the geometry and gets the word the product is named for.

Its stroke is `2.5`, heavier than the `1.75` the interface icons carry, because the mark is small
and sits on a filled ground where the lighter weight thins out by 16px. Stroked in `var(--ground)`
on the masthead square and `var(--band)` on the band's cream square, so it inverts correctly in
both themes. Checked at 16, 18, 24, 38, 64 and 128 in both, which is how the shaft length and the
collar width were settled.

### The header band

The overview's header: a full-bleed `--band` surface carrying the mark at `2.4rem`, the `h1` in
cream, and the tagline in `--band-ink`. Its inner width is `63.5rem`, the shell's two tracks plus
their gap, so its left edge lands exactly on the sidebar's.

It stacks to a column below `34rem`. The manual has no band; a reference page does not need a
hero, and the shared masthead is what makes the two pages read as one site.

### The install block

The overview's centrepiece and its only code block. Four lines, in order, that take someone from
nothing to a registered server, with a copy button. It sits directly under the tagline, above
every explanation, because someone who already knows they want it should not have to read past it.

A single line of `ink-muted` beneath carries the prerequisites and the sandbox warning. That line
is the entire safety brief on this page; the rest is in the manual.

### Feature list

Seven lines on the overview, a Lucide icon and one clause each. No bold lead-in, no explanatory
second line, no rules between rows.

The constraint is the component. One line each is not a target, it is the definition: an item that
needs a sentence of explanation is documentation and belongs in the manual. The FERPA guard is a name and a
seven-word consequence here, and a whole section there.

### Browser surfaces

Selection is `terracotta` with cream text. The caret is `terracotta`. Scrollbars take
`rule-strong` on the page ground with a 3px ground-coloured inset, so the thumb reads as a bar
rather than a gutter. These are drawn from the palette like everything else.

### Skip link

Positioned off-canvas at `left: -9999px`, moves to `left: 0` on focus, `terracotta` ground with
white text. First tab stop on the page.

## Do's and Don'ts

### Do:

- **Do** run `contrast.py` before shipping any colour change. Seventeen pairs, both themes, 4.5:1
  and 3:1.
- **Do** define every colour as a token on bare `:root` and redefine only the tokens inside
  `@media (prefers-color-scheme: dark)`. A colour whose only definition lives inside the media
  query renders one theme's text on the other theme's ground.
- **Do** wrap every table in `.tw` and give it a caption.
- **Do** put the semantic meaning in the note's label text, not only in its colour.
- **Do** keep new script as progressive enhancement. Both pages must be fully readable and fully
  navigable with JavaScript off, which is why the copy buttons are built in script rather than
  shipped in the markup.
- **Do** theme the browser's own surfaces: selection, caret, scrollbar, focus ring.
- **Do** render the ʻokina (U+02BB) and kahakō correctly in Lamakū, Hawaiʻi, Mānoa, and JABSOM.
  This is a brand commitment, not a typographic preference.
- **Do** keep the palette anchored to Lamakū's own. If Lamakū's identity changes this follows it,
  rather than drifting on its own.

### Don't:

- **Don't** add a webfont. Not for headings, not for code, not for one accent word. The system
  stack is the reason this page will look the same in ten years.
- **Don't** add a shadow, a gradient, or a glow.
- **Don't** use the terracotta as a heading colour or a card border. Links, current
  marker, focus ring, skip link.
- **Don't** add a hero, a feature grid, a testimonial, or a call-to-action button, on either page.
  The overview's whole argument is that it can be read in thirty seconds.
- **Don't** let the overview grow, and don't push the install block below anything. Every
  addition is a subtraction from how fast the page reads, and the manual is one click away.
- **Don't** put a paragraph on the overview to explain a feature. If it needs explaining, the
  feature line links to the manual and the explanation lives there.
- **Don't** build a card grid. Same-size icon-heading-text cards in a row is a feature wall.
- **Don't** hand-draw an interface icon or reach for an emoji. Take it from Lucide, vendor the
  path data, and let the stylesheet set the weight.
- **Don't** extend the mark without `vector-effect: non-scaling-stroke` on anything scaled. A
  scaled path draws a thinner line, and mismatched weight is what made the first two attempts at
  this mark look wrong.
- **Don't** fill any surface but the header band with the accent.
- **Don't** write a heading as "What it does" or "What it is". Name the thing: Features, How to
  install, Documentation.
- **Don't** put a UH logo, seal, or wordmark on the page. The project is not endorsed by the
  University of Hawaiʻi or D2L. The author works at UH; the project does not speak for it.
- **Don't** let a heading level skip. `h2` to `h4` is a bug; the tool-index group labels are
  `h3.grp` for exactly this reason.
