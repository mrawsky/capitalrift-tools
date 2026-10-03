import { emptyRestaurantLibrary, parseRestaurantLibrary, type RestaurantLibrary } from '../utils/domain/library'
import { parseChunkIdInput } from '../utils/domain/location'
import { downloadToolJson, restaurantShare } from '../utils/sharing'
import type { RecipePart } from '../utils/domain/types'

const STORAGE_KEY = 'capital-rift-restaurant-library-v1'
export function useRestaurantLibrary() {
  const library = useState<RestaurantLibrary>('restaurant-library', emptyRestaurantLibrary)
  const ready = useState('restaurant-library-ready', () => false)
  const storageMessage = useState('restaurant-storage-message', () => '')
  function initialize() {
    if (!import.meta.client || ready.value) return
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) library.value = parseRestaurantLibrary(saved) }
    catch { storageMessage.value = 'Saved restaurant data could not be read. This visit uses a fresh library.' }
    ready.value = true
  }
  function persist() {
    initialize()
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(library.value)); storageMessage.value = '' }
    catch { storageMessage.value = 'Your library is available this visit, but this browser could not save it. Export a backup to keep it.' }
  }
  function saveRestaurant(chunkId: string, name: string) {
    initialize()
    const parsed = parseChunkIdInput(chunkId)
    const existing = library.value.restaurants.find(restaurant => parseChunkIdInput(restaurant.chunkId).locationKey === parsed.locationKey)
    const label = name.trim().slice(0, 120) || parsed.originalId
    if (existing) { existing.chunkId = parsed.originalId; existing.name = label }
    else { if (library.value.restaurants.length >= 300) throw new Error('Export your library before adding more than 300 restaurants.'); library.value.restaurants.push({ id: crypto.randomUUID(), name: label, chunkId: parsed.originalId }) }
    persist()
  }
  function saveRecipe(chunkId: string, parts: RecipePart[], name: string) {
    initialize()
    const shared = restaurantShare(chunkId, parts, name.slice(0, 120))
    if (library.value.recipes.length >= 300) throw new Error('Export your library before adding more than 300 recipes.')
    library.value.recipes.push({ ...shared, id: crypto.randomUUID() }); persist()
  }
  function removeRestaurant(id: string) { library.value.restaurants = library.value.restaurants.filter(item => item.id !== id); persist() }
  function removeRecipe(id: string) { library.value.recipes = library.value.recipes.filter(item => item.id !== id); persist() }
  function importBackup(text: string) {
    const incoming = parseRestaurantLibrary(text)
    initialize()
    if (incoming.restaurants.length + library.value.restaurants.length > 300 || incoming.recipes.length + library.value.recipes.length > 300) throw new Error('Merged library would exceed 300 records per category.')
    library.value.restaurants.push(...incoming.restaurants.map(item => ({ ...item, id: crypto.randomUUID() })))
    library.value.recipes.push(...incoming.recipes.map(item => ({ ...item, id: crypto.randomUUID() })))
    persist()
  }
  function exportBackup() { downloadToolJson(library.value, 'capital-rift-restaurants.json') }
  return { library, storageMessage, initialize, saveRestaurant, saveRecipe, removeRestaurant, removeRecipe, importBackup, exportBackup }
}
