<script setup lang="ts">
import { FACTORY_CATALOG, REPOSITORY_URL, defaultRecipeFor, itemName, productPath } from '../../utils/factory/catalog'
import { planProduction } from '../../utils/factory/calculations'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Factory Blueprints: Nails, Parts & Batteries', 'Start a Capital Rift factory from a reviewed blueprint for Nails, Machine Parts, Battery Packs, or Mining Barrows, with machines and raw supply requirements.')
const blueprints = ['nails', 'machine_parts', 'battery', 'mining_barrow'].map(productId => {
  const target = defaultRecipeFor(productId)!.perMinute
  const result = planProduction(productId, target)
  return { productId, target, result, external: result.rows.filter(row => !row.recipeId && row.toProduce > 0) }
})
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Factory', to: '/factory' }, { label: 'Starter blueprints' }]" />
    <FactoryPageHeader eyebrow="Community examples" title="Starter factory blueprints" description="One finished-product machine, balanced upstream capacity, and explicit external supplies. Open an example to inspect, adjust, and save it in your browser." />
    <div class="dashboard-grid"><article v-for="blueprint in blueprints" :key="blueprint.productId" class="dashboard-card blueprint-card"><h2>{{ itemName(blueprint.productId) }}</h2><p>{{ fmt(blueprint.target) }}/min nominal output · {{ blueprint.result.totalMachines }} required machines</p><h3>External supply / min</h3><ul><li v-for="row in blueprint.external" :key="row.itemId">{{ itemName(row.itemId) }}: {{ fmt(row.toProduce) }}</li></ul><div class="button-row"><NuxtLink class="button button--primary" :to="{ path: '/factory/planner', query: { product: blueprint.productId, rate: blueprint.target } }">Preview blueprint</NuxtLink><NuxtLink class="text-button" :to="productPath(blueprint.productId)">Crafting recipe</NuxtLink></div></article></div>
    <p class="reference-note">Calculated from the bundled factory catalog (<NuxtLink to="/changelog">data updates</NuxtLink>) and checked against the same production rules as the planner. These examples assume full-speed operation with the listed supplies. Ownership, transport, and purchase costs are entered separately.</p>
    <section class="factory-panel tool-guide" aria-labelledby="blueprint-contribution-title">
      <header class="tool-guide__header">
        <p class="eyebrow accent">Community contributions</p>
        <h2 id="blueprint-contribution-title">Contribute a blueprint or correction</h2>
        <p>Share a useful setup or help fix a recipe. Include enough detail for another player to reproduce it.</p>
      </header>
      <ul class="tool-guide__list">
        <li><strong>Your setup or correction.</strong> Attach a blueprint JSON or describe the recipe you want to fix.</li>
        <li><strong>What you checked.</strong> Include the date and any in-game screenshots or reproduction notes.</li>
        <li><strong>The supplies and result.</strong> List required machines, raw supplies, and the output you observed.</li>
      </ul>
      <div class="tool-guide__actions"><a class="button" :href="`${REPOSITORY_URL}/issues/new?title=Blueprint%20contribution`" target="_blank" rel="noopener noreferrer">Open a contribution report ↗</a><p class="form-note">Community examples are reviewed before publication.</p></div>
    </section>
  </main>
</template>
