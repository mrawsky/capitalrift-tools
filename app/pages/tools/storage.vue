<script setup lang="ts">
import { containersRequired } from '../../utils/equipment'
import { itemName, productPath } from '../../utils/factory/catalog'
useToolSeo('Capital Rift Storage Comparison & Capacity Calculator', 'Compare storage crates, racks, lockers, containers, and silos using current in-game capacities. Calculate containers needed and open their crafting recipes.', true)
const quantity = ref(1000)
const values = reactive<Record<string, { capacity?: number; accepts: string; placement: string }>>({})
const ids = ['crate', 'rack', 'cabinet', 'shelving_unit', 'stockroom_rack', 'storage_locker', 'pallet_rack', 'lumber_stack', 'shipping_container', 'grain_silo', 'oil_drum']
for (const id of ids) values[id] = { accepts: '', placement: '' }
const ranked = computed(() => ids.filter(id => Number.isFinite(values[id]?.capacity) && (values[id]?.capacity ?? 0) > 0).sort((a, b) => values[b]!.capacity! - values[a]!.capacity!))
function setCapacity(id: string, event: Event) { const text = (event.target as HTMLInputElement).value; values[id]!.capacity = text === '' ? undefined : Number(text) }
</script>
<template>
  <main id="main-content" class="factory-page"><ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Storage comparison' }]" /><FactoryPageHeader eyebrow="Storage" title="Compare the storage you can use." description="Enter capacities from the current game, then compare how many containers your stock needs. Record accepted items and placement restrictions alongside each option." />
    <section class="factory-panel tool-guide" aria-labelledby="storage-values-title">
      <header class="tool-guide__header">
        <p class="eyebrow accent">Before you compare</p>
        <h2 id="storage-values-title">Current values from your game</h2>
        <p>Use the capacities shown in your game. Your setup can change them, so client display defaults are not reliable storage limits.</p>
      </header>
      <div class="tool-guide__layout">
        <ul class="tool-guide__list">
          <li><strong>Keep unknown values blank.</strong> Add a capacity only when you have checked it in game.</li>
          <li><strong>Compare compatible goods.</strong> Use the same units and check which items each container accepts.</li>
          <li><strong>Check the placement.</strong> The largest capacity may not suit the space or goods you need to store.</li>
        </ul>
        <div class="tool-guide__field">
          <label for="storage-quantity">Units you need to store</label>
          <input id="storage-quantity" v-model.number="quantity" type="number" min="0" step="any" aria-describedby="storage-values-help">
          <p id="storage-values-help" class="form-note">Your capacities and notes stay available for this visit.</p>
        </div>
      </div>
      <p v-if="ranked.length" class="tool-guide__status" role="status">Largest entered capacity: <strong>{{ itemName(ranked[0]!) }}</strong>, {{ values[ranked[0]!]!.capacity }} units. Check accepted goods and placement before choosing it.</p>
    </section>
    <section class="factory-panel"><div class="table-wrap"><table class="storage-comparison"><thead><tr><th>Storage</th><th>In-game capacity</th><th>Containers needed</th><th>Accepted items</th><th>Placement notes</th></tr></thead><tbody><tr v-for="id in ids" :key="id"><th><NuxtLink :to="productPath(id)">{{ itemName(id) }}</NuxtLink></th><td><input :value="values[id]!.capacity ?? ''" type="number" min="1" step="any" placeholder="Unknown" :aria-label="`${itemName(id)} in-game capacity`" @input="setCapacity(id, $event)"></td><td>{{ containersRequired(quantity, values[id]!.capacity) ?? 'Unknown / invalid' }}</td><td><input v-model="values[id]!.accepts" :aria-label="`${itemName(id)} accepted items`" placeholder="Check in game"></td><td><input v-model="values[id]!.placement" :aria-label="`${itemName(id)} placement restrictions`" placeholder="Check in game"></td></tr></tbody></table></div></section>
    <div class="button-row reference-actions"><NuxtLink class="button" to="/tools/hauling">Calculate hauling trips</NuxtLink><NuxtLink class="button" to="/factory/recipes">Browse crafting recipes</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates →</NuxtLink></p>
  </main>
</template>
