<script setup lang="ts">
definePageMeta({ layout: 'factory' })
useToolSeo('Capital Rift Factory Planner: Setup & Tutorial', 'Learn how to track factories, owned machines, production capacity, and required supplies. Start with a reviewed blueprint or a crafting recipe.')
const { state, addFactory } = useFactoryPlanner()
function start() { if (!state.value.factories.length) addFactory('My first factory'); navigateTo('/factory/production') }
</script>

<template>
  <main id="main-content" class="factory-page">
    <FactoryPageHeader eyebrow="Tutorial / About" title="Know what every factory needs." description="Add what you own and what each machine makes. The planner totals inputs, output, capacity, and shortages without connecting to the game." />
    <section class="dashboard-grid dashboard-grid--three">
      <article class="dashboard-card"><span>01</span><h2>Add a factory</h2><p>Create separate workspaces for each site you run.</p></article>
      <article class="dashboard-card"><span>02</span><h2>Enter production</h2><p>Add raw supplies, owned machines, and the recipes assigned to them.</p></article>
      <article class="dashboard-card"><span>03</span><h2>Check the balance</h2><p>Statistics shows what you make, consume, have spare, or still need.</p></article>
    </section>
    <section class="factory-panel split-panel">
      <div><p class="eyebrow accent">PLAN NEXT</p><h2>Build a production chain</h2><p>Choose a finished item and a target rate. The planner expands every known recipe, counts machines, and leaves raw inputs clearly marked.</p><NuxtLink class="button mt-6" to="/factory/planner">Open planner</NuxtLink></div>
      <div><p class="eyebrow accent">LOCAL BY DESIGN</p><h2>Your setup stays here</h2><p>Factories and plans are saved in this browser. Export a JSON backup when you want to move them. The tool makes no Capital Rift requests and does not read your account.</p><button class="button button--primary mt-6" type="button" @click="start">{{ state.factories.length ? 'Continue to production' : 'Create your first factory' }}</button></div>
    </section>
    <section class="factory-panel legal-note"><h2>Unofficial community project</h2><p>Not affiliated with, endorsed by, or associated with NIKS GAMES LLC. Capital Rift and related names and assets are property of their respective owners.</p></section>
  </main>
</template>
