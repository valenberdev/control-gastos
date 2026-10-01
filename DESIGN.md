---
name: Control de Gastos
description: Liquid Glass personal-finance PWA. Translucent panes float over a drifting colour field, with iOS-style blue, green and red semantics.
colors:
  accent: "#0a63e8"
  accent-fill: "#0a5fe0"
  accent-fill-2: "#1470ee"
  accent-dark: "#5ca4ff"
  on-accent: "#ffffff"
  income: "#137a37"
  income-fill: "#2fbf5a"
  income-dark: "#3fdc6d"
  expense: "#c4172a"
  expense-fill: "#ff4a40"
  expense-dark: "#ff6e66"
  bg-base-light: "#e9edf7"
  bg-base-dark: "#05070f"
  text-light: "#15161a"
  text-muted-light: "#565b6e"
  text-dark: "#f4f5fa"
  text-muted-dark: "#a6abc0"
  glass-light: "rgba(255, 255, 255, 0.5)"
  glass-strong-light: "rgba(255, 255, 255, 0.78)"
  glass-border-light: "rgba(255, 255, 255, 0.75)"
  glass-dark: "rgba(255, 255, 255, 0.07)"
  glass-strong-dark: "rgba(255, 255, 255, 0.13)"
  glass-border-dark: "rgba(255, 255, 255, 0.16)"
  hair-light: "rgba(50, 62, 110, 0.12)"
  hair-dark: "rgba(255, 255, 255, 0.1)"
  cat-comida: "#FF6B2C"
  cat-transporte: "#0A84FF"
  cat-entretenimiento: "#A64DE8"
  cat-salud: "#F0366B"
  cat-servicios: "#12A87F"
  cat-otros: "#7A7F93"
  cat-ingreso: "#27B957"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "clamp(2.25rem, fitted to card width, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  pane: "30px"
  sheet: "34px"
  inset: "22px"
  control: "16px"
  squircle: "13px"
  squircle-sm: "12px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  gutter-desktop: "32px"
components:
  glass-pane:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.pane}"
    padding: "20px"
  button-primary:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    height: "54px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.pill}"
    height: "54px"
  add-circle:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.circle}"
    size: "56px"
  dock:
    backgroundColor: "{colors.glass-light}"
    rounded: "{rounded.pill}"
    height: "64px"
  chip:
    backgroundColor: "{colors.glass-strong-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 18px"
  chip-selected:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-accent}"
  field-input:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.control}"
    height: "52px"
    padding: "12px 16px"
  category-squircle:
    textColor: "{colors.on-accent}"
    rounded: "{rounded.squircle}"
    size: "40px"
  balance-inset:
    backgroundColor: "{colors.glass-strong-light}"
    rounded: "{rounded.inset}"
    padding: "14px"
---

# Design System: Control de Gastos

## Overview

**Creative North Star: "Liquid Glass"**

Translucent, refractive panes float over a slowly drifting colour field, so the glass always has something to bend. The user pinned the direction as Apple-like crystal glass: modern, fluid, pleasing to look at. The balance is the hero pane; everything else is a quieter pane of the same material. The system is calm, soft and springy, built for one-handed phone use in Argentina (es-AR, ARS currency).

Depth comes from the material, not from rules or opaque cards: backdrop blur and saturation, a white specular edge, an inner top highlight and a diagonal sheen. Colour has jobs. Blue is the single action colour, green means ingreso, red means gasto, and each category owns one hue shown on a glass squircle. Light and dark are both complete worlds, chosen by `data-theme` before first paint.

The user rejected the earlier Crouwel-grid world; flat opaque cards and hard rules are refused here.

**Key Characteristics:**
- Ambient colour field behind every screen; static on phones, drifting from 900px.
- One glass recipe reused for panes, dock, bell, top bar and sheet.
- Continuous large radii: 30px panes, pills, circles, squircle category icons.
- System SF on Apple devices with Hanken Grotesk fallback; tabular figures; tight tracking on big numbers.
- Springy motion with a distinct lens easing for sliding highlights.
- Full light and dark parity, with solid fallbacks when backdrop-filter is missing.

