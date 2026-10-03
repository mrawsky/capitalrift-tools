<script setup lang="ts">
const { state, ready, storageMessage, initialize, addFactory, downloadBackup, replaceFromImport, mergeFromImport, clearFactoryData } = useFactoryPlanner()
const importMode = ref<'merge' | 'replace'>('merge')
const importMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const factoryOptions = computed(() => state.value.factories.map(factory => ({ value: factory.id, label: factory.name })))

onMounted(initialize)

function createNamedFactory() {
  addFactory()
  navigateTo('/factory/production')
}

async function importFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    if (importMode.value === 'replace') replaceFromImport(text)
    else mergeFromImport(text)
    importMessage.value = `Imported ${file.name}.`
  }
  catch (cause) {
    importMessage.value = cause instanceof Error ? cause.message : 'The backup could not be imported.'
  }
  if (fileInput.value) fileInput.value.value = ''
}

function clearAll() {
  if (confirm('Remove every locally saved factory and plan? Recipe calculator cache data will stay.')) clearFactoryData()
}
</script>

<template>
  <div class="factory-shell">
    <aside class="factory-sidebar">
      <div><p class="eyebrow accent">FACTORY PLANNER</p><h2>Production desk</h2></div>
      <nav aria-label="Factory planner">
        <NuxtLink to="/factory">Tutorial / About</NuxtLink><NuxtLink to="/factory/statistics">Statistics</NuxtLink><NuxtLink to="/factory/production">Production</NuxtLink><NuxtLink to="/factory/machines">Machines</NuxtLink><NuxtLink to="/factory/planner">Planner</NuxtLink><NuxtLink to="/factory/recipes">Recipes</NuxtLink><NuxtLink to="/factory/blueprints">Blueprints</NuxtLink>
      </nav>
      <div class="factory-sidebar__storage">
        <label for="factory-picker">Current factory</label>
        <SearchableSelect id="factory-picker" v-model="state.selectedFactoryId" :options="factoryOptions" placeholder="No factory yet" :disabled="!state.factories.length" />
        <button class="button button--primary" type="button" @click="createNamedFactory">New factory</button>
        <details class="factory-data-menu">
          <summary>Local data</summary>
          <div>
            <button class="button" type="button" @click="downloadBackup">Export JSON</button>
            <label for="import-mode">Import mode</label><select id="import-mode" v-model="importMode"><option value="merge">Merge</option><option value="replace">Replace</option></select>
            <label class="button" for="factory-import">Import JSON</label><input id="factory-import" ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="importFile">
            <button class="button button--danger" type="button" @click="clearAll">Clear factory data</button>
          </div>
        </details>
        <p v-if="storageMessage || importMessage" class="form-note" aria-live="polite">{{ storageMessage || importMessage }}</p>
      </div>
    </aside>
    <div class="factory-workspace"><slot /><p v-if="!ready" class="factory-loading-note" aria-live="polite">Opening locally saved factory data…</p></div>
  </div>
</template>
