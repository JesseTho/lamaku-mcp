# The `jabsom` style — John A. Burns School of Medicine

For courses authored by or for JABSOM. Derived from the **JABSOM Design System**, a Claude
Design project (`fa47af3f-232b-4a44-a336-7f61e227c21f`) that follows the UH Mānoa Brand Style
Guide and JABSOM Brand Guidelines v1.0.

This file covers markup. Pass `template: "jabsom"` to `create_content_page` or
`update_content_page` and the tokens, reading column and footer below are applied for you.

## What the style does

Passing `template: "jabsom"` inlines the token subset a content page needs and wraps the page in a
Mānoa Green rule, a 68ch reading column, and a school footer.

**Tokens are inlined, not linked.** A Brightspace or Moodle content page cannot reach
claude.ai, and the UH shared HTML Template Library does not carry the JABSOM system. The only
external request is Google Fonts, and both faces are the authentic brand typefaces rather than
substitutes. If the font request is blocked, the page falls back to `system-ui` and Georgia
and stays entirely readable.

## The palette, and why it is greens

JABSOM is a unit of UH Mānoa and uses the Mānoa palette. Mānoa Green is primary; Kelly Green
is secondary and does the work of an accent.

| Token | Value | Role |
|---|---|---|
| `--manoa-green` | `#024731` | Headings, the top rule, the footer border. PANTONE 3435C. |
| `--kelly-green` | `#009A44` | Focus rings, blockquote rule. PANTONE 347C. |
| `--ink` | `#1B2A23` | Body text. A green-biased near-black, not a pure one. |
| `--green-50` | `#F1F8F4` | Callout ground. |
| `--neutral-200` | `#DEE5E0` | Rules between sections. |

The neutral scale is deliberately green-tinted rather than pure grey, which is what keeps a
page reading as *this* school's rather than as generic academic material.

The tertiary accents — red `#AA0000`, orange `#AE5E00`, blue `#242551`, purple `#542977` —
exist in the full system and are marked **use sparingly**. A course page has no reason to
reach for them except status: `--accent-orange` for a caution, `--accent-red` for a real
danger. Never as decoration.

## Type

Two faces, both free Google Fonts and both authentic to the brand.

- **Inter** carries headings and anything tabular. Semibold, tight tracking on display sizes.
- **Source Serif 4** carries body text. The UH brand system specifies serif for web long-form,
  and a course page is long-form. This is the one place the JABSOM style differs most visibly
  from the `uh` style, and it is the right difference: sustained reading is easier in the
  serif.

`h2` is the page title, because `h1` belongs to the LMS chrome. Start sections at `h3` and
descend without skipping.

## Components available on a page

The style ships the element defaults; you write plain semantic HTML and it lands correctly.

**A callout** is a `<blockquote>` — green ground, Kelly Green rule. One per page at most.

**A table** wants `<div class="table-wrap">` around it so a wide table scrolls instead of
breaking the page, plus a `<caption>` and `scope="col"` on headers.

```html
<div class="table-wrap">
<table>
  <caption>What each term means</caption>
  <thead><tr><th scope="col">Term</th><th scope="col">Definition</th></tr></thead>
  <tbody><tr><td>Never-skilling</td><td>Never building the skill at all.</td></tr></tbody>
</table>
</div>
```

**Video** is a plain `<iframe>` with a `title`. The style caps it to the content width. Always
give the direct link as well, so a blocked embed does not leave the learner with nothing.

## Assets

The design system carries the JABSOM seal and wordmark in several treatments, plus four
Hawaiian plant motifs — ʻawa, kukui, lehua, and pōpolo — in green and white. They are not
inlined here, because a content page that pulls images from a design-system project would
break the moment the project moved.

If a course wants them, download from the project and ship them in the cartridge with
`@file`, with real alt text. The plants are decorative in most contexts and take `alt=""`;
the seal and wordmark are institutional identification and take a description.

## Accessibility

Everything in [`course-style.md`](course-style.md) applies, and two points matter here:

- **ʻŌlelo Hawaiʻi renders correctly or the page is wrong.** ʻOkina (ʻ, U+02BB) and kahakō
  (ā ē ī ō ū) must survive into the page. Write the character; never an apostrophe standing in
  for an ʻokina. The footer this style emits contains both, and it is a useful canary.
- **Green carries meaning in this palette**, so never let it carry meaning *alone*. Pair it
  with a label or a number.

Target WCAG 2.2 AA. Mānoa Green on white is well past AA for body and large text alike.

## Which style for which course

| Destination | Style |
|---|---|
| A JABSOM course, anywhere | `jabsom` |
| A UH course outside JABSOM, on Lamakū | `uh` |
| Anywhere else | `plain` |

`jabsom` is self-contained, so unlike `uh` it is safe to ship off-instance — the page looks
the same in Moodle, Canvas, or a browser opening the file directly.
