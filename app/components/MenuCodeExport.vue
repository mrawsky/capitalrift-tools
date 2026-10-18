<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { INGREDIENT_BY_ID } from '../utils/domain/ingredients'
import {
  MAX_MENU_DISHES,
  encodeMenuFromRecipes,
  encodeRecipeCode,
  type RecipeCodeDetails,
} from '../utils/domain/menuCode'
import { STATIONS, validateRecipeComposition } from '../utils/domain/scoring'
import { ANALYTICS_EVENTS } from '../utils/analytics'
import { useAnalytics } from '../composables/useAnalytics'
import type { RecipePart, Station } from '../utils/domain/types'

interface MenuExportDish {
  parts: RecipePart[]
  name?: string
  vessel?: Station
  price?: number
  servings?: number
}

const props = withDefaults(defineProps<{
  dishes: MenuExportDish[]
  kind?: 'recipe' | 'menu'
  label?: string
  defaultVessel?: Station
  defaultPrice?: number
  defaultServings?: number
}>(), {
  kind: undefined,
  label: 'Export menu code',
  defaultVessel: 'prep',
  defaultPrice: 1,
  defaultServings: 1,
})

const { capture } = useAnalytics()
const uid = useId()
const open = ref(false)
const copied = ref(false)
const nameTouched = ref(false)
const message = ref('')
const name = ref(props.dishes[0]?.name || '')
const vessel = ref<Station>(props.defaultVessel)
const price = ref(props.defaultPrice)
const servings = ref(props.defaultServings)

const single = computed(() => props.dishes.length === 1)
const exportKind = computed<'recipe' | 'menu'>(() => props.kind ?? (single.value ? 'recipe' : 'menu'))
const codeLabel = computed(() => exportKind.value === 'recipe' ? 'CRRCP1' : 'CRMENU1')

function suggestedName(parts: RecipePart[]) {
  const top = [...parts].sort((a, b) => b.share - a.share).slice(0, 2)
  return `${top.map(part => INGREDIENT_BY_ID.get(part.ingredientId)?.name ?? part.ingredientId).join(' & ')} Blend`
}

const dishNames = computed(() => props.dishes.map(dish => dish.name?.trim() || suggestedName(dish.parts)))

const errors = computed(() => {
  if (props.dishes.length === 0) return ['Generate or add at least one recipe first.']
  if (props.dishes.length > MAX_MENU_DISHES) return [`A menu code holds at most ${MAX_MENU_DISHES} dishes.`]
  return props.dishes.flatMap(dish => validateRecipeComposition(dish.parts))
})
const valid = computed(() => errors.value.length === 0)

const code = computed(() => {
  if (!valid.value) return ''
  const details: RecipeCodeDetails[] = props.dishes.map((dish, index) => ({
    name: single.value ? (name.value.trim() || undefined) : dishNames.value[index],
    vessel: dish.vessel ?? vessel.value,
    price: dish.price ?? price.value,
    servings: dish.servings ?? servings.value,
  }))
  try {
    return exportKind.value === 'recipe'
      ? encodeRecipeCode(props.dishes[0]!.parts, details[0])
      : encodeMenuFromRecipes(props.dishes.map((dish, index) => ({ parts: dish.parts, details: details[index] })))
  }
  catch {
    return ''
  }
})

function toggle() {
  if (!open.value && single.value && !nameTouched.value) {
    const dish = props.dishes[0]
    if (dish) name.value = dish.name?.trim() || suggestedName(dish.parts)
  }
  open.value = !open.value
}

async function copyCode() {
  if (!code.value) return
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => copied.value = false, 1800)
    message.value = `${codeLabel.value} code copied (${props.dishes.length} dish${props.dishes.length === 1 ? '' : 'es'}).`
    capture(ANALYTICS_EVENTS.menuCodeExported, {
      tool: 'recipe-menu-export',
      code_kind: exportKind.value,
      dish_count: props.dishes.length,
      vessel: vessel.value,
    })
  }
  catch {
    message.value = 'The browser could not copy the code. Select the code above and copy it manually.'
  }
}
</script>

<template>
  <div class="menu-code-export">
    <button class="text-button" type="button" :aria-expanded="open" @click="toggle">
      {{ open ? 'Close menu code export' : label }} <span aria-hidden="true">↗</span>
    </button>

    <div v-if="open" class="menu-code-export__form">
      <template v-if="single">
        <label :for="`menu-export-name-${uid}`">Dish name</label>
        <input :id="`menu-export-name-${uid}`" v-model="name" maxlength="40" placeholder="Dish name" @input="nameTouched = true">
      </template>
      <template v-else>
        <p class="form-note">{{ dishes.length }} dishes will be exported as a single {{ codeLabel }} menu.</p>
        <ul class="menu-mix" aria-label="Dishes in this menu">
          <li v-for="(dishName, index) in dishNames" :key="index">
            <span>{{ dishName }}</span>
            <strong>{{ index + 1 }}</strong>
          </li>
        </ul>
      </template>

      <div class="menu-code-export__fields">
        <label>Station
          <select v-model="vessel">
            <option v-for="station in STATIONS" :key="station" :value="station">{{ station }}</option>
          </select>
        </label>
        <label>Price
          <input v-model.number="price" type="number" min="1" max="100" step="0.01">
        </label>
        <label>Servings
          <input v-model.number="servings" type="number" min="1" step="1">
        </label>
      </div>

      <ul v-if="errors.length" class="error-list" aria-live="polite">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>

      <template v-if="code">
        <label :for="`menu-export-code-${uid}`">Generated {{ codeLabel }} code</label>
        <textarea :id="`menu-export-code-${uid}`" :value="code" rows="3" readonly spellcheck="false"></textarea>
        <div class="button-row">
          <button class="button button--primary" type="button" @click="copyCode">{{ copied ? 'Copied' : `Copy ${codeLabel} code` }}</button>
        </div>
      </template>

      <p v-if="message" class="form-note" role="status">{{ message }}</p>
    </div>
  </div>
</template>
