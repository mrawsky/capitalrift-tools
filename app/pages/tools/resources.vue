<script setup lang="ts">
import { EQUIPMENT_MECHANICS, miningAssignment } from '../../utils/equipment'
import { FACTORY_CATALOG, itemName, productPath } from '../../utils/factory/catalog'
import { ANALYTICS_EVENTS } from '../../utils/analytics'
useToolSeo('Capital Rift Mining Equipment & Survey Notebook', 'Estimate Capital Rift mining supply from your base rate, crew and equipment, compare survey tools, and save deposits, rates and locations in a local survey notebook.', true)
const miners = ref(1)
const baseRate = ref(1)
const vehicles = reactive<Record<string, number>>({})
const itemId = ref('iron_ore')
const message = ref('')
const { selectedFactory, initialize, addSupply, touchFactory } = useFactoryPlanner()
const { notebook, ready, storageMessage, initialize: initNotebook, addDeposit, removeDeposit, clearNotebook, importBackup, exportBackup } = useResourceLibrary()
onMounted(() => { initialize(); initNotebook() })
const multipliers = computed(() => miningAssignment(miners.value, vehicles))
const valid = computed(() => Number.isInteger(miners.value) && miners.value > 0 && miners.value <= 1000 && Number.isFinite(baseRate.value) && baseRate.value > 0 && EQUIPMENT_MECHANICS.mining.every(entry => vehicles[entry.itemId] === undefined || (Number.isInteger(vehicles[entry.itemId]) && vehicles[entry.itemId]! >= 0 && vehicles[entry.itemId]! <= 1000)))
const rate = computed(() => valid.value ? baseRate.value * multipliers.value.reduce((sum, value) => sum + value, 0) : null)
const telemetry = useToolTelemetry('resources')
watch(rate, () => { if (rate.value !== null) telemetry.calculated({ resource: itemId.value, miners: miners.value, rate_per_min: Math.round(rate.value * 1000) / 1000 }) })
const minerals = ['coal', 'concrete', 'iron_ore', 'copper_ore', 'gold_ore', 'lithium_ore', 'quartz', 'marble', 'crude_oil'].filter(id => FACTORY_CATALOG.itemById.has(id)).map(id => ({ value: id, label: itemName(id) }))
const surveyGear = ['survey_tripod', 'survey_tower', 'survey_array'].filter(id => FACTORY_CATALOG.itemById.has(id)).map(id => ({ value: id, label: itemName(id) }))
const depositItem = ref('iron_ore')
const depositRate = ref<number | ''>('')
const depositLocation = ref('')
const depositGear = ref('')
const depositNote = ref('')
function addEstimate() { if (!selectedFactory.value || rate.value === null || !Number.isFinite(rate.value)) return; addSupply(itemId.value); const line = selectedFactory.value.supplies.at(-1)!; line.ratePerMinute = rate.value; line.label = 'User-entered mining estimate'; touchFactory(); message.value = `Added ${rate.value.toFixed(3)}/min ${itemName(itemId.value)} to ${selectedFactory.value.name}. Verify the supply rate in game.` }
function saveDeposit() {
  if (!Number.isFinite(Number(depositRate.value)) || Number(depositRate.value) < 0) { message.value = 'Enter a nonnegative extraction rate.'; return }
  try { addDeposit({ itemId: depositItem.value, ratePerMinute: Number(depositRate.value), location: depositLocation.value.trim(), surveyGearId: depositGear.value, note: depositNote.value.trim() }); telemetry.action(ANALYTICS_EVENTS.surveyDepositSaved, { resource: depositItem.value, rate_per_min: Number(depositRate.value), has_gear: Boolean(depositGear.value), has_location: Boolean(depositLocation.value.trim()) }); depositRate.value = ''; depositLocation.value = ''; depositNote.value = ''; message.value = 'Deposit saved to your notebook.' }
  catch (error) { message.value = error instanceof Error ? error.message : 'The deposit could not be saved.' }
}
function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  file.text().then(text => { try { importBackup(text); message.value = 'Notebook imported.' } catch (error) { message.value = error instanceof Error ? error.message : 'Import failed.' } }).finally(() => { input.value = '' })
}
function fmt(value: number, digits = 3) { return value.toLocaleString('en-US', { maximumFractionDigits: digits }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Resources' }]" />
    <FactoryPageHeader eyebrow="Mining & survey" title="Equip the crew, record the ground." description="Estimate mining supply from your own base rate and equipment, then keep a local notebook of deposits, rates and locations to feed factory plans." />
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Mining equipment estimator</h2></div>
      <div class="equipment-form">
        <div><label for="res-miners">Miners on this parcel</label><input id="res-miners" v-model.number="miners" type="number" min="1" max="1000" step="1"></div>
        <div><label for="res-base">Measured base units / min per miner</label><input id="res-base" v-model.number="baseRate" type="number" min="0.0001" step="any"></div>
        <div><label for="res-item">Supply item</label><SearchableSelect id="res-item" v-model="itemId" :options="minerals" /></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Client multiplier</th><th>Available on parcel</th></tr></thead><tbody><tr v-for="entry in EQUIPMENT_MECHANICS.mining" :key="entry.itemId"><th><NuxtLink :to="productPath(entry.itemId)">{{ itemName(entry.itemId) }}</NuxtLink></th><td>{{ entry.multiplier }}×</td><td><input v-model.number="vehicles[entry.itemId]" type="number" min="0" max="1000" step="1" placeholder="0" :aria-label="`${itemName(entry.itemId)} count`"></td></tr></tbody></table></div>
      <p v-if="rate !== null" class="reference-answer" role="status">Estimated supply: <strong>{{ fmt(rate) }} {{ itemName(itemId) }}/min</strong>. {{ multipliers.filter(value => value > 1).length }} miners have a vehicle; {{ multipliers.filter(value => value === 1).length }} use the base rate.</p>
      <p v-else class="danger" role="status">Enter positive rates and whole miner/vehicle counts within the displayed limits.</p>
      <button class="button" type="button" :disabled="!selectedFactory || rate === null" @click="addEstimate">Add estimate to selected factory</button>
      <p v-if="!selectedFactory" class="form-note"><NuxtLink to="/factory/production">Create or select a factory</NuxtLink> to add this estimate as an external supply.</p>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Survey notebook</h2><span>{{ notebook.deposits.length }} saved</span></div>
      <p class="panel-note">Record deposits you have surveyed. Data stays in this browser and can be exported as JSON. Survey equipment effects are not predicted; keep the gear name as a note.</p>
      <div class="equipment-form">
        <div><label for="res-dep-item">Resource</label><SearchableSelect id="res-dep-item" v-model="depositItem" :options="minerals" /></div>
        <div><label for="res-dep-rate">Extraction / min</label><input id="res-dep-rate" v-model.number="depositRate" type="number" min="0" step="any"></div>
        <div><label for="res-dep-loc">Location</label><input id="res-dep-loc" v-model="depositLocation" maxlength="120" placeholder="Parcel, landmark or coordinates"></div>
        <div><label for="res-dep-gear">Survey gear</label><SearchableSelect id="res-dep-gear" v-model="depositGear" :options="[{ value: '', label: 'None recorded' }, ...surveyGear]" /></div>
        <div><label for="res-dep-note">Note</label><input id="res-dep-note" v-model="depositNote" maxlength="240" placeholder="Richness, depth, access…"></div>
      </div>
      <button class="button button--primary" type="button" @click="saveDeposit">Save deposit</button>
      <div class="table-wrap"><table v-if="notebook.deposits.length"><thead><tr><th>Resource</th><th>Rate / min</th><th>Location</th><th>Gear</th><th>Note</th><th></th></tr></thead><tbody><tr v-for="deposit in notebook.deposits" :key="deposit.id"><th>{{ itemName(deposit.itemId) }}</th><td>{{ fmt(deposit.ratePerMinute) }}</td><td>{{ deposit.location || '—' }}</td><td>{{ deposit.surveyGearId ? itemName(deposit.surveyGearId) : '—' }}</td><td class="text-cell">{{ deposit.note || '—' }}</td><td><button class="icon-button" type="button" :aria-label="`Remove ${itemName(deposit.itemId)} deposit`" @click="removeDeposit(deposit.id)">×</button></td></tr></tbody></table><p v-else class="form-note">No deposits saved yet.</p></div>
      <div class="button-row reference-content">
        <button class="button" type="button" @click="exportBackup">Export notebook JSON</button>
        <label class="button" for="res-import">Import notebook JSON</label><input id="res-import" class="file-picker" type="file" accept="application/json,.json" @change="importFile">
        <button class="button button--danger" type="button" @click="clearNotebook">Clear notebook</button>
      </div>
      <p class="form-note" role="status">{{ storageMessage || message }}</p>
    </section>
    <section class="factory-panel tool-guide" aria-labelledby="resources-workflow-title">
      <header class="tool-guide__header"><p class="eyebrow accent">Resource workflow</p><h2 id="resources-workflow-title">From land to factory supplies</h2><p>Check each part of the supply chain before relying on an estimate.</p></header>
      <ol class="tool-guide__steps" role="list">
        <li><div><strong>Check your land</strong><p>Confirm ownership and survey information in game before staking a zone.</p></div></li>
        <li><div><strong>Prepare your crew</strong><p>Check miners, available vehicles and yard storage. Resources depend on location.</p></div></li>
        <li><div><strong>Measure the output</strong><p>Use the actual resource rate to update your factory's external supply.</p></div></li>
        <li><div><strong>Connect the supply chain</strong><p>Check <NuxtLink to="/tools/logistics">logistics</NuxtLink> before relying on network surplus.</p></div></li>
      </ol>
      <div class="tool-guide__related"><h3>Need survey equipment?</h3><div class="button-row"><NuxtLink class="text-button" :to="productPath('survey_tripod')">Survey Tripod →</NuxtLink><NuxtLink class="text-button" :to="productPath('survey_tower')">Survey Tower →</NuxtLink><NuxtLink class="text-button" :to="productPath('survey_array')">Survey Array →</NuxtLink></div><p class="form-note">These links cover crafting. Check equipment operation and placement in game.</p></div>
    </section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ EQUIPMENT_MECHANICS.evidence }} The mining Haul Truck and hauling Box Truck are distinct equipment.</p>
  </main>
</template>
