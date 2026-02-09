<script setup lang="ts">
/**
 * Tag Search Modal Component
 * Self-contained modal for searching and selecting PI tags
 * 100% decoupled - uses only module's own store
 */
import { watch, onMounted, onUnmounted, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import { useTagSearchStore } from './store'

const store = useTagSearchStore()

// Focus input when modal opens
watch(() => store.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    // Find the input inside the dialog content
    const input = document.querySelector('.tag-search-input input') as HTMLInputElement | null
    input?.focus()
  }
})

// Keyboard navigation
function handleKeydown(event: KeyboardEvent): void {
  if (!store.isOpen) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      store.selectDown()
      break
    case 'ArrowUp':
      event.preventDefault()
      store.selectUp()
      break
    case 'Enter':
      event.preventDefault()
      store.selectCurrent()
      break
    case 'Escape':
      event.preventDefault()
      store.cancel()
      break
  }
}

// Global keyboard shortcut (Ctrl+K)
function handleGlobalKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    if (store.isOpen) {
      store.cancel()
    } else {
      store.open()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  store.search(target.value)
}

function handleClose(): void {
  store.cancel()
}
</script>

<template>
  <Dialog
    :visible="store.isOpen"
    modal
    :closable="true"
    :draggable="false"
    :dismissable-mask="true"
    position="top"
    class="tag-search-dialog"
    @update:visible="val => !val && handleClose()"
  >
    <template #header>
      <div class="tag-search-header">
        <i class="pi pi-search"></i>
        <span>Search Tags</span>
        <kbd class="shortcut">Ctrl+K</kbd>
      </div>
    </template>

    <div class="tag-search-content" @keydown="handleKeydown">
      <InputText
        :model-value="store.query"
        :placeholder="store.context.placeholder ?? 'Search for PI tags...'"
        class="tag-search-input"
        @input="handleInput"
      />

      <div class="tag-search-results">
        <!-- Loading state -->
        <div v-if="store.isLoading" class="tag-search-loading">
          <ProgressSpinner style="width: 24px; height: 24px" />
          <span>Searching...</span>
        </div>

        <!-- Error state -->
        <div v-else-if="store.error" class="tag-search-error">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ store.error }}</span>
        </div>

        <!-- Empty state - typed but no results -->
        <div v-else-if="store.isEmpty" class="tag-search-empty">
          <i class="pi pi-inbox"></i>
          <span>No tags found for "{{ store.query }}"</span>
        </div>

        <!-- Idle state - hint to start typing -->
        <div v-else-if="!store.hasResults && store.status === 'idle'" class="tag-search-hint">
          <span>Type at least 2 characters to search</span>
        </div>

        <!-- Results list -->
        <ul v-else class="tag-list">
          <li
            v-for="(tag, index) in store.results"
            :key="tag.id"
            :class="['tag-item', { selected: index === store.selectedIndex }]"
            @click="store.selectTag(tag)"
            @mouseenter="store.setSelectedIndex(index)"
          >
            <div class="tag-name">
              <i class="pi pi-tag"></i>
              <span>{{ tag.name }}</span>
            </div>
            <div class="tag-details">
              <span class="tag-path">{{ tag.path }}</span>
              <span v-if="tag.valueType" class="tag-type">{{ tag.valueType }}</span>
              <span v-if="tag.engineeringUnit" class="tag-unit">{{ tag.engineeringUnit }}</span>
            </div>
            <div v-if="tag.description" class="tag-description">
              {{ tag.description }}
            </div>
          </li>
        </ul>

        <!-- Has more indicator -->
        <div v-if="store.hasMore" class="tag-search-more">
          <span>More results available - refine your search</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="tag-search-footer">
        <div class="keyboard-hints">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
        <div v-if="store.hasResults" class="result-count">
          {{ store.results.length }}{{ store.hasMore ? '+' : '' }} results
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.tag-search-dialog {
  width: 600px;
  max-width: 90vw;
}

.tag-search-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.tag-search-header .shortcut {
  margin-left: auto;
  padding: 0.2rem 0.5rem;
  background: var(--p-surface-200);
  border-radius: var(--p-border-radius);
  font-size: 0.75rem;
  font-family: monospace;
}

.tag-search-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tag-search-input {
  width: 100%;
}

.tag-search-results {
  max-height: 400px;
  overflow-y: auto;
}

.tag-search-loading,
.tag-search-error,
.tag-search-empty,
.tag-search-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.tag-search-error {
  color: var(--p-red-500);
}

.tag-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag-item {
  padding: 0.75rem;
  cursor: pointer;
  border-radius: var(--p-border-radius);
  transition: background-color 0.15s;
}

.tag-item:hover,
.tag-item.selected {
  background: var(--p-surface-100);
}

.tag-item.selected {
  background: var(--p-primary-100);
}

.tag-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.tag-name i {
  color: var(--p-primary-color);
}

.tag-details {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.tag-path {
  font-family: monospace;
}

.tag-type,
.tag-unit {
  padding: 0.1rem 0.4rem;
  background: var(--p-surface-200);
  border-radius: var(--p-border-radius);
  font-size: 0.75rem;
}

.tag-description {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-search-more {
  text-align: center;
  padding: 0.5rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  border-top: 1px solid var(--p-surface-200);
}

.tag-search-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.keyboard-hints {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.keyboard-hints kbd {
  padding: 0.1rem 0.4rem;
  background: var(--p-surface-200);
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.75rem;
}

.result-count {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
</style>
