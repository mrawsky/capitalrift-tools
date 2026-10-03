import { describe, expect, it } from 'vitest'
import { FACTORY_CATALOG, defaultRecipeFor, productFromSlug, productPath } from '../app/utils/factory/catalog'
import { buildLedger, calculateBatch, factoryFromPlan, planProduction, planQuantity } from '../app/utils/factory/calculations'
import { emptyFactoryState } from '../app/utils/factory/persistence'
import type { FactoryCatalog, FactoryRecipe } from '../app/utils/factory/types'

function fixture(recipes: FactoryRecipe[]): FactoryCatalog {
  const items = [...new Set(recipes.flatMap(recipe => [recipe.productId, recipe.stationId, ...recipe.inputs.map(input => input.itemId)]))].map(id => ({ id, name: id }))
  return { version: 'test', items, recipes, stationIds: ['bench'], itemById: new Map(items.map(item => [item.id, item])), recipeById: new Map(recipes.map(recipe => [recipe.id, recipe])), recipesByProduct: new Map(recipes.map(recipe => [recipe.productId, [recipe]])) }
}
const diamond = fixture([
  { id: 'root', name: 'root', productId: 'root', stationId: 'bench', batch: 1, perMinute: 1, inputs: [{ itemId: 'a', quantity: 1 }, { itemId: 'b', quantity: 1 }] },
  ...['a', 'b'].map(id => ({ id, name: id, productId: id, stationId: 'bench', batch: 2, perMinute: 2, inputs: [{ itemId: 'shared', quantity: 2 }] })),
  { id: 'shared', name: 'shared', productId: 'shared', stationId: 'bench', batch: 5, perMinute: 5, inputs: [{ itemId: 'raw', quantity: 3 }] },
])

describe('whole-machine and batch planning', () => {
  it('rounds batches at the real nails boundary and never erases a tiny positive request', () => {
    const recipe = defaultRecipeFor('nails')!
    expect(calculateBatch(recipe, 20)).toMatchObject({ batches: 1, output: 20, excess: 0, inputs: [{ itemId: 'iron_bar', quantity: 1 }] })
    expect(calculateBatch(recipe, 21)).toMatchObject({ batches: 2, output: 40, excess: 19, inputs: [{ itemId: 'iron_bar', quantity: 2 }] })
    expect(calculateBatch(recipe, 1e-20).batches).toBe(1)
  })
  it('fixes the applied machine-parts shortage without inventing ownership', () => {
    const plan = { id: 'regression', name: 'Machine parts', productId: 'machine_parts', targetRatePerMinute: 0.01, useNetworkSurplus: false, recipeOverrides: {}, createdAt: '', updatedAt: '' }
    const result = planProduction(plan.productId, plan.targetRatePerMinute)
    expect(result.totalMachines).toBe(5)
    expect(result.rows.find(row => row.itemId === 'machine_parts')?.outputRatePerMinute).toBe(0.4)
    const factory = factoryFromPlan(plan, emptyFactoryState(), plan.name)
    expect(factory.machines).toEqual([])
    const ledger = buildLedger([factory])
    expect(ledger.rows.find(row => row.itemId === 'iron_bar')?.balance).toBeCloseTo(0)
    expect(ledger.rows.find(row => row.itemId === 'iron_ore')?.consumed).toBe(2)
  })
  it('aggregates shared inputs before rounding machines or batches', () => {
    const production = planProduction('root', 1, { catalog: diamond })
    expect(production.rows.find(row => row.itemId === 'shared')).toMatchObject({ required: 4, machines: 1, outputRatePerMinute: 5 })
    const quantity = planQuantity('root', 1, diamond)
    expect(quantity.rows.find(row => row.itemId === 'shared')).toMatchObject({ required: 4, batches: 1, output: 5, excess: 1 })
    expect(quantity.rows.find(row => row.itemId === 'raw')?.required).toBe(3)
  })
  it('uses shared surplus once and propagates only installed new capacity', () => {
    const factory = { id: 'supply', name: 'supply', machines: [], productions: [], supplies: [{ id: 's', itemId: 'shared', label: '', ratePerMinute: 3 }], createdAt: '', updatedAt: '' }
    const result = planProduction('root', 1, { catalog: diamond, factories: [factory], useNetworkSurplus: true })
    expect(result.rows.find(row => row.itemId === 'shared')).toMatchObject({ required: 4, coveredBySurplus: 3, toProduce: 1, machines: 1 })
    expect(result.rows.find(row => row.itemId === 'raw')?.required).toBe(3)
  })
  it('detects cycles without recursion loops', () => {
    const cyclic = fixture([{ id: 'loop', name: 'loop', productId: 'loop', stationId: 'bench', batch: 1, perMinute: 1, inputs: [{ itemId: 'loop', quantity: 1 }] }])
    expect(planProduction('loop', 1, { catalog: cyclic }).hasCycle).toBe(true)
    expect(planQuantity('loop', 1, cyclic).hasCycle).toBe(true)
  })
  it('balances every current product against actual full-speed recipe consumption', () => {
    for (const productId of FACTORY_CATALOG.recipesByProduct.keys()) {
      const result = planProduction(productId, 0.01)
      expect(result.hasCycle, productId).toBe(false)
      const factory = { id: 'all', name: 'all', machines: [], productions: result.rows.filter(row => row.recipeId).map(row => ({ id: row.itemId, recipeId: row.recipeId!, label: '', assignedMachines: row.machines })), supplies: result.rows.filter(row => !row.recipeId).map(row => ({ id: row.itemId, itemId: row.itemId, label: '', ratePerMinute: row.toProduce })), createdAt: '', updatedAt: '' }
      for (const row of buildLedger([factory]).rows) expect(row.balance, `${productId}: ${row.itemId}`).toBeGreaterThanOrEqual(-1e-8)
      expect(productFromSlug(productPath(productId).split('/').at(-1)!)).toBe(productId)
    }
    expect(productFromSlug('not-a-product')).toBeNull()
  })
})
