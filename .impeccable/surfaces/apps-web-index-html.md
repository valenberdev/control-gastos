---
version: 1
slug: "apps-web-index-html"
primary_target: "apps/web/index.html"
related_targets: []
---

# Surface brief: Control de Gastos (PWA web, todas las pantallas)

Mode: Operate. Replacement of the visual world (the previous Crouwel grid world is discarded; the user did not like it). Direction PINNED BY THE USER: "similar a las cosas Apple, crystal glass, moderno, animaciones fluidas, lindo a la vista". The pinned direction beats the roll; no concept-seed was run. Behavior, data, copy and routes stay untouched; layout may be reorganized freely.

Audience and job: uso personal y de gente cercana en Argentina, sobre todo en el celular, a una mano. Cargar un movimiento en segundos y entender "cómo voy este mes" de un vistazo. Theme: follows system or the existing toggle; both light and dark fully supported.

## Direction contract

THESIS: Liquid Glass. Translucent, refractive glass panes float over a slowly drifting colour field, so the glass has something to bend; the balance is the hero pane. Refuses flat opaque cards and hard rules.

OWN-WORLD: Ambient colour field, static on phones and slowly drifting from 900px up for performance (light: pale sky with blue, violet, peach and mint orbs; dark: deep midnight with indigo, magenta and teal orbs) under panes with backdrop blur + saturation, a 1px white specular edge, an inner top highlight and a soft offset shadow. Continuous large radii (28px panes, pills, circles). System SF typography on Apple devices with Hanken Grotesk as fallback, tabular numerals, tight tracking on big figures. iOS semantic colours: blue accent, green for ingresos, red for gastos in the balance pills and chart (in the ledger gastos stay in primary text with a minus sign and ingresos are green, as iOS does), one colour per category with a glass squircle icon. Floating pill tab bar with a sliding glass lens, circular add button beside it, bottom-sheet modal.

STORY: The visitor reads the month's balance in one calm glass card, sees what came in and went out as two small inset pills, scans a spending ring with category colours, and finds the add button in the same dock as the tab bar. Everything responds with springy, fluid motion.

FIRST VIEWPORT (mobile 390): translucent top bar with app icon and name plus the bell; the balance glass card with a large count-up figure and two inset pills (ingresos, gastos); the trend card with a smooth area chart and an iOS segmented control; the floating pill tab bar at the bottom with the circular blue add button on its right.

FORM: User-pinned Apple Liquid Glass (not from the roll; no seed key). Month strip stays below the trend chart (user-approved earlier).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints
Do not edit logic, handlers, API calls, routes, state, or visible copy. Do not touch apps/web/src/api/client.ts or apps/web/vercel.json. Keep semantics, labels, aria attributes, dialog behavior. Respect prefers-reduced-motion. Provide solid fallbacks where backdrop-filter is unsupported. Icons (PWA, favicon, apple-touch, push badge, header mark) are regenerated from one SVG source.
