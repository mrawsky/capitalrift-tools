export interface SearchableSelectOption {
  value: string
  label: string
  searchText?: string
  disabled?: boolean
}

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function rankSearchOptions(options: readonly SearchableSelectOption[], query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return [...options]

  const queryTokens = normalizedQuery.split(' ')
  return options
    .map((option, index) => {
      const label = normalizeSearchText(option.label)
      const corpus = normalizeSearchText(`${option.label} ${option.searchText ?? ''}`)
      if (!queryTokens.every(token => corpus.includes(token))) return null

      const labelWords = label.split(' ')
      const rank = label === normalizedQuery
        ? 0
        : label.startsWith(normalizedQuery)
          ? 1
          : labelWords.some(word => word.startsWith(normalizedQuery))
            ? 2
            : 3

      return { option, index, rank }
    })
    .filter((entry): entry is { option: SearchableSelectOption; index: number; rank: number } => entry !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.option)
}
