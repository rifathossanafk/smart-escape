# Smart Escape — Interactive Evacuation Route Simulator

AI DevFest Mock Test submission. A frontend-only web app that displays a building
map, computes the lowest-cost evacuation route to an open exit, and instantly
re-routes when simulated hazards (blocked rooms/junctions, blocked corridors,
closed exits) change.

> Educational simulation — not a certified real-world evacuation planning tool.

## Identity

- **Name:** <!-- YOUR FULL NAME -->
- **Registration number:** <!-- YOUR REGISTRATION NUMBER -->
- **Live site:** <!-- PUBLIC HTTPS URL (Vercel / Netlify / GitHub Pages / Cloudflare Pages) -->
- **Final commit:** <!-- first 7 chars of the final commit hash -->

## Running locally

```bash
npm install
npm run dev      # development server
npm run build    # production build -> dist/
npm run preview  # serve the production build
```

No backend, no external APIs — routing runs entirely in the browser.

## Using the app

1. Import a `building.json` file (or click **Load sample data**).
2. In **Navigate** mode, click a room/junction on the map (or a button under
   *Start location*) to set the start.
3. The lowest-cost route to an accessible exit is highlighted, with the node
   sequence, exit and total cost.
4. In **Edit hazards** mode (or via the side-panel lists), block/unblock rooms,
   junctions and corridors, and close/reopen exits. The route recalculates
   immediately. **Reset hazards** restores the file's original `initial_state`.
5. Toggle English / বাংলা from the header.

## Implemented features

- JSON import with full schema validation (node/edge limits, ID uniqueness,
  category-correct initial state, no self-loops or repeated pairs) with clear
  per-field error messages
- Dijkstra lowest-cost routing over the allowed subgraph; blocked nodes, blocked
  edges and closed exits are excluded (closed exits also excluded as
  intermediate nodes)
- Exact tie-breaking: minimum cost → lexicographically smallest exit ID →
  lexicographically smallest node-ID sequence
- Distinct node shapes (room ▢ / junction ○ / exit ◇), corridor cost labels,
  visual hazard states (hatched + ✕), animated route drawing and flow
- Failure states: *No route available*, *Starting location blocked*
- Bilingual UI: English and বাংলা
- Responsive: three-column desktop layout, tabbed mobile layout
- Event log, active-hazard summary, legend

## AI tools used

- Kimi (AI coding assistant) — generated the full implementation from the
  problem statement.
- Most useful prompt: *"Build Smart Escape: interactive evacuation route
  simulator — import/validate building.json, Dijkstra lowest-cost route with the
  exact tie-breaking rules, hazard toggles with instant rerouting, reset,
  English/Bangla UI, frontend-only."*

## Known issues

- None known.

## License

MIT — see [LICENSE](./LICENSE).
