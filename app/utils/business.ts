import mechanics from '../data/economy-mechanics.json'

export const ECONOMY_MECHANICS = mechanics
const { rent: RENT, lease: LEASE, seizure: SEIZURE, building: BUILDING, busyness: BUSYNESS, wages: WAGES, solvency: SOLVENCY, auction: AUCTION } = mechanics

export const MINUTES_PER_REAL_DAY = 1440

function clampBusyness(value: number) { return Math.min(BUSYNESS.max, Math.max(BUSYNESS.min, Number.isFinite(value) ? value : BUSYNESS.min)) }
function wholeFloors(floors: number) { return Math.min(BUILDING.maxFloorsCap, Math.max(1, Math.floor(Number.isFinite(floors) ? floors : 1))) }
function economyFactor(buildingAreaM2: number, floors: number) {
  if (!(Number.isFinite(buildingAreaM2) && buildingAreaM2 > 0)) return 1
  return Math.min(1, BUILDING.econMaxFootprintM2 / buildingAreaM2, BUILDING.econMaxFloorAreaM2 / (buildingAreaM2 * floors))
}

export interface PropertyInput { unitAreaM2: number; buildingAreaM2: number; floors: number; basements: number; busyness: number; subtypeMul?: number }

export function rentPerDay(input: PropertyInput): number {
  const floors = wholeFloors(input.floors)
  const x = economyFactor(input.buildingAreaM2, floors)
  const busyness = clampBusyness(input.busyness)
  const unitArea = Math.max(0, Number.isFinite(input.unitAreaM2) ? input.unitAreaM2 : 0) * x
  const tapered = unitArea <= RENT.areaTaperM2 ? unitArea : RENT.areaTaperM2 * Math.pow(unitArea / RENT.areaTaperM2, RENT.areaTaperExp)
  const subtypeMul = Number.isFinite(input.subtypeMul) && (input.subtypeMul ?? 0) > 0 ? input.subtypeMul! : 1
  const raw = RENT.perM2PerDay * tapered * Math.pow(busyness, RENT.busynessExp) * subtypeMul
  return Math.max(RENT.minPerDay, Math.round(raw))
}

export function buildingValue(input: Omit<PropertyInput, 'unitAreaM2'>): number {
  const floors = wholeFloors(input.floors)
  const x = economyFactor(input.buildingAreaM2, floors)
  const busyness = clampBusyness(input.busyness)
  const subtypeMul = Number.isFinite(input.subtypeMul) && (input.subtypeMul ?? 0) > 0 ? input.subtypeMul! : 1
  const raw = BUILDING.valuePerM2 * Math.max(0, input.buildingAreaM2) * x
    * (1 + BUILDING.upperFloorFactor * (floors - 1) + BUILDING.basementFloorFactor * Math.max(0, input.basements))
    * Math.pow(busyness, BUILDING.busynessExp) * subtypeMul
  return Math.max(BUILDING.valueMin, Math.round(raw / 50) * 50)
}

export interface LeaseTerms { downPayment: number; perTerm: number; compensation: number; evictionArrears: number; termRealDays: number }

export function leaseTerms(rentPerDayValue: number): LeaseTerms {
  const perDay = Number.isFinite(rentPerDayValue) ? Math.max(0, rentPerDayValue) : 0
  return {
    downPayment: LEASE.downPaymentDays * perDay,
    perTerm: LEASE.termRealDays * 24 * perDay,
    compensation: LEASE.compensationDays * perDay,
    evictionArrears: LEASE.evictAfterRealDays * 24 * perDay,
    termRealDays: LEASE.termRealDays,
  }
}

export function rentPerMinute(rentPerDayValue: number): number {
  return Number.isFinite(rentPerDayValue) ? Math.max(0, rentPerDayValue) / 60 : 0
}

export type SolvencyTier = 'ok' | 'behind' | 'burning' | 'at_risk' | 'critical'

export interface SolvencyInput { netPerMin: number; cash: number; seizableCredit?: number; rentPerMin: number; behind?: boolean; evictAtMs?: number | null; nowMs?: number }

export interface SolvencyResult { tier: SolvencyTier; burnPerMin: number; zeroAtMs: number | null; seizeEndAtMs: number | null; evictAtMs: number | null }

