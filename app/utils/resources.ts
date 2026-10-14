export interface SavedDeposit {
  id: string
  itemId: string
  ratePerMinute: number
  location: string
  surveyGearId: string
  note: string
  updatedAt: string
}

export interface ResourceNotebook {
  schemaVersion: 1
  deposits: SavedDeposit[]
}

export const MAX_DEPOSITS = 300
export const MAX_NOTE_LENGTH = 240

export function emptyResourceNotebook(): ResourceNotebook {
  return { schemaVersion: 1, deposits: [] }
}

function string(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback }
function finiteNonNegative(value: unknown) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : 0 }

function sanitizeDeposit(value: any): SavedDeposit | null {
  if (!value || typeof value !== 'object' || !string(value.id) || !string(value.itemId)) return null
  return {
    id: string(value.id),
    itemId: string(value.itemId),
    ratePerMinute: finiteNonNegative(value.ratePerMinute),
    location: string(value.location).slice(0, 120),
    surveyGearId: string(value.surveyGearId).slice(0, 60),
    note: string(value.note).slice(0, MAX_NOTE_LENGTH),
    updatedAt: string(value.updatedAt, new Date().toISOString()),
  }
}

export function parseResourceNotebook(input: string | unknown): ResourceNotebook {
  const value: any = typeof input === 'string' ? JSON.parse(input) : input
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1) throw new Error('This is not a supported resource notebook backup.')
  const deposits = Array.isArray(value.deposits) ? value.deposits.map(sanitizeDeposit).filter(Boolean) as SavedDeposit[] : []
  return { schemaVersion: 1, deposits }
}

export function serializeResourceNotebook(notebook: ResourceNotebook) {
  return JSON.stringify(notebook, null, 2)
}
