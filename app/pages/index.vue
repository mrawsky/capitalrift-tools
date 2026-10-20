<script setup lang="ts">
import { FACTORY_CATALOG, productPath } from '../utils/factory/catalog'
import { NEW_CRAFTING_PRODUCTS } from '../utils/factory/reference'
import { FEATURE_FLAGS } from '../utils/analytics'
const route = useRoute()
useToolSeo('Capital Rift Tools: Crafting Recipes & Factory Planner', () => `Free Capital Rift tools: browse ${FACTORY_CATALOG.recipes.length} crafting recipes, calculate materials, plan factory production, and match restaurant recipes to local tastes.`, true)
const { capture } = useAnalytics()
const showNewTools = useFeatureFlag(FEATURE_FLAGS.homeNewTools)
const showMarket = useFeatureFlag(FEATURE_FLAGS.marketReference)
function onHubClick(event: MouseEvent) {
  const href = (event.target as HTMLElement | null)?.closest('a')?.getAttribute('href')
  if (href) capture('hub_tool_opened', { path: href })
}
onMounted(() => {
  if (typeof route.query.id === 'string') navigateTo({ path: '/recipe', query: { id: route.query.id } }, { replace: true })
})
</script>

<template>
  <main id="main-content">
    <section class="hero hero--hub">
      <div class="hero__meta"><span>UNOFFICIAL PLAYER TOOLS</span><span>LOCAL / NO GAME CONNECTION</span></div>
      <h1>Capital Rift tools.<br><em>Plan the production.</em></h1>
      <div class="hero__footer"><p>Crafting answers, balanced factory plans, and restaurant recipes for Capital Rift. Save your work in your browser and share a blueprint without an account.</p><NuxtLink class="down-link" to="/factory/recipes">Browse {{ FACTORY_CATALOG.recipes.length }} crafting recipes →</NuxtLink></div>
    </section>
    <section class="tool-grid" aria-label="Available tools" @click="onHubClick">
      <div><p class="eyebrow accent">01 / CRAFTING REFERENCE</p><h2>What does it take?</h2><p>Look up every craftable product, calculate batches and ingredients, and follow its complete production chain.</p><NuxtLink class="button button--primary" to="/factory/recipes">Browse crafting recipes</NuxtLink></div>
      <div><p class="eyebrow accent">02 / FACTORY PLANNER</p><h2>Balance the chain.</h2><p>Plan whole machines, record what you own, and check external supplies and shortages. Save and share standalone blueprints.</p><NuxtLink class="button" to="/factory/planner">Open production planner</NuxtLink><NuxtLink class="text-button reference-actions" to="/factory/blueprints">Try a starter blueprint →</NuxtLink></div>
      <div><p class="eyebrow accent">03 / RESTAURANT RECIPES</p><h2>Match local tastes.</h2><p>Find restaurant trends, choose available ingredients, and save custom recipes.</p><NuxtLink class="button" to="/recipe">Open recipe calculator</NuxtLink></div>
      <template v-if="showNewTools">
        <div><p class="eyebrow accent">04 / POWER, CLIMATE &amp; MONEY</p><h2>Run and afford it.</h2><p>Estimate electricity bills, plan room cooling, compare power stations, and check your cash runway, net rent after upkeep and managers, running costs and market prices.</p><div class="button-row resource-actions"><NuxtLink class="button" to="/tools/electricity">Electricity</NuxtLink><NuxtLink class="button" to="/tools/cooling">Cooling</NuxtLink><NuxtLink class="button" to="/tools/power-station">Power station</NuxtLink><NuxtLink class="button" to="/tools/business">Business &amp; property</NuxtLink><NuxtLink v-if="showMarket" class="button" to="/tools/market">Market</NuxtLink></div></div>
        <div><p class="eyebrow accent">05 / RESOURCE WORKFLOW</p><h2>Supply your factory.</h2><p>Plan hauling, garage fuel and repair kits, storage and transport throughput, estimate mining equipment effects, keep a survey notebook, and troubleshoot stalled lines.</p><div class="button-row resource-actions"><NuxtLink class="button" to="/tools/logistics">Logistics</NuxtLink><NuxtLink class="button" to="/tools/resources">Resources</NuxtLink><NuxtLink class="button" to="/tools/troubleshoot">Troubleshoot</NuxtLink></div></div>
        <div><p class="eyebrow accent">06 / SHOPPING & MENU CODES</p><h2>Plan a bigger build.</h2><p>Combine several products into one shopping list, browse power and cooling blueprints, and read CRRCP1 or CRMENU1 menu codes.</p><div class="button-row resource-actions"><NuxtLink class="button" to="/factory/shopping">Shopping list</NuxtLink><NuxtLink class="button" to="/factory/blueprints">Blueprints</NuxtLink><NuxtLink class="button" to="/recipe/menu">Menu codes</NuxtLink></div></div>
      </template>
    </section>
    <section class="hub-reference"><h2>New crafting recipes</h2><ul class="reference-links"><li v-for="id in NEW_CRAFTING_PRODUCTS" :key="id"><NuxtLink :to="productPath(id)">{{ FACTORY_CATALOG.itemById.get(id)?.name }}</NuxtLink></li></ul><p><NuxtLink to="/changelog">See the latest tools and data updates →</NuxtLink></p></section>
    <div class="hub-reference"><CraftingQuestions /></div>
  </main>
</template>
