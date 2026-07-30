# Carnot Heat Engine

An interactive simulation of the ideal reversible Carnot cycle, built with
[SceneryStack](https://scenerystack.org/), Vite 8, TypeScript 7, and Biome 2.
Three screens tie the four legs of the cycle to a physical piston-cylinder, to
the energy budget that fixes the efficiency, and to the same apparatus run
backwards as a refrigerator.

## Features

- **Intro** — a piston-cylinder with docking reservoirs and an insulating sleeve, side by side with a live PV diagram, plus a discrete stage stepper that walks the four legs one at a time
- **Efficiency Lab** — energy-flow bars, a ghosted previous-cycle overlay, a toggleable T–S diagram (where a Carnot cycle is a rectangle), an η-vs-T_cold reference inset, and a Measure mode that withholds η until the student computes it
- **Reversed Cycle** — the same cycle counter-clockwise, framed as a refrigerator or a heat pump, with COP in place of η
- Reversible ideal-gas physics with η derived twice — closed form and numerically integrated ∮P dV — and asserted to agree
- English, Spanish, and French localization via `StringManager`, with full screen-reader descriptions
- Default and projector color profiles
- Progressive Web App (installable, offline-capable)
- Shared GitHub Actions CI via `OpenPhysics/Baton`

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run build:single` | Single-file build mode |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (physics + memory-leak suites) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke (`?fuzz`, default 15s) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenPhysics org license](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
