<script setup lang="ts">
useToolSeo('Capital Rift Factory Troubleshooting FAQ: Stalled Supply & Workers', 'Answers to common Capital Rift factory problems: workers not collecting ore, stalled supply lines, storage that will not accept goods, machines missing ingredients, blocked rooms and hot rooms that slow production.', true)
interface Faq { id: string; question: string; answer: string; steps: string[]; links?: { label: string; to: string }[] }
const faqs: Faq[] = [
  {
    id: 'workers-not-collecting',
    question: 'Why are my workers not collecting ore or resources?',
    answer: 'A mining crew stops when the zone is not owned, the path is blocked, the yard storage is full, or the crew is waiting at a full destination. Work through these checks in order.',
    steps: ['Confirm the zone is staked, owned and inside your land.', 'Check for a free path and available yard storage to drop the load.', 'Check whether the resource has thinned or run out at that spot.', 'Make sure the crew is not reassigned or waiting at a full destination.'],
    links: [{ label: 'Mining & survey notebook', to: '/tools/resources' }],
  },
  {
    id: 'stalled-line',
    question: 'Why is my supply line stalled or waiting?',
    answer: 'A supply line stalls when the destination is full, the amount was never requested, the source is not set to ship, or no vehicle can make the trip. An acceptance filter alone does not request a delivery.',
    steps: ['Check both ends and whether the receiving site has free capacity.', 'Verify a requested amount, not just an acceptance filter.', 'Confirm the source is configured to ship the item or category out.', 'Look for a full destination, a missing vehicle, or a driver requirement.'],
    links: [{ label: 'Logistics setup', to: '/tools/logistics' }],
  },
  {
    id: 'storage-not-accepting',
    question: 'Why is my storage full or not accepting goods?',
    answer: 'A destination can reject an item even when physical space exists, if the accepted-goods filter excludes it. Goods may also sit in another room, and stock not configured to ship out is unavailable to the network.',
    steps: ['Check accepted goods on the destination filter.', 'Confirm there is a delivery space and room to receive the load.', 'Move goods that are stuck in another room, or widen access.', 'Remember that unshipped stock cannot be used by the network.'],
    links: [{ label: 'Storage comparison', to: '/tools/logistics' }],
  },
  {
    id: 'machine-no-ingredients',
    question: 'Why does my machine have no ingredients?',
    answer: 'Machines run out of ingredients when inputs are unreachable, being hauled away by a builder, or simply not supplied fast enough. The machine card says what it is waiting for and why.',
    steps: ['Check the machine card for the waiting reason.', 'Confirm ingredients are in the same room or reachable by a worker.', 'Check that a worker is not taking input out of a running machine.', 'Compare consumed rate with supply in the factory statistics.'],
    links: [{ label: 'Factory statistics', to: '/factory/statistics' }, { label: 'Production planner', to: '/factory/planner' }],
  },
  {
    id: 'rooms-blocked',
    question: 'Why can’t my workers reach a room or floor?',
    answer: 'Workers need a door or opening between rooms and a stair or lift between floors. Editing a wall can remove the only doorway, and a room with no connection cannot be served.',
    steps: ['Add or restore a door between connected rooms.', 'Confirm stairs or a lift connect the floors.', 'Check that a wall edit did not remove the only opening.'],
  },
  {
    id: 'hot-rooms-slow',
    question: 'Why are machines or workers slower than expected?',
    answer: 'Hot factory rooms slow machines and workers. Above the comfort threshold each extra degree removes a share of speed down to a floor, so cooling or fewer running machines restores output.',
    steps: ['Check room temperature with the heat camera.', 'Add cooling if the room is above the comfort threshold.', 'Reduce running machines, or spread them across rooms.', 'Use the bottleneck view to see which input falls short first.'],
    links: [{ label: 'Cooling planner', to: '/tools/cooling' }, { label: 'Bottleneck view', to: '/factory/statistics' }, { label: 'Electricity cost', to: '/tools/electricity' }],
  },
  {
    id: 'full-destination',
    question: 'How do I fix a full destination or missing delivery space?',
    answer: 'A full destination blocks deliveries until space frees up. Add storage, widen the accepted-goods filter, or move stock to another room so the receiving space can accept the load.',
    steps: ['Add or upgrade storage at the destination.', 'Widen the accepted-goods filter where appropriate.', 'Clear stock sitting in the receiving room.'],
    links: [{ label: 'Storage comparison', to: '/tools/logistics' }],
  },
  {
    id: 'shipping-setup',
    question: 'How do I set up shipping from a source?',
    answer: 'Enable shipping at the source and choose what it sends out. Then request a quantity at the destination. Supply and demand should match the delivered amount per minute, not just the on-site stock.',
    steps: ['Enable shipping and select items or categories at the source.', 'Set a delivery request with a quantity at the destination.', 'Match delivered units per minute to factory demand.'],
    links: [{ label: 'Transport throughput', to: '/tools/logistics' }, { label: 'Factory statistics', to: '/factory/statistics' }],
  },
]
useHead(() => ({ script: [{ key: 'faq-schema', type: 'application/ld+json', textContent: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) }) }] }))
const { capture } = useAnalytics()
function openFaq(id: string, index: number) { capture('faq_opened', { question_id: id, index }) }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Troubleshooting FAQ' }]" />
    <FactoryPageHeader eyebrow="Help & FAQ" title="Factory troubleshooting answers." description="Quick answers to the most common Capital Rift factory problems. Each answer lists the checks to work through, and points to the tool that helps you fix it. This page does not read your game." />
    <nav class="factory-panel" aria-label="Common questions">
      <div class="panel-title"><h2>Common questions</h2><span>{{ faqs.length }}</span></div>
      <ul class="faq-index">
        <li v-for="(faq, index) in faqs" :key="faq.id"><a :href="`#${faq.id}`" :data-index="String(index + 1).padStart(2, '0')" @click="openFaq(faq.id, index)">{{ faq.question }}</a></li>
      </ul>
    </nav>
    <section v-for="(faq, index) in faqs" :id="faq.id" :key="faq.id" class="factory-panel tool-guide" :aria-labelledby="`${faq.id}-title`">
      <header class="tool-guide__header">
        <p class="eyebrow accent">Check {{ String(index + 1).padStart(2, '0') }}</p>
        <h2 :id="`${faq.id}-title`">{{ faq.question }}</h2>
        <p class="faq-answer">{{ faq.answer }}</p>
      </header>
      <ol class="tool-guide__steps" role="list">
        <li v-for="(step, stepIndex) in faq.steps" :key="stepIndex"><div><p>{{ step }}</p></div></li>
      </ol>
      <div v-if="faq.links" class="tool-guide__actions">
        <NuxtLink v-for="link in faq.links" :key="link.to" class="button" :to="link.to">{{ link.label }}</NuxtLink>
      </div>
    </section>
    <section class="factory-panel tool-guide">
      <header class="tool-guide__header">
        <p class="eyebrow accent">Still stuck?</p>
        <h2>Report a reproducible problem</h2>
        <p>These checks come from the saved client's delivery advice. If a problem repeats, open an issue with the steps you took and any screenshots.</p>
      </header>
      <div class="tool-guide__actions">
        <NuxtLink class="button" to="/tools/logistics">Logistics &amp; throughput</NuxtLink><NuxtLink class="button" to="/tools/resources">Mining &amp; resources</NuxtLink><NuxtLink class="button" to="/tools/cooling">Room cooling</NuxtLink><NuxtLink class="button" to="/factory/statistics">Factory statistics</NuxtLink>
      </div>
    </section>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. Report a reproducible problem on the <a href="https://github.com/mrawsky/capitalrift-tools/issues/new" target="_blank" rel="noopener noreferrer">issue tracker</a>.</p>
  </main>
</template>
