<script setup lang="ts">
import { FACTORY_CATALOG } from '../../utils/factory/catalog'

definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Combined Crafting Shopping List', 'Plan several Capital Rift products at once and combine their material chains into one shopping list with batches, leftovers, and external raw materials.', true)
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Factory', to: '/factory' }, { label: 'Shopping list' }]" />
    <FactoryPageHeader eyebrow="Crafting" title="One list for several products." description="Choose as many finished products as you need. Shared ingredients are combined before batches are rounded, so you gather each material once." />
    <section class="factory-panel"><CombinedShoppingList /></section>
    <div class="button-row reference-actions"><NuxtLink class="button button--primary" to="/factory/planner">Continuous production planner</NuxtLink><NuxtLink class="button" to="/tools/power-station">Power-station checklist</NuxtLink><NuxtLink class="button" to="/factory/blueprints">Blueprints</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. Quantities assume full-speed crafting with raw materials available. Ownership and purchase costs are entered separately. {{ FACTORY_CATALOG.recipes.length }} recipes included.</p>
  </main>
</template>
