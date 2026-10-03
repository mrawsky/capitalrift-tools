<script setup lang="ts">
import { FACTORY_CATALOG, itemName, productPath } from '../../../utils/factory/catalog'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Crafting Recipes & Item Calculator', 'Browse all 249 Capital Rift production recipes. Find ingredients, batch yields, machines, and quantity calculators for every craftable item.')
const route = useRoute()
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const station = ref('all')
const stations = [...FACTORY_CATALOG.stationIds].sort((a, b) => itemName(a).localeCompare(itemName(b)))
const stationOptions = [{ value: 'all', label: 'All machines' }, ...stations.map(id => ({ value: id, label: itemName(id) }))]
const recipes = computed(() => { const query = search.value.trim().toLowerCase(); return FACTORY_CATALOG.recipes.filter(recipe => (station.value === 'all' || recipe.stationId === station.value) && (!query || recipe.name.toLowerCase().includes(query) || itemName(recipe.productId).toLowerCase().includes(query) || itemName(recipe.stationId).toLowerCase().includes(query) || recipe.inputs.some(input => itemName(input.itemId).toLowerCase().includes(query)))).sort((a, b) => itemName(a.productId).localeCompare(itemName(b.productId))) })
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 3 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Factory', to: '/factory' }, { label: 'Crafting recipes' }]" />
    <FactoryPageHeader eyebrow="Recipes" title="Capital Rift crafting recipes" description="Find how to make an item, calculate its ingredients, and plan its production. Choose a product for batch quantities and the complete chain." />
    <section class="factory-panel"><div class="recipe-filters"><div><label for="recipe-search">Search</label><input id="recipe-search" v-model="search" type="search" placeholder="Product, machine, ingredient…"></div><div><label for="recipe-station">Machine</label><SearchableSelect id="recipe-station" v-model="station" :options="stationOptions" placeholder="Search machines…" /></div><p>{{ recipes.length }} of {{ FACTORY_CATALOG.recipes.length }} recipes</p></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Machine</th><th>Batch</th><th>Per min</th><th>Per hour</th><th>Ingredients</th></tr></thead><tbody><tr v-for="recipe in recipes" :key="recipe.id"><th><NuxtLink :to="productPath(recipe.productId)">{{ itemName(recipe.productId) }}</NuxtLink></th><td>{{ itemName(recipe.stationId) }}</td><td>{{ fmt(recipe.batch) }}</td><td>{{ fmt(recipe.perMinute) }}</td><td>{{ fmt(recipe.perMinute * 60) }}</td><td class="text-cell">{{ recipe.inputs.map(input => `${fmt(input.quantity)} × ${itemName(input.itemId)}`).join(', ') }}</td></tr></tbody></table></div><p v-if="!recipes.length" class="form-note" role="status">No recipes match these filters. Try another product or machine.</p></section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates →</NuxtLink></p>
  </main>
</template>
