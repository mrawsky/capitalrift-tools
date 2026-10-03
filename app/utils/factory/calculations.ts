import { FACTORY_CATALOG, defaultRecipeFor, itemName } from './catalog'
import type { BatchResult, Factory, FactoryCatalog, FactoryLedger, FactoryPlannerStateV1, FactoryRecipe, PlanRow, ProductionPlanResult, QuantityPlanResult, SavedProductionPlan } from './types'

const EPSILON = 1e-9
export const PLAN_CALCULATION_VERSION = 2
function nonNegative(value: number) { return Number.isFinite(value) ? Math.max(0, value) : 0 }
function wholeCount(required: number, capacity: number) { const ratio = required / capacity; const nearest = Math.round(ratio); return nearest > 0 && Math.abs(ratio - nearest) <= Number.EPSILON * Math.max(1, ratio) * 8 ? nearest : Math.ceil(ratio) }
function add(target: Record<string, number>, key: string, value: number) { target[key] = (target[key] ?? 0) + value }

export function calculateBatch(recipe: FactoryRecipe, requested: number): BatchResult {
  requested = nonNegative(requested)
  const batches = wholeCount(requested, recipe.batch)
  const output = batches * recipe.batch
  return { requested, batches, output, excess: output - requested, inputs: recipe.inputs.map(input => ({ ...input, quantity: input.quantity * batches })) }
}

// Reverse postorder processes consumers before ingredients. Shared demands are
// aggregated before a producer is rounded, including diamonds in the graph.
function productionGraph(productId: string, catalog: FactoryCatalog, overrides: Readonly<Record<string, string>>) {
  const recipes = new Map<string, FactoryRecipe | null>()
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const order: string[] = []
  let hasCycle = false
  function visit(itemId: string) {
    if (visiting.has(itemId)) { hasCycle = true; return }
    if (visited.has(itemId)) return
    visiting.add(itemId)
    const override = overrides[itemId] ? catalog.recipeById.get(overrides[itemId]!) : null
    const recipe = override?.productId === itemId ? override : catalog.recipesByProduct.get(itemId)?.[0] ?? null
    recipes.set(itemId, recipe)
    for (const input of recipe?.inputs ?? []) visit(input.itemId)
    visiting.delete(itemId)
    visited.add(itemId)
    order.push(itemId)
  }
  visit(productId)
  return { recipes, order: order.reverse(), hasCycle }
}

export function buildLedger(factories: readonly Factory[], catalog: FactoryCatalog = FACTORY_CATALOG): FactoryLedger {
  const supply: Record<string, number> = {}; const demand: Record<string, number> = {}; const owned: Record<string, number> = {}; const assigned: Record<string, number> = {}; const productionCounts: Record<string, number> = {}
  for (const factory of factories) {
    for (const stock of factory.machines) add(owned, stock.stationId, Math.max(0, stock.owned))
    for (const source of factory.supplies) add(supply, source.itemId, Math.max(0, source.ratePerMinute))
    for (const line of factory.productions) {
      const recipe = catalog.recipeById.get(line.recipeId); if (!recipe) continue
      const machines = Math.max(0, line.assignedMachines); const output = machines * recipe.perMinute
      add(supply, recipe.productId, output); add(assigned, recipe.stationId, machines); add(productionCounts, recipe.stationId, 1)
      for (const input of recipe.inputs) add(demand, input.itemId, output * input.quantity / recipe.batch)
    }
  }
  const rows = [...new Set([...Object.keys(supply), ...Object.keys(demand)])].map(itemId => ({ itemId, supplied: supply[itemId] ?? 0, consumed: demand[itemId] ?? 0, balance: (supply[itemId] ?? 0) - (demand[itemId] ?? 0) })).sort((a, b) => itemName(a.itemId).localeCompare(itemName(b.itemId), 'en'))
  const machineRows = [...new Set([...Object.keys(owned), ...Object.keys(assigned)])].map((stationId) => { const o = owned[stationId] ?? 0; const a = assigned[stationId] ?? 0; return { stationId, owned: o, assigned: a, spare: Math.max(0, o - a), missing: Math.max(0, a - o), productionCount: productionCounts[stationId] ?? 0 } }).sort((a, b) => itemName(a.stationId).localeCompare(itemName(b.stationId), 'en'))
  return { rows, machineRows, supply, demand }
}

