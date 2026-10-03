import { describe, expect, it } from 'vitest'
import rawCatalog from '../app/data/factory-catalog.json'
import { CURRENT_RELEASE_KEY } from '../app/utils/changelog'
import { FACTORY_CATALOG } from '../app/utils/factory/catalog'
import { buildLedger, planProduction } from '../app/utils/factory/calculations'
import { emptyFactoryState, parseFactoryState, serializeFactoryState } from '../app/utils/factory/persistence'
import type { Factory, FactoryCatalog } from '../app/utils/factory/types'

const catalog: FactoryCatalog = (() => {
  const items = [
    { id: 'ore', name: 'Ore' },
    { id: 'bar', name: 'Bar' },
    { id: 'part', name: 'Part' },
    { id: 'furnace', name: 'Furnace' },
    { id: 'bench', name: 'Bench' },
  ]
  const recipes = [
    { id: 'bar-recipe', name: 'Smelt bar', productId: 'bar', stationId: 'furnace', batch: 1, perMinute: 2, inputs: [{ itemId: 'ore', quantity: 3 }] },
    { id: 'part-recipe', name: 'Build part', productId: 'part', stationId: 'bench', batch: 1, perMinute: 1, inputs: [{ itemId: 'bar', quantity: 2 }] },
  ]
  return {
    version: 'test',
    items,
    recipes,
    itemById: new Map(items.map(item => [item.id, item])),
    recipeById: new Map(recipes.map(recipe => [recipe.id, recipe])),
    recipesByProduct: new Map([['bar', [recipes[0]!]], ['part', [recipes[1]!]]]),
    stationIds: ['furnace', 'bench'],
  }
})()

function factory(): Factory {
  return {
    id: 'factory-1',
    name: 'Test factory',
    machines: [{ stationId: 'furnace', owned: 1 }],
    productions: [
      { id: 'bar-line', recipeId: 'bar-recipe', label: '', assignedMachines: 2 },
      { id: 'part-line', recipeId: 'part-recipe', label: '', assignedMachines: 1 },
    ],
    supplies: [{ id: 'ore-source', itemId: 'ore', label: '', ratePerMinute: 10 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('factory planner domain', () => {
  it('builds production balances without rationing shortages', () => {
    const ledger = buildLedger([factory()], catalog)
    expect(ledger.rows.find(row => row.itemId === 'bar')).toMatchObject({ supplied: 4, consumed: 2, balance: 2 })
    expect(ledger.rows.find(row => row.itemId === 'ore')).toMatchObject({ supplied: 10, consumed: 12, balance: -2 })
    expect(ledger.machineRows.find(row => row.stationId === 'furnace')).toMatchObject({ owned: 1, assigned: 2, missing: 1 })
  })

  it('expands a product into machines and raw inputs', () => {
    const result = planProduction('part', 3, { catalog })
    expect(result.rows.find(row => row.itemId === 'part')).toMatchObject({ toProduce: 3, machines: 3 })
    expect(result.rows.find(row => row.itemId === 'bar')).toMatchObject({ toProduce: 6, machines: 3 })
    expect(result.rows.find(row => row.itemId === 'ore')).toMatchObject({ toProduce: 18, recipeId: null })
    expect(result.totalMachines).toBe(6)
  })

  it('uses only positive network surplus when requested', () => {
    const result = planProduction('part', 2, { catalog, factories: [factory()], useNetworkSurplus: true })
    expect(result.rows.find(row => row.itemId === 'bar')?.coveredBySurplus).toBe(2)
    expect(result.rows.some(row => row.itemId === 'ore')).toBe(false)
  })

  it('round-trips and sanitizes local state', () => {
    const state = emptyFactoryState()
    state.factories = [factory()]
    state.selectedFactoryId = 'factory-1'
    const parsed = parseFactoryState(serializeFactoryState(state))
    expect(parsed.factories).toHaveLength(1)
    expect(parsed.selectedFactoryId).toBe('factory-1')
    expect(() => parseFactoryState('{"schemaVersion":2}')).toThrow(/supported/)
  })

  it('migrates legacy generated recipe ids in factories and plans', () => {
    const parsed = parseFactoryState({
      schemaVersion: 1,
      catalogVersion: 'legacy-catalog',
      selectedFactoryId: 'factory-1',
      factories: [{
        ...factory(),
        productions: [
          { id: 'computer-line', recipeId: 'computer_case--manufacturing_press--fold-a-computer-case', label: '', assignedMachines: 1 },
          { id: 'missing-line', recipeId: 'missing--station--old-name', label: '', assignedMachines: 1 },
        ],
      }],
      plans: [{
        id: 'plan-1',
        name: 'Computer cases',
        productId: 'computer_case',
        targetRatePerMinute: 1,
        useNetworkSurplus: false,
        recipeOverrides: { computer_case: 'computer_case--manufacturing_press--fold-a-computer-case' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      settings: { showHourly: true },
    })

    expect(parsed.factories[0]?.productions[0]?.recipeId).toBe('computer_case')
    expect(parsed.factories[0]?.productions[1]?.recipeId).toBe('missing--station--old-name')
    expect(parsed.plans[0]?.recipeOverrides.computer_case).toBe('computer_case')
  })

  it('ships a consistent bundled catalog', () => {
    expect(Object.keys(rawCatalog).sort()).toEqual(['items', 'recipes'])
    expect(FACTORY_CATALOG.version).toBe(CURRENT_RELEASE_KEY)
    expect(FACTORY_CATALOG.items).toHaveLength(329)
    expect(FACTORY_CATALOG.recipes).toHaveLength(249)
    expect(new Set(FACTORY_CATALOG.recipes.map(recipe => recipe.id)).size).toBe(FACTORY_CATALOG.recipes.length)
    for (const recipe of FACTORY_CATALOG.recipes) {
      expect(FACTORY_CATALOG.itemById.has(recipe.productId)).toBe(true)
      expect(FACTORY_CATALOG.itemById.has(recipe.stationId)).toBe(true)
      expect(recipe.perMinute).toBeGreaterThan(0)
      expect(recipe.batch).toBeGreaterThan(0)
      expect(recipe.inputs.every(input => FACTORY_CATALOG.itemById.has(input.itemId) && input.quantity > 0)).toBe(true)
    }
  })

  it('includes current game recipe fixtures and new production chains', () => {
    expect(FACTORY_CATALOG.recipeById.get('computer_case')).toMatchObject({
      stationId: 'manufacturing_press',
      productId: 'computer_case',
      batch: 1,
      perMinute: 0.07,
      inputs: [
        { itemId: 'plastic_part', quantity: 2 },
        { itemId: 'steel_sheet', quantity: 3 },
      ],
    })
    expect(FACTORY_CATALOG.recipeById.get('paper')).toMatchObject({
      stationId: 'mill',
      productId: 'paper',
      batch: 4,
      perMinute: 2,
      inputs: [{ itemId: 'wood', quantity: 1 }],
    })
    expect(FACTORY_CATALOG.recipeById.get('diesel')).toBeDefined()
    expect(FACTORY_CATALOG.recipeById.get('marine_engine')).toBeDefined()
    expect(FACTORY_CATALOG.recipeById.get('playing_cards')).toBeDefined()
  })
})
