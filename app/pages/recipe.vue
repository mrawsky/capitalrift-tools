<script setup lang="ts">
import { locationFromLonLat, parseChunkIdInput, type ParsedLocation } from '../utils/domain/location'
import { generateTrends, trendSeed } from '../utils/domain/trends'
import type { OptimizationResponse, Trend } from '../utils/domain/types'
import type { RecipePart } from '../utils/domain/types'
import { INGREDIENTS } from '../utils/domain/ingredients'
import { parseShareFragment, type SharedRecipe } from '../utils/sharing'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const { optimize } = useRecipeOptimizer()

const location = ref<ParsedLocation | null>(null)
const trends = ref<Trend[]>([])
const optimization = ref<OptimizationResponse | null>(null)
const loading = ref(false)
const error = ref('')
const status = ref('Ready for a restaurant location ID.')
const shareCopied = ref(false)
const allowedIngredientIds = ref(INGREDIENTS.map(ingredient => ingredient.id))
const initialParts = ref<RecipePart[] | undefined>()
const libraryMessage = ref('')

const initialId = computed(() => typeof route.query.id === 'string' ? route.query.id : '')
const canonical = computed(() => runtimeConfig.public.siteUrl ? `${String(runtimeConfig.public.siteUrl).replace(/\/$/, '')}/recipe` : undefined)

useSeoMeta({
  title: 'Recipe Calculator — Capital Rift Tools',
  description: 'Unofficial calculator for Capital Rift restaurant recipes and local taste trends.',
  ogTitle: 'Capital Rift Recipe Calculator',
  ogDescription: 'Generate local trends, strong recipes, and exact match calculations from a restaurant chunk ID.',
  ogType: 'website',
  twitterCard: 'summary',
})

useHead(() => ({
  link: canonical.value ? [{ rel: 'canonical', href: canonical.value }] : [],
  script: [{
    type: 'application/ld+json',
    textContent: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Capital Rift Recipe Calculator',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any modern browser',
      description: 'An unofficial local recipe and trend calculator for Capital Rift.',
      isAccessibleForFree: true,
    }),
  }],
}))

async function generate(payload: { type: 'id', input: string } | { type: 'coordinates', longitude: number, latitude: number }) {
  if (loading.value) return
  error.value = ''
  optimization.value = null
  loading.value = true
  status.value = 'Normalizing the location and generating local trends.'

  try {
    const nextLocation = payload.type === 'id'
      ? parseChunkIdInput(payload.input)
      : locationFromLonLat(payload.longitude, payload.latitude)
    const nextTrends = generateTrends(nextLocation.locationKey)
    location.value = nextLocation
    trends.value = nextTrends
    await router.replace({ query: { id: nextLocation.originalId } })
    status.value = 'Searching deterministic recipe candidates. The page remains usable while the worker runs.'
    optimization.value = await optimize(nextLocation.locationKey, nextTrends, [...allowedIngredientIds.value])
    status.value = `Generated ${optimization.value.results.reduce((total, result) => total + result.candidates.length, 0)} best-found recipes using ${allowedIngredientIds.value.length} selected ingredients from ${optimization.value.candidatesEvaluated.toLocaleString('en-US')} evaluated candidates.`
    await nextTick()
    document.querySelector('#calculation-chain')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to generate recipes for that location.'
    status.value = error.value
  }
  finally {
    loading.value = false
  }
}

async function copyShareLink() {
  try {
    const url = new URL('/recipe', window.location.origin)
    if (location.value) url.searchParams.set('id', location.value.originalId)
    await navigator.clipboard.writeText(url.href)
    shareCopied.value = true
    setTimeout(() => shareCopied.value = false, 1800)
  } catch { libraryMessage.value = 'The browser could not copy the location link. Copy the page address or download a recipe JSON instead.' }
}

function openSavedRecipe(recipe: SharedRecipe) {
  if (loading.value) return
  initialParts.value = recipe.parts.map(part => ({ ...part }))
  libraryMessage.value = `Opened ${recipe.name}. Its composition is rescored with the current model; nothing was saved or replaced.`
  generate({ type: 'id', input: recipe.chunkId })
}
watch(allowedIngredientIds, () => { if (!loading.value) { optimization.value = null; status.value = 'Ingredient availability changed. Generate again to search with this selection.' } }, { deep: true })
onMounted(() => {
  if (route.path !== '/recipe') return
  try {
    const shared = parseShareFragment(window.location.hash)
    if (shared) { if (shared.type !== 'restaurant-recipe') throw new Error('Open factory blueprints in the production planner.'); openSavedRecipe(shared); return }
    if (initialId.value) generate({ type: 'id', input: initialId.value })
  } catch (cause) { libraryMessage.value = cause instanceof Error ? cause.message : 'Invalid shared recipe link.' }
})
</script>

