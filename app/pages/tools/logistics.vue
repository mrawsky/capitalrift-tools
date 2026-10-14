<script setup lang="ts">
import { EQUIPMENT_MECHANICS, containersRequired, throughputPlan, tripsRequired } from '../../utils/equipment'
import { itemName, productPath } from '../../utils/factory/catalog'
useToolSeo('Capital Rift Logistics: Hauling, Storage & Transport Throughput', 'Plan Capital Rift logistics: calculate hauling trips from vehicle capacity, compare storage, and turn a measured round trip into vehicles, delivery frequency and buffer stock.', true)
const vehicle = ref(EQUIPMENT_MECHANICS.hauling[0]!.id)
const quantity = ref(1000)
const capacityOverride = ref<number | ''>('')
const selected = computed(() => EQUIPMENT_MECHANICS.hauling.find(entry => entry.id === vehicle.value)!)
const capacity = computed(() => capacityOverride.value === '' ? selected.value.cargo : Number(capacityOverride.value))
const trips = computed(() => tripsRequired(quantity.value, capacity.value))
const storageIds = ['crate', 'rack', 'cabinet', 'shelving_unit', 'stockroom_rack', 'storage_locker', 'pallet_rack', 'lumber_stack', 'shipping_container', 'grain_silo', 'oil_drum']
const storageValues = reactive<Record<string, { capacity?: number; accepts: string; placement: string }>>({})
for (const id of storageIds) storageValues[id] = { accepts: '', placement: '' }
const ranked = computed(() => storageIds.filter(id => Number.isFinite(storageValues[id]?.capacity) && (storageValues[id]?.capacity ?? 0) > 0).sort((a, b) => storageValues[b]!.capacity! - storageValues[a]!.capacity!))
function setCapacity(id: string, event: Event) { const text = (event.target as HTMLInputElement).value; storageValues[id]!.capacity = text === '' ? undefined : Number(text) }
const demandPerMinute = ref(60)
const roundTripMinutes = ref(8)
const throughput = computed(() => throughputPlan(demandPerMinute.value, capacity.value, roundTripMinutes.value))
const telemetry = useToolTelemetry('logistics')
watch([trips, throughput], () => telemetry.calculated({ vehicle: vehicle.value, quantity: quantity.value, trips: trips.value, demand_per_min: demandPerMinute.value, vehicles_needed: throughput.value?.vehiclesNeeded ?? null, buffer_stock: throughput.value === null ? null : Math.round(throughput.value.bufferStock * 100) / 100 }))
function fmt(value: number, digits = 0) { return value.toLocaleString('en-US', { maximumFractionDigits: digits }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Logistics' }]" />
    <FactoryPageHeader eyebrow="Materials & logistics" title="Move it and store it." description="Calculate hauling trips, compare storage you can use, and connect a measured round trip to a steady factory demand. Enter your in-game capacities where your setup differs." />
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Hauling trips</h2></div>
      <div class="equipment-form">
        <div><label for="log-vehicle">Vehicle</label><SearchableSelect id="log-vehicle" v-model="vehicle" :options="EQUIPMENT_MECHANICS.hauling.map(entry => ({ value: entry.id, label: `${entry.name} (${entry.mode})` }))" /></div>
        <div><label for="log-quantity">Units to move</label><input id="log-quantity" v-model.number="quantity" type="number" min="0" step="any"></div>
        <div><label for="log-capacity">Current capacity (optional)</label><input id="log-capacity" v-model.number="capacityOverride" type="number" min="1" step="any" :placeholder="String(selected.cargo)"></div>
      </div>
      <p v-if="trips !== null" class="reference-answer" role="status">{{ fmt(quantity) }} units ÷ {{ fmt(capacity) }} units/trip = <strong>{{ fmt(trips) }} trips</strong>, rounded up.</p>
      <p v-else class="danger" role="status">Enter a finite nonnegative quantity and a positive capacity.</p>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Transport throughput</h2></div>
      <p class="panel-note">Connect a vehicle to a steady demand. Measure one round trip in game and enter how long it takes.</p>
      <div class="equipment-form">
        <div><label for="log-demand">Factory demand / min</label><input id="log-demand" v-model.number="demandPerMinute" type="number" min="0" step="any"></div>
        <div><label for="log-roundtrip">Round trip (minutes)</label><input id="log-roundtrip" v-model.number="roundTripMinutes" type="number" min="0.1" step="any"></div>
      </div>
      <ul v-if="throughput" class="reference-links">
        <li>One vehicle carries about <strong>{{ fmt(throughput.perVehiclePerMinute, 3) }} units/min</strong> ({{ fmt(throughput.tripsPerHour, 2) }} trips/hour).</li>
        <li>Vehicles needed: <strong>{{ throughput.vehiclesNeeded }}</strong>.</li>
        <li>Stock consumed between deliveries (buffer): <strong>{{ fmt(throughput.bufferStock) }} units</strong>.</li>
      </ul>
      <p v-else class="danger" role="status">Enter a positive capacity and a round trip of at least a tenth of a minute.</p>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Vehicle cargo reference</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Vehicle</th><th>Transport</th><th>Base cargo units</th><th>Trips for {{ fmt(quantity) }}</th></tr></thead><tbody><tr v-for="entry in EQUIPMENT_MECHANICS.hauling" :key="entry.id"><th>{{ entry.name }}</th><td>{{ entry.mode }}</td><td>{{ fmt(entry.cargo) }}</td><td>{{ tripsRequired(quantity, entry.cargo) }}</td></tr></tbody></table></div>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Storage comparison</h2></div>
      <p class="panel-note">Enter capacities from your game, then compare how many containers your stock needs. Placement defaults may be overridden by the server.</p>
      <div class="table-wrap"><table class="storage-comparison"><thead><tr><th>Storage</th><th>In-game capacity</th><th>Containers needed</th><th>Accepted items</th><th>Placement notes</th></tr></thead><tbody><tr v-for="id in storageIds" :key="id"><th><NuxtLink :to="productPath(id)">{{ itemName(id) }}</NuxtLink></th><td><input :value="storageValues[id]!.capacity ?? ''" type="number" min="1" step="any" placeholder="Unknown" :aria-label="`${itemName(id)} in-game capacity`" @input="setCapacity(id, $event)"></td><td>{{ containersRequired(quantity, storageValues[id]!.capacity) ?? 'Unknown / invalid' }}</td><td><input v-model="storageValues[id]!.accepts" :aria-label="`${itemName(id)} accepted items`" placeholder="Check in game"></td><td><input v-model="storageValues[id]!.placement" :aria-label="`${itemName(id)} placement restrictions`" placeholder="Check in game"></td></tr></tbody></table></div>
      <p v-if="ranked.length" class="form-note" role="status">Largest entered capacity: {{ itemName(ranked[0]!) }}, {{ storageValues[ranked[0]!]!.capacity }} units. Check accepted goods and placement before choosing it.</p>
    </section>
    <section class="factory-panel tool-guide" aria-labelledby="logistics-checklist-title">
      <header class="tool-guide__header"><p class="eyebrow accent">Delivery setup</p><h2 id="logistics-checklist-title">Logistics checklist</h2><p>Work through these checks so materials can leave the source, arrive, and be stored.</p></header>
      <ol class="tool-guide__steps" role="list">
        <li><div><strong>Make room at the destination</strong><p>Confirm a delivery space and enough free storage to receive the load.</p></div></li>
        <li><div><strong>Set a delivery request</strong><p>Choose items or categories and enter an amount. An acceptance filter alone does not request a delivery.</p></div></li>
        <li><div><strong>Enable shipping at the source</strong><p>Configure what it ships out so the network can use the stock.</p></div></li>
        <li><div><strong>Match supply to demand</strong><p>Compare delivered units per minute with your <NuxtLink to="/factory/statistics">factory demand</NuxtLink>.</p></div></li>
      </ol>
      <div class="tool-guide__actions"><NuxtLink class="button" to="/tools/resources">Survey & resources →</NuxtLink></div>
    </section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ EQUIPMENT_MECHANICS.evidence }} No route duration, loading time, freight fee, or profitability is predicted; enter your own measurements.</p>
  </main>
</template>
