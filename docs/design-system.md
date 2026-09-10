# GiantPay Frontend — Design System

## Brand asset status

The official GiantPlus/GiantPay logo (`src/assets/brand/giantpay-logo.jpg`)
is in place, supplied by the product owner as a full lockup (icon +
"GiantPay" + "Global Finance Solutions" tagline) on its own light backing.
A single `Logo` component (`src/components/navigation/Logo.tsx`) is the only
place it's referenced — every header, sidebar and checkout usage goes
through it. The asset is used as supplied (no redraw/recolor/crop), aspect
ratio preserved, `alt="GiantPay"`.

Two known gaps, tracked in `HANDOVER.md`:

- **No standalone icon-only mark.** The collapsed-sidebar "mark" slot and
  the browser favicon still use the typographic "G" placeholder, since
  isolating just the icon from the supplied lockup would mean cropping the
  source file — not allowed under the "don't crop/redraw" constraint. A
  proper icon-only export (square, ideally transparent background) is
  needed to replace both.
- **Opaque light background on the source file.** Placed directly on the
  dark navy sidebar this would be a "visually conflicting background" (also
  disallowed) — `Logo` handles this by giving the image a small white
  backing plate when `inverted` is set, rather than altering the asset
  itself. A transparent-background export would remove the need for that.

## Tokens

All tokens are CSS variables defined once in `src/app/theme/tokens.css` and
consumed through Tailwind v4's `@theme` directive (no arbitrary hex values in
components). Light theme only, per spec; dark theme is not implemented (an
incomplete dark theme is explicitly disallowed).

### Color

`--color-blue-*`, `--color-red-*` and `--color-gold-*` are not invented —
they're pixel-sampled averages taken directly from the logo file
(`src/assets/brand/giantpay-logo.jpg`): blue from the "G"/"Giant" glyphs,
red from the "P"/"Pay" glyphs and arrow, gold from the swoosh. The product's
interactive color is therefore an exact match to the mark, not a
approximation of it.

| Token | Role |
|---|---|
| `--color-navy-*` (950–50) | Foundation: app chrome, headers, sidebar, high-emphasis text. Same ~216° hue family as the logo's blue, just darker/desaturated — this was already correct before the real logo arrived and didn't need changing. |
| `--color-blue-*` (700–50) | Primary interactive — sampled from the logo's blue (`#054092` at 600, the base/button/focus-ring/active-nav shade). Was a placeholder teal before the real logo was supplied; renamed and recolored to match it (previously `--color-teal-*`; `Badge`'s `teal` variant and `StatusBadge`'s `'teal'` status variant were renamed to `blue` to match). |
| `--color-red-*` | Brand red — sampled from the logo (`#cb102b` at 600). Reserved for destructive actions/errors and controlled brand accents; never the primary CTA color. |
| `--color-amber-*` | Warning — semantic only, deliberately not a brand color |
| `--color-green-*` | Success — semantic only, deliberately not a brand color, AA contrast |
| `--color-gold-500` | Brand gold — sampled from the logo's swoosh (`#cda744`). Sparing highlight only, never large surfaces or body text. Not yet used anywhere in the UI (previously `--color-yellow-*`; renamed since "yellow" no longer described the sampled value). |
| `--color-neutral-*` | Surfaces, borders, secondary text |

### Typography

- Font: Inter (system-ui fallback stack) — chosen for legible tabular
  numerals.
- `.font-tabular-nums` / `font-variant-numeric: tabular-nums` applied to all
  money, reference and table-numeric cells via the `AmountDisplay` and
  `DataTable` components, so figures align in columns.
- Type scale tokens: `--text-display`, `--text-h1`..`--text-h4`,
  `--text-body`, `--text-label`, `--text-help`, each with paired line-height.
  Semantic structure (page title vs. section title vs. field label) is
  always paired with a heading level or `aria-label`, never conveyed by size
  alone.

### Spacing, radius, shadow, motion

- 4px spacing scale.
- Radius tokens: `--radius-sm` (4px, inputs/badges), `--radius-md` (8px,
  cards), `--radius-lg` (12px, modals) — deliberately restrained, no
  pill-everything aesthetic.
- Shadow tokens: two levels only (`--shadow-card`, `--shadow-popover`).
- Motion: `--duration-fast` 120ms / `--duration-base` 200ms, both wrapped in
  a `prefers-reduced-motion` media query that collapses to 0ms. Financial
  totals never animate through intermediate values — they render final.

## Component inventory (this phase)

Built in `src/components/`, Radix-primitive-backed where interaction
complexity warrants it (Dialog, DropdownMenu, Tabs, Tooltip, Select,
Checkbox, Switch, RadioGroup, Popover):

`Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`,
`RadioGroup`, `Switch`, `CurrencyInput`, `PhoneInput`, `FileUpload`,
`FormField`, `SearchInput`, `FilterBar`, `Dialog`, `ConfirmationDialog`,
`Drawer`, `DropdownMenu`, `Tabs`, `Breadcrumbs`, `Tooltip`, `Popover`,
`Badge`, `StatusBadge`, `Card`, `StatCard`, `DataTable`, `MobileDataList`,
`Pagination`, `Timeline`, `ChartContainer`, `AmountDisplay`, `CopyButton`,
`Toast`, `Alert`, `Banner`, `Skeleton`, `EmptyState`, `ErrorState`,
`PermissionDenied`, `PageHeader`, `DateRangePicker`.

Every component: typed public props, visible focus state, disabled/loading
variants, keyboard support, and (for the higher-value/most-reused ones —
Button, StatusBadge, DataTable, AmountDisplay, CurrencyInput, FormField,
ConfirmationDialog) a Vitest + RTL test.

## Explicitly avoided

Gradients/glass effects, neon colors, cartoon illustration, decorative 3D,
deep card nesting, oversized radii, emoji-as-icon, motion without functional
purpose, red as a primary CTA color.
