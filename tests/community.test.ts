import { describe, expect, it } from 'vitest'
import { parseRestaurantLibrary } from '../app/utils/domain/library'
import { optimizationCacheKey, optimizeRecipes } from '../app/utils/domain/optimizer'
import { generateTrends } from '../app/utils/domain/trends'
import { parseSharedTool, parseShareFragment, restaurantShare, shareFragment } from '../app/utils/sharing'
import { containersRequired, miningAssignment, tripsRequired } from '../app/utils/equipment'

describe('portable tools and constrained recommendations', () => {
  it('keeps excluded ingredients out of pairs and refinement', () => {
    const response = optimizeRecipes({ requestId: 'restricted', trends: generateTrends('12/2286/1348'), allowedIngredientIds: ['KETCHUP', 'VINEGAR', 'MUSTARD'] })
    for (const result of response.results) for (const candidate of result.candidates) expect(candidate.parts.every(part => ['KETCHUP', 'VINEGAR', 'MUSTARD'].includes(part.ingredientId))).toBe(true)
    expect(() => optimizeRecipes({ requestId: 'empty', trends: generateTrends('12/2286/1348'), allowedIngredientIds: [] })).toThrow(/at least two/)
  })
  it('separates availability caches and normalizes equivalent selections', () => {
    expect(optimizationCacheKey('tile', ['KETCHUP', 'VINEGAR'])).toBe(optimizationCacheKey('tile', ['VINEGAR', 'KETCHUP', 'VINEGAR']))
    expect(optimizationCacheKey('tile', ['KETCHUP', 'VINEGAR'])).not.toBe(optimizationCacheKey('tile'))
  })
  it('round-trips recipe compositions and rejects malformed or unavailable inputs', () => {
    const recipe = restaurantShare('15/18295/10789', [{ ingredientId: 'KETCHUP', share: 50 }, { ingredientId: 'VINEGAR', share: 50 }], 'Test mix')
    expect(parseShareFragment(shareFragment(recipe))).toEqual(recipe)
    expect(() => parseSharedTool(JSON.stringify({ ...recipe, parts: [{ ingredientId: 'UNKNOWN', share: 100 }] }))).toThrow(/invalid/)
    expect(() => parseShareFragment('#share=%not-valid')).toThrow()
    const library = { schemaVersion: 1, restaurants: [{ id: 'r', name: 'Restaurant', chunkId: recipe.chunkId }], recipes: [{ ...recipe, id: 'mix' }] }
    expect(parseRestaurantLibrary(JSON.stringify(library))).toEqual(library)
    expect(() => parseRestaurantLibrary(JSON.stringify({ ...library, schemaVersion: 2 }))).toThrow(/supported/)
  })
  it('exports standalone blueprints without sender network state', () => {
    const value = parseSharedTool(JSON.stringify({ schemaVersion: 1, type: 'factory-plan', catalogVersion: 'old', name: 'Parts', productId: 'machine_parts', targetRatePerMinute: 0.01, recipeOverrides: {}, useNetworkSurplus: true, factories: [{ name: 'Private' }] }))
    expect(value).not.toHaveProperty('useNetworkSurplus')
    expect(value).not.toHaveProperty('factories')
    expect(() => parseSharedTool(JSON.stringify({ ...value, targetRatePerMinute: 0 }))).toThrow(/rate/)
    expect(() => parseSharedTool(JSON.stringify({ ...value, recipeOverrides: { nails: 'battery' } }))).toThrow(/selection/)
  })
  it('preserves unknown capacity and rounds trips at boundaries', () => {
    expect(containersRequired(100, undefined)).toBeNull()
    expect(tripsRequired(15000, 15000)).toBe(1)
    expect(tripsRequired(15001, 15000)).toBe(2)
    expect(tripsRequired(0, 15000)).toBe(0)
    expect(tripsRequired(10, 0)).toBeNull()
  })
  it('assigns the strongest available vehicles once per miner', () => {
    expect(miningAssignment(3, { mining_barrow: 3, haul_truck: 1 })).toEqual([7, 1.5, 1.5])
    expect(miningAssignment(3, { bucket_wheel_excavator: 1 })).toEqual([10, 1, 1])
    expect(miningAssignment(1, { haul_truck: 100 })).toEqual([7])
  })
})
