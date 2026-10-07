<script setup lang="ts">
import { buildLedger } from '../../utils/factory/calculations'
import { itemName } from '../../utils/factory/catalog'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Factory Statistics & Supply Balances', 'Check Capital Rift factory input shortages, output surpluses, and machine counts. Compare nominal full-speed supply balances across your saved factories.')
const { state, selectedFactory } = useFactoryPlanner()
const scope = ref<'all' | 'current'>('all')
const factories = computed(() => scope.value === 'current' && selectedFactory.value ? [selectedFactory.value] : state.value.factories)
const ledger = computed(() => buildLedger(factories.value))
const shortages = computed(() => ledger.value.rows.filter(row => row.balance < -1e-9).sort((a, b) => a.balance - b.balance))
const surpluses = computed(() => ledger.value.rows.filter(row => row.balance > 1e-9).sort((a, b) => b.balance - a.balance))
const machineTotals = computed(() => ledger.value.machineRows.reduce((total, row) => ({ owned: total.owned + row.owned, assigned: total.assigned + row.assigned, missing: total.missing + row.missing }), { owned: 0, assigned: 0, missing: 0 }))
const productionCount = computed(() => factories.value.reduce((total, factory) => total + factory.productions.length, 0))
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
      <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">FULL LEDGER</p><h2>Every item</h2></div><span>{{ ledger.rows.length }} items</span></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Made / min</th><th>Used / min</th><th>Balance / min</th><th v-if="state.settings.showHourly">Balance / hour</th></tr></thead><tbody><tr v-for="row in ledger.rows" :key="row.itemId"><th>{{ itemName(row.itemId) }}</th><td>{{ fmt(row.supplied) }}</td><td>{{ fmt(row.consumed) }}</td><td :class="row.balance < -1e-9 ? 'danger' : row.balance > 1e-9 ? 'positive' : ''">{{ row.balance > 0 ? '+' : '' }}{{ fmt(row.balance) }}</td><td v-if="state.settings.showHourly">{{ fmt(row.balance * 60) }}</td></tr></tbody></table></div></section>
    </template>
  </main>
</template>
