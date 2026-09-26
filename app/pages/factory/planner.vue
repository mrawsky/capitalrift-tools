<script setup lang="ts">
import { FACTORY_CATALOG, itemName } from '../../utils/factory/catalog'
import { planProduction } from '../../utils/factory/calculations'

definePageMeta({ layout: 'factory' })
useSeoMeta({ title: 'Production Planner — Capital Rift Tools', description: 'Calculate a complete Capital Rift factory production chain and save it locally.' })
const { state, selectedFactory, savePlan, removePlan, createFactoryFromSavedPlan, mergePlanIntoFactory } = useFactoryPlanner()
const products = [...FACTORY_CATALOG.recipesByProduct.keys()].sort((a, b) => itemName(a).localeCompare(itemName(b)))
const productOptions = products.map(id => ({ value: id, label: itemName(id) }))
const productId = ref(products[0] ?? '')
const targetRate = ref(1)
const useSurplus = ref(false)
const recipeOverrides = reactive<Record<string, string>>({})
const planName = ref('')
const message = ref('')
const result = computed(() => planProduction(productId.value, targetRate.value, { factories: state.value.factories, useNetworkSurplus: useSurplus.value, recipeOverrides }))
watch(productId, () => { for (const key of Object.keys(recipeOverrides)) delete recipeOverrides[key] })
function recipesFor(itemId: string) { return FACTORY_CATALOG.recipesByProduct.get(itemId) ?? [] }
function saveCurrent() { const name = planName.value.trim() || `${itemName(productId.value)} at ${targetRate.value}/min`; savePlan({ name, productId: productId.value, targetRatePerMinute: targetRate.value, useNetworkSurplus: useSurplus.value, recipeOverrides: { ...recipeOverrides } }); planName.value = ''; message.value = `Saved ${name}.` }
function applyNew(plan: typeof state.value.plans[number]) { const factory = createFactoryFromSavedPlan(plan); message.value = `Created ${factory.name}.`; navigateTo('/factory/production') }
function applyCurrent(plan: typeof state.value.plans[number]) { if (!selectedFactory.value) return; mergePlanIntoFactory(plan, selectedFactory.value.id); message.value = `Added ${plan.name} to ${selectedFactory.value.name}. Owned machine counts were not changed.` }
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 2 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <FactoryPageHeader eyebrow="Planner" title="Start with the finished item." description="Set a target rate and follow the chain back to raw materials. Save the result or apply it to a factory when it looks right." />
    <section class="factory-panel planner-form"><div><label for="plan-product">Product</label><SearchableSelect id="plan-product" v-model="productId" :options="productOptions" placeholder="Search products…" /></div><div><label for="plan-rate">Target / min</label><input id="plan-rate" v-model.number="targetRate" type="number" min="0.0001" step="any"></div><label class="check-field"><input v-model="useSurplus" type="checkbox"> Use current network surplus</label></section>
    <section class="kpi-grid"><article><span>Steps</span><strong>{{ result.rows.length }}</strong></article><article><span>Machines</span><strong>{{ result.totalMachines }}</strong></article><article><span>Raw inputs</span><strong>{{ result.unresolvedItems.length }}</strong></article><article><span>Covered from spare</span><strong>{{ result.rows.filter(row => row.coveredBySurplus > 0).length }}</strong></article></section>
    <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">PRODUCTION CHAIN</p><h2>{{ itemName(productId) }} at {{ fmt(targetRate) }}/min</h2></div><span v-if="result.hasCycle" class="danger">Recipe cycle found</span></div><div class="table-wrap"><table><thead><tr><th>Step</th><th>Needed / min</th><th>From surplus</th><th>To produce</th><th>Machine</th><th>Count</th><th>Recipe</th></tr></thead><tbody><tr v-for="row in result.rows" :key="row.itemId"><th :style="{ paddingLeft: `${0.55 + Math.min(row.depth, 6) * 0.8}rem` }">{{ itemName(row.itemId) }} <small v-if="!row.recipeId">raw</small></th><td>{{ fmt(row.required) }}</td><td :class="{ positive: row.coveredBySurplus }">{{ fmt(row.coveredBySurplus) }}</td><td :class="{ danger: row.toProduce > 0 && !row.recipeId }">{{ fmt(row.toProduce) }}</td><td>{{ row.stationId ? itemName(row.stationId) : '—' }}</td><td>{{ row.machines || '—' }}</td><td><select v-if="recipesFor(row.itemId).length > 1" v-model="recipeOverrides[row.itemId]" :aria-label="`Recipe for ${itemName(row.itemId)}`"><option v-for="recipe in recipesFor(row.itemId)" :key="recipe.id" :value="recipe.id">{{ recipe.name }}</option></select><span v-else>{{ row.recipeId ? FACTORY_CATALOG.recipeById.get(row.recipeId)?.name : 'External supply' }}</span></td></tr></tbody></table></div><div class="planner-save"><input v-model="planName" placeholder="Plan name (optional)" aria-label="Plan name"><button class="button button--primary" type="button" :disabled="!productId || targetRate <= 0 || result.hasCycle" @click="saveCurrent">Save plan</button></div><p class="form-note" aria-live="polite">{{ message }}</p></section>
    <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">SAVED LOCALLY</p><h2>Saved plans</h2></div><span>{{ state.plans.length }}</span></div><div v-if="state.plans.length" class="saved-plans"><article v-for="plan in state.plans" :key="plan.id"><div><h3>{{ plan.name }}</h3><p>{{ itemName(plan.productId) }} · {{ fmt(plan.targetRatePerMinute) }}/min<span v-if="plan.useNetworkSurplus"> · uses surplus</span></p></div><div><button class="button button--primary" type="button" @click="applyNew(plan)">New factory</button><button class="button" type="button" :disabled="!selectedFactory" @click="applyCurrent(plan)">Add to current</button><button class="icon-button" type="button" :aria-label="`Delete ${plan.name}`" @click="removePlan(plan.id)">×</button></div></article></div><p v-else class="factory-empty factory-empty--small">No saved plans yet.</p></section>
  </main>
</template>
