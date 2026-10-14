import { basePrice } from '../market'
import type { RecipePart } from './types'

export interface RecipeCostRow { ingredientId: string; share: number; price: number | null; cost: number }
export interface RecipeCost { total: number; priced: number; unpriced: string[]; breakdown: RecipeCostRow[] }

// Relative ingredient cost for one batch of the recipe, using the client base
// prices and each ingredient's percentage share. Prices are per base unit.
export function recipeCost(parts: readonly RecipePart[]): RecipeCost {
  const breakdown: RecipeCostRow[] = parts.map(part => {
    const price = basePrice(part.ingredientId)
    return { ingredientId: part.ingredientId, share: part.share, price, cost: price === null ? 0 : price * part.share / 100 }
  })
  const unpriced = breakdown.filter(row => row.price === null).map(row => row.ingredientId)
  return { total: breakdown.reduce((sum, row) => sum + row.cost, 0), priced: breakdown.length - unpriced.length, unpriced, breakdown }
}
