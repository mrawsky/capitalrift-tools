import { INGREDIENT_BY_ID } from './ingredients'
import type { RecipePart, Station } from './types'
import { STATIONS } from './scoring'

// Game codes are "PREFIX.base64url(json)" with an optional ignored third part.
// CRRCP1 encodes one recipe; CRMENU1 encodes up to twelve dishes.
const RECIPE_PREFIX = 'CRRCP1'
const MENU_PREFIX = 'CRMENU1'
const MAX_CODE_LENGTH = 8192
const MAX_DISHES = 12
const MIN_INGREDIENTS = 2
const MAX_INGREDIENTS = 8
const MAX_NAME_LENGTH = 40
const MIN_PRICE = 1
const MAX_PRICE = 100
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const ALPHABET_INDEX = new Map([...ALPHABET].map((character, index) => [character, index]))

export type MenuKind = 'recipe' | 'menu'

export interface DecodedDish {
  name: string
  vessel: Station
  mix: RecipePart[]
  price: number
  servings: number
}

export interface DecodedMenuCode { kind: MenuKind; dishes: DecodedDish[] }

export type DecodeResult = { ok: true; value: DecodedMenuCode } | { ok: false; error: string }

const ERROR_MESSAGES: Record<string, string> = {
  empty: 'Paste a CRRCP1 or CRMENU1 code.',
  too_long: 'This code is too long to be a valid menu code.',
  not_a_code: 'This is not a recipe or menu code.',
  corrupt: 'This code could not be read. It may be incomplete or edited.',
  too_many_dishes: `A menu code holds at most ${MAX_DISHES} dishes.`,
  unnamed_dish: 'Every dish needs a name of up to 40 characters.',
  unknown_vessel: 'A dish uses a station that is not pot, pan, grill, fryer, oven, or prep.',
  bad_mix: 'A dish has an invalid ingredient list.',
  not_edible: 'A dish uses an ingredient the game does not treat as edible.',
  bad_share: 'Every ingredient share must be a whole number from 1 to 100.',
  too_few_ingredients: `A dish needs at least ${MIN_INGREDIENTS} ingredients.`,
  too_many_ingredients: `A dish can use at most ${MAX_INGREDIENTS} ingredients.`,
  shares_must_total_100: 'Ingredient shares must total exactly 100%.',
  bad_price: `Dish prices must be between ${MIN_PRICE} and ${MAX_PRICE}.`,
}

function base64UrlDecode(input: string): Uint8Array | null {
  if (input.length % 4 === 1) return null
  const bytes = new Uint8Array(Math.floor(input.length * 3 / 4))
  let accumulator = 0
  let bits = 0
  let written = 0
  for (const character of input) {
    const value = ALPHABET_INDEX.get(character)
    if (value === undefined) return null
    accumulator = (accumulator << 6) | value
    bits += 6
    if (bits >= 8) { bits -= 8; bytes[written++] = (accumulator >> bits) & 255 }
  }
  return bytes.subarray(0, written)
}

function base64UrlEncode(bytes: Uint8Array): string {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    output += ALPHABET[first >> 2]
    output += ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)]
    if (second === undefined) break
    output += ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)]
    if (third === undefined) break
    output += ALPHABET[third & 63]
  }
  return output
}

export function decodeMenuCode(input: string): DecodeResult {
  const text = input.trim()
  if (text.length === 0) return { ok: false, error: ERROR_MESSAGES.empty! }
  if (text.length > MAX_CODE_LENGTH) return { ok: false, error: ERROR_MESSAGES.too_long! }
  const parts = text.split('.')
  if (parts.length !== 2 && parts.length !== 3) return { ok: false, error: ERROR_MESSAGES.not_a_code! }
  const kind: MenuKind | null = parts[0] === RECIPE_PREFIX ? 'recipe' : parts[0] === MENU_PREFIX ? 'menu' : null
  if (kind === null) return { ok: false, error: ERROR_MESSAGES.not_a_code! }
  const bytes = base64UrlDecode(parts[1] ?? '')
  if (bytes === null) return { ok: false, error: ERROR_MESSAGES.corrupt! }
  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder().decode(bytes)) }
  catch { return { ok: false, error: ERROR_MESSAGES.corrupt! } }
  if (!Array.isArray(parsed) || parsed.length === 0) return { ok: false, error: ERROR_MESSAGES.corrupt! }
  if (kind === 'recipe' && parsed.length !== 1) return { ok: false, error: ERROR_MESSAGES.corrupt! }
  if (parsed.length > MAX_DISHES) return { ok: false, error: ERROR_MESSAGES.too_many_dishes! }
  const dishes: DecodedDish[] = []
  for (const raw of parsed) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: ERROR_MESSAGES.corrupt! }
    const entry = raw as Record<string, unknown>
    const name = typeof entry.n === 'string' ? entry.n.trim().slice(0, MAX_NAME_LENGTH) : ''
    if (name.length === 0) return { ok: false, error: ERROR_MESSAGES.unnamed_dish! }
    if (typeof entry.v !== 'string' || !STATIONS.includes(entry.v as Station)) return { ok: false, error: ERROR_MESSAGES.unknown_vessel! }
    if (typeof entry.m !== 'object' || entry.m === null || Array.isArray(entry.m)) return { ok: false, error: ERROR_MESSAGES.bad_mix! }
    const mix: RecipePart[] = []
    let total = 0
    for (const [ingredientId, shareValue] of Object.entries(entry.m as Record<string, unknown>)) {
      if (!INGREDIENT_BY_ID.has(ingredientId)) return { ok: false, error: ERROR_MESSAGES.not_edible! }
      const share = Number(shareValue)
      if (!Number.isInteger(share) || share < 1 || share > 100) return { ok: false, error: ERROR_MESSAGES.bad_share! }
      mix.push({ ingredientId, share })
      total += share
    }
    if (mix.length < MIN_INGREDIENTS) return { ok: false, error: ERROR_MESSAGES.too_few_ingredients! }
    if (mix.length > MAX_INGREDIENTS) return { ok: false, error: ERROR_MESSAGES.too_many_ingredients! }
    if (total !== 100) return { ok: false, error: ERROR_MESSAGES.shares_must_total_100! }
    const price = Number(entry.p)
    if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) return { ok: false, error: ERROR_MESSAGES.bad_price! }
    const servings = Number(entry.s)
    dishes.push({ name, vessel: entry.v as Station, mix, price: Math.round(price * 100) / 100, servings: Number.isFinite(servings) && servings > 0 ? Math.floor(servings) : 0 })
  }
  return { ok: true, value: { kind, dishes } }
}

export function encodeMenuCode(value: DecodedMenuCode): string {
  const payload = value.dishes.map(dish => ({
    n: dish.name,
    v: dish.vessel,
    m: Object.fromEntries(dish.mix.map(part => [part.ingredientId, part.share])),
    p: dish.price,
    s: dish.servings,
  }))
  const prefix = value.kind === 'recipe' ? RECIPE_PREFIX : MENU_PREFIX
  return `${prefix}.${base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))}`
}
