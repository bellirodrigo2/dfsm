<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Message from 'primevue/message'
import { TagSearchModal, useTagSearchStore } from '../modules/tagSearch'

const authStore = useAuthStore()
const uiStore = useUiStore()
const tagSearchStore = useTagSearchStore()
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-title">
        <h1>DFSM</h1>
        <span class="subtitle">DataFrame Schema Manager</span>
      </div>

      <nav class="app-nav">
        <RouterLink to="/my-dataframes" class="nav-link">My DataFrames</RouterLink>
        <RouterLink to="/public-dataframes" class="nav-link">Public</RouterLink>
        <RouterLink to="/shared-dataframes" class="nav-link">Shared</RouterLink>
      </nav>

      <div class="app-actions">
        <Button
          label="Tag Search"
          icon="pi pi-search"
          severity="secondary"
          size="small"
          @click="tagSearchStore.open()"
        />
        <Button label="New DF" icon="pi pi-plus" size="small" />
      </div>

      <div class="user-info">
        <span v-if="authStore.loading" class="loading">Loading...</span>
        <span v-else-if="authStore.isAuthenticated" class="authenticated">
          <i class="pi pi-user"></i>
          {{ authStore.displayName }}
        </span>
        <span v-else class="anonymous">
          <i class="pi pi-eye"></i>
          Read-only
        </span>
      </div>
    </header>

    <ProgressBar v-if="uiStore.globalLoading" mode="indeterminate" class="global-progress" />

    <Message v-if="uiStore.globalError" severity="error" :closable="true" @close="uiStore.clearGlobalError()">
      {{ uiStore.globalError }}
    </Message>

    <Message v-if="authStore.error" severity="error" :closable="false">
      {{ authStore.error }}
    </Message>

    <main class="app-main">
      <RouterView />
    </main>

    <!-- Global Tag Search Modal (Ctrl+K) -->
    <TagSearchModal />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 2rem;
  background: var(--p-surface-100);
  border-bottom: 1px solid var(--p-surface-200);
}

.app-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.app-title .subtitle {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  display: block;
}

.app-nav {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: var(--p-text-color);
  border-radius: var(--p-border-radius);
  transition: background-color 0.2s;
}

.nav-link:hover {
  background: var(--p-surface-200);
}

.nav-link.router-link-active {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

.app-actions {
  display: flex;
  gap: 0.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--p-surface-200);
  border-radius: var(--p-border-radius);
  font-size: 0.875rem;
}

.user-info i {
  font-size: 1rem;
}

.anonymous {
  color: var(--p-text-muted-color);
}

.global-progress {
  height: 3px;
}

.app-main {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
