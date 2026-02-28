# IFS Vision

High-precision capital efficiency terminal. Part of the Digital Twin Studio ecosystem.

**v3.9.5** · [Live Demo](https://ifs-vision-final.vercel.app) · [mikolaysemyonov-code](https://github.com/mikolaysemyonov-code)

---

## Overview

Financial engine for property vs. deposit comparison with zero-float precision. All monetary calculations use integer math (base units: cents/kopeks). Single entry-point equity comparison (Zero-Point Sync), indexed rent, and explicit CB rate phases yield reproducible results over 10–20 year horizons.

## Engineering Core

**Integer Math** — Annuity, tax deductions, ROI, and rent comparison run in a pure-function layer. Amounts are computed in kopeks and rounded at each step; output is converted to display units. No floating-point in the calculation pipeline.

**Logic Decoupling** — Business logic lives in `useWidgetLogic`. The main UI is layout-only: one hook call and JSX. State, derived data, and side effects are fully encapsulated in the hook.

**Performance** — React 19 Compiler; Zustand with `useShallow` selectors to limit re-renders. Heavy work in a single hook and service layer. Chart updates and Framer Motion target 60–120 FPS; animations are decoupled from recalculation.

**Zero-Point Sync** — Property and deposit series start from the same equity. Remaining cash after down payment is included in the property scenario and decreases with mortgage payments. Chart delta is the difference between the two series.

**Inflation Inflection** — Proprietary logic detects the month where indexed rent outpaces deposit yield; optional warning in the UI.

## Tech Stack

- React 19
- Next.js 15 (App Router, Turbopack)
- TypeScript
- Zustand (`useShallow`)
- Tailwind CSS
- Framer Motion, Recharts

## Infrastructure

- Vercel (Edge where applicable)
- White Label: branding via URL params (`?partner=`, `?accentColor=`, `?companyName=`, etc.) and admin-stored config
- Optional: Telegram lead capture (`BOT_TOKEN`, `CHAT_ID`), JPG/PDF report generation

## Visual Overview

| Screenshot | Description |
|------------|-------------|
| [01-strategy-selection](.github/assets/screenshots/01-strategy-selection.png) | Strategy and mortgage parameters |
| [02-inflection-point](.github/assets/screenshots/02-inflection-point.png) | Net equity; inflation inflection |
| [03-ai-insights-report](.github/assets/screenshots/03-ai-insights-report.png) | ROI, deposit peaks, verdicts |
| [04-investor-deck-report](.github/assets/screenshots/04-investor-deck-report.png) | JPG report with White Label |

## Licensing

Commercial use only. Contact for integration.
