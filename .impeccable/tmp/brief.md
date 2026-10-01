# Surface brief: Control de Gastos (PWA web, todas las pantallas)

Mode: Operate. Redesign of the visual world only; behavior, data, copy and routes stay untouched. Layout may be reorganized freely with the same data and actions.

Audience and job: uso personal y de gente cercana en Argentina, sobre todo en el celular, a una mano, a la luz del día. Cargar un movimiento en segundos y entender "cómo voy este mes" de un vistazo. Light is the default scene (street, daylight); dark follows the system or the existing toggle and must stay fully supported.

## Direction contract

THESIS: Cifras monumentales construidas celda por celda sobre una grilla visible, al estilo de Wim Crouwel (chosen challenger crouwel-grid-specimen). The balance is the poster; everything else is a ruled module on the same grid. Refuses the rounded glass-card fintech arrangement.

OWN-WORLD: Grid paper ground with fine blue hairlines (light: white sheet, Crouwel blue #0057FF, ink #111; dark: deep ink-blue ground, same grid in faint blue, lifted blue). One signal vermilion for gastos and errors only. Zero radius, 1px ruled modules with a thicker top rule, one diagonal slash as the only ornament. Display and numerals in a squared grid-built face (Tektur), prose in a neutral grotesk (Hanken Grotesk). Active nav is a skewed blue parallelogram. Bars are made of grid cells, never smooth.

STORY: In one glance the visitor reads the month's balance in giant figures, sees what came in versus what went out, and finds the add button. Amounts line up in right-aligned tabular columns like a ledger.

FIRST VIEWPORT (mobile 390): top bar with wordmark GASTOS plus slash and the bell; the saldo as a monumental grid-built figure filling the width with the diagonal slash crossing its corner; below it two cells, ingresos (blue, +) and gastos (vermilion, −); then the month strip; add button is a solid blue square at the bottom right above the nav; bottom nav is a ruled three-cell bar with a skewed active cell.

FORM: Crouwel grid specimen, ranked 3rd of my own challenger hand on the second roll (user re-rolled once, then chose this competitive challenger). Seed key 742a6667.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints
Do not edit logic, handlers, API calls, routes, state, or visible copy. Do not touch apps/web/src/api/client.ts. Keep semantics, labels, aria attributes, dialog behavior. Fonts self-limited to Google Fonts. No images are generated; no rasters ship.

## Open
- Expense color is vermilion; income is blue.
