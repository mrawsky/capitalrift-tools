<script setup lang="ts">
import { BUSINESS_CONSTANTS, buildingValue, cashRunway, hireCost, leaseTerms, listingFee, rentPerDay, rentPerMinute, seizureRecovery, solvencyForecast, wageCostPerMin } from '../../utils/business'
useToolSeo('Capital Rift Business, Cash Runway & Property Planner', 'Combine revenue, rent, wages and electricity into an operating margin and cash runway, estimate rent, lease terms and building value, and check auction bids and seizure buy-backs in Capital Rift.', true)
const revenuePerMin = ref(20)
const materialPerMin = ref(5)
const electricityPerMin = ref(2)
const workers = ref(1)
const rentPerDayInput = ref(65)
const cash = ref(5000)
const seizableCredit = ref(0)
const downPayment = ref(0)
const baseOutputPerMin = ref(30)
const roomSpeedPercent = ref(100)
const unitAreaM2 = ref(64)
const buildingAreaM2 = ref(400)
const floors = ref(3)
const basements = ref(0)
const busyness = ref(1.2)
const openingBid = ref(0)
const wagePerMin = computed(() => wageCostPerMin(workers.value))
const rentMin = computed(() => rentPerMinute(rentPerDayInput.value))
const operatingCostPerMin = computed(() => Math.max(0, materialPerMin.value) + Math.max(0, electricityPerMin.value) + wagePerMin.value)
const netPerMin = computed(() => Math.max(0, revenuePerMin.value) - operatingCostPerMin.value - rentMin.value)
const marginPercent = computed(() => revenuePerMin.value > 0 ? (netPerMin.value / revenuePerMin.value) * 100 : 0)
const runway = computed(() => cashRunway({ netPerMin: netPerMin.value, cash: cash.value, rentPerDay: rentPerDayInput.value, downPayment: downPayment.value }))
const solvency = computed(() => solvencyForecast({ netPerMin: netPerMin.value, cash: cash.value, seizableCredit: seizableCredit.value, rentPerMin: rentMin.value, nowMs: 0 }))
const minutesToZero = computed(() => solvency.value.zeroAtMs === null ? null : solvency.value.zeroAtMs / 60000)
const effectiveOutput = computed(() => Math.max(0, baseOutputPerMin.value) * Math.min(1, Math.max(0, roomSpeedPercent.value) / 100))
const outputPerWorker = computed(() => workers.value > 0 ? effectiveOutput.value / workers.value : 0)
const propertyRent = computed(() => rentPerDay({ unitAreaM2: unitAreaM2.value, buildingAreaM2: buildingAreaM2.value, floors: floors.value, basements: basements.value, busyness: busyness.value }))
const value = computed(() => buildingValue({ buildingAreaM2: buildingAreaM2.value, floors: floors.value, basements: basements.value, busyness: busyness.value }))
const lease = computed(() => leaseTerms(propertyRent.value))
const yearRent = computed(() => propertyRent.value * 365)
const buyVsRentYears = computed(() => propertyRent.value > 0 ? value.value / propertyRent.value / 365 : 0)
const fee = computed(() => listingFee(openingBid.value))
const recovery = computed(() => seizureRecovery(value.value))
const bidVerdict = computed(() => { if (openingBid.value <= 0 || value.value <= 0) return ''; const ratio = openingBid.value / value.value; if (ratio < 0.8) return 'Below the estimated value — a good opening bid.'; if (ratio > 1.2) return 'Above the estimated value — bid with care.'; return 'Close to the estimated value.' })
const tierLabel: Record<string, string> = { ok: 'OK', behind: 'Behind', tight: 'Tight', good: 'Good', loss: 'Loss', danger: 'Danger', short: 'Short', burning: 'Burning', at_risk: 'At risk', critical: 'Critical' }
const telemetry = useToolTelemetry('business')
watch([netPerMin, runway, solvency], () => telemetry.calculated({ net_per_min: Math.round(netPerMin.value * 100) / 100, margin_percent: Math.round(marginPercent.value * 10) / 10, runway_tier: runway.value.tier, runway_days: runway.value.runwayDays === null ? null : Math.round(runway.value.runwayDays * 10) / 10, solvency_tier: solvency.value.tier, workers: workers.value }))
function usePropertyRent() { rentPerDayInput.value = propertyRent.value; telemetry.action('business_property_rent_applied', { rent_per_day: propertyRent.value }) }
function money(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function money0(value: number) { return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }
function fmt(value: number, digits = 2) { return value.toLocaleString('en-US', { maximumFractionDigits: digits }) }
function duration(minutes: number | null) { if (minutes === null) return '—'; if (minutes < 60) return `${fmt(minutes, 1)} min`; if (minutes < 2880) return `${fmt(minutes / 60, 1)} h`; return `${fmt(minutes / 1440, 1)} days` }
</script>

<template>
  <main id="main-content" class="factory-page">
    <ToolBreadcrumbs :items="[{ label: 'Tools', to: '/' }, { label: 'Business & property' }]" />
    <FactoryPageHeader eyebrow="Money & property" title="Does it pay, and can you afford it?" description="Enter income and recurring costs for an operating margin and cash runway. Estimate rent, lease terms and building value, then sanity-check an auction bid or a seizure buy-back." />
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Operating margin</h2></div>
      <div class="equipment-form">
        <div><label for="biz-revenue">Revenue / min</label><input id="biz-revenue" v-model.number="revenuePerMin" type="number" min="0" step="0.01"></div>
        <div><label for="biz-materials">Materials / min</label><input id="biz-materials" v-model.number="materialPerMin" type="number" min="0" step="0.01"></div>
        <div><label for="biz-power">Electricity / min</label><input id="biz-power" v-model.number="electricityPerMin" type="number" min="0" step="0.01"></div>
        <div><label for="biz-workers">Workers</label><input id="biz-workers" v-model.number="workers" type="number" min="0" max="1000" step="1"></div>
        <div><label for="biz-rent">Rent / day</label><input id="biz-rent" v-model.number="rentPerDayInput" type="number" min="0" step="1"></div>
      </div>
      <p class="form-note">Wages use {{ money(BUSINESS_CONSTANTS.WAGES.wagePerMin) }}/min per active worker; idle crews are treated as unpaid. Rent is converted to {{ money(rentMin) }}/min. Set rent from the property estimate below.</p>
    </section>
    <section class="kpi-grid" aria-label="Operating margin">
      <article><span>Operating cost / min</span><strong>{{ money(operatingCostPerMin) }}</strong><small>materials + power + wages</small></article>
      <article><span>Net / min</span><strong :class="{ positive: netPerMin > 0, danger: netPerMin < 0 }">{{ money(netPerMin) }}</strong><small>{{ fmt(marginPercent, 1) }}% margin</small></article>
      <article><span>Rent / min</span><strong>{{ money(rentMin) }}</strong></article>
      <article><span>Cash runway</span><strong :class="{ danger: runway.tier === 'danger' || runway.tier === 'short' }">{{ runway.tier === 'short' ? 'Short' : duration(runway.runwayMin) }}</strong><small v-if="runway.tier === 'good' || runway.tier === 'tight'">{{ tierLabel[runway.tier] }}</small></article>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Savings and solvency</h2></div>
      <div class="equipment-form">
        <div><label for="biz-cash">Cash in hand</label><input id="biz-cash" v-model.number="cash" type="number" min="0" step="1"></div>
        <div><label for="biz-credit">Seizable assets</label><input id="biz-credit" v-model.number="seizableCredit" type="number" min="0" step="1"></div>
        <div><label for="biz-down">Rent down payment</label><input id="biz-down" v-model.number="downPayment" type="number" min="0" step="1"></div>
      </div>
      <p class="reference-answer" role="status">
        Status: <strong :class="{ danger: solvency.tier === 'critical' || solvency.tier === 'at_risk' }">{{ tierLabel[solvency.tier] }}</strong>.
        <template v-if="solvency.burnPerMin > 0"> Losing {{ money(solvency.burnPerMin) }}/min, cash runs out in {{ duration(minutesToZero) }}<template v-if="solvency.evictAtMs !== null">, and unpaid rent risks eviction after that</template>.</template>
        <template v-else> The business is not burning cash.</template>
      </p>
      <p class="form-note">Money never goes negative in game: the bank seizes assets for unpaid bills. After a seizure you can buy assets back at a {{ Math.round(BUSINESS_CONSTANTS.SEIZURE.redeemFee * 100) }}% fee within {{ BUSINESS_CONSTANTS.SEIZURE.holdRealDays }} real days, or they sell at a {{ Math.round(BUSINESS_CONSTANTS.SEIZURE.saleDiscount * 100) }}% discount.</p>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Staffing productivity</h2></div>
      <div class="equipment-form">
        <div><label for="biz-output">Base output / min (no crew)</label><input id="biz-output" v-model.number="baseOutputPerMin" type="number" min="0" step="any"></div>
        <div><label for="biz-speed">Room speed (%)</label><input id="biz-speed" v-model.number="roomSpeedPercent" type="number" min="0" max="100" step="1"></div>
      </div>
      <ul class="reference-links">
        <li>Estimated output: <strong>{{ fmt(effectiveOutput) }}/min</strong> ({{ fmt(outputPerWorker) }}/min per worker).</li>
        <li>Wage cost: <strong>{{ money(wagePerMin) }}/min</strong> for {{ workers }} worker(s); hiring {{ workers }} costs {{ money(hireCost(workers)) }}.</li>
        <li>Set room speed from the <NuxtLink to="/tools/cooling">cooling planner</NuxtLink> when machines or workers slow down in hot rooms.</li>
      </ul>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Property &amp; rent estimate</h2></div>
      <div class="equipment-form">
        <div><label for="prop-unit">Unit area (m²)</label><input id="prop-unit" v-model.number="unitAreaM2" type="number" min="0" step="any"></div>
        <div><label for="prop-building">Building footprint (m²)</label><input id="prop-building" v-model.number="buildingAreaM2" type="number" min="0" step="any"></div>
        <div><label for="prop-floors">Floors</label><input id="prop-floors" v-model.number="floors" type="number" min="1" max="200" step="1"></div>
        <div><label for="prop-basements">Basements</label><input id="prop-basements" v-model.number="basements" type="number" min="0" max="20" step="1"></div>
        <div><label for="prop-busyness">Busyness (1 = normal)</label><input id="prop-busyness" v-model.number="busyness" type="number" min="0.4" max="2.5" step="0.05"></div>
      </div>
      <div class="kpi-grid" aria-label="Rent and value">
        <article><span>Rent / day</span><strong>{{ money0(propertyRent) }}</strong></article>
        <article><span>Rent / year</span><strong>{{ money0(yearRent) }}</strong></article>
        <article><span>Building value</span><strong>{{ money0(value) }}</strong></article>
        <article><span>Buy vs rent</span><strong>{{ fmt(buyVsRentYears, 1) }} yrs</strong><small>of rent equals the price</small></article>
      </div>
      <div class="button-row reference-content"><button class="button" type="button" @click="usePropertyRent">Use this rent in the margin above</button></div>
      <p class="form-note">Rent uses ${{ BUSINESS_CONSTANTS.RENT.perM2PerDay }}/m²/day, a minimum of ${{ BUSINESS_CONSTANTS.RENT.minPerDay }}/day, and a tapered rentable area. Busyness is capped between {{ BUSINESS_CONSTANTS.BUSYNESS.min }} and {{ BUSINESS_CONSTANTS.BUSYNESS.max }}.</p>
      <div class="table-wrap"><table><thead><tr><th>Lease term</th><th>Amount</th></tr></thead><tbody>
        <tr><th>Down payment ({{ BUSINESS_CONSTANTS.LEASE.downPaymentDays }} days)</th><td>{{ money0(lease.downPayment) }}</td></tr>
        <tr><th>Cost per term ({{ lease.termRealDays }} real days)</th><td>{{ money0(lease.perTerm) }}</td></tr>
        <tr><th>Compensation ({{ BUSINESS_CONSTANTS.LEASE.compensationDays }} days)</th><td>{{ money0(lease.compensation) }}</td></tr>
        <tr><th>Arrears before eviction ({{ BUSINESS_CONSTANTS.LEASE.evictAfterRealDays }} day)</th><td>{{ money0(lease.evictionArrears) }}</td></tr>
      </tbody></table></div>
    </section>
    <section class="factory-panel reference-content">
      <div class="panel-title"><h2>Auction and seizure check</h2></div>
      <div class="equipment-form"><div><label for="prop-bid">Opening bid / Buy Now</label><input id="prop-bid" v-model.number="openingBid" type="number" min="0" step="1"></div></div>
      <ul class="reference-links">
        <li>Listing fee ({{ BUSINESS_CONSTANTS.AUCTION.listingFeePct }}% of the opening bid, not refunded): <strong>{{ money0(fee) }}</strong>.</li>
        <li v-if="bidVerdict">Against the estimated value of {{ money0(value) }}: {{ bidVerdict }}</li>
        <li>If an asset is seized, buying it back within {{ recovery.holdRealDays }} real days costs about {{ money0(recovery.redeemCost) }} ({{ Math.round(BUSINESS_CONSTANTS.SEIZURE.redeemFee * 100) }}% fee). It may otherwise sell for about {{ money0(recovery.saleProceeds) }}.</li>
      </ul>
    </section>
    <div class="button-row reference-actions"><NuxtLink class="button" to="/tools/electricity">Estimate electricity</NuxtLink><NuxtLink class="button" to="/tools/market">Market prices</NuxtLink><NuxtLink class="button" to="/tools/cooling">Cooling planner</NuxtLink></div>
    <p class="reference-note"><NuxtLink to="/changelog">Changelog & data updates</NuxtLink>. Calculations use the client's rent, lease, wage and solvency model; building value is an estimate from per-m² constants, not a live appraisal. Check important figures in game after an update.</p>
  </main>
</template>
