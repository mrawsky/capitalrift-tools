import changelog from '../data/changelog.json'

export const CHANGELOG = changelog.entries
export const CURRENT_RELEASE = CHANGELOG[0]!

// Changing the checked build or release date refreshes caches without copying
// game version labels into tool data or saved files.
export function releaseIdentity(entry: { id: string; date: string; gameVersion: string }) {
  const text = JSON.stringify([entry.id, entry.date, entry.gameVersion])
  let hash = 2166136261
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return `release-${hash.toString(16)}`
}
export const CURRENT_RELEASE_KEY = releaseIdentity(CURRENT_RELEASE)
