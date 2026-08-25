---
name: lamaku-mcp site
description: The overview and the reference manual for an MCP server that authors Brightspace courses.
colors:
  manoa-green: "#024731"
  manoa-green-hover: "#0a6a49"
  manoa-green-dark: "#7fc9a5"
  paper: "#ffffff"
  paper-shade: "#f6f7f6"
  paper-code: "#f2f4f2"
  ink: "#1a1c1a"
  ink-secondary: "#414742"
  ink-muted: "#646b65"
  hairline: "#d9ddd9"
  hairline-strong: "#868d87"
  note-blue: "#0a5c7a"
  note-blue-bg: "#eef5f8"
  caution-amber: "#8a4b04"
  caution-amber-bg: "#fbf2e7"
  stop-red: "#8c1d18"
  stop-red-bg: "#fbeceb"
  slate: "#16181a"
  slate-shade: "#1d2022"
  slate-code: "#212528"
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
    backgroundColor: "{colors.note-blue-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.block}"
    padding: "0.8rem 1rem"
  note-caution:
    backgroundColor: "{colors.caution-amber-bg}"
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
    textColor: "{colors.manoa-green}"
    padding: "0.22rem 0 0.22rem 0.7rem"
  code-block:
    backgroundColor: "{colors.paper-code}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.block}"
    padding: "0.9rem 1rem"
  step-marker:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    size: "1.6rem"
  table-header:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.ink-secondary}"
    padding: "0.5rem 0.8rem"
  capability-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "0.35rem 0 0.35rem 1.4rem"
  copy-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.code}"
    padding: "0.4rem 0.55rem"
  copy-button-done:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.manoa-green}"
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

The one place expression is spent is the accent: Mānoa Green, `#024731`, the University of
Hawaiʻi's own dark green, used for links, the current-section marker, and the focus ring, and
nowhere else. It carries maybe two percent of the page's area. Everything around it is white,
near-black, and hairline grey, because the accent only reads as a choice when nothing competes
with it.

The site is two pages sharing one stylesheet, and they are deliberately unequal in weight. The
**overview** at `/` opens the way a tool page is supposed to: a one-line tagline, then one
copy-pastable block that installs it. Seven one-line features and a list of links follow, and that
is the whole page. It runs about 156 words. The **manual** at `/guide/` is where everything else
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

- **Mānoa Green** (`#024731`): Links, the current-section marker in both nav columns, the focus
  ring, and the skip-link background. 12.9:1 on white. In dark mode it lifts to **Sea Foam**
  (`#7fc9a5`) at 8.4:1 on the slate ground, because the dark green disappears there.

### Secondary

The three semantic note colours. They are signal, never decoration, and each pairs a label
colour with its own tinted ground.

- **Note Blue** (`#0a5c7a` on `#eef5f8`): Something worth knowing before you continue.
- **Caution Amber** (`#8a4b04` on `#fbf2e7`): Something that will surprise you if you skip it.
- **Stop Red** (`#8c1d18` on `#fbeceb`): Something that destroys data or affects real students.

### Neutral

- **Paper** (`#ffffff`) and **Slate** (`#16181a`): The two grounds.
- **Paper Shade** (`#f6f7f6`) / **Slate Shade** (`#1d2022`): Table headers, captions, step
  markers, sidebar surfaces.
- **Paper Code** (`#f2f4f2`) / **Slate Code** (`#212528`): Code blocks and inline code.
- **Ink** (`#1a1c1a` / `#e6e9e7`): Body text, 17.1:1 light and 14.6:1 dark.
- **Ink Secondary** (`#414742` / `#b3bab5`): The tagline, table headers, nav links at rest.
- **Ink Muted** (`#646b65` / `#8b938d`): Section labels, captions, the on-this-page rail.
- **Hairline** (`#d9ddd9` / `#31363a`): Every rule, border, and divider on the page.
- **Hairline Strong** (`#868d87` / `#68716b`): Only the step-marker outline, where a UI boundary
  needs 3:1.

### Named Rules

**The Two Percent Rule.** Mānoa Green appears on links, the current-section marker, and the
focus ring. It is never a background, never a heading colour, never a border on a card. Its
rarity is what makes a link obvious.

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

The overview uses none of that grid. It is one centred column at `38rem`, which measures about 70
characters, and it has no sticky nav on either side because there is nothing to navigate. The
manual's wider `46rem` is deliberate and not drift: its tables need the room, and its prose is
read in fragments rather than start to finish.

Nothing breaks that column. The overview is one measure from the masthead to the footer, which is
most of why it reads quickly.

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
underline, `manoa-green` and underlined on hover, and `manoa-green` with a 2px green left border
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

### Copy button

Every `pre` gets one, injected by script so a reader without JavaScript never sees a control that
cannot work. Mono at `0.6875rem`, `ink-muted` on the page ground with a hairline border, parked
top-right inside a `5rem` gutter reserved in the block's padding.

Visible at rest rather than on hover: this audience should not have to discover an affordance by
sweeping the mouse, and hover does not exist on a phone at all. It brightens to `ink-secondary`
when the block is hovered, to `manoa-green` on its own hover or focus, and holds `Copied` on the
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

A `1.15rem` Mānoa Green rounded square with three rules in it, sitting before the wordmark in the
masthead on both pages, and the same shape as `favicon.svg`. The rules are stroked in
`var(--ground)` rather than white, so the mark inverts correctly in dark mode instead of glaring.

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

Selection is `manoa-green` with white text. The caret is `manoa-green`. Scrollbars take
`rule-strong` on the page ground with a 3px ground-coloured inset, so the thumb reads as a bar
rather than a gutter. These are drawn from the palette like everything else.

### Skip link

Positioned off-canvas at `left: -9999px`, moves to `left: 0` on focus, `manoa-green` ground with
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

### Don't:

- **Don't** add a webfont. Not for headings, not for code, not for one accent word. The system
  stack is the reason this page will look the same in ten years.
- **Don't** add a shadow, a gradient, or a glow.
- **Don't** use Mānoa Green as a background, a heading colour, or a card border. Links, current
  marker, focus ring, skip link.
- **Don't** add a hero, a feature grid, a testimonial, or a call-to-action button, on either page.
  The overview's whole argument is that it can be read in thirty seconds.
- **Don't** let the overview grow, and don't push the install block below anything. Every
  addition is a subtraction from how fast the page reads, and the manual is one click away.
- **Don't** put a paragraph on the overview to explain a feature. If it needs explaining, the
  feature line links to the manual and the explanation lives there.
- **Don't** build a card grid. Same-size icon-heading-text cards in a row is a feature wall.
- **Don't** hand-draw an icon or reach for an emoji. Take it from Lucide, vendor the path data,
  and let the stylesheet set the weight.
- **Don't** write a heading as "What it does" or "What it is". Name the thing: Features, How to
  install, Documentation.
- **Don't** put a UH logo, seal, or wordmark on the page. The project is not endorsed by the
  University of Hawaiʻi or D2L. The author works at UH; the project does not speak for it.
- **Don't** let a heading level skip. `h2` to `h4` is a bug; the tool-index group labels are
  `h3.grp` for exactly this reason.
