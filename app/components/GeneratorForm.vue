<script setup lang="ts">
import { parseChunkIdInput } from '../utils/domain/location'

const props = withDefaults(defineProps<{
  loading?: boolean
  initialId?: string
}>(), {
  loading: false,
  initialId: '',
})

const emit = defineEmits<{
  generate: [value: { type: 'id', input: string } | { type: 'coordinates', longitude: number, latitude: number }]
}>()

const chunkId = ref(props.initialId)
const longitude = ref<string>('')
const latitude = ref<string>('')
const parsedId = computed(() => {
  if (!chunkId.value.trim()) return null
  try {
    return parseChunkIdInput(chunkId.value)
  }
  catch {
    return null
  }
})
const hasInput = computed(() => chunkId.value.trim().length > 0)
const { capture } = useAnalytics()

watch(() => props.initialId, value => {
  if (value) chunkId.value = value
})

function submitId() {
  capture('recipe_candidate_search_requested', { input_method: 'chunk_id', has_example: chunkId.value.trim() === '15/18295/10789' })
  emit('generate', { type: 'id', input: chunkId.value })
}

function useExample() {
  chunkId.value = '15/18295/10789'
  capture('recipe_example_used')
  submitId()
}

function submitCoordinates() {
  capture('recipe_candidate_search_requested', { input_method: 'coordinates' })
  emit('generate', { type: 'coordinates', longitude: Number(longitude.value), latitude: Number(latitude.value) })
}
</script>

<template>
  <section id="generator" class="generator-panel" aria-labelledby="generator-title">
    <header class="panel-heading">
      <div>
        <p class="eyebrow accent">01 / GENERATOR</p>
        <h2 id="generator-title">Find the strongest local recipes.</h2>
      </div>
      <p>Paste the restaurant chunk ID. Everything runs locally in your browser—no account, server, or game login.</p>
    </header>

    <form class="generator-form" @submit.prevent="submitId">
      <label class="generator-form__label" for="chunk-id">Restaurant location ID</label>
      <p id="chunk-help" class="field-help generator-form__help">Paste the complete <code>zoom/tileX/tileY</code> value—or the surrounding JSON line. We will extract one unambiguous ID.</p>
      <input id="chunk-id" class="generator-form__input" v-model="chunkId" name="chunkId" type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-describedby="chunk-help chunk-feedback" :aria-invalid="hasInput && !parsedId" placeholder="15/18295/10789">
      <div class="button-row generator-form__actions">
        <button class="button button--primary" type="submit" :disabled="loading">
          {{ loading ? 'Searching recipes…' : 'Find recipe candidates' }}
        </button>
        <button class="button button--quiet" type="button" :disabled="loading" @click="useExample">Use verified example</button>
      </div>
      <div id="chunk-feedback" class="id-preview generator-form__feedback" :class="{ 'id-preview--error': hasInput && !parsedId }" aria-live="polite">
        <template v-if="parsedId">
          <span><i aria-hidden="true">✓</i> Recognized {{ parsedId.originalId }}</span>
          <span>Trend grid {{ parsedId.locationKey }}</span>
        </template>
        <template v-else-if="hasInput">
          <span>Check the format: three whole numbers separated by two slashes.</span>
        </template>
        <template v-else>
          <span>Accepted input / raw ID · JSON response · copied text</span>
        </template>
      </div>
    </form>

    <details class="id-guide-panel">
      <summary><span>Where do I find the chunk ID?</span><small>Desktop browser · about 2 minutes</small></summary>
      <ChunkIdGuide compact />
      <NuxtLink class="text-button guide-deep-link" to="/recipe/methodology#find-id">Open the full guide ↗</NuxtLink>
    </details>

    <details class="coordinate-panel">
      <summary>Only have longitude and latitude?</summary>
      <p>The raw restaurant chunk ID is safer. Coordinates derive the zoom-12 Web Mercator tile that controls local trends.</p>
      <form class="coordinate-form" @submit.prevent="submitCoordinates">
        <div class="field-group">
          <label for="longitude">Longitude</label>
          <input id="longitude" v-model="longitude" type="number" min="-180" max="180" step="any" placeholder="21.0122">
        </div>
        <div class="field-group">
          <label for="latitude">Latitude</label>
          <input id="latitude" v-model="latitude" type="number" min="-85.05112878" max="85.05112878" step="any" placeholder="52.2297">
        </div>
        <button class="button button--quiet" type="submit" :disabled="loading">Use coordinates</button>
      </form>
    </details>
  </section>
</template>
