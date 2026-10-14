<script setup lang="ts">
import { CLIMATE_MECHANICS, heatOptions, outdoorTemperature, roomTemperature } from '../../utils/climate'
import { POWER_MECHANICS, costPerMinute, optionContinuousKw } from '../../utils/power'
useToolSeo('Capital Rift Room Temperature & Cooling Planner', 'Estimate Capital Rift room temperature from latitude, floor, area and machines, then see the production slowdown and the air conditioners needed to cool it.', true)
const latDeg = ref(40)
const floor = ref(0)
const areaM2 = ref(64)
const pricePerKwh = ref<number>(POWER_MECHANICS.defaultPricePerKwh)
const heatSources = heatOptions()
const byId = new Map(heatSources.map(source => [source.id, source]))
const heatOptionsList = heatSources.map(source => ({ value: source.id, label: `${source.name} (${source.value > 0 ? '+' : ''}${source.value})` }))
let uid = 0
interface Unit { id: number; sourceId: string; count: number }
const units = ref<Unit[]>([{ id: uid++, sourceId: 'furnace', count: 1 }])
function addUnit() { units.value.push({ id: uid++, sourceId: '', count: 1 }) }
function removeUnit(id: number) { units.value = units.value.filter(unit => unit.id !== id) }
const unitMap = computed(() => { const map: Record<string, number> = {}; for (const unit of units.value) if (unit.sourceId && Number.isFinite(unit.count)) map[unit.sourceId] = (map[unit.sourceId] ?? 0) + Math.max(0, unit.count); return map })
const result = computed(() => roomTemperature({ latDeg: Math.min(90, Math.max(-90, latDeg.value)), floor: Math.trunc(floor.value), areaM2: areaM2.value, units: unitMap.value }))
const acKw = computed(() => optionContinuousKw('industrial_ac') * result.value.acsToCool)
const acCostMin = computed(() => costPerMinute(acKw.value, pricePerKwh.value))
const telemetry = useToolTelemetry('cooling')
watch([result, pricePerKwh], () => telemetry.calculated({ lat_deg: latDeg.value, area_m2: areaM2.value, temp_c: Math.round(result.value.tempC * 10) / 10, acs: result.value.acsToCool, slowdown_percent: result.value.slowdownPercent, machine_count: Object.keys(unitMap.value).length }))
function fmt(value: number, digits = 2) { return value.toLocaleString('en-US', { maximumFractionDigits: digits }) }
function money(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Cooling planner' }]" />
    <FactoryPageHeader eyebrow="Power & climate" title="Will this room run hot?" description="Enter the room's latitude, floor and area, then the machines and climate devices it holds. Hot rooms slow machines and workers, and air conditioners cost power to run." />
    <section class="factory-panel reference-content">
      <div class="equipment-form">
        <div><label for="cool-lat">Latitude (degrees)</label><input id="cool-lat" v-model.number="latDeg" type="number" min="-90" max="90" step="0.1"></div>
        <div><label for="cool-floor">Floor (0 = ground)</label><input id="cool-floor" v-model.number="floor" type="number" min="-10" max="200" step="1"></div>
        <div><label for="cool-area">Room area (m²)</label><input id="cool-area" v-model.number="areaM2" type="number" min="8" step="any"></div>
        <div><label for="cool-price">Electricity price (per kWh)</label><input id="cool-price" v-model.number="pricePerKwh" type="number" min="0.01" max="5" step="0.001"></div>
      </div>
      <p class="form-note">Outdoor temperature follows 27°C minus 32°C scaled by sin²(latitude). Basements are cooler; upper floors are warmer. Area is clamped to at least {{ CLIMATE_MECHANICS.config.minArea }} m².</p>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Heat sources in the room</h2><button class="button" type="button" @click="addUnit">Add source</button></div>
      <div class="table-wrap"><table><thead><tr><th>Machine or device</th><th>Count</th><th>Heat</th><th></th></tr></thead><tbody>
        <tr v-for="unit in units" :key="unit.id">
          <th><SearchableSelect :id="`cool-source-${unit.id}`" v-model="unit.sourceId" :options="heatOptionsList" placeholder="Choose a machine or device…" /></th>
          <td><input v-model.number="unit.count" type="number" min="0" max="1000" step="1" :aria-label="`${byId.get(unit.sourceId)?.name || 'source'} count`"></td>
          <td>{{ unit.sourceId ? `${(byId.get(unit.sourceId)?.value ?? 0) > 0 ? '+' : ''}${byId.get(unit.sourceId)?.value ?? 0}` : '—' }}</td>
          <td><button class="icon-button" type="button" :aria-label="`Remove ${byId.get(unit.sourceId)?.name || 'source'}`" @click="removeUnit(unit.id)">×</button></td>
        </tr>
      </tbody></table></div>
    </section>
    <section class="kpi-grid" aria-label="Room temperature">
      <article><span>Room temperature</span><strong>{{ fmt(result.tempC) }} °C</strong><small>{{ result.category }}</small></article>
      <article><span>Outdoor / building</span><strong>{{ fmt(result.outdoorC) }} / {{ fmt(result.buildingC) }} °C</strong></article>
      <article><span>Production speed</span><strong :class="{ danger: result.speedFactor < 1 }">{{ fmt(result.speedFactor * 100, 1) }}%</strong><small v-if="result.slowdownPercent">−{{ fmt(result.slowdownPercent, 1) }}% from heat</small></article>
      <article><span>Industrial ACs needed</span><strong>{{ result.acsToCool }}</strong><small v-if="result.acsToCool">≈ {{ fmt(acKw) }} kW</small></article>
    </section>
    <section class="factory-panel reference-content">
      <p class="reference-answer" role="status">Above {{ CLIMATE_MECHANICS.config.comfortThreshold }}°C each extra degree removes {{ CLIMATE_MECHANICS.config.slowdownPerDegree * 100 }}% of speed, down to a floor of {{ CLIMATE_MECHANICS.config.slowdownFloor * 100 }}%. Each industrial AC removes about {{ CLIMATE_MECHANICS.config.acCoolingPerUnit }} heat from a room this size.</p>
      <ul class="reference-links">
        <li>Breakdown: building {{ fmt(result.buildingC) }}°C + floor depth {{ fmt(result.depthC) }}°C + devices {{ fmt(result.devicesC) }}°C + machines {{ fmt(result.machinesC) }}°C.</li>
        <li v-if="result.acsToCool">Cooling the room with {{ result.acsToCool }} industrial AC(s) costs about {{ money(acCostMin) }}/min at the entered price.</li>
        <li v-else-if="result.tempC < CLIMATE_MECHANICS.config.comfortLow">The room is below the comfortable band; add a heater such as an industrial heater (1500 heat) if that matters here.</li>
        <li v-else>The room is within the comfortable band; no cooling is required.</li>
      </ul>
    </section>
    <div class="button-row reference-actions"><NuxtLink class="button" to="/tools/electricity">Estimate electricity bills</NuxtLink><NuxtLink class="button" to="/tools/power-station">Compare power stations</NuxtLink><NuxtLink class="button" :to="{ path: '/factory/recipes', query: { search: 'Air Conditioner' } }">Craft an Air Conditioner</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ CLIMATE_MECHANICS.evidence }} Production slowdown is a client model; check the room in game after an update.</p>
  </main>
</template>