<template>
  <main v-if="route.path === '/recipe'" id="main-content">
    <section class="recipe-intro">
      <div class="hero__meta">
        <span>UNOFFICIAL RECIPE CALCULATOR</span>
        <NuxtLink to="/changelog">Latest updates →</NuxtLink>
      </div>
      <h1>Restaurant recipe calculator</h1>
      <div class="hero__footer">
        <p>Enter a restaurant location ID to see local taste trends and recipe matches.</p>
        <NuxtLink to="/recipe/methodology" class="down-link">How it works <span aria-hidden="true">→</span></NuxtLink>
      </div>
    </section>

    <details class="ingredient-availability"><summary>Choose ingredients you can obtain · {{ allowedIngredientIds.length }} selected</summary><fieldset :disabled="loading"><legend>Available ingredients for recommendations</legend><p>Select at least two. This limits taste optimization; it does not estimate inventory quantities, cost, or station compatibility.</p><div class="button-row"><button class="button" type="button" @click="allowedIngredientIds = INGREDIENTS.map(ingredient => ingredient.id)">Select all</button><button class="button" type="button" @click="allowedIngredientIds = []">Clear selection</button></div><div class="ingredient-options"><label v-for="ingredient in INGREDIENTS" :key="ingredient.id"><input v-model="allowedIngredientIds" type="checkbox" :value="ingredient.id">{{ ingredient.name }}</label></div></fieldset></details>
    <GeneratorForm :loading="loading" :initial-id="initialId" @generate="generate" />
    <p v-if="libraryMessage" class="library-message" role="status">{{ libraryMessage }}</p>

    <div class="status-region" aria-live="polite" aria-atomic="true">
      <p :class="{ error }">{{ status }}</p>
      <p v-if="error" class="error-detail">Check the restaurant chunk ID and select at least two available ingredients.</p>
    </div>

    <template v-if="location && trends.length">
      <section id="calculation-chain" class="chain-section" aria-labelledby="chain-title">
        <header class="section-heading">
          <p class="eyebrow accent">02 / CALCULATION CHAIN</p>
          <h2 id="chain-title">From one map tile to three complete targets.</h2>
          <p>The raw ID is reduced to the zoom-12 grid before the deterministic seed is built.</p>
        </header>
        <ol class="calculation-chain">
          <li><span>01 / INPUT</span><strong>{{ location.originalId }}</strong></li>
          <li><span>02 / LOCATION KEY</span><strong>{{ location.locationKey }}</strong></li>
          <li><span>03 / SEED</span><strong>{{ trendSeed(location.locationKey) }}</strong></li>
          <li><span>04 / TRENDS</span><strong>{{ trends.map(trend => trend.name).join(' · ') }}</strong></li>
        </ol>
        <div class="button-row share-row">
          <button class="button button--quiet" type="button" @click="copyShareLink">{{ shareCopied ? 'Link copied' : 'Copy share link' }}</button>
          <NuxtLink class="text-button" to="/recipe/methodology">How it works →</NuxtLink>
        </div>
        <span class="sr-only" aria-live="polite">{{ shareCopied ? 'Share link copied to clipboard.' : '' }}</span>
      </section>

      <TrendResults v-if="optimization" :trends="trends" :optimization="optimization" :chunk-id="location.originalId" />
      <RecipeEditor :trends="trends" :chunk-id="location.originalId" :initial-parts="initialParts" />
    </template>
    <RestaurantLibrary :chunk-id="location?.originalId" :busy="loading" @open-restaurant="generate({ type: 'id', input: $event })" @open-recipe="openSavedRecipe" />

    <section class="trust-section">
      <div>
        <p class="eyebrow accent">CHECK IN GAME</p>
        <h2>A useful estimate.<br>Easy to verify.</h2>
      </div>
      <div class="trust-copy">
        <p>The calculator uses local game data and community-checked examples. See the <NuxtLink to="/changelog">changelog and data updates</NuxtLink> after a game patch.</p>
        <p>Recommendations optimize taste match only. They do not predict ingredient cost, supply, preparation time, station compatibility, or profit.</p>
        <NuxtLink class="button button--quiet" to="/recipe/methodology">Read how it works</NuxtLink>
      </div>
    </section>
  </main>
  <NuxtPage v-else />
</template>
