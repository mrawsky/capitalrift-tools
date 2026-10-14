<script setup lang="ts">
import { POWER_MECHANICS, categoryLabel, costPerMinute, drawOptionGroups, drawOptions, kwhPerMinute, optionContinuousKw, priceCurvePosition } from '../../utils/power'
import type { MachineState } from '../../utils/power'
useToolSeo('Capital Rift Electricity Cost Calculator & Power Draw', 'Estimate Capital Rift electricity bills from machine, appliance and climate-control power draw. Compare running, idle and paused equipment using your regional power price.', true)
const price = ref<number>(POWER_MECHANICS.defaultPricePerKwh)
const options = drawOptions()
const byId = new Map(options.map(option => [option.id, option]))
const optionOptions = options.map(option => ({ value: option.id, label: `${option.name} — ${categoryLabel(option.category)}` }))
const groups = drawOptionGroups()
let uid = 0
interface Row { id: number; optionId: string; count: number; state: MachineState }
const rows = ref<Row[]>([{ id: uid++, optionId: '', count: 1, state: 'running' }])
function addRow() { rows.value.push({ id: uid++, optionId: '', count: 1, state: 'running' }) }
function removeRow(id: number) { rows.value = rows.value.filter(row => row.id !== id) }
function isMachine(id: string) { return byId.get(id)?.category === 'machines' }
function rowKw(row: Row) { return optionContinuousKw(row.optionId, isMachine(row.optionId) ? row.state : 'running') * Math.max(0, row.count) }
const lines = computed(() => rows.value.filter(row => row.optionId).map(row => ({ key: row.id, label: byId.get(row.optionId)?.name ?? row.optionId, category: byId.get(row.optionId)?.category ?? 'devices', count: Math.max(0, row.count), kw: rowKw(row), cost: costPerMinute(rowKw(row), price.value) })))
const totalKw = computed(() => lines.value.reduce((sum, line) => sum + line.kw, 0))
const totalCostMin = computed(() => costPerMinute(totalKw.value, price.value))
const clampedPrice = computed(() => Math.min(POWER_MECHANICS.priceCeiling, Math.max(POWER_MECHANICS.priceFloor, Number.isFinite(price.value) ? price.value : POWER_MECHANICS.defaultPricePerKwh)))
const curve = computed(() => priceCurvePosition(clampedPrice.value))
const gridFuels = Object.entries(POWER_MECHANICS.gridFuels as Record<string, { mcPerMwh: number; capacityFactor: number; availability: number; color: string }>).sort((a, b) => a[1].mcPerMwh - b[1].mcPerMwh)
const telemetry = useToolTelemetry('electricity')
watch([totalKw, price], () => telemetry.calculated({ option_count: lines.value.length, total_kw: Math.round(totalKw.value * 100) / 100, cost_per_min: Math.round(totalCostMin.value * 1000) / 1000, price_per_kwh: Number(price.value) }))
function money(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` }
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 3 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Electricity cost' }]" />
    <FactoryPageHeader eyebrow="Power & bills" title="What does it cost to run?" description="Add the devices, kitchen stations, factory machines or survey gear you run and enter the price you pay. Running machines draw their full rating, idle machines a standby share, and paused machines nothing." />
    <section class="factory-panel reference-content">
      <div class="equipment-form">
        <div><label for="power-price">Electricity price (per kWh)</label><input id="power-price" v-model.number="price" type="number" min="0.01" max="5" step="0.001"></div>
        <div><label for="power-curve">Grid position</label><input id="power-curve" :value="curve" type="range" min="0" max="1" step="0.01" @input="price = POWER_MECHANICS.priceFloor * Math.pow(POWER_MECHANICS.priceCeiling / POWER_MECHANICS.priceFloor, Number(($event.target as HTMLInputElement).value))"><small class="form-note">${{ POWER_MECHANICS.priceFloor }}–${{ POWER_MECHANICS.priceCeiling }}/kWh default curve</small></div>
      </div>
      <p class="form-note">The default is the client's ${{ POWER_MECHANICS.defaultPricePerKwh }}/kWh. Enter your region's price from the game for a closer estimate.</p>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Equipment running</h2><button class="button" type="button" @click="addRow">Add equipment</button></div>
      <div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Count</th><th>State</th><th>Draw (kW)</th><th>Cost / min</th><th></th></tr></thead><tbody>
        <tr v-for="row in rows" :key="row.id">
          <th><SearchableSelect :id="`power-option-${row.id}`" v-model="row.optionId" :options="optionOptions" placeholder="Choose equipment…" /></th>
          <td><input v-model.number="row.count" type="number" min="0" max="10000" step="1" :aria-label="`${row.optionId || 'equipment'} count`"></td>
          <td><select v-if="isMachine(row.optionId)" v-model="row.state" :aria-label="`${byId.get(row.optionId)?.name} state`"><option value="running">Running</option><option value="idle">Idle</option><option value="paused">Paused</option></select><span v-else class="form-note">Continuous</span></td>
          <td>{{ row.optionId ? fmt(rowKw(row)) : '—' }}</td>
          <td>{{ row.optionId ? money(costPerMinute(rowKw(row), price)) : '—' }}</td>
          <td><button class="icon-button" type="button" :aria-label="`Remove ${row.optionId || 'equipment'}`" @click="removeRow(row.id)">×</button></td>
        </tr>
      </tbody></table></div>
    </section>
    <section class="kpi-grid" aria-label="Estimated electricity cost">
      <article><span>Total draw</span><strong>{{ fmt(totalKw) }} kW</strong><small>{{ fmt(kwhPerMinute(totalKw)) }} kWh/min</small></article>
      <article><span>Cost / minute</span><strong>{{ money(totalCostMin) }}</strong></article>
      <article><span>Cost / hour</span><strong>{{ money(totalCostMin * 60) }}</strong></article>
      <article><span>Cost / day</span><strong>{{ money(totalCostMin * 60 * 24) }}</strong></article>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Power draw reference</h2></div>
      <p class="panel-note">Average draw from the saved client. Machine values are while working; idle machines use a {{ Math.round(POWER_MECHANICS.machineStandby * 100) }}% standby share and paused machines none.</p>
      <div v-for="group in groups" :key="group.category" class="reference-content"><h3>{{ group.label }}</h3><div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Rated</th><th>Duty</th><th>Average kW</th></tr></thead><tbody><tr v-for="option in group.options" :key="option.id"><th>{{ option.name }}</th><td>{{ option.watts >= 1000 ? `${fmt(option.watts / 1000)} kW` : `${option.watts} W` }}</td><td>{{ group.category === 'machines' || group.category === 'pumps' ? 'Continuous' : `${Math.round(option.duty * 100)}%` }}</td><td>{{ fmt(optionContinuousKw(option.id)) }}</td></tr></tbody></table></div></div>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Regional grid reference</h2></div>
      <p class="panel-note">The client uses a default price and a log curve between ${{ POWER_MECHANICS.priceFloor }} and ${{ POWER_MECHANICS.priceCeiling }}/kWh. Grid fuel mixes vary by region.</p>
      <p class="reference-answer" role="status">At <strong>${{ clampedPrice.toFixed(3) }}/kWh</strong> you sit at {{ Math.round(curve * 100) }}% of the client's price curve.</p>
      <div class="table-wrap"><table><thead><tr><th>Grid source</th><th>Marginal cost / MWh</th><th>Capacity factor</th><th>Availability</th></tr></thead><tbody><tr v-for="[name, fuel] in gridFuels" :key="name"><th>{{ name }}</th><td>${{ fuel.mcPerMwh }}</td><td>{{ Math.round(fuel.capacityFactor * 100) }}%</td><td>{{ Math.round(fuel.availability * 100) }}%</td></tr></tbody></table></div>
    </section>
    <div class="button-row reference-actions"><NuxtLink class="button" to="/tools/power-station">Compare power stations</NuxtLink><NuxtLink class="button" to="/tools/cooling">Plan room cooling</NuxtLink><NuxtLink class="button" to="/factory/recipes">Browse crafting recipes</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ POWER_MECHANICS.evidence }}</p>
  </main>
</template>
