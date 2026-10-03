<script setup lang="ts">
import { FACTORY_CATALOG, FACTORY_MODEL, REPOSITORY_URL, defaultRecipeFor, itemName, productFromSlug, productPath, recipesUsing } from '../../../utils/factory/catalog'
import { calculateBatch, planQuantity } from '../../../utils/factory/calculations'

definePageMeta({ layout: 'factory', validate: route => typeof route.params.slug === 'string' && Boolean(productFromSlug(route.params.slug)) })
const route = useRoute()
const productId = computed(() => productFromSlug(String(route.params.slug))!)
const recipe = computed(() => defaultRecipeFor(productId.value)!)
const name = computed(() => itemName(productId.value))
const quantity = ref(1)
const validQuantity = computed(() => Number.isFinite(quantity.value) && quantity.value > 0 && quantity.value <= 1e9)
const batch = computed(() => calculateBatch(recipe.value, validQuantity.value ? quantity.value : 0))
const chain = computed(() => planQuantity(productId.value, validQuantity.value ? quantity.value : 0))
const uses = computed(() => recipesUsing(productId.value))
const events = useToolEvents()
watch(productId, () => { quantity.value = 1 })
useToolSeo(() => `Capital Rift ${name.value}: Recipe, Yield & Calculator`, () => `How to make ${name.value} in Capital Rift: ${recipe.value.inputs.map(input => `${input.quantity} ${itemName(input.itemId)}`).join(', ')} yields ${recipe.value.batch}. Calculate quantities and plan the chain.`, true)
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
const answer = computed(() => `Make ${fmt(recipe.value.batch)} ${name.value} per batch at a ${itemName(recipe.value.stationId)} using ${recipe.value.inputs.map(input => `${fmt(input.quantity)} ${itemName(input.itemId)}`).join(' + ')}.`)
const focusedAnswers: Record<string, string> = {
  nails: 'One Iron Bar produces 20 Nails. To make 21 Nails, run two batches: use 2 Iron Bars and receive 40 Nails.',
  machine_parts: 'Machine Parts are made at the Manufacturing Press. The quantity calculator below covers the direct recipe; the chain also includes Wire and Steel Sheet production.',
  battery: 'Battery Pack crafting uses Battery Paste, Copper Wire, Plastic Part, and Steel Sheet. Battery Paste is a separate Chemical Plant recipe.',
  mining_barrow: 'This page explains how to craft a Mining Barrow. Mining speed and crew effects are separate from its production recipe.',
  sonar_array: 'This is the Sonar Array crafting recipe. Its purpose and operating requirements should be checked in the game; the factory catalog describes crafting only.',
  survey_tower: 'This page covers the Survey Tower construction recipe. Survey effects and placement are separate game mechanics.',
  survey_array: 'A Survey Array is a different item from a Survey Tower. Use the listed recipe for the exact equipment you want to craft.',
}
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Crafting recipes', to: '/factory/recipes' }, { label: name }]" />
    <FactoryPageHeader eyebrow="Crafting reference" :title="`How to make ${name}`" :description="answer" />
    <p v-if="focusedAnswers[productId]" class="reference-answer">{{ focusedAnswers[productId] }}</p>
    <section class="kpi-grid" aria-label="Recipe output"><article><span>Per batch</span><strong>{{ fmt(recipe.batch) }}</strong></article><article><span>Output / min</span><strong>{{ fmt(recipe.perMinute) }}</strong></article><article><span>Output / hour</span><strong>{{ fmt(recipe.perMinute * 60) }}</strong></article><article><span>Machine</span><strong class="kpi-name">{{ itemName(recipe.stationId) }}</strong></article></section>
    <section class="factory-panel"><div class="panel-title"><h2>Ingredients per batch</h2></div><div class="table-wrap"><table><thead><tr><th>Ingredient</th><th>Quantity</th></tr></thead><tbody><tr v-for="input in recipe.inputs" :key="input.itemId"><th><NuxtLink v-if="defaultRecipeFor(input.itemId)" :to="productPath(input.itemId)">{{ itemName(input.itemId) }}</NuxtLink><span v-else>{{ itemName(input.itemId) }}</span></th><td>{{ fmt(input.quantity) }}</td></tr></tbody></table></div></section>
    <section class="factory-panel"><div class="panel-title"><h2>Quantity calculator</h2></div><div class="reference-controls"><label for="batch-quantity">How many {{ name }} do you need?</label><input id="batch-quantity" v-model.number="quantity" type="number" min="0.0001" max="1000000000" step="any" :aria-invalid="!validQuantity" aria-describedby="batch-help" @change="events('batch_calculation', productId)"><p id="batch-help">Whole batches may produce extra items. Enter a positive quantity up to one billion.</p></div><div v-if="validQuantity" class="reference-content" aria-live="polite"><p><strong>{{ fmt(batch.batches) }} batches</strong> produce {{ fmt(batch.output) }} {{ name }} with {{ fmt(batch.excess) }} left over.</p><ul><li v-for="input in batch.inputs" :key="input.itemId">{{ fmt(input.quantity) }} {{ itemName(input.itemId) }}</li></ul></div><p v-else class="form-note danger" role="status">Enter a valid positive quantity.</p></section>
    <section class="factory-panel"><div class="panel-title"><h2>Complete crafting quantities</h2></div><p class="panel-note">Shared ingredients are combined before batches are rounded. These quantities assume you craft everything from external raw materials, without existing stock.</p><p v-if="chain.hasCycle" class="form-note danger">A recipe cycle prevents this chain from being calculated.</p><div v-else-if="validQuantity" class="table-wrap"><table><thead><tr><th>Item</th><th>Needed</th><th>Batches</th><th>Produced</th><th>Left over</th></tr></thead><tbody><tr v-for="row in chain.rows" :key="row.itemId"><th><NuxtLink v-if="row.recipeId" :to="productPath(row.itemId)">{{ itemName(row.itemId) }}</NuxtLink><span v-else>{{ itemName(row.itemId) }} <small>external</small></span></th><td>{{ fmt(row.required) }}</td><td>{{ row.recipeId ? fmt(row.batches) : '—' }}</td><td>{{ row.recipeId ? fmt(row.output) : '—' }}</td><td>{{ row.recipeId ? fmt(row.excess) : '—' }}</td></tr></tbody></table></div></section>
    <div class="button-row reference-actions"><NuxtLink class="button button--primary" :to="{ path: '/factory/planner', query: { product: productId, rate: recipe.perMinute } }" @click="events('open_planner', productId)">Plan continuous production</NuxtLink><NuxtLink class="button" to="/factory/blueprints">Starter blueprints</NuxtLink></div>
    <section v-if="uses.length" class="factory-panel"><div class="panel-title"><h2>What uses {{ name }}?</h2></div><ul class="reference-links"><li v-for="consumer in uses" :key="consumer.id"><NuxtLink :to="productPath(consumer.productId)">{{ itemName(consumer.productId) }}</NuxtLink></li></ul></section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. Rates describe nominal full-speed capacity with supplies available. {{ FACTORY_MODEL.provenance }} <a :href="`${REPOSITORY_URL}/issues/new?title=${encodeURIComponent(`Recipe correction: ${name}`)}`" target="_blank" rel="noopener noreferrer">Report a correction</a>.</p>
  </main>
</template>
