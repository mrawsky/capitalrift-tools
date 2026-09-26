import { describe, expect, it } from 'vitest'
import { normalizeSearchText, rankSearchOptions, type SearchableSelectOption } from '../app/utils/ui/searchableSelect'

const options: SearchableSelectOption[] = [
  { value: 'case', label: 'Computer Case', searchText: 'Manufacturing Press' },
  { value: 'computer', label: 'Computer' },
  { value: 'advanced', label: 'Advanced Computer' },
  { value: 'press', label: 'Manufacturing Press' },
  { value: 'cafe', label: 'Café Grinder' },
]

describe('searchable selector matching', () => {
  it('normalizes case, punctuation, whitespace, and diacritics', () => {
    expect(normalizeSearchText('  CAFÉ—Grinder  ')).toBe('cafe grinder')
  })

  it('requires every query word to match the option search corpus', () => {
    expect(rankSearchOptions(options, 'case press').map(option => option.value)).toEqual(['case'])
    expect(rankSearchOptions(options, 'missing press')).toEqual([])
  })

  it('ranks exact, label-prefix, word-prefix, and metadata matches in that order', () => {
    expect(rankSearchOptions(options, 'computer').map(option => option.value)).toEqual([
      'computer',
      'case',
      'advanced',
    ])
    expect(rankSearchOptions(options, 'press').map(option => option.value)).toEqual([
      'press',
      'case',
    ])
  })

  it('preserves the supplied order when ranks are equal and returns all options for an empty query', () => {
    expect(rankSearchOptions(options, 'comp').map(option => option.value)).toEqual(['case', 'computer', 'advanced'])
    expect(rankSearchOptions(options, '').map(option => option.value)).toEqual(options.map(option => option.value))
  })

  it('matches diacritic-free queries', () => {
    expect(rankSearchOptions(options, 'cafe').map(option => option.value)).toEqual(['cafe'])
  })
})
