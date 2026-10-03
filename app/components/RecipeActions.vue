<script setup lang="ts">
import { INGREDIENT_BY_ID } from '../utils/domain/ingredients'
import { restaurantShare, shareFragment } from '../utils/sharing'
import type { RecipePart } from '../utils/domain/types'
const props = defineProps<{ parts: RecipePart[]; chunkId: string }>()
const { saveRecipe } = useRestaurantLibrary()
const events = useToolEvents()
const message = ref('')
const name = computed(() => props.parts.map(part => INGREDIENT_BY_ID.get(part.ingredientId)?.name).slice(0, 2).join(' & '))
function save() { try { saveRecipe(props.chunkId, props.parts, name.value); message.value = 'Recipe saved in your local library.' } catch (error) { message.value = error instanceof Error ? error.message : 'Could not save this recipe.' } }
async function share() { try { await navigator.clipboard.writeText(`${window.location.origin}/recipe${shareFragment(restaurantShare(props.chunkId, props.parts, name.value))}`); message.value = 'Recipe link copied, including this mix and location.'; events('recipe_share') } catch { message.value = 'Could not copy the recipe link. You can still save it locally.' } }
</script>
<template><div class="recipe-library-actions"><button class="text-button" type="button" @click="save">Save recipe</button><button class="text-button" type="button" @click="share">Share this mix</button><span class="form-note" role="status">{{ message }}</span></div></template>
