<script setup lang="ts">
import { FACTORY_CATALOG, itemName } from '../../utils/factory/catalog'
import { buildLedger } from '../../utils/factory/calculations'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Factory Machines: Owned & Required Capacity', 'Record owned Capital Rift factory machines and compare them with recipe assignments. Find spare capacity and missing machines before expanding production.')
const { selectedFactory, setMachineOwned } = useFactoryPlanner()
const ledger = computed(() => selectedFactory.value ? buildLedger([selectedFactory.value]) : buildLedger([]))
const rows = computed(() => FACTORY_CATALOG.stationIds.map((stationId) => ledger.value.machineRows.find(row => row.stationId === stationId) ?? { stationId, owned: 0, assigned: 0, spare: 0, missing: 0, productionCount: 0 }).sort((a, b) => itemName(a.stationId).localeCompare(itemName(b.stationId))))
</script>

<template>
  <main id="main-content" class="factory-page">
    <FactoryPageHeader eyebrow="Machines" title="Capacity you can account for." description="Enter what this factory owns. Assigned counts come from Production, so missing and spare machines stay easy to spot." />
    <section v-if="!selectedFactory" class="factory-empty"><h2>Select or create a factory</h2><NuxtLink class="button button--primary" to="/factory/production">Go to production</NuxtLink></section>
    <section v-else class="factory-panel"><div class="panel-title"><div><p class="eyebrow">{{ selectedFactory.name }}</p><h2>Machine inventory</h2></div><span>{{ rows.filter(row => row.owned || row.assigned).length }} types in use</span></div><div class="table-wrap"><table class="machine-table"><thead><tr><th>Machine</th><th>Owned</th><th>Assigned</th><th>Spare</th><th>Missing</th><th>Lines</th></tr></thead><tbody><tr v-for="row in rows" :key="row.stationId" :class="{ 'muted-row': !row.owned && !row.assigned }"><th>{{ itemName(row.stationId) }}</th><td><input :value="row.owned" type="number" min="0" step="1" :aria-label="`${itemName(row.stationId)} owned`" @change="setMachineOwned(row.stationId, Number(($event.target as HTMLInputElement).value))"></td><td>{{ row.assigned }}</td><td :class="{ positive: row.spare }">{{ row.spare }}</td><td :class="{ danger: row.missing }">{{ row.missing }}</td><td>{{ row.productionCount }}</td></tr></tbody></table></div></section>
  </main>
</template>
