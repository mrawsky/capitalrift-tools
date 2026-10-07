<script setup lang="ts">
import { EQUIPMENT_MECHANICS, miningAssignment } from '../../utils/equipment'
import { FACTORY_CATALOG, itemName, productPath } from '../../utils/factory/catalog'
useToolSeo('Capital Rift Mining Equipment & Supply Estimator', 'Estimate Capital Rift mining supply from your measured base rate, crew, and vehicle multipliers. Compare equipment and add the estimate to a factory plan.', true)
const miners = ref(1)
const baseRate = ref(1)
const vehicles = reactive<Record<string, number>>({})
const itemId = ref('iron_ore')
const message = ref('')
const { selectedFactory, initialize, addSupply, touchFactory } = useFactoryPlanner()
onMounted(initialize)
const multipliers = computed(() => miningAssignment(miners.value, vehicles))
const valid = computed(() => Number.isInteger(miners.value) && miners.value > 0 && miners.value <= 1000 && Number.isFinite(baseRate.value) && baseRate.value > 0 && EQUIPMENT_MECHANICS.mining.every(entry => vehicles[entry.itemId] === undefined || (Number.isInteger(vehicles[entry.itemId]) && vehicles[entry.itemId]! >= 0 && vehicles[entry.itemId]! <= 1000)))
const rate = computed(() => valid.value ? baseRate.value * multipliers.value.reduce((sum, value) => sum + value, 0) : null)
const minerals = ['concrete', 'iron_ore', 'copper_ore', 'gold_ore', 'lithium_ore', 'quartz', 'marble', 'crude_oil'].filter(id => FACTORY_CATALOG.itemById.has(id)).map(id => ({ value: id, label: itemName(id) }))
function addEstimate() { if (!selectedFactory.value || rate.value === null || !Number.isFinite(rate.value)) return; addSupply(itemId.value); const line = selectedFactory.value.supplies.at(-1)!; line.ratePerMinute = rate.value; line.label = 'User-entered mining estimate'; touchFactory(); message.value = `Added ${rate.value.toFixed(3)}/min ${itemName(itemId.value)} to ${selectedFactory.value.name}. Verify the supply rate in game.` }
</script>
<template>
  <main id="main-content" class="factory-page"><ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Mining equipment' }]" /><FactoryPageHeader eyebrow="Mining & resource supply" title="Equip your mining crew." description="The saved client assigns the strongest available mining vehicles first, one per miner. Enter your own base supply rate per miner without a vehicle to estimate equipment effects." />
    <section class="factory-panel reference-content"><div class="equipment-form"><div><label for="miners">Miners on this parcel</label><input id="miners" v-model.number="miners" type="number" min="1" max="1000" step="1"></div><div><label for="mining-base">Measured base units / min per miner</label><input id="mining-base" v-model.number="baseRate" type="number" min="0.0001" step="any"></div><div><label for="mined-item">Supply item</label><SearchableSelect id="mined-item" v-model="itemId" :options="minerals" /></div></div><p class="form-note">Use a baseline for the selected resource without a vehicle multiplier. This estimate excludes changing ore mix, depletion, travel, storage bottlenecks, and extra yield effects.</p></section>
    <section class="factory-panel"><div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Client multiplier</th><th>Available on parcel</th></tr></thead><tbody><tr v-for="entry in EQUIPMENT_MECHANICS.mining" :key="entry.itemId"><th><NuxtLink :to="productPath(entry.itemId)">{{ itemName(entry.itemId) }}</NuxtLink></th><td>{{ entry.multiplier }}×</td><td><input v-model.number="vehicles[entry.itemId]" type="number" min="0" max="1000" step="1" placeholder="0" :aria-label="`${itemName(entry.itemId)} count`"></td></tr></tbody></table></div></section>
    <section class="factory-panel reference-content"><p v-if="rate !== null" class="reference-answer" role="status">Estimated supply: <strong>{{ rate.toLocaleString('en-US', { maximumFractionDigits: 3 }) }} {{ itemName(itemId) }}/min</strong>. {{ multipliers.filter(value => value > 1).length }} miners have a vehicle; {{ multipliers.filter(value => value === 1).length }} use the base rate.</p><p v-else class="danger" role="status">Enter positive rates and whole miner/vehicle counts within the displayed limits.</p><button class="button" type="button" :disabled="!selectedFactory || rate === null" @click="addEstimate">Add estimate to selected factory</button><p v-if="!selectedFactory" class="form-note"><NuxtLink to="/factory/production">Create or select a factory</NuxtLink> to add this estimate as an external supply.</p><p class="form-note" role="status">{{ message }}</p></section>
    <section class="factory-panel tool-guide" aria-labelledby="mining-workflow-title">
      <header class="tool-guide__header">
        <p class="eyebrow accent">Resource workflow</p>
        <h2 id="mining-workflow-title">From land to factory supplies</h2>
        <p>Check each part of the supply chain before relying on your mining estimate.</p>
      </header>
      <ol class="tool-guide__steps" role="list">
        <li><div><strong>Check your land</strong><p>Confirm ownership and survey information in game before staking a mining zone.</p></div></li>
        <li><div><strong>Prepare your crew</strong><p>Check miners, available vehicles, and yard storage. Resources depend on the location.</p></div></li>
        <li><div><strong>Measure the output</strong><p>Use the actual resource rate to update your factory’s external supply.</p></div></li>
        <li><div><strong>Connect the supply chain</strong><p>Check <NuxtLink to="/tools/storage">storage capacity</NuxtLink> and <NuxtLink to="/tools/hauling">hauling</NuxtLink> before relying on network surplus.</p></div></li>
      </ol>
      <div class="tool-guide__related">
        <h3>Need survey equipment?</h3>
        <div class="button-row"><NuxtLink class="text-button" :to="productPath('survey_tripod')">Survey Tripod →</NuxtLink><NuxtLink class="text-button" :to="productPath('survey_tower')">Survey Tower →</NuxtLink><NuxtLink class="text-button" :to="productPath('survey_array')">Survey Array →</NuxtLink></div>
        <p class="form-note">These links cover crafting. Check equipment operation and placement in game.</p>
      </div>
    </section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ EQUIPMENT_MECHANICS.evidence }} The mining Haul Truck and hauling Box Truck are distinct equipment.</p>
  </main>
</template>
