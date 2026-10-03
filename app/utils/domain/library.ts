import { parseChunkIdInput } from './location'
import { parseSharedTool, type SharedRecipe } from '../sharing'

export interface SavedRestaurant { id: string; name: string; chunkId: string }
export interface SavedRestaurantRecipe extends SharedRecipe { id: string }
export interface RestaurantLibrary { schemaVersion: 1; restaurants: SavedRestaurant[]; recipes: SavedRestaurantRecipe[] }
export function emptyRestaurantLibrary(): RestaurantLibrary { return { schemaVersion: 1, restaurants: [], recipes: [] } }
export function parseRestaurantLibrary(text: string): RestaurantLibrary {
  if (text.length > 512000) throw new Error('Restaurant backup is too large.')
  const value = JSON.parse(text)
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.restaurants) || !Array.isArray(value.recipes) || value.restaurants.length > 300 || value.recipes.length > 300) throw new Error('This is not a supported restaurant backup.')
  const restaurants = value.restaurants.map((restaurant: any) => {
    if (!restaurant || typeof restaurant.id !== 'string' || typeof restaurant.name !== 'string' || !restaurant.name.trim() || restaurant.name.length > 120 || typeof restaurant.chunkId !== 'string') throw new Error('A saved restaurant is invalid.')
    return { id: restaurant.id, name: restaurant.name, chunkId: parseChunkIdInput(restaurant.chunkId).originalId }
  })
  const recipes = value.recipes.map((recipe: any) => {
    const parsed = parseSharedTool(JSON.stringify(recipe))
    if (parsed.type !== 'restaurant-recipe' || typeof recipe.id !== 'string') throw new Error('A saved recipe is invalid.')
    return { ...parsed, id: recipe.id }
  })
  if (new Set(restaurants.map((r: SavedRestaurant) => r.id)).size !== restaurants.length || new Set(recipes.map((r: SavedRestaurantRecipe) => r.id)).size !== recipes.length) throw new Error('This backup contains duplicate record identifiers.')
  return { schemaVersion: 1, restaurants, recipes }
}
