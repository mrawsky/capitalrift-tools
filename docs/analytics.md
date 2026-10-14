# Analytics and feature flags

The site uses [PostHog](https://posthog.com) for product analytics, feature flags, and error tracking, alongside Vercel Web Analytics and Speed Insights. The PostHog client is initialised in `plugins/posthog.client.ts` from `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NUXT_PUBLIC_POSTHOG_HOST`. When PostHog is unconfigured, every helper degrades quietly and the tools keep working.

Analytics is privacy-conscious: it records which tools are used and how, never recipe, factory, or survey contents. Local data stays in the browser. A notice in the site footer links this behaviour to players.

All event names and feature-flag keys live in `app/utils/analytics.ts`. The shared helpers are:

- `useAnalytics()` — `capture(event, props)`, `captureTool(tool, props)`, `log(level, message, attrs)`.
- `useToolTelemetry(tool)` — emits `tool_viewed` on mount, a debounced `tool_calculated`, and explicit `action(name, props, delay)`.
- `useFeatureFlag(key, fallback = true)` — reads a PostHog flag after hydration, falling back to `true` so server-rendered HTML and first client render agree.

## Feature flags

Define each flag in PostHog (Feature flags → New feature flag). All default to on, so an undefined flag keeps the feature visible.

| Key | Default | Controls |
| --- | --- | --- |
| `home-new-tools` | on | The power/climate/money, resource-workflow and shopping/menu-codes cards on the home hub. |
| `planner-climate-power` | on | The heat, cooling and power estimate on the factory planner and statistics pages. |
| `recipe-cost` | on | The estimated ingredient cost on recipe candidates and the custom editor. |
| `recipe-menu-embed` | on | The embedded menu-code reader section on `/recipe`. |
| `combined-shopping-list` | on | The combined shopping-list section on the factory planner. |
| `market-reference` | on | The Market link on the home hub. |

## Events

Generic events are prefixed by tool via the `tool` property.

| Event | Where | Key properties |
| --- | --- | --- |
| `tool_viewed` | every tool page/panel | `tool` |
| `tool_calculated` | live calculators (debounced) | `tool`, `engagement_ms`, plus tool-specific values |
| `tool_calculated` (electricity) | `/tools/electricity` | `option_count`, `total_kw`, `cost_per_min`, `price_per_kwh` |
| `tool_calculated` (cooling) | `/tools/cooling` | `lat_deg`, `area_m2`, `temp_c`, `acs`, `slowdown_percent`, `machine_count` |
| `tool_calculated` (power-station) | `/tools/power-station` | `generator`, `machines`, `margin_per_min`, `break_even_price` |
| `tool_calculated` (business) | `/tools/business` | `net_per_min`, `margin_percent`, `runway_tier`, `runway_days`, `solvency_tier`, `workers` |
| `tool_calculated` (logistics) | `/tools/logistics` | `vehicle`, `quantity`, `trips`, `demand_per_min`, `vehicles_needed`, `buffer_stock` |
| `tool_calculated` (resources) | `/tools/resources` | `resource`, `miners`, `rate_per_min` |
| `tool_calculated` (market) | `/tools/market` | `item`, `quantity`, `spread_category`, `trade_value` |
| `tool_calculated` (planner-climate-power) | planner/statistics panel | `machine_count`, `total_heat`, `acs`, `heaters`, `total_kw`, `temp_c`, `cold` |
| `power_station_checklist_generated` | `/tools/power-station` | `pieces`, `raw_materials` |
| `shopping_list_built` | shopping list | `product_count`, `raw_material_count`, `intermediate_count`, `total_batches` |
| `menu_code_decoded` | menu-code reader | `valid`, `error`, `code_kind`, `dish_count` |
| `menu_code_saved` | menu-code reader | `dish_count`, `saved_total` |
| `survey_deposit_saved` | `/tools/resources` | `resource`, `rate_per_min`, `has_gear`, `has_location` |
| `faq_opened` | `/tools/troubleshoot` | `question_id`, `index` |
| `hub_tool_opened` | home hub | `path` |
| `recipe_candidate_search_requested` | recipe generator | `input_method`, `has_example` |
| `recipe_example_used` | recipe generator | — |
| `batch_calculation`, `open_planner`, `plan_save`, `plan_share`, `recipe_share`, `restaurant_save` | existing tools (also sent to Vercel) | `product_id` |

PostHog also records `$feature_flag_called` automatically when a flag is read, and captures Vue errors through the `vue:error` hook.

## Suggested PostHog panel metrics

Build these as insights on a **"Capital Rift Tools"** dashboard.

Overview:
- **Unique users** and **pageviews** over time, broken down by `tool` (`tool_viewed`).
- **Top tools** — `tool_viewed` grouped by `tool` (bar chart).
- **Tool engagement** — average `engagement_ms` on `tool_calculated`, grouped by `tool`.
- **Calculate → act funnel** — `tool_viewed` → `tool_calculated` (per tool) conversion.

Per feature:
- **Electricity** — average `total_kw` and `cost_per_min`; saved-price distribution (`price_per_kwh`).
- **Cooling** — share of calculations where `acs > 0` (hot rooms); average `slowdown_percent`.
- **Power station** — generator mix (`generator`); share with positive `margin_per_min`; average `break_even_price`.
- **Business** — distribution of `solvency_tier` and `runway_tier`; average `margin_percent`.
- **Logistics** — average `vehicles_needed` and `buffer_stock`; most-used `vehicle`.
- **Resources** — deposits saved over time (`survey_deposit_saved`); top `resource`.
- **Market** — most-queried `item` and `spread_category`.
- **Shopping list** — median `raw_material_count` and `total_batches`.
- **Menu codes** — decode success rate (`menu_code_decoded.valid`); recipe vs menu split (`code_kind`).
- **Troubleshooting FAQ** — most-opened questions (`faq_opened.question_id`).

Feature-flag rollout:
- **Flag exposure** — `$feature_flag_called` by flag key.
- Compare `tool_calculated` / `hub_tool_opened` conversion between flag variants for `home-new-tools`, `planner-climate-power`, `recipe-cost` and `recipe-menu-embed`.

## Enabling flags

1. Create each flag from the table above in PostHog with a 100% release condition (or use it for an experiment).
2. Events appear under **Activity → Events** once traffic arrives.
3. To preview a flag before release, use PostHog's flag targeting on a test user, or the PostHog toolbar's flag override.
