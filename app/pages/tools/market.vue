<script setup lang="ts">
import { MARKET_MECHANICS, basePrice, categoryNames, categorySpread } from '../../utils/market'
useToolSeo('Capital Rift Commodity Prices & Market Trading Reference', 'Reference Capital Rift commodity base prices, category spreads and the store markup, and estimate a fair resale or player-trade value for goods.', true)
const spreadCategory = ref(categoryNames()[0] ?? 'Bundle')
const categoryOptions = categoryNames().map(category => ({ value: category, label: category }))
const search = ref('')
const tradeItem = ref('ketchup')
const tradeQuantity = ref(100)
const spread = computed(() => categorySpread(spreadCategory.value))
const rows = computed(() => {
  const query = search.value.trim().toLowerCase()
  return Object.entries(MARKET_MECHANICS.basePrices as Record<string, number>)
    .filter(([id]) => !query || id.includes(query))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([itemId, base]) => ({ itemId, base, market: base * (1 + spread.value / 2), store: base * (1 + spread.value / 2) * MARKET_MECHANICS.storeMarkup }))
})
const tradeBase = computed(() => { const base = basePrice(tradeItem.value); return base === null ? null : base * Math.max(0, tradeQuantity.value) })
const tradeValue = computed(() => tradeBase.value === null ? null : tradeBase.value * (1 + spread.value / 2))
const tradeStore = computed(() => tradeValue.value === null ? null : tradeValue.value * MARKET_MECHANICS.storeMarkup)
const telemetry = useToolTelemetry('market')
watch([tradeValue, tradeQuantity, spreadCategory], () => { if (tradeValue.value !== null && tradeQuantity.value > 0) telemetry.calculated({ item: tradeItem.value.toLowerCase(), quantity: tradeQuantity.value, spread_category: spreadCategory.value, trade_value: Math.round(tradeValue.value * 100) / 100 }) })
function money(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` }
function fmt(value: number) { return value.toLocaleString('en-US', { maximumFractionDigits: 4 }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Market prices' }]" />
    <FactoryPageHeader eyebrow="Market & trading" title="What is it worth?" description="Reference commodity base prices, apply a category spread, and estimate a fair value for a stack. Prices are player-set in game; the base price is only a starting point." />
    <section class="factory-panel reference-content">
      <div class="equipment-form">
        <div><label for="market-search">Search items</label><input id="market-search" v-model="search" type="search" placeholder="ketchup, nails, steel_sheet…"></div>
        <div><label for="market-category">Category spread</label><SearchableSelect id="market-category" v-model="spreadCategory" :options="categoryOptions" /></div>
      </div>
      <p class="form-note">Base prices use the client table ({{ Object.keys(MARKET_MECHANICS.basePrices).length }} items). The {{ spreadCategory }} spread is {{ (spread * 100).toFixed(0) }}%. The client widens the base by half the spread, then applies a {{ Math.round((MARKET_MECHANICS.storeMarkup - 1) * 100) }}% store markup.</p>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Trade calculator</h2></div>
      <div class="equipment-form">
        <div><label for="market-trade-item">Item id</label><input id="market-trade-item" v-model="tradeItem" placeholder="ketchup"></div>
        <div><label for="market-trade-qty">Quantity</label><input id="market-trade-qty" v-model.number="tradeQuantity" type="number" min="0" step="any"></div>
      </div>
      <p v-if="tradeValue !== null" class="reference-answer" role="status">Base value {{ money(tradeBase!) }} · spread-adjusted <strong>{{ money(tradeValue) }}</strong> · store price ≈ {{ money(tradeStore!) }}.</p>
      <p v-else class="danger" role="status">That item id is not in the base price table. Try a lowercase id such as ketchup.</p>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Base price reference</h2><span>{{ rows.length }} items</span></div>
      <div class="table-wrap"><table><thead><tr><th>Item id</th><th>Base</th><th>With {{ spreadCategory }} spread</th><th>Store price</th></tr></thead><tbody><tr v-for="row in rows" :key="row.itemId"><th>{{ row.itemId }}</th><td>{{ money(row.base) }}</td><td>{{ money(row.market) }}</td><td>{{ money(row.store) }}</td></tr></tbody></table></div>
      <p v-if="!rows.length" class="form-note" role="status">No items match that search.</p>
    </section>
    <div class="button-row reference-actions"><NuxtLink class="button" to="/factory/recipes">Browse crafting recipes</NuxtLink><NuxtLink class="button" to="/factory/shopping">Shopping list</NuxtLink><NuxtLink class="button" to="/tools/business">Business costs</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. {{ MARKET_MECHANICS.evidence }} Player trading is uncapped; agree prices with the other player.</p>
  </main>
</template>
