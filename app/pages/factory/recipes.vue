<script setup lang="ts">
import { FACTORY_CATALOG, itemName } from '../../utils/factory/catalog'

definePageMeta({ layout: 'factory' })
useSeoMeta({ title: 'Factory Recipes — Capital Rift Tools', description: 'Search the bundled Capital Rift factory production recipe list.' })
const search = ref('')
const station = ref('all')
const stations = [...FACTORY_CATALOG.stationIds].sort((a, b) => itemName(a).localeCompare(itemName(b)))
const stationOptions = [{ value: 'all', label: 'All machines' }, ...stations.map(id => ({ value: id, label: itemName(id) }))]
const recipes = computed(() => { const query = search.value.trim().toLowerCase(); return FACTORY_CATALOG.recipes.filter(recipe => (station.value === 'all' || recipe.stationId === station.value) && (!query || recipe.name.toLowerCase().includes(query) || itemName(recipe.productId).toLowerCase().includes(query) || itemName(recipe.stationId).toLowerCase().includes(query) || recipe.inputs.some(input => itemName(input.itemId).toLowerCase().includes(query)))).sort((a, b) => itemName(a.productId).localeCompare(itemName(b.productId))) })
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 3 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <FactoryPageHeader eyebrow="Recipes" title="Every known production recipe." description="Browse the static dataset used by the planner. Filter by product, machine, or ingredient." />
    <section class="factory-panel"><div class="recipe-filters"><div><label for="recipe-search">Search</label><input id="recipe-search" v-model="search" type="search" placeholder="Product, machine, ingredient…"></div><div><label for="recipe-station">Machine</label><SearchableSelect id="recipe-station" v-model="station" :options="stationOptions" placeholder="Search machines…" /></div><p>{{ recipes.length }} of {{ FACTORY_CATALOG.recipes.length }} recipes · data {{ FACTORY_CATALOG.version }}</p></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Machine</th><th>Batch</th><th>Per min</th><th>Per hour</th><th>Ingredients</th></tr></thead><tbody><tr v-for="recipe in recipes" :key="recipe.id"><th>{{ itemName(recipe.productId) }}</th><td>{{ itemName(recipe.stationId) }}</td><td>{{ fmt(recipe.batch) }}</td><td>{{ fmt(recipe.perMinute) }}</td><td>{{ fmt(recipe.perMinute * 60) }}</td><td class="text-cell">{{ recipe.inputs.map(input => `${fmt(input.quantity)} × ${itemName(input.itemId)}`).join(', ') }}</td></tr></tbody></table></div></section>
  </main>
</template>