## Colors

A pale-sky or midnight ground carries four soft orbs; glass whitens or dims it; blue, green and red speak as iOS semantics; category hues are saturated gradient pairs.

### Primary
- **Liquid Blue** (accent-fill #0a5fe0, top stop accent-fill-2 #1470ee): the action fill, a 160deg gradient `#1470ee` to `#0a5fe0` on primary buttons, the add circle and selected chips, always with a white 1px rim and inner top highlight. Active text and icons use accent (#0a63e8 light, #5ca4ff dark) so contrast holds on glass.

### Secondary
- **Income Green** (income #137a37 text, income-fill #2fbf5a for marks and chart; dark text #3fdc6d): ingresos in the ledger, the ingreso pill, the chart's income series.
- **Expense Red** (expense #c4172a text, expense-fill #ff4a40 for marks and chart; dark text #ff6e66): the gasto pill, the chart's expense series, errors. In the ledger, gastos stay in primary text colour with a minus sign (iOS convention); only ingresos turn green.

### Tertiary
- **Category hues** (each a c1 to c2 gradient, c2 listed in tokens): comida orange `#FFA53D` to `#FF6B2C`, transporte sky `#5AC8FA` to `#0A84FF`, entretenimiento violet `#D68CFF` to `#A64DE8`, salud pink `#FF7A9C` to `#F0366B`, servicios mint `#3DDBB0` to `#12A87F`, otros grey `#A6AABB` to `#7A7F93`, ingreso green `#5FE08A` to `#27B957`. Used on the squircle icon, its glow, the donut slice (c2) and the row bar. Unknown categories fall back to otros.

### Neutral
- **Pale Sky** (#e9edf7) and **Midnight** (#05070f): page ground.
- **Orb field** (light: blue 112,160,255 / violet 190,150,255 / peach 255,176,136 / mint 120,228,205 at 0.7 alpha; dark: indigo 56,80,255 / magenta 176,64,220 / ember 255,106,70 / teal 0,190,170 at 0.5 alpha): four radial gradients on two fixed pseudo-elements of the body.
- **Ink** (#15161a / #f4f5fa) and **Muted Ink** (#565b6e / #a6abc0): text.
- **Glass** (white 0.5 / 0.78 strong light; white 0.07 / 0.13 strong dark), **Glass Edge** (white 0.75 light, 0.16 dark), **Hairline** (rgba 50,62,110,0.12 light; white 0.1 dark) for row dividers.
- Control fills: `--fill` (rgba 110,118,150,0.13 light, white 0.09 dark) and `--fill-2` (0.22 / 0.16) for tracks, switches and icon-button hovers.

### Named Rules
**The Semantic Colour Rule.** Blue acts, green is ingreso, red is gasto, category hues identify categories. No colour is borrowed for decoration.
**The Fill-vs-Text Rule.** Bright `*-fill` values are for marks, gradients and charts; text uses the darker `income`, `expense`, `accent` values (lighter in dark mode) so it passes contrast on glass.

## Typography

**Display, Body and Label Font:** the system stack `-apple-system, BlinkMacSystemFont, 'Hanken Grotesk', system-ui, sans-serif` (SF on Apple devices; Hanken Grotesk 400-800 from Google Fonts elsewhere). Mono for code chips: `ui-monospace, 'SF Mono', Menlo`.

**Character:** confident and quiet, heavy weights (650-800) with negative tracking on anything large, in the SF idiom. Money is always tabular.

### Hierarchy
- **Display** (800, fitted `clamp(2.25rem..4.5rem)` on phones, up to 5rem from 900px, line-height 1, -0.035em): the balance figure, sized by container query to its character count, no wrapping.
- **Headline** (800, 34px, 1.05, -0.035em to -0.04em): page titles and auth headings. Sheet title 24px/800.
- **Title** (750, 19px, -0.025em): ledger title; month label 17px/700; module title 15px/650.
- **Body** (600, 16-17px, -0.01 to -0.015em): ledger labels 16.5px, category names 16px, buttons and inputs 17px. Amounts 650-700.
- **Label** (600, 13.5-15.5px): field labels 14px, dates 13.5px muted, segmented 14.5px, nav labels 11.5px/650.
- **Figures**: balance cell amounts `clamp(1.05rem, 6.4cqi, 1.5rem)`/750; donut total 26px/800; amount input 40px/800; link code 40px/800 with 0.14em spacing.

### Named Rules
**The Tabular Rule.** Every currency or numeric figure carries `font-variant-numeric: tabular-nums` (`.fig`) so digits do not jitter during count-up.
**The Tight Tracking Rule.** The larger the type, the tighter the tracking (-0.01em at 16px, -0.04em at 34-40px). Labels at 11-14px stay at 0.

## Layout

Single column on phones, max 540px, 16px gutters, 16px gap between panes. Top padding clears the 60px glass bar plus safe-area; bottom padding clears the 64px dock plus 40px. From 900px: pages are 720px wide with 112px top and 32px side padding; the dashboard becomes a 7fr/5fr grid (max 1120px, 24px gaps) with balance spanning full width, trend and ledger on the left, donut/categories on the right. The balance card turns horizontal (figure left, a 300px column of two inset pills right).

Spacing rhythm is 8 / 12 / 16 / 20 / 24 px; pane padding 20px (balance 24px, 28x32px on desktop); ledger and category rows 10px vertical with a hairline divider and a 40px icon column. Touch targets are at least 44px. Panes enter with a staggered rise (70ms steps).

Breakpoints: 600px (editable ledger rows reflow to two lines under 600), 900px (desktop layout, drifting field, 30px blur, dock moves to the top).

## Elevation & Depth

Depth is optical, not structural: blur, saturation, specular edge, inner highlight, sheen and a soft coloured drop shadow. The background is never flat, so glass always has something to refract.

### Glass pane recipe
- **Backdrop:** `blur(22px) saturate(1.7)` on phones; `blur(30px) saturate(1.8)` from 900px; sheet `blur(44px) saturate(1.9)`; secondary button `blur(24px) saturate(1.6)`; modal backdrop `blur(6px)` over a scrim.
- **Fill:** glass (0.5 white light, 0.07 dark).
- **Edge:** 1px glass-border (the white specular edge).
- **Shadow (light):** `0 1px 1px rgba(30,44,100,.05), 0 12px 32px -8px rgba(40,60,140,.18), 0 28px 64px -28px rgba(40,60,140,.25)`. Dark: `0 1px 1px rgba(0,0,0,.35), 0 16px 44px -10px rgba(0,0,0,.6)`.
- **Inner highlight (light):** `inset 0 1px 0 rgba(255,255,255,.95), inset 0 0 0 1px rgba(255,255,255,.35), inset 0 -14px 28px -16px rgba(255,255,255,.6)`; dark is the same shape at 0.24 / 0.04 / 0.1.
- **Sheen:** a 128deg white gradient on the pane's `::before`, 0.6 alpha at the top-left corner fading to clear by 34%, returning at 0.35x in the lower right (0.14 alpha in dark).
- **Ambient field:** four orbs on `body::before/::after`, static on phones, drifting (34s and 43s alternate, translate+rotate+scale) from 900px. The balance card carries an extra blurred orb that breathes (7s) from 900px.
- **Blue glow** for action fills: `0 10px 24px -6px rgba(10,116,255,.6)` plus inset top highlight `rgba(255,255,255,.55)` and inset bottom shade `rgba(0,40,140,.45)`.

### Fallback
Where `backdrop-filter` is unsupported, glass panes switch to `glass-bg-strong`, and cards go solid: `rgba(255,255,255,.92)` light, `rgba(28,30,44,.94)` dark.

### Named Rules
**The One Recipe Rule.** Panes, dock, bell, top bar and sheet share one glass recipe; only blur radius and fill strength vary by role.
**The Lit-From-Above Rule.** Highlights sit on top and left edges (inner top line, upper-left sheen); shadows fall below, tinted blue-violet in light mode, never grey-black and never hard-offset.

## Shapes

Continuous large radii: panes 30px, sheet 34px (top corners only on phones), inset pills and error blocks 22px, form controls 16px, category squircles 13px (12px small, 36px), app mark 9px at 32px and 20px at 68px. Everything interactive in a row is a pill (999px) or circle (50%): dock, buttons, chips, segmented control, switch, month strip, bell, add button. Borders are always a 1px translucent white edge, never a dark outline. The brand mark is a gradient squircle (blue `#5B9BFF` through `#4A52EA` to violet `#7B3FDA`) with a top gloss and a three-arc ring in mint, gold and pink.

## Components

### Glass pane (card)
Rises in on mount (translateY 22px, scale .97, 0.8s `--ease-out`), staggered. 30px radius, 20px padding, full recipe above. Insets inside a pane (balance cells, link-code) use glass-strong or fill at 22px radius.

### Buttons
- **Primary:** full-width pill, 54px, 17px/650, blue gradient with white rim and glow; hover brightness 1.06; press scales .97 with `--spring`.
- **Secondary:** glass pill with its own blur; same press feel.
- **Link button:** accent text, 44px minimum height, no chrome.
- **Icon button:** 44px circle, transparent, `--fill` on hover, scale .88 on press.

### Floating dock and add button
A pill-shaped glass dock, 64px tall, 12px from screen edges and bottom, three equal items (24px icon over an 11.5px label). A **sliding glass lens** (`::before`, a glass-strong to fill gradient with inner highlight) travels via `translateX(calc(var(--i) * 100%))` over 0.6s `--lens`; the index follows the active item with `:has()`. Active item is accent coloured. On phones the 56px circular blue **add button** docks beside it (the dock shrinks its right edge with a `--spring` transition); from 900px the dock becomes a 380px pill centred at the top and the add button is a 44px circle in the top bar beside the 44px glass bell. Add icon rotates 90deg on hover; the button pops in from scale .4.

### Top bar
Phones: fixed 60px translucent glass bar with the 32px app mark and 20px/750 name, hairline bottom edge. Desktop: transparent, no blur, pointer-events pass through to its children.

### Segmented control
Pill track (`--fill` with inset shadow), 3px padding, 44px segments, 14.5px/650. A glass lens slides under the pressed or active segment (0.55s `--lens`), width `1/n` with n of 2 or 3 detected by `:has()`.

### Chips
44px pills in glass-strong with white edge; selected becomes the blue gradient with white text. Press scales .94 with `--spring`. Used for category pick in the sheet.

### Switch (theme)
iOS switch, 62x38 pill, 30px white thumb that travels 24px with `--spring`. Off is `--fill-2`; on is a warm gold gradient `#ffd466` to `#ffb020` with the thumb icon in `#e8960c`.

### Fields
52px, 16px radius, field-bg fill, 1px hairline, inset hairline shadow; 17px/500 text. Focus: border and 4px halo in accent at 22%, fill lifts to glass-strong. Selects use a custom 14px chevron. Errors: a 14px-radius block tinted expense at 14% with expense text.

### Month strip
A pill glass bar, 56px / 1fr / 56px columns, 44px circular arrows on `--fill`, label 17px/700. Sits below the trend chart.

### Ledger rows
Grid `40px / 1fr / auto`: category squircle, label (16.5px/600) over capitalised muted date (13.5px), amount right (16.5px/700, tabular). Hairline between rows. Gastos use primary text with a minus sign; ingresos use income green. Rows rise in with 40ms stagger. Editable rows add two 44px icon buttons, wrapping to a second line under 600px.

### Category squircle
40px (36px small) rounded square, 155deg `--c1` to `--c2` gradient, white 21px line icon (2px round stroke), glow `0 5px 12px -4px var(--c2)` and inset top highlight. Icons are inline SVG, one per category.

### Donut and category rows
Recharts ring, inner 62 / outer 84, 5 degrees padding between slices, 9px corner radius, no stroke, starts at the top and sweeps clockwise over 1.1s ease-out. Centre: muted "Total gastado" over the 26px figure. Below: category rows (40px squircle, name 16px/600 capitalised, amount 16px/650) each with a 6px pill bar filled by a c1 to c2 gradient that grows from the left (1.1s `--ease-out`, 0.2s delay).

### Trend chart
Recharts area chart, income and expense as smooth areas with `income-fill` and `expense-fill` strokes (#2fbf5a, #ff4a40) over 0.38 / 0.32 alpha to 0 vertical gradient fills; header holds a 10px circular legend and a 210px segmented range control.

### Balance pane
Hero: muted 15px title, the Display figure (count-up), and two inset pills each with a 22px gradient circular mark (green down arrow for ingresos, red up arrow for gastos) and a tabular amount. Count-up runs 700ms with exponential ease-out, **only the first time per session**; later renders show the value directly.

### Bottom sheet (movement modal)
A native `dialog`. Phones: full-width up to 560px, bottom-anchored, 34px top corners, 38x5 grabber, safe-area padding. Desktop: 460px centred card at 34px radius. Heaviest glass (44px blur, strong fill), 6px-blurred scrim, enters 0.7s `--spring` from 60px below at scale .96. Body scroll locks while open. Amount input is 40px/800 tabular.

### Motion tokens
`--ease-out` cubic-bezier(.16, 1, .3, 1) for entrances and growth. `--spring` is a `linear()` curve with about 10% overshoot (peak 1.098) for pops, presses and the thumb; falls back to cubic-bezier(.34, 1.45, .64, 1) where `linear()` is unsupported. `--lens` cubic-bezier(.34, 1.08, .5, 1), about 3% overshoot, for lens travel only. Durations: presses .4-.45s, lens .55-.6s, entrances .7-.8s, hover colour .2-.3s.

### Reduced motion
CSS: all animation and transition durations collapse to 0.001ms, delays to 0, iterations to 1. Count-up skips straight to the final value. Recharts disables `isAnimationActive` on the donut and trend chart when the media query matches at load.

## Do's and Don'ts

### Do:
- **Do** build every elevated surface from the glass recipe: blur + saturate, 1px glass-border, `--glass-shadow`, `--glass-hl`, and the sheen on panes.
- **Do** give any new pane, dock or sheet a solid `glass-bg-strong` fallback in the `@supports not (backdrop-filter)` block.
- **Do** use pill or circle shapes for anything tappable in a row, 30px for panes, 22px for insets.
- **Do** use `--spring` for presses and pops, `--lens` only for travelling highlights, `--ease-out` for entrances.
- **Do** keep blue the only action colour and let category hues live on squircles, donut slices and bars.
- **Do** keep touch targets at 44px minimum and numbers tabular.
- **Do** design light and dark together; add any new glass colour to both token sets.
- **Do** honour reduced motion for any new CSS animation (the global rule covers it) and for any chart library animation (disable it explicitly).

### Don't:
- **Don't** use flat opaque cards, hard rules or dark outlines; separation is by glass edge and hairline only.
- **Don't** colour gasto amounts red in the ledger; red is reserved for the balance pill, chart and errors.
- **Don't** run the field drift or breathing orb on phones; they are desktop-only for performance.
- **Don't** stack more glass blur than the recipe (nesting a blurred pane inside a blurred pane); insets use fill, not backdrop-filter.
- **Don't** use the bright `*-fill` colours for body text.
- **Don't** put the count-up on anything but the first balance load.
