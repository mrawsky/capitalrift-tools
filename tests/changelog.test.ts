import { describe, expect, it } from 'vitest'
import { CHANGELOG, CURRENT_RELEASE, CURRENT_RELEASE_KEY, releaseIdentity } from '../app/utils/changelog'
import metadata from '../app/data/tool-metadata.json'
import equipment from '../app/data/equipment-mechanics.json'
import catalog from '../app/data/factory-catalog.json'

describe('central release history', () => {
  it('keeps complete, uniquely identified public entries with the latest first', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0)
    expect(new Set(CHANGELOG.map(entry => entry.id)).size).toBe(CHANGELOG.length)
    expect(CHANGELOG.map(entry => entry.date)).toEqual([...CHANGELOG.map(entry => entry.date)].sort().reverse())
    for (const entry of CHANGELOG) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/)
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.gameVersion.length).toBeGreaterThan(0)
      expect(entry.evidence.length).toBeGreaterThan(0)
      expect(entry.changes.every(group => group.title && group.items.length)).toBe(true)
    }
  })
  it('automatically changes internal identity when the single checked game build changes', () => {
    expect(releaseIdentity(CURRENT_RELEASE)).toBe(CURRENT_RELEASE_KEY)
    expect(releaseIdentity({ ...CURRENT_RELEASE, gameVersion: `${CURRENT_RELEASE.gameVersion}-changed` })).not.toBe(CURRENT_RELEASE_KEY)
    expect(CURRENT_RELEASE_KEY).not.toContain(CURRENT_RELEASE.gameVersion)
  })
  it('leaves game version metadata out of tool datasets and site metadata', () => {
    for (const data of [metadata, equipment, catalog]) {
      expect(data).not.toHaveProperty('gameVersion')
      expect(data).not.toHaveProperty('snapshotDate')
      expect(data).not.toHaveProperty('version')
    }
  })
})
