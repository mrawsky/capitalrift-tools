<script setup lang="ts">
useToolSeo('Capital Rift Menu & Recipe Code Reader', 'Paste a CRRCP1 or CRMENU1 Capital Rift code to inspect its dishes, score them for a location, and save compositions locally.', true)
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Recipe', to: '/recipe' }, { label: 'Menu code reader' }]" />
    <FactoryPageHeader eyebrow="Restaurant" title="Read a menu or recipe code." description="Paste a game menu code and inspect its dishes. Optionally enter a restaurant location ID to score each dish against its local tastes. Decoding happens locally." />
    <MenuCodeReader />
    <div class="button-row reference-actions"><NuxtLink class="button" to="/recipe">Recipe calculator</NuxtLink><NuxtLink class="button" to="/recipe/methodology">How it works</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. The decoder follows the client's code format; dish scoring uses this tool's taste model. Verify dishes in game.</p>
  </main>
</template>
