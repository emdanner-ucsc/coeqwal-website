# In-Depth Data Viewer — Handoff

A guide for the developer reviewing and finalizing the in-depth data viewer ("Data In-Depth"),
the raw-model-output explorer in the COEQWAL website. The component hierarchy is in `README.md`
(this folder). The build log, punch-list, and prototype→port file map are maintained in a
separate working repo (`coeqwal-prototypes`, `data-in-depth/`) — `NOTES.md`, `OPEN_ITEMS.md`,
`in-depth-viewer-interface-options.md`, `port-to-website-mapping.md`. Eric can share those on
request; this note distills what you need to review and run the code.

## What this is

COEQWAL presents CalSim 3 water-allocation results along two pathways: a **tiers** view
(qualitative outcome bins) and a **raw model output** view. This viewer is the raw-output
pathway — it lets a user pick water-outcome variables (reservoir storage, river flows, Delta
outflow, deliveries, X2, etc.), pick scenarios, and compare distributions, monthly patterns,
and time series across them.

It began life as a standalone single-file sketch (synthetic data, kept frozen as a design
reference) and has been ported into this codebase. **The port is the thing that ships.** It was
built collaboratively (Eric + Claude) and is now ready for an experienced React developer to
review, harden, and merge — you're finalizing it, not starting from a blank sheet.

## Where it lives

- **Repo:** this fork (`emdanner-ucsc/coeqwal-website`, fork of `berkeley-gif/coeqwal-website`)
- **Branch:** `feat/data-in-depth-port-option-a-step1`
- **Base branch:** `dev`
- **Code root:** `apps/main/app/features/scenarioExplorer/explorer/tools/panels/dataInDepth/`
  - `DataExplorerView.tsx` — the top-level component; start here
  - `config/inDepthVariables.ts` — the variable catalog (units, plain/tech copy, view kinds)
  - `components/`, `hooks/`, `utils/`, `synthetic/` — charts, data hooks, export helpers,
    and the synthetic fallback engine
- **Committed data:** `apps/main/public/data-in-depth/calsim/` — per-scenario CalSim sidecars
  (small JSON, served statically)

It's a **Turborepo / pnpm monorepo** (Next.js 15, React 19). The viewer is in the `main` app.

## Running it locally

```text
# Node 22 (see .nvmrc), pnpm 10 via corepack
corepack enable
git checkout feat/data-in-depth-port-option-a-step1
pnpm install
pnpm dev:main          # runs the "main" app on http://localhost:3000
```

Then open `http://localhost:3000/?tab=explore`, and in the Explore tab open the data
("In-Depth") tool.

Verify with `tsc --noEmit` (kept clean throughout) and **plain** `next lint`. Note: the
repo's `lint` script is `next lint --max-warnings 0`, which fails on **pre-existing**
`react/prop-types` warnings unrelated to this work (the props are already typed; the rule is
only disabled in `packages/viz`, not in `main`). Use `tsc --noEmit` + plain `next lint`
to gauge this branch.

## Real vs. synthetic data — read this first

The viewer is wired through a **synthetic → file → live** data seam, and what's real today
is deliberately limited. Honoring these seams is the single most important thing in the
handoff. Anything not listed as real renders a labelled "synthetic stand-in":

**Real (from committed CalSim sidecars, Historical hydroclimate only):**
- Reservoir storage (April / September annual)
- Net Delta Outflow (NDO) — annual and monthly
- River flows (`riv_flow`) — annual; monthly stays synthetic (sidecar is annual only)

**Synthetic stand-in (labelled as such in the UI and in CSV exports):**
- All non-Historical hydroclimates (no variant sidecars extracted yet)
- Reservoir **monthly/time-series** storage views (driven by a seasonal shape)
- Deliveries, X2, ag/CWS, station EC, total exports — not yet column-mapped (see below)

Scenario- and climate-level API paths (`useScenarioList`, `useBatchStatistics`, `useTiers`)
were verified by typecheck/review only — they were built in a sandbox that can't reach the
live API. **Please confirm them against the running app.**

## The interface decision (settled — context for your review)

The big design question — how this tool's scenario/climate selection relates to the site's
shared global selection — is settled as **Option B: shared selection + own controls**. On
open, the viewer *seeds* its working set and active climate from the global selection (so the
user's journey continues), but it keeps its **own** controls for deeper exploration: its own
add/remove working set, an always-pinned "Current operations" baseline, hold-one-vary-another
compare modes, a per-variable location pin, and its own multi-climate compare. Full reasoning
and the rejected alternatives are in the `in-depth-viewer-interface-options.md` working doc.

## What's left (punch-list, summarized)

1. **In-app verification** of the recent UI work (auto-summary sentence, the three explainer
   expanders, y-axis titles, "Outcome sectors" rail header, reservoir monthly/series wording).
   The sandbox couldn't reach the live API to check these.
2. **Build out Option B** — seed working set + active climate from the global selection, add
   the "showing a custom set · reset to match selection" drift affordance. Recommended
   sub-decision defaults are in the working punch-list.
3. **Make real data follow the chosen hydroclimate** — resolve each scenario to its
   per-hydroclimate variant short_code in `applyFileSeries`/`applyFileMonthly`. Coverage will
   be partial until non-historical variant sidecars are extracted.
4. **Reservoir monthly storage sidecar** — extract a `monthly` block for `S_*` storage columns
   to make the reservoir monthly/series views real (take month-end storage directly; do NOT
   apply the CFS→TAF reduction used for flows).
5. **Blocked on Eric (domain mapping):** the extractor column conventions for deliveries
   (`DEL_CVP_*` / `DEL_SWP_*` sums), the published X2 position column, and the ag/CWS
   demand-unit → group mapping. These can't be guessed — they need Eric's input.
6. **Parked until tiers land in the API (~early August):** tier badges on legend members and
   the tier-grouped scenario picker. Building these on synthetic tiers now would be rework.

## Gotchas worth knowing

- **`explorer/store.ts` is a shim** that shadows `store/index.ts` for `../store` imports —
  any new store export must be added in **both** places.
- **Sidecars** under `public/data-in-depth/calsim/` are small and committed. Whether they stay
  committed or become deploy-time build artifacts once all scenarios/variables are extracted is
  an open question (no preference yet).
- **Never commit `CalSim_data/`** — the raw CSVs are gitignored (~280 MB each).
- The extractor that produces the sidecars is `tools/extract_calsim_sidecar.py`; the variable
  → column map lives in its `SPEC`.
