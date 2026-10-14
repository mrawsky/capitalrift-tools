<script setup lang="ts">
import { decodeMenuCode, encodeMenuCode, type DecodedDish } from '../utils/domain/menuCode'
import { parseChunkIdInput } from '../utils/domain/location'
import { generateTrends } from '../utils/domain/trends'
import { scoreRecipeAcrossTrends } from '../utils/domain/scoring'
import { INGREDIENT_BY_ID } from '../utils/domain/ingredients'
import { ANALYTICS_EVENTS } from '../utils/analytics'
import type { RecipePart, Trend } from '../utils/domain/types'

const STORAGE_KEY = 'capital-rift-menu-codes-v1'
const telemetry = useToolTelemetry('menu-code-reader')
const code = ref('')
const error = ref('')
const dishes = ref<DecodedDish[]>([])
const kind = ref<'recipe' | 'menu' | null>(null)
const chunkId = ref('')
const trends = ref<Trend[]>([])
const saved = ref<{ id: string; name: string; code: string }[]>([])
const message = ref('')

function ingredientName(id: string) { return INGREDIENT_BY_ID.get(id)?.name ?? id }
function decode() {
  error.value = ''; dishes.value = []; kind.value = null
  const result = decodeMenuCode(code.value)
  if (!result.ok) { error.value = result.error; telemetry.action(ANALYTICS_EVENTS.menuCodeDecoded, { valid: false, error: result.error }); return }
  kind.value = result.value.kind
  dishes.value = result.value.dishes
  message.value = `Read ${result.value.dishes.length} dish(es).`
  telemetry.action(ANALYTICS_EVENTS.menuCodeDecoded, { valid: true, code_kind: result.value.kind, dish_count: result.value.dishes.length })
}
function scoreFor(dish: DecodedDish) {
  if (!trends.value.length) return null
  try { return scoreRecipeAcrossTrends(dish.mix as RecipePart[], trends.value).best.score } catch { return null }
}
function loadTrends() {
  error.value = ''
  try { const location = parseChunkIdInput(chunkId.value); trends.value = generateTrends(location.locationKey) }
  catch (cause) { trends.value = []; error.value = cause instanceof Error ? cause.message : 'That location ID could not be read.' }
}
function loadSaved() { if (!import.meta.client) return; try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) saved.value = JSON.parse(raw) } catch { saved.value = [] } }
function persist() { if (!import.meta.client) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.value)) } catch { message.value = 'This browser could not save the menu.' } }
function saveMenu() {
  if (!dishes.value.length) return
  const name = dishes.value[0]!.name.slice(0, 60)
  const payload = encodeMenuCode({ kind: kind.value ?? 'menu', dishes: dishes.value })
  saved.value = [{ id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()), name, code: payload }, ...saved.value].slice(0, 100)
  persist(); message.value = 'Saved to this browser.'
  telemetry.action(ANALYTICS_EVENTS.menuCodeSaved, { dish_count: dishes.value.length, saved_total: saved.value.length })
}
function openSaved(entry: { code: string }) { code.value = entry.code; decode(); message.value = 'Opened a saved menu.' }
function removeSaved(id: string) { saved.value = saved.value.filter(item => item.id !== id); persist() }
onMounted(loadSaved)
</script>

<template>
  <div>
    <section class="factory-panel">
      <div class="panel-title"><h2>Paste a code</h2><span>{{ kind === 'menu' ? 'Menu' : kind === 'recipe' ? 'Recipe' : 'CRRCP1 / CRMENU1' }}</span></div>
      <div class="reference-content menu-code-field">
        <label for="menu-code">Menu or recipe code</label>
        <textarea id="menu-code" v-model="code" rows="4" placeholder="CRRCP1.… or CRMENU1.…" spellcheck="false" aria-describedby="menu-code-help"></textarea>
        <p id="menu-code-help" class="form-note">The game exports these codes as a prefix, a base64url payload and an optional extra part. Only your browser reads them; nothing is uploaded.</p>
        <div class="button-row">
          <button class="button button--primary" type="button" :disabled="!code.trim()" @click="decode">Read code</button>
          <button class="button" type="button" :disabled="!dishes.length" @click="saveMenu">Save locally</button>
        </div>
        <p v-if="error" class="danger" role="status">{{ error }}</p>
        <p v-else-if="message" class="form-note" role="status">{{ message }}</p>
      </div>
    </section>
    <section v-if="dishes.length" class="factory-panel">
      <div class="panel-title"><h2>{{ kind === 'recipe' ? 'Recipe contents' : 'Menu contents' }}</h2><span>{{ dishes.length }} dish(es)</span></div>
      <div class="reference-content">
        <div class="equipment-form"><div><label for="menu-chunk">Score for restaurant ID (optional)</label><input id="menu-chunk" v-model="chunkId" placeholder="15/18295/10789"><small class="form-note">Leave blank to skip scoring.</small></div><div><label for="menu-score">Local tastes</label><button id="menu-score" class="button" type="button" @click="loadTrends">Load tastes</button></div></div>
      </div>
      <div class="reference-content">
        <article v-for="(dish, index) in dishes" :key="index" class="menu-dish">
          <div class="menu-dish__head">
            <h3>{{ dish.name }}</h3>
            <span class="menu-dish__meta">{{ dish.vessel }} · ${{ dish.price }}<template v-if="dish.servings"> · {{ dish.servings }} serving(s)</template></span>
          </div>
          <ul class="menu-mix">
            <li v-for="part in dish.mix" :key="part.ingredientId"><span>{{ ingredientName(part.ingredientId) }}</span><strong>{{ part.share }}%</strong></li>
          </ul>
          <p v-if="scoreFor(dish)" class="reference-answer" role="status">Best local match: <strong>{{ scoreFor(dish)!.uiMatchPercent }}%</strong> ({{ scoreFor(dish)!.uiPopularityBonusPercent >= 0 ? '+' : '' }}{{ scoreFor(dish)!.uiPopularityBonusPercent }}% popularity).</p>
        </article>
      </div>
    </section>
    <section class="factory-panel">
      <div class="panel-title"><h2>Saved locally</h2><span>{{ saved.length }}</span></div>
      <div v-if="saved.length" class="reference-content">
        <ul class="library-list">
          <li v-for="entry in saved" :key="entry.id"><button class="text-button" type="button" @click="openSaved(entry)">{{ entry.name }}</button><button class="icon-button" type="button" :aria-label="`Remove ${entry.name}`" @click="removeSaved(entry.id)">×</button></li>
        </ul>
      </div>
      <p v-else class="form-note">Nothing saved yet. Decoded menus stay in this browser only.</p>
    </section>
  </div>
</template>
