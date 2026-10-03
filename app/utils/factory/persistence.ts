import { FACTORY_CATALOG, migrateLegacyRecipeId } from './catalog'
import type { Factory, FactoryPlannerStateV1, SavedProductionPlan } from './types'

export const FACTORY_STORAGE_KEY = 'capital-rift-factory-planner-v1'
export function emptyFactoryState(): FactoryPlannerStateV1 { return { schemaVersion: 1, catalogVersion: FACTORY_CATALOG.version, selectedFactoryId: null, factories: [], plans: [], settings: { showHourly: true } } }
function finiteNonNegative(value: unknown) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : 0 }
function string(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback }
function sanitizeFactory(value: any): Factory | null {
  if (!value || typeof value !== 'object' || !string(value.id) || !string(value.name).trim()) return null
  return { id: string(value.id), name: string(value.name).trim(), machines: Array.isArray(value.machines) ? value.machines.filter((entry: any) => string(entry?.stationId)).map((entry: any) => ({ stationId: string(entry.stationId), owned: finiteNonNegative(entry.owned) })) : [], productions: Array.isArray(value.productions) ? value.productions.filter((entry: any) => string(entry?.id) && string(entry?.recipeId)).map((entry: any) => ({ id: string(entry.id), recipeId: migrateLegacyRecipeId(string(entry.recipeId)), label: string(entry.label), assignedMachines: finiteNonNegative(entry.assignedMachines) })) : [], supplies: Array.isArray(value.supplies) ? value.supplies.filter((entry: any) => string(entry?.id) && string(entry?.itemId)).map((entry: any) => ({ id: string(entry.id), itemId: string(entry.itemId), label: string(entry.label), ratePerMinute: finiteNonNegative(entry.ratePerMinute) })) : [], createdAt: string(value.createdAt, new Date().toISOString()), updatedAt: string(value.updatedAt, new Date().toISOString()) }
}
function sanitizePlan(value: any): SavedProductionPlan | null {
  if (!value || typeof value !== 'object' || !string(value.id) || !string(value.name).trim() || !string(value.productId)) return null
  const productId = string(value.productId)
  const recipeOverrides = value.recipeOverrides && typeof value.recipeOverrides === 'object'
    ? Object.fromEntries(Object.entries(value.recipeOverrides).filter(([, recipeId]) => typeof recipeId === 'string').map(([overrideProductId, recipeId]) => [overrideProductId, migrateLegacyRecipeId(recipeId as string, overrideProductId)])) as Record<string, string>
    : {}
  return { id: string(value.id), name: string(value.name).trim(), productId, targetRatePerMinute: finiteNonNegative(value.targetRatePerMinute), useNetworkSurplus: Boolean(value.useNetworkSurplus), recipeOverrides, calculationVersion: typeof value.calculationVersion === 'number' ? value.calculationVersion : undefined, createdAt: string(value.createdAt, new Date().toISOString()), updatedAt: string(value.updatedAt, new Date().toISOString()) }
}
export function parseFactoryState(input: string | unknown): FactoryPlannerStateV1 {
  const value: any = typeof input === 'string' ? JSON.parse(input) : input
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1) throw new Error('This is not a supported Capital Rift Tools backup.')
  const factories = Array.isArray(value.factories) ? value.factories.map(sanitizeFactory).filter(Boolean) as Factory[] : []; const plans = Array.isArray(value.plans) ? value.plans.map(sanitizePlan).filter(Boolean) as SavedProductionPlan[] : []; const selected = string(value.selectedFactoryId) || null
  return { schemaVersion: 1, catalogVersion: string(value.catalogVersion, FACTORY_CATALOG.version), selectedFactoryId: factories.some(factory => factory.id === selected) ? selected : factories[0]?.id ?? null, factories, plans, settings: { showHourly: value.settings?.showHourly !== false } }
}
export function serializeFactoryState(state: FactoryPlannerStateV1) { return JSON.stringify(state, null, 2) }
