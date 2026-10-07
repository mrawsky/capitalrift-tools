<script setup lang="ts">
import { CHANGELOG } from '../utils/changelog'
useToolSeo('Capital Rift Tools Changelog & Game Data Updates', 'See the latest Capital Rift crafting additions, calculator improvements, and checked game updates, with dated evidence for changes to the bundled data.')
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
</script>

<template>
  <main id="main-content" class="factory-page changelog-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Changelog' }]" />
    <FactoryPageHeader eyebrow="Updates" title="What’s new." description="New tools, improvements, and fixes to help you plan your next build." />
    <ol class="changelog-list" aria-label="Update history">
      <li v-for="(entry, index) in CHANGELOG" :id="entry.id" :key="entry.id" class="changelog-entry">
        <article :aria-labelledby="`${entry.id}-title`">
          <header class="changelog-heading">
            <div class="changelog-meta"><time :datetime="entry.date">{{ formatDate(entry.date) }}</time><span v-if="index === 0" class="changelog-badge">Latest update</span></div>
            <h2 :id="`${entry.id}-title`">{{ entry.title }}</h2>
            <p class="changelog-summary">{{ entry.summary }}</p>
            <p class="changelog-build">Game data checked: <strong>{{ entry.gameVersion }}</strong></p>
          </header>
          <section v-for="(group, groupIndex) in entry.changes" :key="group.title" class="changelog-group" :aria-labelledby="`${entry.id}-group-${groupIndex}`">
            <h3 :id="`${entry.id}-group-${groupIndex}`">{{ group.title }}</h3>
            <ul class="changelog-items"><li v-for="item in group.items" :key="item">{{ item }}</li></ul>
          </section>
          <details class="changelog-evidence"><summary>About the game data</summary><p>{{ entry.evidence }}</p></details>
        </article>
      </li>
    </ol>
    <p class="reference-note">Calculations run locally. Check important results in game after an update and <a href="https://github.com/mrawsky/capitalrift-tools/issues/new" target="_blank" rel="noopener noreferrer">report a mismatch</a> with a reproducible example.</p>
  </main>
</template>
