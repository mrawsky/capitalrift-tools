import { FACTORY_CATALOG } from './factory/catalog'
import { validateRecipeComposition } from './domain/scoring'
import { parseChunkIdInput } from './domain/location'
import { GAME_MODEL } from './domain/model'
import type { RecipePart } from './domain/types'

export interface SharedFactoryPlan { schemaVersion: 1; type: 'factory-plan'; catalogVersion: string; name: string; productId: string; targetRatePerMinute: number; recipeOverrides: Record<string, string> }
export interface SharedRecipe { schemaVersion: 1; type: 'restaurant-recipe'; modelVersion: string; name: string; chunkId: string; parts: RecipePart[] }
export type SharedTool = SharedFactoryPlan | SharedRecipe
export const MAX_SHARE_FILE_BYTES = 65536
const MAX_FRAGMENT_LENGTH = 12000

export function parseSharedTool(text: string): SharedTool {
  if (text.length > MAX_SHARE_FILE_BYTES) throw new Error('This shared file is too large.')
  const value = JSON.parse(text)
  if (!value || value.schemaVersion !== 1 || typeof value.name !== 'string' || value.name.length > 120) throw new Error('This is not a supported shared tool file.')
  if (value.type === 'factory-plan') {
    if (!FACTORY_CATALOG.recipesByProduct.has(value.productId) || !Number.isFinite(value.targetRatePerMinute) || value.targetRatePerMinute <= 0 || value.targetRatePerMinute > 1e6) throw new Error('The blueprint product or target rate is unavailable.')
    const overrides: Record<string, string> = {}
    if (value.recipeOverrides && typeof value.recipeOverrides === 'object' && !Array.isArray(value.recipeOverrides)) for (const [product, recipeId] of Object.entries(value.recipeOverrides)) {
      if (typeof recipeId !== 'string' || FACTORY_CATALOG.recipeById.get(recipeId)?.productId !== product) throw new Error('This blueprint contains an unavailable recipe selection.')
      overrides[product] = recipeId
    }
    return { schemaVersion: 1, type: 'factory-plan', catalogVersion: typeof value.catalogVersion === 'string' ? value.catalogVersion : '', name: value.name, productId: value.productId, targetRatePerMinute: value.targetRatePerMinute, recipeOverrides: overrides }
  }
  if (value.type === 'restaurant-recipe') {
    if (typeof value.chunkId !== 'string' || !Array.isArray(value.parts) || value.parts.length > 8 || value.parts.some((part: any) => !part || typeof part.ingredientId !== 'string' || typeof part.share !== 'number')) throw new Error('The shared recipe is incomplete.')
    const parts = value.parts.map((part: RecipePart) => ({ ingredientId: part.ingredientId, share: part.share }))
    if (validateRecipeComposition(parts).length) throw new Error('The shared recipe composition is invalid.')
    return { schemaVersion: 1, type: 'restaurant-recipe', modelVersion: typeof value.modelVersion === 'string' ? value.modelVersion : '', name: value.name, chunkId: parseChunkIdInput(value.chunkId).originalId, parts }
  }
  throw new Error('This shared file has an unknown tool type.')
}

export function shareFragment(value: SharedTool) {
  const encoded = encodeURIComponent(JSON.stringify(parseSharedTool(JSON.stringify(value))))
  if (encoded.length > MAX_FRAGMENT_LENGTH) throw new Error('This plan is too large for a link. Download its JSON instead.')
  return `#share=${encoded}`
}
export function parseShareFragment(hash: string) {
  if (!hash.startsWith('#share=')) return null
  if (hash.length > MAX_FRAGMENT_LENGTH + 7) throw new Error('This shared link is too large.')
  return parseSharedTool(decodeURIComponent(hash.slice(7)))
}
export function restaurantShare(chunkId: string, parts: RecipePart[], name: string): SharedRecipe {
  return parseSharedTool(JSON.stringify({ schemaVersion: 1, type: 'restaurant-recipe', modelVersion: GAME_MODEL.label, chunkId, parts, name })) as SharedRecipe
}
export function downloadToolJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
