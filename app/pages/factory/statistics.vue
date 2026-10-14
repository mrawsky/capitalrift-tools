<script setup lang="ts">
import { buildLedger } from '../../utils/factory/calculations'
import { FACTORY_CATALOG, itemName } from '../../utils/factory/catalog'
import { FEATURE_FLAGS } from '../../utils/analytics'
import type { Factory } from '../../utils/factory/types'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Factory Statistics, Supply Balances & Bottlenecks', 'Check Capital Rift factory input shortages, output surpluses, machine counts, and how a hot-room slowdown cuts output, with the bottlenecks that matter most.', true)
const { state, selectedFactory } = useFactoryPlanner()
const scope = ref<'all' | 'current'>('all')
const roomSpeed = ref(100)
const factories = computed(() => scope.value === 'current' && selectedFactory.value ? [selectedFactory.value] : state.value.factories)
const ledger = computed(() => buildLedger(factories.value))
const shortages = computed(() => ledger.value.rows.filter(row => row.balance < -1e-9).sort((a, b) => a.balance - b.balance))
const surpluses = computed(() => ledger.value.rows.filter(row => row.balance > 1e-9).sort((a, b) => b.balance - a.balance))
const machineTotals = computed(() => ledger.value.machineRows.reduce((total, row) => ({ owned: total.owned + row.owned, assigned: total.assigned + row.assigned, missing: total.missing + row.missing }), { owned: 0, assigned: 0, missing: 0 }))
const productionCount = computed(() => factories.value.reduce((total, factory) => total + factory.productions.length, 0))
const assignedMachines = computed(() => ledger.value.machineRows.filter(row => row.assigned > 0).map(row => ({ stationId: row.stationId, count: row.assigned })))
const showClimatePower = useFeatureFlag(FEATURE_FLAGS.plannerClimatePower)

