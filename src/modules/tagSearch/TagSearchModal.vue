<script setup lang="ts">
/**
 * Tag Search Modal Component
 * Self-contained modal for searching and selecting PI tags
 * 100% decoupled - uses only module's own store
 */
import { watch, onMounted, onUnmounted, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ProgressSpinner from 'primevue/progressspinner'
import { useTagSearchStore } from './store'
import { useDataServersStore } from '../../stores/dataservers'

const store = useTagSearchStore()
const dataServersStore = useDataServersStore()

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
      <!-- Data Server Selection -->
      <Select
        v-model="dataServersStore.selectedDataServerId"
        :options="dataServersStore.dataServers"
        option-label="name"
        option-value="id"
        placeholder="Select Data Server"
        class="dataserver-select"
        :disabled="!dataServersStore.hasDataServers || dataServersStore.loading"
      />

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
            <i class="pi pi-tag"></i>
            <span class="tag-name">{{ tag.name }}</span>
            <span v-if="tag.description" class="tag-descriptor">{{ tag.description }}</span>
          </li>
        </ul>

        <!-- Load More button -->
        <div v-if="store.hasMore && !store.isLoading" class="tag-search-load-more">
          <button @click="store.loadMore()" class="load-more-btn">
            <i class="pi pi-arrow-down"></i>
            <span>Load More Results</span>
          </button>
        </div>

        <!-- Loading more indicator -->
        <div v-if="store.isLoading && store.hasResults" class="tag-search-loading-more">
          <ProgressSpinner style="width: 20px; height: 20px" />
          <span>Loading more...</span>
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

.dataserver-select {
  width: 100%;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
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

.tag-item i {
  color: var(--p-primary-color);
  flex-shrink: 0;
}

.tag-name {
  font-weight: 500;
  flex-shrink: 0;
}

.tag-descriptor {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 0.5rem;
}

.tag-search-load-more {
  display: flex;
  justify-content: center;
  padding: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--p-primary-color);
  color: white;
  border: none;
  border-radius: var(--p-border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.load-more-btn:hover {
  background: var(--p-primary-600);
  transform: translateY(-1px);
}

.load-more-btn:active {
  transform: translateY(0);
}

.tag-search-loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
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