export function planProduction(productId: string, targetRatePerMinute: number, options: { factories?: readonly Factory[]; useNetworkSurplus?: boolean; recipeOverrides?: Readonly<Record<string, string>>; catalog?: FactoryCatalog } = {}): ProductionPlanResult {
  const catalog = options.catalog ?? FACTORY_CATALOG
  targetRatePerMinute = nonNegative(targetRatePerMinute)
  const graph = productionGraph(productId, catalog, options.recipeOverrides ?? {})
  const surplus: Record<string, number> = {}; const required: Record<string, number> = { [productId]: targetRatePerMinute }; const depths: Record<string, number> = { [productId]: 0 }; const rows: PlanRow[] = []
  if (options.useNetworkSurplus) for (const row of buildLedger(options.factories ?? [], catalog).rows) if (row.balance > EPSILON) surplus[row.itemId] = row.balance
  for (const itemId of graph.order) {
    const demand = required[itemId] ?? 0
    if (demand <= 0) continue
    const covered = Math.min(demand, surplus[itemId] ?? 0)
    const remaining = demand - covered
    const recipe = remaining > 0 ? graph.recipes.get(itemId) : null
    const machines = recipe ? wholeCount(remaining, recipe.perMinute) : 0
    const output = machines * (recipe?.perMinute ?? 0)
    const depth = depths[itemId] ?? 0
    rows.push({ itemId, required: demand, coveredBySurplus: covered, toProduce: remaining, outputRatePerMinute: output, excessRatePerMinute: Math.max(0, output - remaining), depth, recipeId: recipe?.id ?? null, stationId: recipe?.stationId ?? null, machines, cycle: graph.hasCycle })
    if (!graph.hasCycle) for (const input of recipe?.inputs ?? []) {
      add(required, input.itemId, output * input.quantity / recipe!.batch)
      depths[input.itemId] = Math.max(depths[input.itemId] ?? 0, depth + 1)
    }
  }
  rows.sort((a, b) => a.depth - b.depth || itemName(a.itemId).localeCompare(itemName(b.itemId), 'en'))
  return { productId, targetRatePerMinute, rows, totalMachines: rows.reduce((total, row) => total + row.machines, 0), unresolvedItems: rows.filter(row => row.toProduce > EPSILON && !row.recipeId).map(row => row.itemId), hasCycle: graph.hasCycle }
}

export function planQuantity(productId: string, quantity: number, catalog = FACTORY_CATALOG): QuantityPlanResult {
  const graph = productionGraph(productId, catalog, {})
  const required: Record<string, number> = { [productId]: nonNegative(quantity) }
  const depths: Record<string, number> = { [productId]: 0 }
  const rows: QuantityPlanResult['rows'] = []
  for (const itemId of graph.order) {
    const demand = required[itemId] ?? 0
    if (demand <= 0) continue
    const recipe = graph.recipes.get(itemId)
    const batch = recipe ? calculateBatch(recipe, demand) : null
    const depth = depths[itemId] ?? 0
    rows.push({ itemId, required: demand, batches: batch?.batches ?? 0, output: batch?.output ?? 0, excess: batch?.excess ?? 0, depth, recipeId: recipe?.id ?? null })
    if (!graph.hasCycle) for (const input of batch?.inputs ?? []) {
      add(required, input.itemId, input.quantity)
      depths[input.itemId] = Math.max(depths[input.itemId] ?? 0, depth + 1)
    }
  }
  return { rows, hasCycle: graph.hasCycle }
}

function id(prefix: string) { return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}` }
export function factoryFromPlan(plan: SavedProductionPlan, state: FactoryPlannerStateV1, name: string): Factory {
  if (!FACTORY_CATALOG.recipesByProduct.has(plan.productId) || !Number.isFinite(plan.targetRatePerMinute) || plan.targetRatePerMinute <= 0) throw new Error('This saved product or target rate is unavailable. Preview and update the plan first.')
  const result = planProduction(plan.productId, plan.targetRatePerMinute, { factories: state.factories, useNetworkSurplus: plan.useNetworkSurplus, recipeOverrides: plan.recipeOverrides })
  if (result.hasCycle) throw new Error('A recipe cycle prevents this plan from being applied.')
  const now = new Date().toISOString(); const productions = result.rows.filter(row => row.recipeId && row.machines > 0).map(row => ({ id: id('production'), recipeId: row.recipeId!, label: '', assignedMachines: row.machines }))
  return { id: id('factory'), name, machines: [], productions, supplies: [], createdAt: now, updatedAt: now }
}
export function createFactory(name: string): Factory { const now = new Date().toISOString(); return { id: id('factory'), name, machines: [], productions: [], supplies: [], createdAt: now, updatedAt: now } }
export function createProductionLine(recipeId = defaultRecipeFor(FACTORY_CATALOG.recipes[0]?.productId ?? '')?.id ?? '') { return { id: id('production'), recipeId, label: '', assignedMachines: 1 } }
export function createSupplyLine(itemId = FACTORY_CATALOG.items[0]?.id ?? '') { return { id: id('supply'), itemId, label: '', ratePerMinute: 0 } }
