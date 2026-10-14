<script setup lang="ts">
import { CLIMATE_MECHANICS, machineHeat, roomTemperature } from '../utils/climate'
import { POWER_MECHANICS, costPerMinute, machineDrawKwForStation, optionContinuousKw } from '../utils/power'
import { itemName } from '../utils/factory/catalog'

interface MachineCount { stationId: string; count: number }
const props = defineProps<{ machines: MachineCount[]; label?: string }>()

const latDeg = ref(40)
const areaM2 = ref(64)
const floor = ref(0)
const pricePerKwh = ref<number>(POWER_MECHANICS.defaultPricePerKwh)

const activeMachines = computed(() => props.machines.filter(machine => machine.count > 0))
const units = computed(() => Object.fromEntries(activeMachines.value.map(machine => [machine.stationId, machine.count])))
const heatPerStation = computed(() => activeMachines.value.map(machine => ({ stationId: machine.stationId, count: machine.count, heat: machineHeat(machine.stationId) * machine.count })).filter(entry => entry.heat !== 0).sort((a, b) => b.heat - a.heat))
const totalHeat = computed(() => heatPerStation.value.reduce((sum, entry) => sum + entry.heat, 0))
const result = computed(() => roomTemperature({ latDeg: Math.min(90, Math.max(-90, latDeg.value)), floor: Math.trunc(floor.value), areaM2: areaM2.value, units: units.value }))
const acs = computed(() => result.value.acsToCool)
const heaters = computed(() => result.value.tempC < CLIMATE_MECHANICS.config.comfortLow ? Math.ceil((CLIMATE_MECHANICS.config.comfortLow - result.value.tempC) * result.value.areaM2 / CLIMATE_MECHANICS.config.acCoolingPerUnit) : 0)
const machinePowerKw = computed(() => activeMachines.value.reduce((sum, machine) => sum + machineDrawKwForStation(machine.stationId) * machine.count, 0))
const acPowerKw = computed(() => optionContinuousKw('industrial_ac') * acs.value)
const totalKw = computed(() => machinePowerKw.value + acPowerKw.value)
const costMin = computed(() => costPerMinute(totalKw.value, pricePerKwh.value))
const telemetry = useToolTelemetry('planner-climate-power')
watch([activeMachines, latDeg, areaM2, floor], () => {
  if (!activeMachines.value.length) return
  telemetry.calculated({ machine_count: activeMachines.value.reduce((sum, machine) => sum + machine.count, 0), total_heat: totalHeat.value, acs: acs.value, heaters: heaters.value, total_kw: Math.round(totalKw.value * 100) / 100, temp_c: Math.round(result.value.tempC * 10) / 10, cold: heaters.value > 0 })
})
function fmt(value: number, digits = 2) { return value.toLocaleString('en-US', { maximumFractionDigits: digits }) }
function money(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` }
</script>

<template>
  <section class="factory-panel reference-content">
    <div class="panel-title"><h3>Heat, cooling &amp; power</h3><NuxtLink to="/tools/cooling">Cooling planner →</NuxtLink></div>
    <p class="panel-note">Machines give off heat and draw power. Enter the room latitude and area to estimate the temperature, slowdown, air conditioners and electricity cost of the assigned machines.</p>
    <div class="equipment-form">
      <div><label for="climate-lat">Latitude (degrees)</label><input id="climate-lat" v-model.number="latDeg" type="number" min="-90" max="90" step="0.1"></div>
      <div><label for="climate-area">Room area (m²)</label><input id="climate-area" v-model.number="areaM2" type="number" min="8" step="any"></div>
      <div><label for="climate-floor">Floor</label><input id="climate-floor" v-model.number="floor" type="number" min="-10" max="200" step="1"></div>
      <div><label for="climate-price">Electricity price (per kWh)</label><input id="climate-price" v-model.number="pricePerKwh" type="number" min="0.01" max="5" step="0.001"></div>
    </div>
    <div class="kpi-grid" aria-label="Heat and power">
      <article><span>Machine heat</span><strong>{{ fmt(totalHeat, 0) }}</strong><small>{{ heatPerStation.length }} heat sources</small></article>
      <article><span>Room temperature</span><strong>{{ fmt(result.tempC) }} °C</strong><small>{{ result.category }}</small></article>
      <article><span>Production speed</span><strong :class="{ danger: result.speedFactor < 1 }">{{ fmt(result.speedFactor * 100, 1) }}%</strong><small v-if="result.slowdownPercent">−{{ fmt(result.slowdownPercent, 1) }}% from heat</small></article>
      <article><span>Machines draw</span><strong>{{ fmt(machinePowerKw) }} kW</strong></article>
    </div>
    <p v-if="!activeMachines.length" class="form-note" role="status">No machines assigned yet. Add production lines to estimate heat and power.</p>
    <template v-else>
      <p v-if="acs > 0" class="reference-answer" role="status">This room runs at {{ fmt(result.tempC) }} °C and needs <strong>{{ acs }} industrial AC(s)</strong> to cool (≈ {{ fmt(acPowerKw) }} kW). Total draw including cooling is {{ fmt(totalKw) }} kW, about <strong>{{ money(costMin) }}/min</strong> at the entered price. <NuxtLink to="/tools/electricity">Compare power draws</NuxtLink> or <NuxtLink to="/tools/cooling">open the cooling planner</NuxtLink>.</p>
      <p v-else-if="heaters > 0" class="reference-answer" role="status">This room runs cold at {{ fmt(result.tempC) }} °C. Add about <strong>{{ heaters }} industrial heater(s)</strong> to reach the comfortable band. The assigned machines draw {{ fmt(machinePowerKw) }} kW, about <strong>{{ money(costMin) }}/min</strong>. <NuxtLink to="/tools/cooling">Model heaters and cooling</NuxtLink>.</p>
      <p v-else class="reference-answer" role="status">This room runs at {{ fmt(result.tempC) }} °C, which is within the comfort range, so no cooling or heating is required. The assigned machines draw {{ fmt(machinePowerKw) }} kW, about <strong>{{ money(costMin) }}/min</strong> at the entered price. <NuxtLink to="/tools/electricity">Estimate electricity</NuxtLink>.</p>
      <div class="table-wrap"><table><thead><tr><th>Machine</th><th>Count</th><th>Heat</th><th>Draw (kW)</th></tr></thead><tbody><tr v-for="machine in activeMachines" :key="machine.stationId"><th>{{ itemName(machine.stationId) }}</th><td>{{ machine.count }}</td><td>{{ machineHeat(machine.stationId) * machine.count }}</td><td>{{ fmt(machineDrawKwForStation(machine.stationId) * machine.count) }}</td></tr></tbody></table></div>
    </template>
    <p class="form-note">Heat, temperature and slowdown follow the client model. Cooling assumes industrial AC units (1500 heat removed each). Power uses the client's kWh conversion; verify in game after an update.</p>
  </section>
</template>
