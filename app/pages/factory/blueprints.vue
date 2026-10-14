<script setup lang="ts">
import { FACTORY_CATALOG, REPOSITORY_URL, defaultRecipeFor, itemName, productPath } from '../../utils/factory/catalog'
import { planProduction } from '../../utils/factory/calculations'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Factory Blueprints: Power, Fuel, Cooling & Builds', 'Start a Capital Rift factory from a reviewed blueprint for power equipment, diesel, cooling, construction supplies, or starter products, with machines and raw supply requirements.')
const groups = [
  { id: 'power', title: 'Power equipment', products: ['coal_generator', 'oil_generator', 'hydro_turbine', 'wind_turbine', 'coal_bunker', 'fuel_tank'] },
  { id: 'fuel', title: 'Fuels', products: ['diesel'] },
  { id: 'climate', title: 'Cooling & climate', products: ['air_conditioner', 'industrial_ac', 'portable_ac', 'space_heater'] },
  { id: 'supplies', title: 'Construction supplies', products: ['brick', 'steel_beam', 'concrete'] },
  { id: 'starter', title: 'Starter products', products: ['nails', 'machine_parts', 'battery', 'mining_barrow'] },
].map(group => ({ ...group, products: group.products.filter(id => FACTORY_CATALOG.recipesByProduct.has(id) && defaultRecipeFor(id)) })).filter(group => group.products.length)
const search = ref('')
const category = ref('all')
const categoryOptions = [{ value: 'all', label: 'All categories' }, ...groups.map(group => ({ value: group.id, label: group.title }))]
const allBlueprints = groups.flatMap(group => group.products.map(productId => {
  const target = defaultRecipeFor(productId)!.perMinute
  const result = planProduction(productId, target)
  return { productId, groupId: group.id, groupTitle: group.title, target, result, external: result.rows.filter(row => !row.recipeId && row.toProduce > 0) }
}))
const visible = computed(() => { const query = search.value.trim().toLowerCase(); return allBlueprints.filter(blueprint => (category.value === 'all' || blueprint.groupId === category.value) && (!query || itemName(blueprint.productId).toLowerCase().includes(query))) })
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Factory', to: '/factory' }, { label: 'Blueprints' }]" />
    <FactoryPageHeader eyebrow="Community examples" title="Starter factory blueprints" description="One finished-product machine, balanced upstream capacity, and explicit external supplies. Open an example to inspect, adjust, and save it in your browser." />
    <section class="factory-panel reference-content">
      <div class="recipe-filters"><div><label for="bp-search">Search</label><input id="bp-search" v-model="search" type="search" placeholder="Product name…"></div><div><label for="bp-category">Category</label><SearchableSelect id="bp-category" v-model="category" :options="categoryOptions" /></div><p>{{ visible.length }} of {{ allBlueprints.length }} blueprints</p></div>
    </section>
    <div class="dashboard-grid"><article v-for="blueprint in visible" :key="blueprint.productId" class="dashboard-card blueprint-card"><p class="eyebrow accent">{{ blueprint.groupTitle }}</p><h2>{{ itemName(blueprint.productId) }}</h2><p>{{ fmt(blueprint.target) }}/min nominal output · {{ blueprint.result.totalMachines }} required machines</p><h3>External supply / min</h3><ul><li v-for="row in blueprint.external" :key="row.itemId">{{ itemName(row.itemId) }}: {{ fmt(row.toProduce) }}</li></ul><div class="button-row"><NuxtLink class="button button--primary" :to="{ path: '/factory/planner', query: { product: blueprint.productId, rate: blueprint.target } }">Preview blueprint</NuxtLink><NuxtLink class="text-button" :to="productPath(blueprint.productId)">Crafting recipe</NuxtLink></div></article></div>
    <p v-if="!visible.length" class="form-note" role="status">No blueprints match these filters.</p>
    <p class="reference-note">Calculated from the bundled factory catalog (<NuxtLink to="/changelog">data updates</NuxtLink>) and checked against the same production rules as the planner. These examples assume full-speed operation with the listed supplies. Ownership, transport, and purchase costs are entered separately.</p>
    <section class="factory-panel tool-guide" aria-labelledby="blueprint-contribution-title">
      <header class="tool-guide__header"><p class="eyebrow accent">Community contributions</p><h2 id="blueprint-contribution-title">Contribute a blueprint or correction</h2><p>Share a useful setup or help fix a recipe. Include enough detail for another player to reproduce it.</p></header>
      <ul class="tool-guide__list"><li><strong>Your setup or correction.</strong> Attach a blueprint JSON or describe the recipe you want to fix.</li><li><strong>What you checked.</strong> Include the date and any in-game screenshots or reproduction notes.</li><li><strong>The supplies and result.</strong> List required machines, raw supplies, and the output you observed.</li></ul>
      <div class="tool-guide__actions"><a class="button" :href="`${REPOSITORY_URL}/issues/new?title=Blueprint%20contribution`" target="_blank" rel="noopener noreferrer">Open a contribution report ↗</a><p class="form-note">Community examples are reviewed before publication.</p></div>
    </section>
  </main>
</template>
