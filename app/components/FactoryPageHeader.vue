<script setup lang="ts">
defineProps<{ eyebrow: string, title: string, description: string }>()
</script>

<template>
  <header class="factory-page-header">
    <p class="eyebrow accent">{{ eyebrow }}</p>
    <div><h1>{{ title }}</h1><p>{{ description }}</p></div>
  </header>
</template>
