// @vitest-environment happy-dom

import { computed, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRestaurantLibrary } from '../app/composables/useRestaurantLibrary'
import { useFactoryPlanner } from '../app/composables/useFactoryPlanner'
import { parseRestaurantLibrary } from '../app/utils/domain/library'
import { emptyFactoryState } from '../app/utils/factory/persistence'

beforeEach(() => {
  const states = new Map<string, Ref>()
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(init()))
    return states.get(key)
  })
  vi.stubGlobal('computed', computed)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('local community data', () => {
  it('keeps restaurant edits usable and exportable when browser storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded') })
    const library = useRestaurantLibrary()
    library.saveRestaurant('12/2286/1348', 'Harbor kitchen')
    library.saveRecipe('12/2286/1348', [{ ingredientId: 'KETCHUP', share: 50 }, { ingredientId: 'VINEGAR', share: 50 }], 'House recipe')
    expect(library.storageMessage.value).toMatch(/could not save/)
    const backup = parseRestaurantLibrary(JSON.stringify(library.library.value))
    expect(backup.restaurants[0]?.name).toBe('Harbor kitchen')
    expect(backup.recipes[0]?.parts).toHaveLength(2)
    expect(useRestaurantLibrary().library.value).toEqual(library.library.value)
  })

  it('merges a validated restaurant backup and leaves the library intact on rejection', () => {
    const library = useRestaurantLibrary()
    library.saveRestaurant('12/2286/1348', 'Existing')
    const incoming = { ...library.library.value, restaurants: [{ ...library.library.value.restaurants[0]!, name: 'Imported' }] }
    library.importBackup(JSON.stringify(incoming))
    expect(library.library.value.restaurants.map(item => item.name)).toEqual(['Existing', 'Imported'])
    expect(new Set(library.library.value.restaurants.map(item => item.id)).size).toBe(2)
    const before = JSON.stringify(library.library.value)
    expect(() => library.importBackup('{"schemaVersion":2}')).toThrow()
    expect(() => library.saveRecipe('12/2286/1348', [{ ingredientId: 'UNKNOWN', share: 100 }], 'Bad recipe')).toThrow()
    expect(JSON.stringify(library.library.value)).toBe(before)
  })

  it('adds a production plan without granting owned machines or replacing local supplies', () => {
    const workspace = useFactoryPlanner()
    const factory = workspace.addFactory('Existing factory')
    factory.machines.push({ stationId: 'metalwork_bench', owned: 2 })
    factory.supplies.push({ id: 'ore', itemId: 'iron_ore', label: 'Mine', ratePerMinute: 5 })
    const owned = structuredClone(factory.machines)
    const supplies = structuredClone(factory.supplies)
    const plan = workspace.savePlan({ name: 'Nails', productId: 'nails', targetRatePerMinute: 8, recipeOverrides: {}, useNetworkSurplus: false, calculationVersion: 2 })
    workspace.mergePlanIntoFactory(plan, factory.id)
    expect(factory.productions.length).toBeGreaterThan(0)
    expect(factory.machines).toEqual(owned)
    expect(factory.supplies).toEqual(supplies)
    const fresh = workspace.createFactoryFromSavedPlan(plan)
    expect(fresh.machines).toEqual([])
    expect(fresh.supplies).toEqual([])
    expect(emptyFactoryState().schemaVersion).toBe(workspace.state.value.schemaVersion)
  })
})
