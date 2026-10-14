<script setup lang="ts">
import { POWER_MECHANICS, generatorSpec, stationEconomics } from '../../utils/power'
import type { GeneratorKind } from '../../utils/power'
import { FACTORY_CATALOG, defaultRecipeFor, itemName, productPath } from '../../utils/factory/catalog'
import { planQuantityMulti } from '../../utils/factory/calculations'
useToolSeo('Capital Rift Power-Station Calculator & Build Checklist', 'Compare coal, oil, hydro and wind generators in Capital Rift. Estimate fuel demand, operating margin and break-even power price, then gather the materials for a whole station.', true)
const kinds = Object.keys(POWER_MECHANICS.generators) as GeneratorKind[]
const kindOptions = kinds.map(kind => ({ value: kind, label: generatorSpec(kind)!.name }))
const kind = ref<GeneratorKind>('coal')
const machines = ref(1)
const fuelItem = ref('COAL')
const fuelPrice = ref(7)
const pricePerKwh = ref<number>(POWER_MECHANICS.defaultPricePerKwh)
const spec = computed(() => generatorSpec(kind.value)!)
watch(kind, () => { const first = spec.value.fuels[0]; fuelItem.value = first?.item ?? '' }, { immediate: false })
const fuelOptions = computed(() => spec.value.fuels.map(fuel => ({ value: fuel.item, label: itemName(fuel.item.toLowerCase()) })))
const economics = computed(() => stationEconomics({ kind: kind.value, fuelItem: fuelItem.value, fuelPrice: fuelPrice.value, pricePerKwh: pricePerKwh.value, machines: machines.value }))
const stationProducts = ['coal_bunker', 'coal_generator', 'oil_generator', 'hydro_turbine', 'wind_turbine', 'fuel_tank'].filter(id => FACTORY_CATALOG.recipesByProduct.has(id))
const counts = reactive<Record<string, number>>({ coal_bunker: 1, coal_generator: 1 })
const targets = computed(() => Object.fromEntries(stationProducts.filter(id => (counts[id] ?? 0) > 0).map(id => [id, counts[id]!])))
const checklist = computed(() => planQuantityMulti(targets.value))
const externalRows = computed(() => checklist.value.rows.filter(row => !row.recipeId))
const telemetry = useToolTelemetry('power-station')
watch(economics, () => telemetry.calculated({ generator: kind.value, machines: machines.value, margin_per_min: Math.round(economics.value.marginPerMin * 100) / 100, break_even_price: economics.value.breakEvenPricePerKwh === null ? null : Math.round(economics.value.breakEvenPricePerKwh * 10000) / 10000 }))
watch(checklist, () => telemetry.action('power_station_checklist_generated', { pieces: Object.keys(targets.value).length, raw_materials: externalRows.value.length }, 1200))
const craftedRows = computed(() => checklist.value.rows.filter(row => row.recipeId))
function money(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` }
function fmt(value: number, digits = 2) { return value.toLocaleString('en-US', { maximumFractionDigits: digits }) }
function fuelLabel(item: string) { return itemName(item.toLowerCase()) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Power station' }]" />
    <FactoryPageHeader eyebrow="Power & fuel" title="Run your own power." description="Compare the four generator types, estimate their fuel demand and margin at your prices, then gather every material a station needs in one checklist." />
    <section class="factory-panel reference-content">
      <div class="equipment-form">
        <div><label for="station-kind">Generator</label><SearchableSelect id="station-kind" v-model="kind" :options="kindOptions" /></div>
        <div><label for="station-machines">Generators</label><input id="station-machines" v-model.number="machines" type="number" min="1" max="1000" step="1"></div>
        <div v-if="economics.needsFuel"><label for="station-fuel">Fuel</label><SearchableSelect id="station-fuel" v-model="fuelItem" :options="fuelOptions" /></div>
        <div v-if="economics.needsFuel"><label for="station-fuel-price">Fuel price each</label><input id="station-fuel-price" v-model.number="fuelPrice" type="number" min="0" step="0.01"></div>
        <div><label for="station-price">Power price (per kWh)</label><input id="station-price" v-model.number="pricePerKwh" type="number" min="0.01" max="5" step="0.001"></div>
      </div>
    </section>
    <section class="kpi-grid" aria-label="Station economics">
      <article><span>Rated output</span><strong>{{ fmt(economics.ratedKw, 0) }} kW</strong><small>{{ Math.round(spec.availability * 100) }}% availability</small></article>
      <article><span>Output</span><strong>{{ fmt(economics.outputKwhPerMin, 0) }} kWh/min</strong></article>
      <article v-if="economics.needsFuel"><span>Fuel demand</span><strong>{{ fmt(economics.fuelPerMin) }}/min</strong><small>{{ fuelLabel(economics.fuelItem!) }} · {{ money(economics.fuelCostPerMin) }}/min</small></article>
      <article v-else><span>Fuel</span><strong>None</strong><small>Runs on availability</small></article>
      <article><span>Margin</span><strong :class="{ positive: economics.marginPerMin > 0, danger: economics.marginPerMin < 0 }">{{ money(economics.marginPerMin) }}/min</strong><small v-if="economics.breakEvenPricePerKwh !== null">Break-even ${{ economics.breakEvenPricePerKwh.toFixed(4) }}/kWh</small></article>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Generator reference</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Generator</th><th>Rated power</th><th>Fuel / MWh</th><th>Availability</th></tr></thead><tbody><tr v-for="entry in kinds" :key="entry"><th>{{ generatorSpec(entry)!.name }}</th><td>{{ fmt(generatorSpec(entry)!.ratedKw, 0) }} kW</td><td class="text-cell">{{ generatorSpec(entry)!.fuels.length ? generatorSpec(entry)!.fuels.map(fuel => `${fuel.perMwh} × ${fuelLabel(fuel.item)}`).join(', ') : 'No fuel' }}</td><td>{{ Math.round(generatorSpec(entry)!.availability * 100) }}%</td></tr></tbody></table></div>
      <p class="form-note">Power is billed using the client's kWh-per-kW-per-minute factor ({{ POWER_MECHANICS.kwhPerKwMin }}). Fuel demand uses the client's per-MWh ratios; check actual consumption in game.</p>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Station build checklist</h2><NuxtLink to="/factory/recipes">Browse recipes →</NuxtLink></div>
      <p class="panel-note">Set how many of each power piece you need. Shared materials are combined before batches are rounded, with leftovers shown.</p>
      <div class="table-wrap"><table><thead><tr><th>Power piece</th><th>Quantity</th><th>Recipe</th></tr></thead><tbody><tr v-for="id in stationProducts" :key="id"><th>{{ itemName(id) }}</th><td><input v-model.number="counts[id]" type="number" min="0" max="1000" step="1" :aria-label="`${itemName(id)} quantity`"></td><td><NuxtLink :to="productPath(id)">Crafting →</NuxtLink></td></tr></tbody></table></div>
      <p v-if="checklist.hasCycle" class="form-note danger" role="status">A recipe cycle prevents this checklist from being calculated.</p>
      <template v-else-if="craftedRows.length">
        <h3>Materials to gather (external)</h3>
        <div class="table-wrap"><table><thead><tr><th>Item</th><th>Needed</th><th>Left over</th></tr></thead><tbody><tr v-for="row in externalRows" :key="row.itemId"><th><NuxtLink v-if="defaultRecipeFor(row.itemId)" :to="productPath(row.itemId)">{{ itemName(row.itemId) }}</NuxtLink><span v-else>{{ itemName(row.itemId) }}</span></th><td>{{ fmt(row.required) }}</td><td>{{ fmt(row.excess) }}</td></tr></tbody></table></div>
        <h3>Intermediate crafting</h3>
        <div class="table-wrap"><table><thead><tr><th>Item</th><th>Batches</th><th>Produced</th><th>Left over</th></tr></thead><tbody><tr v-for="row in craftedRows" :key="row.itemId"><th><NuxtLink :to="productPath(row.itemId)">{{ itemName(row.itemId) }}</NuxtLink></th><td>{{ fmt(row.batches) }}</td><td>{{ fmt(row.output) }}</td><td>{{ fmt(row.excess) }}</td></tr></tbody></table></div>
      </template>
      <p v-else class="form-note">Enter at least one power piece to build the shopping list.</p>
    </section>
    <div class="button-row reference-actions"><NuxtLink class="button" to="/tools/electricity">Estimate electricity bills</NuxtLink><NuxtLink class="button" to="/factory/shopping">Combined shopping list</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ POWER_MECHANICS.evidence }}</p>
  </main>
</template>
