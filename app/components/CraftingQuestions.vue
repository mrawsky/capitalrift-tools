<script setup lang="ts">
import { productPath } from '../utils/factory/catalog'
import { CRAFTING_QUESTIONS, craftingAnswer } from '../utils/factory/reference'
</script>

<template>
  <section class="factory-panel reference-content crafting-questions" aria-labelledby="crafting-questions-title">
    <h2 id="crafting-questions-title">Capital Rift crafting questions</h2>
    <article v-for="entry in CRAFTING_QUESTIONS" :key="entry.productId">
      <h3><NuxtLink :to="productPath(entry.productId)">{{ entry.question }}</NuxtLink></h3>
      <p>{{ craftingAnswer(entry.productId) }}</p>
    </article>
  </section>
</template>
