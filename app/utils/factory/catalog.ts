import rawCatalog from '../../data/factory-catalog.json'
import type { FactoryCatalog, FactoryCatalogItem, FactoryRecipe } from './types'

interface RawRecipe { label: string; station: string; product: string; batch: number; rate: number; inputs: Record<string, number> }
interface RawCatalog { version: string; items: Record<string, string>; recipes: Record<string, RawRecipe> }

function buildCatalog(): FactoryCatalog {
  const source = rawCatalog as RawCatalog
  const items: FactoryCatalogItem[] = Object.entries(source.items).map(([id, name]) => ({ id, name }))
  const recipes: FactoryRecipe[] = Object.entries(source.recipes).map(([id, recipe]) => ({
    id,
    name: recipe.label,
    stationId: recipe.station,
    productId: recipe.product,
    batch: Number(recipe.batch),
    perMinute: Number(recipe.rate),
    inputs: Object.entries(recipe.inputs).map(([itemId, quantity]) => ({ itemId, quantity: Number(quantity) })),
  }))
  const itemById = new Map(items.map(item => [item.id, item]))
  const recipeById = new Map(recipes.map(recipe => [recipe.id, recipe]))
  const recipesByProduct = new Map<string, FactoryRecipe[]>()
  for (const recipe of recipes) recipesByProduct.set(recipe.productId, [...(recipesByProduct.get(recipe.productId) ?? []), recipe])
  return { version: source.version, items, recipes, itemById, recipeById, recipesByProduct, stationIds: [...new Set(recipes.map(recipe => recipe.stationId))] }
}

export const FACTORY_CATALOG = buildCatalog()
export function itemName(itemId: string) { return FACTORY_CATALOG.itemById.get(itemId)?.name ?? itemId.replaceAll('_', ' ') }
export function defaultRecipeFor(productId: string) { return FACTORY_CATALOG.recipesByProduct.get(productId)?.[0] ?? null }

export function migrateLegacyRecipeId(recipeId: string, productHint?: string) {
  if (FACTORY_CATALOG.recipeById.has(recipeId) || !recipeId.includes('--')) return recipeId
  const productId = productHint || recipeId.slice(0, recipeId.indexOf('--'))
  const candidates = FACTORY_CATALOG.recipesByProduct.get(productId) ?? []
  return candidates.length === 1 ? candidates[0]!.id : recipeId
}
