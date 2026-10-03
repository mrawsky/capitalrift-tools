<script setup lang="ts">
import { FACTORY_CATALOG, itemName, productPath } from '../../utils/factory/catalog'
import { PLAN_CALCULATION_VERSION, planProduction } from '../../utils/factory/calculations'
import { downloadToolJson, MAX_SHARE_FILE_BYTES, parseSharedTool, parseShareFragment, shareFragment, type SharedFactoryPlan } from '../../utils/sharing'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Production Planner & Shareable Blueprints', 'Plan balanced whole-machine factory chains, see full-speed capacity and required supplies, then save or share a Capital Rift blueprint.', true)
const route = useRoute()
const { state, selectedFactory, savePlan, removePlan, createFactoryFromSavedPlan, mergePlanIntoFactory } = useFactoryPlanner()
const products = [...FACTORY_CATALOG.recipesByProduct.keys()].sort((a, b) => itemName(a).localeCompare(itemName(b)))
const productOptions = products.map(id => ({ value: id, label: itemName(id) }))
const queryProduct = typeof route.query.product === 'string' && products.includes(route.query.product) ? route.query.product : null
const queryRate = Number(route.query.rate)
const productId = ref(queryProduct ?? products[0] ?? '')
const targetRate = ref(Number.isFinite(queryRate) && queryRate > 0 && queryRate <= 1e6 ? queryRate : 1)
const useSurplus = ref(false)
const recipeOverrides = reactive<Record<string, string>>({})
const planName = ref('')
const message = ref('')
const sharedPreview = ref(false)
const events = useToolEvents()
const validRate = computed(() => Number.isFinite(targetRate.value) && targetRate.value > 0 && targetRate.value <= 1e6)
const result = computed(() => planProduction(productId.value, validRate.value ? targetRate.value : 0, { factories: state.value.factories, useNetworkSurplus: useSurplus.value, recipeOverrides }))
const root = computed(() => result.value.rows.find(row => row.itemId === productId.value))
watch(productId, () => { for (const key of Object.keys(recipeOverrides)) delete recipeOverrides[key] }, { flush: 'sync' })
watch(() => [route.query.product, route.query.rate], () => {
  if (typeof route.query.product !== 'string' || !products.includes(route.query.product)) return
  productId.value = route.query.product
  const rate = Number(route.query.rate)
  if (Number.isFinite(rate) && rate > 0 && rate <= 1e6) targetRate.value = rate
  useSurplus.value = false; sharedPreview.value = false; planName.value = ''
})
function recipesFor(itemId: string) { return FACTORY_CATALOG.recipesByProduct.get(itemId) ?? [] }
function saveCurrent() {
  if (!validRate.value || result.value.hasCycle) return
  const name = planName.value.trim().slice(0, 120) || `${itemName(productId.value)} at ${targetRate.value}/min`
  savePlan({ name, productId: productId.value, targetRatePerMinute: targetRate.value, useNetworkSurplus: useSurplus.value, recipeOverrides: { ...recipeOverrides }, calculationVersion: PLAN_CALCULATION_VERSION })
  planName.value = ''; sharedPreview.value = false; message.value = `Saved ${name} locally.`; events('plan_save', productId.value)
}
function applyNew(plan: typeof state.value.plans[number]) {
  try { const factory = createFactoryFromSavedPlan(plan); message.value = `Created ${factory.name}. Enter owned machines and external supplies.`; navigateTo('/factory/production') }
  catch (error) { message.value = error instanceof Error ? error.message : 'This plan could not be applied.' }
}
function applyCurrent(plan: typeof state.value.plans[number]) {
  if (!selectedFactory.value) return
  try { mergePlanIntoFactory(plan, selectedFactory.value.id); message.value = `Added ${plan.name}. Owned machine counts were not changed.` }
  catch (error) { message.value = error instanceof Error ? error.message : 'This plan could not be applied.' }
}
function portable(): SharedFactoryPlan {
  return { schemaVersion: 1, type: 'factory-plan', catalogVersion: FACTORY_CATALOG.version, name: planName.value.trim().slice(0, 120) || `${itemName(productId.value)} blueprint`, productId: productId.value, targetRatePerMinute: targetRate.value, recipeOverrides: { ...recipeOverrides } }
}
async function copyLink() {
  try { const link = `${window.location.origin}/factory/planner${shareFragment(portable())}`; await navigator.clipboard.writeText(link); message.value = 'Blueprint link copied. Portable plans use no local network surplus.'; events('plan_share', productId.value) }
  catch (error) { message.value = error instanceof Error ? error.message : 'Could not copy this link. Download the JSON instead.' }
}
function previewShared(value: ReturnType<typeof parseSharedTool>) {
  if (value.type !== 'factory-plan') throw new Error('Open restaurant recipes in the restaurant calculator.')
  productId.value = value.productId; targetRate.value = value.targetRatePerMinute; useSurplus.value = false
  for (const key of Object.keys(recipeOverrides)) delete recipeOverrides[key]
  Object.assign(recipeOverrides, value.recipeOverrides); planName.value = value.name; sharedPreview.value = true
  message.value = `Blueprint preview opened. Nothing was saved or replaced.${value.catalogVersion !== FACTORY_CATALOG.version ? ' Its catalog differs; quantities have been recalculated with the current snapshot.' : ''}`
}
function previewSaved(plan: typeof state.value.plans[number]) {
  try { previewShared(parseSharedTool(JSON.stringify({ ...plan, schemaVersion: 1, type: 'factory-plan', catalogVersion: state.value.catalogVersion }))) }
  catch (error) { message.value = error instanceof Error ? error.message : 'This saved plan could not be previewed.' }
}
async function importBlueprint(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  try { if (!file) return; if (file.size > MAX_SHARE_FILE_BYTES) throw new Error('Blueprint JSON must be smaller than 64 KiB.'); previewShared(parseSharedTool(await file.text())) }
  catch (error) { message.value = error instanceof Error ? error.message : 'This blueprint could not be opened.' }
  finally { input.value = '' }
}
onMounted(() => { try { const shared = parseShareFragment(window.location.hash); if (shared) previewShared(shared) } catch (error) { message.value = error instanceof Error ? error.message : 'Invalid shared link.' } })
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Factory', to: '/factory' }, { label: 'Production planner' }]" />
    <FactoryPageHeader eyebrow="Planner" title="Balance whole machines." description="Set the output you need. The planner rounds whole machines and carries their full-speed ingredient demand upstream, combining shared inputs before rounding." />
    <section class="factory-panel planner-form"><div><label for="plan-product">Product</label><SearchableSelect id="plan-product" v-model="productId" :options="productOptions" placeholder="Search products…" /></div><div><label for="plan-rate">Requested output / min</label><input id="plan-rate" v-model.number="targetRate" type="number" min="0.0001" max="1000000" step="any" :aria-invalid="!validRate"></div><label class="check-field"><input v-model="useSurplus" type="checkbox"> Use current network surplus</label></section>
    <p v-if="!validRate" class="form-note danger" role="status">Enter a positive finite rate up to one million per minute.</p>
    <p v-if="useSurplus" class="reference-note">Network surplus assumes nominal full-speed production and unrestricted transfers. Check existing raw supplies and hauling capacity separately.</p>
    <section class="kpi-grid"><article><span>Requested / min</span><strong>{{ fmt(validRate ? targetRate : 0) }}</strong></article><article><span>Installed output / min</span><strong>{{ fmt(root?.outputRatePerMinute ?? 0) }}</strong><small v-if="root?.coveredBySurplus">Plus {{ fmt(root.coveredBySurplus) }} from network</small></article><article><span>Machines required</span><strong>{{ result.totalMachines }}</strong></article><article><span>External inputs</span><strong>{{ result.unresolvedItems.length }}</strong></article></section>
    <section class="factory-panel"><div class="panel-title"><h2>{{ itemName(productId) }} production chain</h2><span v-if="result.hasCycle" class="danger">Recipe cycle found</span><NuxtLink v-else :to="productPath(productId)">Crafting quantities →</NuxtLink></div><p class="panel-note">Capacity assumes every assigned machine runs at full speed with all supplies available. Required machines are separate from owned inventory. External inputs still need to be sourced.</p><div class="table-wrap"><table><thead><tr><th>Item</th><th>Needed / min</th><th>Network</th><th>To produce</th><th>Capacity / min</th><th>Extra / min</th><th>Machine</th><th>Count</th><th>Recipe</th></tr></thead><tbody><tr v-for="row in result.rows" :key="row.itemId"><th :style="{ paddingLeft: `${0.55 + Math.min(row.depth, 6) * 0.8}rem` }">{{ itemName(row.itemId) }} <small v-if="!row.recipeId && row.toProduce > 0">external</small></th><td>{{ fmt(row.required) }}</td><td>{{ fmt(row.coveredBySurplus) }}</td><td :class="{ danger: row.toProduce > 0 && !row.recipeId }">{{ fmt(row.toProduce) }}</td><td>{{ row.recipeId ? fmt(row.outputRatePerMinute) : '—' }}</td><td>{{ row.recipeId ? fmt(row.excessRatePerMinute) : '—' }}</td><td>{{ row.stationId ? itemName(row.stationId) : '—' }}</td><td>{{ row.machines || '—' }}</td><td><select v-if="recipesFor(row.itemId).length > 1" :value="recipeOverrides[row.itemId] ?? row.recipeId" :aria-label="`Recipe for ${itemName(row.itemId)}`" @change="recipeOverrides[row.itemId] = ($event.target as HTMLSelectElement).value"><option v-for="recipe in recipesFor(row.itemId)" :key="recipe.id" :value="recipe.id">{{ recipe.name }}</option></select><span v-else>{{ row.recipeId ? FACTORY_CATALOG.recipeById.get(row.recipeId)?.name : row.toProduce > 0 ? 'External supply' : 'Covered by network' }}</span></td></tr></tbody></table></div>
      <div class="planner-save"><label class="sr-only" for="plan-name">Plan name</label><input id="plan-name" v-model="planName" maxlength="120" placeholder="Plan name (optional)"><button class="button button--primary" type="button" :disabled="!validRate || result.hasCycle" @click="saveCurrent">{{ sharedPreview ? 'Save this preview locally' : 'Save plan' }}</button></div>
      <div class="button-row reference-content"><button class="button" type="button" :disabled="!validRate || result.hasCycle" @click="copyLink">Copy blueprint link</button><button class="button" type="button" :disabled="!validRate || result.hasCycle" @click="downloadToolJson(portable(), 'capital-rift-blueprint.json')">Download blueprint JSON</button><label class="button" for="blueprint-import">Preview blueprint JSON</label><input id="blueprint-import" class="file-picker" type="file" accept="application/json,.json" @change="importBlueprint"></div><p class="form-note" role="status">{{ message }}</p>
    </section>
    <section class="factory-panel"><div class="panel-title"><h2>Saved plans</h2><span>{{ state.plans.length }}</span></div><div v-if="state.plans.length" class="saved-plans"><article v-for="plan in state.plans" :key="plan.id"><div><h3>{{ plan.name }}</h3><p>{{ itemName(plan.productId) }} · {{ fmt(plan.targetRatePerMinute) }}/min<span v-if="plan.useNetworkSurplus"> · uses surplus</span></p><p v-if="plan.calculationVersion !== PLAN_CALCULATION_VERSION" class="danger">Legacy plan: applying it recalculates whole-machine capacity. Existing factories stay unchanged.</p></div><div><button class="button" type="button" @click="previewSaved(plan)">Preview standalone</button><button class="button button--primary" type="button" @click="applyNew(plan)">New factory</button><button class="button" type="button" :disabled="!selectedFactory" @click="applyCurrent(plan)">Add to current</button><button class="icon-button" type="button" :aria-label="`Delete ${plan.name}`" @click="removePlan(plan.id)">×</button></div></article></div><p v-else class="factory-empty factory-empty--small">No saved plans yet. Try a <NuxtLink to="/factory/blueprints">starter blueprint</NuxtLink>.</p></section>
  </main>
</template>
