<script setup lang="ts">
import { FACTORY_CATALOG, defaultRecipeFor, itemName, productPath } from '../utils/factory/catalog'
import { planQuantityMulti } from '../utils/factory/calculations'
import { ANALYTICS_EVENTS } from '../utils/analytics'

const products = [...FACTORY_CATALOG.recipesByProduct.keys()].sort((a, b) => itemName(a).localeCompare(itemName(b)))
const productOptions = products.map(id => ({ value: id, label: itemName(id) }))
let uid = 0
interface Row { id: number; productId: string; quantity: number }
const rows = ref<Row[]>([{ id: uid++, productId: '', quantity: 1 }])
function addRow() { rows.value.push({ id: uid++, productId: '', quantity: 1 }) }
function removeRow(id: number) { rows.value = rows.value.filter(row => row.id !== id) }
function addProduct(productId: string, quantity = 1) {
  if (!FACTORY_CATALOG.recipesByProduct.has(productId)) return
  const existing = rows.value.find(row => row.productId === productId)
  if (existing) existing.quantity += quantity
  else {
    const empty = rows.value.find(row => !row.productId)
    if (empty) { empty.productId = productId; empty.quantity = quantity }
    else rows.value.push({ id: uid++, productId, quantity })
  }
}
defineExpose({ addProduct })
const targets = computed(() => { const map: Record<string, number> = {}; for (const row of rows.value) if (row.productId && Number.isFinite(row.quantity) && row.quantity > 0) map[row.productId] = (map[row.productId] ?? 0) + row.quantity; return map })
const result = computed(() => planQuantityMulti(targets.value))
const external = computed(() => result.value.rows.filter(row => !row.recipeId))
const crafted = computed(() => result.value.rows.filter(row => row.recipeId))
const telemetry = useToolTelemetry('shopping-list')
watch(result, () => {
  if (!external.value.length && !crafted.value.length) return
  telemetry.action(ANALYTICS_EVENTS.shoppingListBuilt, {
    product_count: Object.keys(targets.value).length,
    raw_material_count: external.value.length,
    intermediate_count: crafted.value.length,
    total_batches: crafted.value.reduce((sum, row) => sum + row.batches, 0),
  }, 1200)
})
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
</script>

<template>
  <div>
    <div class="panel-title"><h2>Products to craft</h2><button class="button" type="button" @click="addRow">Add product</button></div>
    <div class="shopping-table">
      <div class="shopping-table__head"><span>Product</span><span>Quantity</span><span></span></div>
      <div v-for="row in rows" :key="row.id" class="shopping-row">
        <SearchableSelect :id="`shop-product-${row.id}`" v-model="row.productId" :options="productOptions" :aria-label="`Product ${row.productId ? itemName(row.productId) : 'to add'}`" placeholder="Search products…" />
        <input v-model.number="row.quantity" type="number" min="0" max="1000000000" step="any" :aria-label="`${itemName(row.productId) || 'product'} quantity`">
        <button class="icon-button" type="button" :aria-label="`Remove ${itemName(row.productId) || 'row'}`" @click="removeRow(row.id)">×</button>
      </div>
    </div>
    <p v-if="result.hasCycle" class="form-note danger" role="status">A recipe cycle prevents this list from being calculated.</p>
    <p v-else-if="!external.length && !crafted.length" class="form-note" role="status">Add at least one product with a positive quantity.</p>
    <template v-if="external.length || crafted.length">
      <ul class="shopping-totals" aria-label="Shopping list totals">
        <li>Products <strong>{{ Object.keys(targets).length }}</strong></li>
        <li>Raw materials <strong>{{ external.length }}</strong></li>
        <li>Intermediate crafts <strong>{{ crafted.length }}</strong></li>
        <li>Total batches <strong>{{ fmt(crafted.reduce((sum, row) => sum + row.batches, 0)) }}</strong></li>
      </ul>
      <div class="panel-title"><h3>Materials to gather</h3><span>{{ external.length }} items</span></div>
      <p class="panel-note">These are external raw inputs. Quantities assume you craft everything from scratch without existing stock.</p>
      <div class="table-wrap"><table><thead><tr><th>Material</th><th>Needed</th><th>Left over</th></tr></thead><tbody><tr v-for="row in external" :key="row.itemId"><th><NuxtLink v-if="defaultRecipeFor(row.itemId)" :to="productPath(row.itemId)">{{ itemName(row.itemId) }}</NuxtLink><span v-else>{{ itemName(row.itemId) }}</span></th><td>{{ fmt(row.required) }}</td><td>{{ fmt(row.excess) }}</td></tr></tbody></table></div>
      <div class="panel-title"><h3>Intermediate crafting</h3><span>{{ crafted.length }} items</span></div>
      <div class="table-wrap"><table><thead><tr><th>Item</th><th>Needed</th><th>Batches</th><th>Produced</th><th>Left over</th></tr></thead><tbody><tr v-for="row in crafted" :key="row.itemId"><th><NuxtLink :to="productPath(row.itemId)">{{ itemName(row.itemId) }}</NuxtLink></th><td>{{ fmt(row.required) }}</td><td>{{ fmt(row.batches) }}</td><td>{{ fmt(row.output) }}</td><td>{{ fmt(row.excess) }}</td></tr></tbody></table></div>
    </template>
  </div>
</template>
