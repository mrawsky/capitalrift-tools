<script setup lang="ts">
import { EQUIPMENT_MECHANICS, tripsRequired } from '../../utils/equipment'
useToolSeo('Capital Rift Hauling Calculator & Delivery Setup', 'Compare saved-client vehicle cargo capacities, calculate trips for your materials, and check delivery requests and storage before setting up hauling.', true)
const vehicle = ref(EQUIPMENT_MECHANICS.hauling[0]!.id)
const quantity = ref(1000)
const capacityOverride = ref<number | ''>('')
const selected = computed(() => EQUIPMENT_MECHANICS.hauling.find(entry => entry.id === vehicle.value)!)
const capacity = computed(() => capacityOverride.value === '' ? selected.value.cargo : Number(capacityOverride.value))
const trips = computed(() => tripsRequired(quantity.value, capacity.value))
const options = EQUIPMENT_MECHANICS.hauling.map(entry => ({ value: entry.id, label: `${entry.name} (${entry.mode})` }))
function fmt(value: number) { return value.toLocaleString('en-US') }
</script>
<template>
  <main id="main-content" class="factory-page"><ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Hauling calculator' }]" /><FactoryPageHeader eyebrow="Materials & logistics" title="How many hauling trips?" description="Choose a vehicle and enter the quantity to move. Trips assume the whole cargo capacity can be used for these items; mixed loads and route restrictions must be checked separately." />
    <section class="factory-panel reference-content"><div class="equipment-form"><div><label for="haul-vehicle">Vehicle</label><SearchableSelect id="haul-vehicle" v-model="vehicle" :options="options" /></div><div><label for="haul-quantity">Units to move</label><input id="haul-quantity" v-model.number="quantity" type="number" min="0" step="any"></div><div><label for="haul-capacity">Current in-game capacity (optional)</label><input id="haul-capacity" v-model.number="capacityOverride" type="number" min="1" step="any" :placeholder="String(selected.cargo)"></div></div><p v-if="trips !== null" class="reference-answer" role="status">{{ fmt(quantity) }} units ÷ {{ fmt(capacity) }} units/trip = <strong>{{ fmt(trips) }} trips</strong>, rounded up.</p><p v-else class="danger" role="status">Enter a finite nonnegative quantity and a positive capacity.</p><p class="form-note">The optional override lets you use the capacity displayed for your vehicle, including any applicable bonuses. No route duration, loading time, freight fee, or profitability is predicted.</p></section>
    <section class="factory-panel"><div class="panel-title"><h2>Vehicle cargo reference</h2></div><div class="table-wrap"><table><thead><tr><th>Vehicle</th><th>Transport</th><th>Base cargo units</th></tr></thead><tbody><tr v-for="entry in EQUIPMENT_MECHANICS.hauling" :key="entry.id"><th>{{ entry.name }}</th><td>{{ entry.mode }}</td><td>{{ fmt(entry.cargo) }}</td></tr></tbody></table></div></section>
    <section class="factory-panel tool-guide" aria-labelledby="hauling-checklist-title">
      <header class="tool-guide__header">
        <p class="eyebrow accent">Delivery setup</p>
        <h2 id="hauling-checklist-title">Hauling setup checklist</h2>
        <p>Work through these checks to make sure your materials can reach the factory.</p>
      </header>
      <ol class="tool-guide__steps" role="list">
        <li><div><strong>Make room at the destination</strong><p>Check that it has a delivery space and enough room to receive the load.</p></div></li>
        <li><div><strong>Set a delivery request</strong><p>Choose the items or categories and enter an amount. An acceptance filter alone does not request a delivery.</p></div></li>
        <li><div><strong>Enable shipping at the source</strong><p>Configure what it ships out so the network can use the available stock.</p></div></li>
        <li><div><strong>Check storage and the route</strong><p>Confirm accepted goods, free capacity, vehicle availability, and any driver or route requirements in game.</p></div></li>
        <li><div><strong>Match supply to demand</strong><p>Compare the delivered supply per minute with your <NuxtLink to="/factory/statistics">factory demand</NuxtLink>.</p></div></li>
      </ol>
      <div class="tool-guide__actions"><NuxtLink class="button" to="/tools/storage">Compare storage →</NuxtLink></div>
    </section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ EQUIPMENT_MECHANICS.evidence }} Setup guidance comes from the saved client's delivery advice.</p>
  </main>
</template>
