# Visual Style: Junker Ship Wedding Run

The look of the game: a rust bucket held together by duct tape, with a little bit of spaceship.
Implemented by issue #13. Decision record: [research.md §17](./research.md#17-styling-tokens).

## Principles

- **Jokes go on the tape.** The silliness lives in hand-lettered duct-tape labels and the writing.
  Layout, contrast, and body text stay steady so the game is easy to play when the copy is
  ridiculous.
- **Space means the screen.** The amber-on-black diagnostic screen (symptoms) is the only "space"
  surface, and it stays dark in both themes. No starfields, gradients, or neon glow.
- **Metal, not glass.** Panels are flat plates: 3px corners, 2px borders, optional rivets in the
  corners. No soft shadows or blur. Buttons have a thick bottom edge and press down when clicked.
- **Outcomes say it in words.** `ok`, `warning`, and `danger` always come with a text label
  ("Fixed", "Still broken", "Game over") to meet FR-042. `rust` never signals an outcome.

## Color

Each token has a light value ("hangar lights on") and a dark value ("running dark"). `rust` is the
only accent. `ok` and `danger` are used only for outcomes.

| Token        | Name              | Light     | Dark      | Use                                                              |
| ------------ | ----------------- | --------- | --------- | ---------------------------------------------------------------- |
| `hull`       | Galvanized Hull   | `#d9dcd5` | `#1b1e1a` | Page background                                                  |
| `panel`      | Bulkhead Panel    | `#eef0ea` | `#262a25` | Panels, cards, inputs                                            |
| `panel-edge` | Panel Seam        | `#9ba197` | `#3e443c` | Borders, dividers, diagnostic-screen frame, rivets               |
| `ink`        | Grease Pencil     | `#1f231e` | `#e6e4da` | Body text                                                        |
| `ink-muted`  |                   | `#545b52` | `#a3a89c` | Secondary text, captions                                         |
| `rust`       | Oxidized Orange   | `#a8481f` | `#e07a45` | Buttons, links, current area, trip progress                      |
| `rust-deep`  |                   | `#7c3313` | `#9c4a22` | Button bottom edge                                               |
| `on-rust`    |                   | `#fff8ef` | `#1b1e1a` | Text on `rust` (dark text in dark mode keeps contrast)           |
| `tape`       | Duct Tape         | `#b9bdb8` | `#8e938f` | Tape labels                                                      |
| `tape-ink`   |                   | `#26292a` | `#16181a` | Marker text on tape                                              |
| `warning`    | Hazard Stripe     | `#e2a91b` | `#f0ba2e` | "Still broken" results, busy notices, hazard stripes, focus ring |
| `screen`     | Diagnostic Screen | `#16201c` | `#0e1512` | Symptoms screen and code blocks (dark in both themes)            |
| `phosphor`   | Amber Phosphor    | `#f2b64a` | `#f5bd55` | Text on `screen`                                                 |
| `ok`         | Coolant Green     | `#2f7d4a` | `#6cc388` | "Fixed" outcome                                                  |
| `danger`     | Fire Extinguisher | `#c22a3a` | `#f2606c` | "Game over" outcome, generation errors                           |

## Typography

All four faces are on Google Fonts and load through `next/font/google` in `app/layout.tsx`,
replacing Geist.

| Role     | Face                  | Tailwind       | Use                                                                                                    |
| -------- | --------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| Display  | Bungee                | `font-display` | Headings, area names, buttons. Never body text.                                                        |
| Labels   | Permanent Marker      | `font-marker`  | The uncle's handwriting on tape: "Tried", warnings, jokes. Five words at most, never required to play. |
| Body     | Atkinson Hyperlegible | `font-sans`    | Symptoms outside the screen, results, log, forms. Chosen for readability of long AI text.              |
| Readouts | Share Tech Mono       | `font-mono`    | Diagnostic screen, leg counter, area tabs, small uppercase labels (letter-spacing ~0.08em).            |