// Scales production output and its ingredient demand by a room-speed factor so
// the effect of heat slowdown stays visible without changing saved data.
function scaledLedger(source: readonly Factory[], speed: number) {
  const supply: Record<string, number> = {}; const demand: Record<string, number> = {}; const owned: Record<string, number> = {}; const assigned: Record<string, number> = {}
  const add = (target: Record<string, number>, key: string, value: number) => { target[key] = (target[key] ?? 0) + value }
  for (const factory of source) {
    for (const stock of factory.machines) add(owned, stock.stationId, Math.max(0, stock.owned))
    for (const line of factory.supplies) add(supply, line.itemId, Math.max(0, line.ratePerMinute))
    for (const line of factory.productions) {
      const recipe = FACTORY_CATALOG.recipeById.get(line.recipeId); if (!recipe) continue
      const output = Math.max(0, line.assignedMachines) * recipe.perMinute * speed
      add(supply, recipe.productId, output); add(assigned, recipe.stationId, Math.max(0, line.assignedMachines))
      for (const input of recipe.inputs) add(demand, input.itemId, output * input.quantity / recipe.batch)
    }
  }
  const rows = [...new Set([...Object.keys(supply), ...Object.keys(demand)])].map(itemId => ({ itemId, supplied: supply[itemId] ?? 0, consumed: demand[itemId] ?? 0, balance: (supply[itemId] ?? 0) - (demand[itemId] ?? 0) }))
  return { rows, owned, assigned }
}
const speed = computed(() => Math.min(1, Math.max(0, roomSpeed.value) / 100))
const effective = computed(() => scaledLedger(factories.value, speed.value))
const effectiveShortages = computed(() => effective.value.rows.filter(row => row.balance < -1e-9).sort((a, b) => a.balance - b.balance))
const newShortages = computed(() => effectiveShortages.value.filter(row => !shortages.value.some(existing => existing.itemId === row.itemId)))
const lostUnits = computed(() => factories.value.reduce((total, factory) => total + factory.productions.reduce((sum, line) => { const recipe = FACTORY_CATALOG.recipeById.get(line.recipeId); return sum + (recipe ? Math.max(0, line.assignedMachines) * recipe.perMinute * (1 - speed.value) : 0) }, 0), 0))
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 2 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <FactoryPageHeader eyebrow="Statistics" title="Your production at a glance." description="Factories share one planning network here. These are nominal full-speed balances; actual production depends on owned machines, supplies, storage, and transport." />
    <div class="factory-toolbar"><label for="statistics-scope">View</label><select id="statistics-scope" v-model="scope"><option value="all">All factories</option><option value="current" :disabled="!selectedFactory">Current factory</option></select></div>
    <section class="kpi-grid" aria-label="Factory totals">
      <article><span>Factories</span><strong>{{ factories.length }}</strong></article><article><span>Production lines</span><strong>{{ productionCount }}</strong></article><article><span>Items short</span><strong :class="{ danger: shortages.length }">{{ shortages.length }}</strong></article><article><span>Machines assigned</span><strong>{{ machineTotals.assigned }} / {{ machineTotals.owned }}</strong><small v-if="machineTotals.missing">{{ machineTotals.missing }} missing</small></article>
    </section>
    <section v-if="!factories.length" class="factory-empty"><h2>No factories yet</h2><p>Create a factory, then add supplies and production lines.</p><NuxtLink class="button button--primary" to="/factory/production">Start production setup</NuxtLink></section>
    <template v-else>
      <section class="dashboard-grid">
        <article class="factory-panel"><div class="panel-title"><div><p class="eyebrow">TOP SHORTAGES</p><h2>Needs attention</h2></div><span>{{ shortages.length }}</span></div><ul v-if="shortages.length" class="rank-list"><li v-for="row in shortages.slice(0, 8)" :key="row.itemId"><span>{{ itemName(row.itemId) }}</span><strong class="danger">{{ fmt(row.balance) }}/min</strong></li></ul><p v-else class="positive-state">No shortages in this view.</p></article>
        <article class="factory-panel"><div class="panel-title"><div><p class="eyebrow">TOP SURPLUSES</p><h2>Available output</h2></div><span>{{ surpluses.length }}</span></div><ul v-if="surpluses.length" class="rank-list"><li v-for="row in surpluses.slice(0, 8)" :key="row.itemId"><span>{{ itemName(row.itemId) }}</span><strong class="positive">+{{ fmt(row.balance) }}/min</strong></li></ul><p v-else class="form-note">No surplus output yet.</p></article>
      </section>
      <FactoryClimatePower v-if="showClimatePower" :machines="assignedMachines" />
      <section class="factory-panel reference-content">
        <div class="panel-title"><div><p class="eyebrow">BOTTLENECK SCENARIO</p><h2>What if the rooms run hot?</h2></div></div>
        <p class="panel-note">Hot factory rooms slow machines and workers. Set the room speed from the <NuxtLink to="/tools/cooling">cooling planner</NuxtLink> to see which inputs fall short first.</p>
        <div class="equipment-form"><div><label for="stat-speed">Room speed (%)</label><input id="stat-speed" v-model.number="roomSpeed" type="number" min="0" max="100" step="1"></div></div>
        <p class="reference-answer" role="status">At {{ fmt(roomSpeed) }}% speed you lose about <strong>{{ fmt(lostUnits) }} units/min</strong> of output. {{ newShortages.length ? `${newShortages.length} new item(s) fall short.` : 'No new shortages appear.' }}</p>
        <ul v-if="effectiveShortages.length" class="rank-list"><li v-for="row in effectiveShortages.slice(0, 8)" :key="row.itemId"><span>{{ itemName(row.itemId) }}<small v-if="newShortages.some(item => item.itemId === row.itemId)"> new</small></span><strong class="danger">{{ fmt(row.balance) }}/min</strong></li></ul>
        <p v-else class="positive-state">Production still covers demand at this speed.</p>
      </section>
      <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">FULL LEDGER</p><h2>Every item</h2></div><span>{{ ledger.rows.length }} items</span></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Made / min</th><th>Used / min</th><th>Balance / min</th><th v-if="state.settings.showHourly">Balance / hour</th></tr></thead><tbody><tr v-for="row in ledger.rows" :key="row.itemId"><th>{{ itemName(row.itemId) }}</th><td>{{ fmt(row.supplied) }}</td><td>{{ fmt(row.consumed) }}</td><td :class="row.balance < -1e-9 ? 'danger' : row.balance > 1e-9 ? 'positive' : ''">{{ row.balance > 0 ? '+' : '' }}{{ fmt(row.balance) }}</td><td v-if="state.settings.showHourly">{{ fmt(row.balance * 60) }}</td></tr></tbody></table></div></section>
    </template>
  </main>
</template>
