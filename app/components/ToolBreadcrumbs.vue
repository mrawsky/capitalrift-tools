<script setup lang="ts">
const props = defineProps<{ items: { label: string; to?: string }[] }>()
const config = useRuntimeConfig()
useHead(() => ({ script: config.public.siteUrl ? [{ key: 'tool-breadcrumbs', type: 'application/ld+json', textContent: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: props.items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.label, ...(item.to ? { item: `${String(config.public.siteUrl).replace(/\/$/, '')}${item.to}` } : {}) })) }) }] : [] }))
</script>

<template>
  <nav class="tool-breadcrumbs" aria-label="Breadcrumb"><ol><li v-for="(item, index) in items" :key="index"><NuxtLink v-if="item.to" :to="item.to">{{ item.label }}</NuxtLink><span v-else aria-current="page">{{ item.label }}</span></li></ol></nav>
</template>
