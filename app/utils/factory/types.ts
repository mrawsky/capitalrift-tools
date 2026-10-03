export interface FactoryCatalogItem { id: string; name: string }
export interface FactoryRecipeInput { itemId: string; quantity: number }
export interface FactoryRecipe { id: string; name: string; stationId: string; productId: string; batch: number; perMinute: number; inputs: FactoryRecipeInput[] }
export interface FactoryCatalog { version: string; items: FactoryCatalogItem[]; recipes: FactoryRecipe[]; itemById: ReadonlyMap<string, FactoryCatalogItem>; recipeById: ReadonlyMap<string, FactoryRecipe>; recipesByProduct: ReadonlyMap<string, FactoryRecipe[]>; stationIds: readonly string[] }
export interface MachineInventory { stationId: string; owned: number }
export interface ProductionLine { id: string; recipeId: string; label: string; assignedMachines: number }
export interface SupplyLine { id: string; itemId: string; label: string; ratePerMinute: number }
export interface Factory { id: string; name: string; machines: MachineInventory[]; productions: ProductionLine[]; supplies: SupplyLine[]; createdAt: string; updatedAt: string }
export interface SavedProductionPlan { id: string; name: string; productId: string; targetRatePerMinute: number; useNetworkSurplus: boolean; recipeOverrides: Record<string, string>; calculationVersion?: number; createdAt: string; updatedAt: string }
export interface FactoryPlannerStateV1 { schemaVersion: 1; catalogVersion: string; selectedFactoryId: string | null; factories: Factory[]; plans: SavedProductionPlan[]; settings: { showHourly: boolean } }
export interface LedgerRow { itemId: string; supplied: number; consumed: number; balance: number }
export interface MachineSummary { stationId: string; owned: number; assigned: number; spare: number; missing: number; productionCount: number }
export interface FactoryLedger { rows: LedgerRow[]; machineRows: MachineSummary[]; supply: Readonly<Record<string, number>>; demand: Readonly<Record<string, number>> }
export interface PlanRow { itemId: string; required: number; coveredBySurplus: number; toProduce: number; outputRatePerMinute: number; excessRatePerMinute: number; depth: number; recipeId: string | null; stationId: string | null; machines: number; cycle: boolean }
export interface ProductionPlanResult { productId: string; targetRatePerMinute: number; rows: PlanRow[]; totalMachines: number; unresolvedItems: string[]; hasCycle: boolean }
export interface BatchResult { requested: number; batches: number; output: number; excess: number; inputs: FactoryRecipeInput[] }
export interface QuantityPlanRow { itemId: string; required: number; batches: number; output: number; excess: number; depth: number; recipeId: string | null }
export interface QuantityPlanResult { rows: QuantityPlanRow[]; hasCycle: boolean }
