import { FACTORY_CATALOG, defaultRecipeFor, itemName } from './catalog'
import type { Factory, FactoryCatalog, FactoryLedger, FactoryPlannerStateV1, PlanRow, ProductionPlanResult, SavedProductionPlan } from './types'

const EPSILON = 1e-9
function add(target: Record<string, number>, key: string, value: number) { target[key] = (target[key] ?? 0) + value }

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
  const catalog = options.catalog ?? FACTORY_CATALOG; const surplus: Record<string, number> = {}; const indexed = new Map<string, PlanRow>()
  if (options.useNetworkSurplus) for (const row of buildLedger(options.factories ?? [], catalog).rows) if (row.balance > EPSILON) surplus[row.itemId] = row.balance
  function walk(itemId: string, quantity: number, depth: number, path: ReadonlySet<string>) {
    let row = indexed.get(itemId)
    if (!row) { row = { itemId, required: 0, coveredBySurplus: 0, toProduce: 0, depth, recipeId: null, stationId: null, machines: 0, cycle: false }; indexed.set(itemId, row) }
    row.required += quantity; row.depth = Math.max(row.depth, depth)
    const available = surplus[itemId] ?? 0; const covered = Math.min(quantity, available); surplus[itemId] = available - covered; row.coveredBySurplus += covered
    const remaining = quantity - covered; row.toProduce += remaining
    if (remaining <= EPSILON) return
    if (path.has(itemId)) { row.cycle = true; return }
    const override = options.recipeOverrides?.[itemId]
    const recipe = (override ? catalog.recipeById.get(override) : null) ?? catalog.recipesByProduct.get(itemId)?.[0] ?? null
    if (!recipe) return
    row.recipeId = recipe.id; row.stationId = recipe.stationId
    const nextPath = new Set(path); nextPath.add(itemId)
    for (const input of recipe.inputs) walk(input.itemId, remaining * input.quantity / recipe.batch, depth + 1, nextPath)
  }
  walk(productId, Math.max(0, targetRatePerMinute), 0, new Set())
  const rows = [...indexed.values()]
  for (const row of rows) { const recipe = row.recipeId ? catalog.recipeById.get(row.recipeId) : null; row.machines = recipe?.perMinute ? Math.ceil(row.toProduce / recipe.perMinute - EPSILON) : 0 }
  rows.sort((a, b) => a.depth - b.depth || itemName(a.itemId).localeCompare(itemName(b.itemId), 'en'))
  return { productId, targetRatePerMinute, rows, totalMachines: rows.reduce((total, row) => total + row.machines, 0), unresolvedItems: rows.filter(row => row.toProduce > EPSILON && !row.recipeId).map(row => row.itemId), hasCycle: rows.some(row => row.cycle) }
}

function id(prefix: string) { return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}` }
export function factoryFromPlan(plan: SavedProductionPlan, state: FactoryPlannerStateV1, name: string): Factory {
  const result = planProduction(plan.productId, plan.targetRatePerMinute, { factories: state.factories, useNetworkSurplus: plan.useNetworkSurplus, recipeOverrides: plan.recipeOverrides })
  const now = new Date().toISOString(); const productions = result.rows.filter(row => row.recipeId && row.machines > 0).map(row => ({ id: id('production'), recipeId: row.recipeId!, label: '', assignedMachines: row.machines }))
  const totals: Record<string, number> = {}; for (const line of productions) { const recipe = FACTORY_CATALOG.recipeById.get(line.recipeId); if (recipe) add(totals, recipe.stationId, line.assignedMachines) }
  return { id: id('factory'), name, machines: Object.entries(totals).map(([stationId, owned]) => ({ stationId, owned })), productions, supplies: [], createdAt: now, updatedAt: now }
}
export function createFactory(name: string): Factory { const now = new Date().toISOString(); return { id: id('factory'), name, machines: [], productions: [], supplies: [], createdAt: now, updatedAt: now } }
export function createProductionLine(recipeId = defaultRecipeFor(FACTORY_CATALOG.recipes[0]?.productId ?? '')?.id ?? '') { return { id: id('production'), recipeId, label: '', assignedMachines: 1 } }
export function createSupplyLine(itemId = FACTORY_CATALOG.items[0]?.id ?? '') { return { id: id('supply'), itemId, label: '', ratePerMinute: 0 } }
