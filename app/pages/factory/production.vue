<script setup lang="ts">
import { FACTORY_CATALOG, itemName } from '../../utils/factory/catalog'
import { buildLedger } from '../../utils/factory/calculations'

definePageMeta({ layout: 'factory' })
useSeoMeta({ title: 'Factory Production — Capital Rift Tools', description: 'Enter factory supplies and machine recipe assignments.' })
const { state, selectedFactory, addFactory, removeFactory, addProduction, addSupply, touchFactory } = useFactoryPlanner()
const recipes = [...FACTORY_CATALOG.recipes].sort((a, b) => itemName(a.productId).localeCompare(itemName(b.productId)))
const items = [...FACTORY_CATALOG.items].sort((a, b) => a.name.localeCompare(b.name))
const recipeOptions = recipes.map(recipe => ({ value: recipe.id, label: `${itemName(recipe.productId)} — ${itemName(recipe.stationId)}`, searchText: recipe.name }))
const itemOptions = items.map(item => ({ value: item.id, label: item.name }))
const ledger = computed(() => selectedFactory.value ? buildLedger([selectedFactory.value]) : buildLedger([]))
function recipeLabel(recipeId: string) { const recipe = FACTORY_CATALOG.recipeById.get(recipeId); return recipe ? `${itemName(recipe.productId)} — ${itemName(recipe.stationId)}` : 'Unavailable recipe' }
function optionsForRecipe(recipeId: string) { return FACTORY_CATALOG.recipeById.has(recipeId) ? recipeOptions : [{ value: recipeId, label: `Unavailable: ${recipeId}` }, ...recipeOptions] }
function removeProduction(id: string) { if (!selectedFactory.value) return; selectedFactory.value.productions = selectedFactory.value.productions.filter(line => line.id !== id); touchFactory() }
function removeSupply(id: string) { if (!selectedFactory.value) return; selectedFactory.value.supplies = selectedFactory.value.supplies.filter(line => line.id !== id); touchFactory() }
function removeCurrent() { if (selectedFactory.value && confirm(`Remove ${selectedFactory.value.name}?`)) removeFactory(selectedFactory.value.id) }
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 2 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <FactoryPageHeader eyebrow="Production" title="What each factory makes." description="Record supplies that arrive without a recipe, then assign recipes to machines. Output and ingredient use are calculated automatically." />
    <section v-if="!selectedFactory" class="factory-empty"><h2>Create a factory to begin</h2><p>Factories keep their production lines and machine inventory separate.</p><button class="button button--primary" @click="addFactory()">New factory</button></section>
    <template v-else>
      <section class="factory-panel factory-name-panel"><label for="factory-name">Factory name</label><input id="factory-name" v-model.trim="selectedFactory.name" @change="touchFactory"><button class="button button--danger" type="button" @click="removeCurrent">Remove factory</button></section>
      <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">RAW / EXTERNAL SUPPLY</p><h2>Supplies</h2></div><button class="button" type="button" @click="addSupply()">Add supply</button></div><p class="panel-note">Use this for mined, farmed, purchased, or otherwise externally supplied items.</p><div v-if="selectedFactory.supplies.length" class="form-table"><div v-for="line in selectedFactory.supplies" :key="line.id" class="form-table__row"><div><label :for="`supply-item-${line.id}`">Item</label><SearchableSelect :id="`supply-item-${line.id}`" v-model="line.itemId" :options="itemOptions" placeholder="Search items…" @change="touchFactory" /></div><div><label :for="`supply-label-${line.id}`">Label</label><input :id="`supply-label-${line.id}`" v-model="line.label" placeholder="North mine" @change="touchFactory"></div><div><label :for="`supply-rate-${line.id}`">Units / min</label><input :id="`supply-rate-${line.id}`" v-model.number="line.ratePerMinute" type="number" min="0" step="any" @change="touchFactory"></div><button class="icon-button" type="button" :aria-label="`Remove ${itemName(line.itemId)} supply`" @click="removeSupply(line.id)">×</button></div></div><p v-else class="factory-empty factory-empty--small">No external supplies entered.</p></section>
      <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">MACHINE ASSIGNMENTS</p><h2>Production lines</h2></div><button class="button button--primary" type="button" @click="addProduction()">Add production</button></div><div v-if="selectedFactory.productions.length" class="form-table"><div v-for="line in selectedFactory.productions" :key="line.id" class="form-table__row"><div><label :for="`recipe-${line.id}`">Recipe</label><SearchableSelect :id="`recipe-${line.id}`" v-model="line.recipeId" :options="optionsForRecipe(line.recipeId)" placeholder="Search products or machines…" @change="touchFactory" /></div><div><label :for="`line-label-${line.id}`">Label</label><input :id="`line-label-${line.id}`" v-model="line.label" placeholder="Main line" @change="touchFactory"></div><div><label :for="`machines-${line.id}`">Assigned</label><input :id="`machines-${line.id}`" v-model.number="line.assignedMachines" type="number" min="0" step="1" @change="touchFactory"></div><button class="icon-button" type="button" :aria-label="`Remove ${recipeLabel(line.recipeId)}`" @click="removeProduction(line.id)">×</button></div></div><p v-else class="factory-empty factory-empty--small">No production lines yet.</p></section>
      <section class="factory-panel"><div class="panel-title"><div><p class="eyebrow">FACTORY BALANCE</p><h2>Current flow</h2></div><NuxtLink class="text-button" to="/factory/statistics">All statistics →</NuxtLink></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Made / min</th><th>Used / min</th><th>Balance</th></tr></thead><tbody><tr v-for="row in ledger.rows" :key="row.itemId"><th>{{ itemName(row.itemId) }}</th><td>{{ fmt(row.supplied) }}</td><td>{{ fmt(row.consumed) }}</td><td :class="row.balance < 0 ? 'danger' : 'positive'">{{ fmt(row.balance) }}</td></tr></tbody></table></div></section>
    </template>
  </main>
</template>