Type scale:

| Tailwind    | px  | Used for                           |
| ----------- | --- | ---------------------------------- |
| `text-4xl`  | 40  | Victory / loss headings (display)  |
| `text-2xl`  | 24  | Area names (display)               |
| `text-lg`   | 18  | Symptoms and result text           |
| `text-base` | 16  | Action labels, log entries         |
| `text-sm`   | 14  | Nav tabs, tags, leg counter (mono) |

## Component treatments

| Element                           | Treatment                                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Panel`                           | `bg-panel`, 2px `panel-edge` border, 3px radius, optional corner rivets                                                |
| `Button`                          | `bg-rust text-on-rust font-display`, 4px `rust-deep` bottom border that shrinks to 2px and moves down 2px when pressed |
| Tape label (`OutcomeTag` "Tried") | `bg-tape text-tape-ink font-marker`, ragged ends via `clip-path`, rotated -2° to 1.5°                                  |
| `SymptomsPanel`                   | `bg-screen text-phosphor font-mono`, thick `panel-edge` frame, faint scanlines, inset shadow                           |
| `LatestResult`                    | `bg-hull` plate with an 8px left edge colored by outcome (`warning` / `ok` / `danger`) plus the text label             |
| `AreaNavLink`                     | Mono uppercase tab; current area filled with `rust`                                                                    |
| `GeneratingNotice`                | Button swaps to a `panel-edge` fill with mono text and animated dots ("Consulting the manual…")                        |
| Hazard stripe                     | 45° `warning` / `ink` stripes, 10px tall; dividers and warnings only                                                   |
| Focus ring                        | 3px `warning` outline, 3px offset                                                                                      |

Custom CSS (keyframes for the dots, the tape `clip-path`, rivet and scanline gradients) is allowed
under Constitution III with a comment saying why utilities can't express it. Rotations and the
button press are disabled under `prefers-reduced-motion`.

## `app/globals.css` tokens

Replaces the current create-next-app tokens. The `--font-*` variables on the right come from the
`next/font/google` `variable` options.

```css
@import "tailwindcss";

:root {
  --hull: #d9dcd5;
  --panel: #eef0ea;
  --panel-edge: #9ba197;
  --ink: #1f231e;
  --ink-muted: #545b52;
  --rust: #a8481f;
  --rust-deep: #7c3313;
  --on-rust: #fff8ef;
  --tape: #b9bdb8;
  --tape-ink: #26292a;
  --warning: #e2a91b;
  --screen: #16201c;
  --phosphor: #f2b64a;
  --ok: #2f7d4a;
  --danger: #c22a3a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --hull: #1b1e1a;
    --panel: #262a25;
    --panel-edge: #3e443c;
    --ink: #e6e4da;
    --ink-muted: #a3a89c;
    --rust: #e07a45;
    --rust-deep: #9c4a22;
    --on-rust: #1b1e1a;
    --tape: #8e938f;
    --tape-ink: #16181a;
    --warning: #f0ba2e;
    --screen: #0e1512;
    --phosphor: #f5bd55;
    --ok: #6cc388;
    --danger: #f2606c;
  }
}

@theme inline {
  --color-hull: var(--hull);
  --color-panel: var(--panel);
  --color-panel-edge: var(--panel-edge);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-rust: var(--rust);
  --color-rust-deep: var(--rust-deep);
  --color-on-rust: var(--on-rust);
  --color-tape: var(--tape);
  --color-tape-ink: var(--tape-ink);
  --color-warning: var(--warning);
  --color-screen: var(--screen);
  --color-phosphor: var(--phosphor);
  --color-ok: var(--ok);
  --color-danger: var(--danger);

  --font-display: var(--font-bungee);
  --font-marker: var(--font-permanent-marker);
  --font-sans: var(--font-atkinson);
  --font-mono: var(--font-share-tech-mono);
}

body {
  background: var(--hull);
  color: var(--ink);
  font-family: var(--font-sans);
}
```
