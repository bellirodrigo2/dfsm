<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppShell from './ui/AppShell.vue'
import { loadConfig, ConfigLoadError } from './app/config'
import { initializeAuth } from './services/auth'

const configError = ref<string | null>(null)
const initialized = ref(false)

onMounted(async () => {
  try {
    await loadConfig()
    await initializeAuth()
    initialized.value = true
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      configError.value = `Configuration Error: ${error.message}`
    } else {
      configError.value = 'Failed to initialize application'
    }
  }
})
</script>

<template>
  <div v-if="configError" class="config-error">
    <div class="error-content">
      <h1>Application Error</h1>
      <p>{{ configError }}</p>
      <p class="hint">Check that /config/dsm.config.json is accessible and valid.</p>
    </div>
  </div>
  <div v-else-if="!initialized" class="loading-screen">
    <div class="loading-content">
      <h1>DFSM</h1>
      <p>Loading...</p>
    </div>
  </div>
  <AppShell v-else />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  min-height: 100vh;
}

.config-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fef2f2;
}

.error-content {
  text-align: center;
  padding: 2rem;
  max-width: 500px;
}

.error-content h1 {
  color: #dc2626;
  margin-bottom: 1rem;
}

.error-content p {
  color: #7f1d1d;
  margin-bottom: 0.5rem;
}

.error-content .hint {
  font-size: 0.875rem;
  color: #991b1b;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f8fafc;
}

.loading-content {
  text-align: center;
}

.loading-content h1 {
  font-size: 2rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.loading-content p {
  color: #64748b;
}
</style>
