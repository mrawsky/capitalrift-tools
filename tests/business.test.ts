import { describe, expect, it } from 'vitest'
import { averageRepairShare, buildingValue, cashRunway, hireCost, landlordBreakdown, leaseTerms, listingFee, makeReadyFee, rentPerDay, runningCostPerMin, runningCostShare, seizureRecovery, solvencyForecast, wageCostPerMin } from '../app/utils/business'

describe('business mechanics', () => {
  const property = { unitAreaM2: 64, buildingAreaM2: 400, floors: 3, basements: 0, busyness: 1.2 }

  it('derives daily rent from area, busyness and floors', () => {
    expect(rentPerDay(property)).toBe(65)
    expect(rentPerDay({ ...property, unitAreaM2: 5, busyness: 0.4 })).toBe(6)
  })

  it('computes lease terms from daily rent', () => {
    expect(leaseTerms(65)).toMatchObject({ downPayment: 3120, perTerm: 10920, compensation: 10920, evictionArrears: 1560, termRealDays: 7 })
  })

  it('estimates building value with floor factors', () => {
    expect(buildingValue({ buildingAreaM2: 400, floors: 3, basements: 0, busyness: 1.2 })).toBe(2497100)
    expect(buildingValue({ buildingAreaM2: 10, floors: 1, basements: 0, busyness: 1.2 })).toBe(60000)
  })

  it('classifies solvency tiers', () => {
    const critical = solvencyForecast({ netPerMin: -10, cash: 500, rentPerMin: 65 / 60, nowMs: 0 })
    expect(critical.tier).toBe('critical')
    expect(critical.burnPerMin).toBe(10)
    expect(solvencyForecast({ netPerMin: 5, cash: 0, rentPerMin: 1 }).tier).toBe('ok')
    expect(solvencyForecast({ netPerMin: -1, cash: 1000000, rentPerMin: 1 }).tier).toBe('burning')
  })

  it('estimates cash runway after a down payment', () => {
    const danger = cashRunway({ netPerMin: 0, cash: 5000, rentPerDay: 65, downPayment: 0 })
    expect(danger.tier).toBe('danger')
    expect(danger.runwayMin).toBeCloseTo(4615.38, 1)
    expect(cashRunway({ netPerMin: 10, cash: 5000, rentPerDay: 65, downPayment: 0 }).tier).toBe('good')
    expect(cashRunway({ netPerMin: 10, cash: 10, rentPerDay: 65, downPayment: 100 }).tier).toBe('short')
  })

  it('prices wages, hiring and seized assets', () => {
    expect(wageCostPerMin(3)).toBeCloseTo(9.9, 6)
    expect(hireCost(10)).toBe(10000)
    expect(seizureRecovery(1000)).toMatchObject({ redeemCost: 200, saleProceeds: 900, liquidationValue: 800, holdRealDays: 2 })
    expect(listingFee(1000)).toBe(10)
  })

  it('takes upkeep, manager cut and repairs off the rent a tenant pays', () => {
    const repairs = averageRepairShare()
    expect(repairs).toBeCloseTo(0.0910833333, 9)

    const managed = landlordBreakdown(1000, true)
    expect(managed.upkeepPerDay).toBeCloseTo(250, 9)
    expect(managed.managerPerDay).toBeCloseTo(70, 9)
    expect(managed.repairsPerDay).toBeCloseTo(1000 * repairs, 9)
    expect(managed.netPerDay).toBeCloseTo(1000 - 250 - 70 - 1000 * repairs, 9)
    expect(managed.netPerMinute).toBeCloseTo(managed.netPerDay / 60, 9)

    const selfManaged = landlordBreakdown(1000, false)
    expect(selfManaged.managerPerDay).toBe(0)
    expect(selfManaged.netPerDay).toBeCloseTo(managed.netPerDay + 70, 9)
  })

  it('charges a make-ready fee of 48 days of rent', () => {
    expect(makeReadyFee(100)).toBe(4800)
    expect(makeReadyFee(0)).toBe(0)
  })

  it('prices running costs per business type', () => {
    expect(runningCostShare('shop')).toBe(0.4)
    expect(runningCostShare('restaurant')).toBe(0.4)
    expect(runningCostShare('cart')).toBe(0.59)
    expect(runningCostShare('casino')).toBe(0.45)
    expect(runningCostPerMin(100, 'cart')).toBeCloseTo(59, 9)
    expect(runningCostPerMin(100, 'shop')).toBeCloseTo(40, 9)
  })
})
