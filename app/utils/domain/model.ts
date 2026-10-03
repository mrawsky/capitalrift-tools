import { CURRENT_RELEASE_KEY } from '../changelog'

// Internal cache/share identity. Game build history is maintained only in the changelog.
export const GAME_MODEL = Object.freeze({ label: CURRENT_RELEASE_KEY, cacheKey: CURRENT_RELEASE_KEY })
