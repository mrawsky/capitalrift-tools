import { emptyResourceNotebook, MAX_DEPOSITS, parseResourceNotebook, serializeResourceNotebook, type ResourceNotebook, type SavedDeposit } from '../utils/resources'

const STORAGE_KEY = 'capital-rift-resource-notebook-v1'

export function useResourceLibrary() {
  const notebook = useState<ResourceNotebook>('resource-notebook', emptyResourceNotebook)
  const ready = useState('resource-notebook-ready', () => false)
  const storageMessage = useState('resource-notebook-message', () => '')
  function initialize() {
    if (!import.meta.client || ready.value) return
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) notebook.value = parseResourceNotebook(saved) }
    catch { storageMessage.value = 'Saved survey data could not be read. This visit uses a fresh notebook.' }
    ready.value = true
  }
  function persist() {
    initialize()
    try { localStorage.setItem(STORAGE_KEY, serializeResourceNotebook(notebook.value)); storageMessage.value = '' }
    catch { storageMessage.value = 'Your notebook is available this visit, but this browser could not save it. Export a backup to keep it.' }
  }
  function addDeposit(input: Omit<SavedDeposit, 'id' | 'updatedAt'>) {
    initialize()
    if (notebook.value.deposits.length >= MAX_DEPOSITS) throw new Error(`Export your notebook before saving more than ${MAX_DEPOSITS} deposits.`)
    notebook.value.deposits.push({ ...input, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, updatedAt: new Date().toISOString() })
    persist()
  }
  function removeDeposit(id: string) { notebook.value.deposits = notebook.value.deposits.filter(deposit => deposit.id !== id); persist() }
  function clearNotebook() { notebook.value = emptyResourceNotebook(); if (import.meta.client) localStorage.removeItem(STORAGE_KEY) }
  function importBackup(text: string) {
    const incoming = parseResourceNotebook(text)
    initialize()
    if (incoming.deposits.length + notebook.value.deposits.length > MAX_DEPOSITS) throw new Error(`Merged notebook would exceed ${MAX_DEPOSITS} deposits.`)
    notebook.value.deposits.push(...incoming.deposits.map(deposit => ({ ...deposit, id: globalThis.crypto?.randomUUID?.() ?? deposit.id })))
    persist()
  }
  function exportBackup() {
    if (!import.meta.client) return
    const blob = new Blob([serializeResourceNotebook(notebook.value)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `capital-rift-surveys-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return { notebook, ready, storageMessage, initialize, addDeposit, removeDeposit, clearNotebook, importBackup, exportBackup }
}
