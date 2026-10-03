# CapitalRift Tools

**Unofficial tools for CapitalRift restaurant recipes and factory production planning.**

The site includes a complete crafting reference, batch and full-chain quantity calculators, a balanced factory planner, restaurant optimization, reviewed starter blueprints, and storage, hauling, and mining helpers. Calculations run locally against dated data.

Factory setups and saved production plans stay in local storage and can be backed up as JSON.

> See the [changelog](/changelog) for tool updates, checked game builds, and data provenance.

[Open the recipe methodology](./app/pages/methodology.vue) · [Report a problem](https://github.com/mrawsky/capitalrift-tools/issues/new) · [View the repository](https://github.com/mrawsky/capitalrift-tools)

## Factory planner

Create named factories, enter raw supplies, record owned machines, assign recipes, and see production balances across the full network. The Planner expands a finished product into its inputs and required machines, and the Recipes page provides a searchable copy of the bundled production data.

The factory tool does not sign in to Capital Rift, call its APIs, scrape locations, read buildings, or automate play. Data is entered by the user and calculations happen locally against a reviewed, versioned production catalog.

The planner combines shared demands before rounding machines and propagates full-speed consumption upstream. New factories leave owned inventory empty: enter owned machines and external supplies separately. Statistics describe nominal capacity rather than production under shortages. Older plans show a recalculation notice; existing factory data stays unchanged.

Every craftable item has a page at `/factory/recipes/<item-slug>`, with quantities, a complete batch chain, and reverse uses. `/factory/blueprints` provides reviewed starters. Portable blueprint links and JSON exclude personal network surplus and open a preview without replacing local data.

Restaurant locations and compositions can be saved, shared, and backed up as JSON. Selected available ingredients constrain search and cache identity. Scoring still excludes stock quantities, cost, and station compatibility.

`/tools/hauling` and `/tools/mining` use checked saved-client tables with overrides or measured baselines. `/tools/storage` compares player-entered current capacities because rendering defaults may be overridden by the server.

## What can I do with it?

Paste a restaurant `chunkId`, such as `15/18295/10789`, and the tool will:

- normalize it to the zoom-12 tile used by Capital Rift;
- reproduce the location's three deterministic taste trends;
- search for four strong recipe candidates per trend;
- show exact and game-rounded match scores;
- predict the popularity bonus;
- explain every axis error behind the result;
- let you edit a custom 2–8 ingredient recipe and rescore it live.

All recipe calculations run locally in your browser, with no account, game login, database, or external recipe API involved. The production site uses Vercel Web Analytics and Speed Insights to measure visits and performance.

## Why the location ID matters

Local trends are not global presets. Capital Rift derives them from a restaurant's normalized map tile.

Two nearby restaurants can share the same trends when they fall inside the same zoom-12 tile. Cross that tile boundary and the complete trend set changes. Even when two places both display a trend called “Sour & Sweet,” their remaining axes can differ.

The app includes a visual guide for finding `chunkId` in the browser Network panel. The most reliable route currently known is:

1. Open the target restaurant or shop.
2. Open browser developer tools and select **Network**.
3. Find the request beginning `building-info?ref=player%2F…`.
4. Open its **Response** tab.
5. Copy the complete `chunkId` value in `zoom/tileX/tileY` format.

## A result we can reproduce together

The primary reference fixture is:

```text
Restaurant chunkId: 15/18295/10789
Normalized tile:    12/2286/1348
Seed:               crtrend:1:12/2286/1348

Trends:
1. Sour & Sweet
2. Salty & Richness
3. Richness & Spice
```

For its Sour & Sweet target, **Ketchup 50% + Vinegar 50%** produces:

```text
Taste profile:     (3.5, 2, 7.5, 0.5, 1.5, 0.5, 0, 1.5)
L1 distance:       9
Exact match:       0.6785714286
Game display:      68%
Popularity bonus:  +13%
```

These fixtures matter more than a vague claim that the calculator is “accurate.” They give players and contributors something concrete to check after every update.

## Help keep the model current

Capital Rift can change. Ingredient vectors, validation rules, trend generation, or display rounding may be different in a future build. The project becomes much more useful when players share what they can verify.

Please [open an issue](https://github.com/mrawsky/capitalrift-tools/issues/new) if you find:

- trend names that do not match the game for the same `chunkId`;
- an ingredient vector or recipe score that changed after a patch;
- a calculation that matches internally but differs in the Recipe Designer;
- a confusing part of the generator or methodology;
- a mobile, keyboard, accessibility, or browser-specific problem.

The most useful game-mechanics report includes:

```text
Game version:
Date checked:
Restaurant chunkId:
Normalized location key, if known:
Three trend names in their displayed order:
Recipe ingredients and percentages:
Match and popularity shown by the game:
Screenshot or reproduction notes:
```

Pull requests are welcome too—whether they improve code, tests, documentation, accessibility, research notes, or the player experience. For mechanics changes, please include a reproducible fixture and explain how the value was checked.

## What is verified—and what is not

The current recipe model uses community-checked game data and known results from the game UI.

The documented model covers:

- all eight taste axes in their exact order;
- 45 known edible ingredient vectors;
- recipe composition validation;
- recipe-profile rounding;
- L1 match and popularity formulas;
- zoom-12 location normalization;
- seed hashing, Mulberry32, eligible axes, and deterministic trend generation.

It does **not** model:

- ingredient price or recipe cost;
- inventory, supply, or availability;
- preparation time;
- station compatibility;
- menu pricing, profitability, or customer demand outside the verified popularity formula.

Suggested recipe names are created by this tool and do not come from the game. Recommendations are labeled **best found**, not globally optimal: every valid two-ingredient mix is searched exhaustively, while larger recipes use deterministic refinement.

Please verify important recommendations in the in-game Recipe Designer—especially after a patch.

## Run it locally

Node.js 22 or newer is recommended.

```bash
npm install
npm run dev
```

Nuxt serves the local app at `http://localhost:3000` by default.

Useful commands:

```bash
npm run dev        # start the development server
npm test           # run mechanics and regression fixtures
npm run typecheck  # validate Nuxt, Vue, and TypeScript
npm run build      # create a production server build
npm run generate   # create static deployment output
npm run preview    # preview the production build
```

## How the project is organized

```text
app/
  components/       interface, results, editor, and player guidance
  composables/       Worker lifecycle and versioned local caching
  pages/             tool hub, recipe calculator, and factory dashboard routes
  utils/domain/      framework-independent game mechanics
  workers/           deterministic recipe search
tests/               fixtures and domain regression tests
```

The mechanics live outside Vue components so they can be reviewed and tested without running the interface. The expensive search runs in a Web Worker to keep the page responsive.

Game version history lives only in [app/data/changelog.json](./app/data/changelog.json), rendered at [/changelog](/changelog). Add a newest-first entry there with a unique ID, date, checked game build, evidence, and changes. There are no game build labels to update in the tool pages, factory catalog, equipment tables, or discovery templates.

Cache identity and shared-file compatibility derive an internal release key from the current entry. Changing its checked game build or date refreshes that identity automatically. JSON schema and calculation versions remain independent so existing local saves can still be read.

## Updating the mechanics after a patch

Before changing displayed recommendations:

1. Compare the client ingredient table with `app/utils/domain/ingredients.ts`.
2. Re-check ingredient-count, percentage, station, and recipe validation rules.
3. Re-check the seed version, hash constants, PRNG, eligible-axis threshold, and random-call order.
4. Re-check profile rounding, distance denominator, match clamp, popularity constants, and UI rounding.
5. Reproduce all three trend names for both known location fixtures.
6. Update or add tests before changing public methodology copy.
7. Record the checked build and evidence in `app/data/changelog.json`; change the optimizer version too if the search behavior changed.

Evidence should be labeled honestly. Client-code findings, UI-confirmed behavior, reasonable inference, and generated suggestions are not the same level of certainty.

## Deployment

The project supports a standard Nuxt server deployment or static generation. Set `NUXT_PUBLIC_SITE_URL` to the production origin to emit canonical links and absolute discovery URLs. Vercel's production URL is detected automatically when available; otherwise the default origin comes from `app/data/tool-metadata.json`. Sitemap generation remains enabled without environment variables and has a runtime fallback.

Discovery files:

- `/sitemap.xml` — automatically indexes the public Nuxt routes;
- `/changelog` — tool updates, fixes, and checked game build history;
- `/llms.txt` — concise tool, documentation, and community links for AI systems;
- `/llms-full.txt` — full mechanics, formulas, verified fixture, limitations, and contribution guidance.

## Community project

This is an unofficial tool made by [mrawsky](https://mrawsky.pro), but I would like its useful parts to belong to the people playing, testing, and documenting CapitalRift.

If it helped your restaurant or factory give it star!, found a mismatch, or made the mechanics easier to understand, share what you learned. That feedback is how this stops being a one-off calculator and becomes a reliable community reference.

Unofficial community project. Not affiliated with, endorsed by, or associated with NIKS GAMES LLC. Capital Rift and related names and assets are property of their respective owners.
