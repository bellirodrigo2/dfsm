<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMyDataFrames, useCreateDataFrame, useDeleteDataFrame } from '../queries/dataframes'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import type { PermissionMode } from '../domain/dataframe'

const router = useRouter()
const { data: dataframes, isLoading, error } = useMyDataFrames()
const createMutation = useCreateDataFrame()
const deleteMutation = useDeleteDataFrame()

function openDataFrame(id: string) {
  router.push(`/my-dataframes/${id}`)
}

// Create dialog state
const showCreateDialog = ref(false)
const newDfName = ref('')
const newDfDescription = ref('')
const newDfPermission = ref<PermissionMode>('PRIVATE')
const createError = ref<string | null>(null)

const permissionOptions = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Shared', value: 'SHARED' },
]

// Delete confirmation state
const showDeleteDialog = ref(false)
const deleteTargetId = ref<string | null>(null)
const deleteTargetName = ref('')

function openCreateDialog() {
  newDfName.value = ''
  newDfDescription.value = ''
  newDfPermission.value = 'PRIVATE'
  createError.value = null
  showCreateDialog.value = true
}

async function handleCreate() {
  createError.value = null

  if (!newDfName.value.trim()) {
    createError.value = 'Name is required'
    return
  }

  try {
    await createMutation.mutateAsync({
      name: newDfName.value.trim(),
      description: newDfDescription.value.trim() || undefined,
      permissions: newDfPermission.value,
    })
    showCreateDialog.value = false
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Failed to create DataFrame'
  }
}

function confirmDelete(id: string, name: string) {
  deleteTargetId.value = id
  deleteTargetName.value = name
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deleteTargetId.value) return

  try {
    await deleteMutation.mutateAsync(deleteTargetId.value)
    showDeleteDialog.value = false
    deleteTargetId.value = null
  } catch (err) {
    console.error('Delete failed:', err)
  }
}

function getPermissionLabel(mode: PermissionMode): string {
  const option = permissionOptions.find(o => o.value === mode)
  return option?.label ?? mode
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>My DataFrames</h1>
      <Button
        label="New DataFrame"
        icon="pi pi-plus"
        @click="openCreateDialog"
      />
    </div>

    <Message v-if="error" severity="error">
      Failed to load DataFrames: {{ (error as Error).message }}
    </Message>

    <div v-if="isLoading" class="loading-container">
      <ProgressSpinner />
    </div>

    <DataTable
      v-else-if="dataframes && dataframes.length > 0"
      :value="dataframes"
      stripedRows
      class="dataframes-table"
    >
      <Column field="name" header="Name" sortable>
        <template #body="{ data }">
          <Button
            :label="data.name"
            link
            class="name-link"
            @click="openDataFrame(data.id)"
          />
        </template>
      </Column>
      <Column field="description" header="Description" />
      <Column header="Permission">
        <template #body="{ data }">
          {{ getPermissionLabel(data.permissions.mode) }}
        </template>
      </Column>
      <Column header="Actions" style="width: 150px">
        <template #body="{ data }">
          <div class="action-buttons">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              text
              aria-label="Edit"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              aria-label="Delete"
              @click="confirmDelete(data.id, data.name)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <div v-else-if="!isLoading" class="empty-state">
      <i class="pi pi-database empty-icon"></i>
      <p>You don't have any DataFrames yet.</p>
      <Button
        label="Create your first DataFrame"
        icon="pi pi-plus"
        @click="openCreateDialog"
      />
    </div>

    <!-- Create Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create New DataFrame"
      modal
      :style="{ width: '450px' }"
    >
      <div class="dialog-form">
        <Message v-if="createError" severity="error" :closable="false">
          {{ createError }}
        </Message>

        <div class="field">
          <label for="df-name">Name *</label>
          <InputText
            id="df-name"
            v-model="newDfName"
            class="w-full"
            placeholder="e.g., production_metrics"
          />
        </div>

        <div class="field">
          <label for="df-description">Description</label>
          <Textarea
            id="df-description"
            v-model="newDfDescription"
            class="w-full"
            rows="3"
            placeholder="Optional description"
          />
        </div>

        <div class="field">
          <label for="df-permission">Permission</label>
          <Select
            id="df-permission"
            v-model="newDfPermission"
            :options="permissionOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showCreateDialog = false"
        />
        <Button
          label="Create"
          icon="pi pi-check"
          :loading="createMutation.isPending.value"
          @click="handleCreate"
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      modal
      :style="{ width: '400px' }"
    >
      <p>Are you sure you want to delete <strong>{{ deleteTargetName }}</strong>?</p>
      <p class="delete-warning">This action cannot be undone.</p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showDeleteDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          icon="pi pi-trash"
          :loading="deleteMutation.isPending.value"
          @click="handleDelete"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  margin: 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.dataframes-table {
  margin-top: 1rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin-bottom: 1.5rem;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-weight: 500;
}

.w-full {
  width: 100%;
}

.delete-warning {
  color: var(--p-red-500);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
