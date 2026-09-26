<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { rankSearchOptions, type SearchableSelectOption } from '../utils/ui/searchableSelect'

const props = withDefaults(defineProps<{
  id: string
  options: readonly SearchableSelectOption[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}>(), {
  placeholder: 'Select an option',
  disabled: false,
  ariaLabel: undefined,
})

const model = defineModel<string | null>({ required: true })
const emit = defineEmits<{ change: [value: string] }>()
const input = ref<HTMLInputElement | null>(null)
const open = ref(false)
const hasTyped = ref(false)
const displayText = ref('')
const activeIndex = ref(-1)
const listboxId = `${props.id}-listbox`

const selectedOption = computed(() => props.options.find(option => option.value === model.value) ?? null)
const filteredOptions = computed(() => rankSearchOptions(props.options, hasTyped.value ? displayText.value : ''))
const activeOption = computed(() => filteredOptions.value[activeIndex.value] ?? null)

function selectedLabel() {
  return selectedOption.value?.label ?? ''
}

function firstEnabledIndex(options = filteredOptions.value) {
  return options.findIndex(option => !option.disabled)
}

function lastEnabledIndex(options = filteredOptions.value) {
  for (let index = options.length - 1; index >= 0; index--) {
    if (!options[index]?.disabled) return index
  }
  return -1
}

function openList() {
  if (props.disabled) return
  open.value = true
  hasTyped.value = false
  displayText.value = selectedLabel()
  const selectedIndex = filteredOptions.value.findIndex(option => option.value === model.value && !option.disabled)
  activeIndex.value = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex()
  nextTick(() => input.value?.select())
}

function closeList() {
  open.value = false
  hasTyped.value = false
  activeIndex.value = -1
  displayText.value = selectedLabel()
}

function handleInput(event: Event) {
  displayText.value = (event.target as HTMLInputElement).value
  hasTyped.value = true
  open.value = true
  activeIndex.value = firstEnabledIndex()
}

function handleClick() {
  if (!open.value) openList()
}

function moveActive(direction: 1 | -1) {
  if (!open.value) {
    openList()
    return
  }
  const options = filteredOptions.value
  if (!options.length) return
  let index = activeIndex.value
  for (let attempts = 0; attempts < options.length; attempts++) {
    index = (index + direction + options.length) % options.length
    if (!options[index]?.disabled) {
      activeIndex.value = index
      nextTick(() => document.getElementById(`${props.id}-option-${index}`)?.scrollIntoView({ block: 'nearest' }))
      return
    }
  }
}

function selectOption(option: SearchableSelectOption) {
  if (option.disabled) return
  model.value = option.value
  emit('change', option.value)
  closeList()
  nextTick(() => input.value?.focus())
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  }
  else if (event.key === 'Home' && open.value && !hasTyped.value) {
    event.preventDefault()
    activeIndex.value = firstEnabledIndex()
  }
  else if (event.key === 'End' && open.value && !hasTyped.value) {
    event.preventDefault()
    activeIndex.value = lastEnabledIndex()
  }
  else if (event.key === 'Enter' && open.value && activeOption.value) {
    event.preventDefault()
    selectOption(activeOption.value)
  }
  else if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closeList()
  }
  else if (event.key === 'Tab') {
    closeList()
  }
}

watch(selectedOption, () => {
  if (!open.value) displayText.value = selectedLabel()
}, { immediate: true })

watch(filteredOptions, (options) => {
  if (!options[activeIndex.value] || options[activeIndex.value]?.disabled) activeIndex.value = firstEnabledIndex(options)
})
</script>

<template>
  <div class="searchable-select" :class="{ 'searchable-select--open': open, 'searchable-select--disabled': disabled }">
    <input
      :id="id"
      ref="input"
      class="searchable-select__input"
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      :value="displayText"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-activedescendant="open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined"
      @focus="openList"
      @click="handleClick"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="closeList"
    >
    <span class="searchable-select__chevron" aria-hidden="true"></span>
    <div v-if="open" class="searchable-select__popup">
      <ul :id="listboxId" class="searchable-select__list" role="listbox">
        <li
          v-for="(option, index) in filteredOptions"
          :id="`${id}-option-${index}`"
          :key="option.value"
          class="searchable-select__option"
          :class="{ 'is-active': index === activeIndex, 'is-selected': option.value === model, 'is-disabled': option.disabled }"
          role="option"
          :aria-selected="option.value === model"
          :aria-disabled="option.disabled || undefined"
          @mousemove="!option.disabled && (activeIndex = index)"
          @pointerdown.prevent="selectOption(option)"
        >
          {{ option.label }}
        </li>
      </ul>
      <p v-if="!filteredOptions.length" class="searchable-select__empty" role="status">No matches</p>
    </div>
    <span class="sr-only" aria-live="polite">{{ open && hasTyped ? `${filteredOptions.length} suggestions` : '' }}</span>
  </div>
</template>
