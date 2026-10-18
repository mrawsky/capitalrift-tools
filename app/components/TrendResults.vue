<script setup lang="ts">
import { AXIS_LABELS } from '../utils/domain/axes'
import { MAX_MENU_DISHES } from '../utils/domain/menuCode'
import type { OptimizationResponse, RecipePart, Trend } from '../utils/domain/types'

const props = defineProps<{
  trends: Trend[]
  optimization: OptimizationResponse
  chunkId: string
}>()

// The whole generated menu: every distinct candidate across the three trends,
// capped at the game's twelve-dish limit.
const exportDishes = computed(() => {
  const seen = new Set<string>()
  const dishes: { parts: RecipePart[] }[] = []
  for (const result of props.optimization.results) {
    for (const candidate of result.candidates) {
      if (seen.has(candidate.signature)) continue
      seen.add(candidate.signature)
      dishes.push({ parts: candidate.parts })
      if (dishes.length >= MAX_MENU_DISHES) return dishes
    }
  }
  return dishes
})
</script>

<template>
  <section class="results-section" aria-labelledby="results-title">
    <header class="section-heading">
      <p class="eyebrow accent">03 / OPTIMIZED RECIPES</p>
      <h2 id="results-title">Menu candidates, ranked by exact match.</h2>
      <p>Best found—not claimed as global optima. Every two-ingredient mix among your selected ingredients was checked exhaustively; larger recipes use deterministic refinement.</p>
      <div class="button-row">
        <MenuCodeExport :dishes="exportDishes" kind="menu" label="Export full menu code (CRMENU1)" />
      </div>
    </header>

    <article v-for="trend in trends" :key="trend.index" class="trend-block">
      <header class="trend-header">
        <div>
          <p class="eyebrow">TREND {{ String(trend.index + 1).padStart(2, '0') }}</p>
          <h3>{{ trend.name }}</h3>
          <p>Primary {{ AXIS_LABELS[trend.primary] }} · Secondary {{ AXIS_LABELS[trend.secondary] }} · Boosted {{ AXIS_LABELS[trend.boosted] }}</p>
        </div>
        <TasteGrid :profile="trend.target" />
      </header>
      <div class="recipe-grid">
        <RecipeCard
          v-for="(candidate, index) in optimization.results.find(result => result.trendIndex === trend.index)?.candidates"
          :key="candidate.signature"
          :candidate="candidate"
          :trend="trend"
          :trends="trends"
          :rank="index + 1"
          :chunk-id="chunkId"
        />
      </div>
    </article>

    <footer class="search-metadata">
      <span>STATUS / {{ optimization.optimality.toUpperCase() }}</span>
      <span>STRATEGY / {{ optimization.strategy }}</span>
      <span>CANDIDATES / {{ optimization.candidatesEvaluated.toLocaleString('en-US') }}</span>
      <span>OPTIMIZER / {{ optimization.optimizerVersion }}</span>
    </footer>
  </section>
</template>