export function solvencyForecast(input: SolvencyInput): SolvencyResult {
  const nowMs = input.nowMs ?? 0
  const burnPerMin = Math.max(0, -(Number.isFinite(input.netPerMin) ? input.netPerMin : 0))
  if (burnPerMin <= 0) return { tier: input.behind ? 'behind' : 'ok', burnPerMin: 0, zeroAtMs: null, seizeEndAtMs: null, evictAtMs: input.evictAtMs ?? null }
  const cash = Number.isFinite(input.cash) ? input.cash : 0
  const zeroAtMs = nowMs + cash / burnPerMin * 60000
  const seizableCredit = Number.isFinite(input.seizableCredit) ? Math.max(0, input.seizableCredit!) : 0
  const seizeEndAtMs = seizableCredit > 0 ? zeroAtMs + seizableCredit / burnPerMin * 60000 : zeroAtMs
  const evictAtMs = input.evictAtMs ?? (input.rentPerMin > 0 ? seizeEndAtMs + mechanics.realSecondsPerGameDay * 1000 : null)
  const toZero = zeroAtMs - nowMs
  const toEvict = evictAtMs !== null ? evictAtMs - nowMs : null
  const tier: SolvencyTier = (toZero <= SOLVENCY.criticalZeroHours * 3600000 || (toEvict !== null && toEvict <= SOLVENCY.criticalEvictHours * 3600000))
    ? 'critical'
    : toZero <= SOLVENCY.atRiskHours * 3600000 ? 'at_risk' : 'burning'
  return { tier, burnPerMin, zeroAtMs, seizeEndAtMs: seizableCredit > 0 ? seizeEndAtMs : null, evictAtMs }
}

export type RunwayTier = 'short' | 'good' | 'tight' | 'loss' | 'danger'

export interface RunwayInput { netPerMin: number; cash: number; rentPerDay: number; downPayment: number }

export interface RunwayResult { tier: RunwayTier; netAfterPerMin: number; cashAfter: number; runwayMin: number | null; runwayDays: number | null }

export function cashRunway(input: RunwayInput): RunwayResult {
  const perMin = rentPerMinute(input.rentPerDay)
  const net = Number.isFinite(input.netPerMin) ? input.netPerMin : 0
  const netAfterPerMin = net - perMin
  const cashAfter = (Number.isFinite(input.cash) ? input.cash : 0) - (Number.isFinite(input.downPayment) ? input.downPayment : 0)
  if (cashAfter < 0) return { tier: 'short', netAfterPerMin, cashAfter, runwayMin: null, runwayDays: null }
  if (netAfterPerMin >= 0) {
    const good = netAfterPerMin >= SOLVENCY.goodNetFraction * perMin && cashAfter >= SOLVENCY.goodCashDays * input.rentPerDay
    return { tier: good ? 'good' : 'tight', netAfterPerMin, cashAfter, runwayMin: null, runwayDays: null }
  }
  const runwayMin = cashAfter / -netAfterPerMin
  const threshold = LEASE.termRealDays * MINUTES_PER_REAL_DAY
  return { tier: runwayMin >= threshold ? 'loss' : 'danger', netAfterPerMin, cashAfter, runwayMin, runwayDays: runwayMin / MINUTES_PER_REAL_DAY }
}

export function wageCostPerMin(activeWorkers: number): number {
  if (!Number.isFinite(activeWorkers) || activeWorkers <= 0) return 0
  return activeWorkers * WAGES.wagePerMin
}

export function hireCost(workers: number): number {
  if (!Number.isFinite(workers) || workers <= 0) return 0
  return Math.ceil(workers) * WAGES.hireCost
}

export interface ProductivityInput { grossPerMin: number; wagePerMin: number; rentPerMin?: number }

export function staffedNetPerMin(input: ProductivityInput): number {
  return (Number.isFinite(input.grossPerMin) ? input.grossPerMin : 0)
    - (Number.isFinite(input.wagePerMin) ? input.wagePerMin : 0)
    - (Number.isFinite(input.rentPerMin) ? input.rentPerMin! : 0)
}

export function seizureRecovery(value: number) {
  const base = Number.isFinite(value) ? Math.max(0, value) : 0
  return {
    redeemCost: base * SEIZURE.redeemFee,
    saleProceeds: base * (1 - SEIZURE.saleDiscount),
    liquidationValue: base * (1 - SEIZURE.liquidationCut),
    holdRealDays: SEIZURE.holdRealDays,
  }
}

export function listingFee(openingBid: number): number {
  return Number.isFinite(openingBid) && openingBid > 0 ? openingBid * AUCTION.listingFeePct / 100 : 0
}

export const BUSINESS_CONSTANTS = { WAGES, SEIZURE, LEASE, SOLVENCY, RENT, BUILDING, BUSYNESS, AUCTION }
