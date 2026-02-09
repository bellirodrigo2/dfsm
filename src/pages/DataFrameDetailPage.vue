<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataFrame } from '../queries/dataframes'
import { useDataFrameColumns, useCreateColumn, useDeleteColumn } from '../queries/columns'
import type { ValueSourceType, CreateColumnInput } from '../domain/column'
import { getValueSourceTypeLabel } from '../domain/column'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Breadcrumb from 'primevue/breadcrumb'
import { useTagSearchStore } from '../modules/tagSearch'

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const tagSearchStore = useTagSearchStore()

const { data: dataframe, isLoading: dfLoading, error: dfError } = useDataFrame(props.id)
const { data: columns, isLoading: colsLoading, error: colsError } = useDataFrameColumns(props.id)
const createColumnMutation = useCreateColumn(props.id)
const deleteColumnMutation = useDeleteColumn(props.id)

// Breadcrumb
const breadcrumbItems = computed(() => [
  { label: 'My DataFrames', route: '/my-dataframes' },
  { label: dataframe.value?.name ?? 'Loading...' },
])
const breadcrumbHome = { icon: 'pi pi-home', route: '/' }

// Create column dialog
const showCreateColumnDialog = ref(false)
const newColName = ref('')
const newColSourceType = ref<ValueSourceType>('PiTag')
const newColSource = ref('')
const newColUnit = ref('')
const createColError = ref<string | null>(null)

const sourceTypeOptions = [
  { label: 'PI Tag', value: 'PiTag' },
  { label: 'Fixed Value', value: 'FixedValue' },
  { label: 'Formula', value: 'Formula' },
]

// Delete confirmation
const showDeleteColDialog = ref(false)
const deleteColTarget = ref<{ id: string; name: string } | null>(null)

function openCreateColumnDialog() {
  newColName.value = ''
  newColSourceType.value = 'PiTag'
  newColSource.value = ''
  newColUnit.value = ''
  createColError.value = null
  showCreateColumnDialog.value = true
}

async function handleCreateColumn() {
  createColError.value = null

  if (!newColName.value.trim()) {
    createColError.value = 'Name is required'
    return
  }

  const input: CreateColumnInput = {
    name: newColName.value.trim(),
    valueSourceType: newColSourceType.value,
    valueSource: newColSource.value.trim() || undefined,
    engineeringUnit: newColUnit.value.trim() || undefined,
  }

  try {
    await createColumnMutation.mutateAsync(input)
    showCreateColumnDialog.value = false
  } catch (err) {
    createColError.value = err instanceof Error ? err.message : 'Failed to create column'
  }
}

function confirmDeleteColumn(id: string, name: string) {
  deleteColTarget.value = { id, name }
  showDeleteColDialog.value = true
}

async function handleDeleteColumn() {
  if (!deleteColTarget.value) return

  try {
    await deleteColumnMutation.mutateAsync(deleteColTarget.value.id)
    showDeleteColDialog.value = false
    deleteColTarget.value = null
  } catch (err) {
    console.error('Delete column failed:', err)
  }
}

function goBack() {
  router.push('/my-dataframes')
}

function openTagSearch() {
  tagSearchStore.open({
    onSelect: (tag) => {
      newColSource.value = tag.path
      if (tag.engineeringUnit) {
        newColUnit.value = tag.engineeringUnit
      }
      // Auto-fill column name if empty
      if (!newColName.value.trim()) {
        newColName.value = tag.name
      }
    },
    placeholder: 'Search for a PI tag...',
  })
}
</script>

<template>
  <div class="page">
    <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="mb-4" />

    <div v-if="dfLoading" class="loading-container">
      <ProgressSpinner />
    </div>

    <Message v-else-if="dfError" severity="error">
      Failed to load DataFrame: {{ (dfError as Error).message }}
    </Message>

    <template v-else-if="dataframe">
      <div class="page-header">
        <div class="header-left">
          <Button
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="goBack"
          />
          <div>
            <h1>{{ dataframe.name }}</h1>
            <p v-if="dataframe.description" class="description">{{ dataframe.description }}</p>
          </div>
        </div>
      </div>

      <TabView value="0">
        <TabPanel value="0" header="Columns">
          <div class="tab-header">
            <Button
              label="Add Column"
              icon="pi pi-plus"
              size="small"
              @click="openCreateColumnDialog"
            />
          </div>

          <Message v-if="colsError" severity="error">
            Failed to load columns: {{ (colsError as Error).message }}
          </Message>

          <div v-if="colsLoading" class="loading-container">
            <ProgressSpinner />
          </div>

          <DataTable
            v-else-if="columns && columns.length > 0"
            :value="columns"
            stripedRows
            class="columns-table"
          >
            <Column field="name" header="Name" sortable />
            <Column header="Source Type">
              <template #body="{ data }">
                {{ getValueSourceTypeLabel(data.valueSourceType) }}
              </template>
            </Column>
            <Column field="valueSource" header="Source" />
            <Column field="engineeringUnit" header="Unit" />
            <Column header="Actions" style="width: 120px">
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
                    @click="confirmDeleteColumn(data.id, data.name)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>

          <div v-else class="empty-state">
            <i class="pi pi-table empty-icon"></i>
            <p>No columns defined yet.</p>
            <Button
              label="Add your first column"
              icon="pi pi-plus"
              @click="openCreateColumnDialog"
            />
          </div>
        </TabPanel>

        <TabPanel value="1" header="Schema">
          <div class="schema-preview">
            <h3>Arrow Schema Preview</h3>
            <pre v-if="columns && columns.length > 0">Schema
<template v-for="col in columns" :key="col.id">├─ {{ col.name }}: {{ col.valueType ?? 'unknown' }}
</template>└─ metadata: { ... }</pre>
            <p v-else class="empty-hint">Add columns to see the schema preview.</p>
          </div>
        </TabPanel>

        <TabPanel value="2" header="Metadata">
          <div class="metadata-section">
            <h3>DataFrame Metadata</h3>
            <pre v-if="dataframe.metadata && Object.keys(dataframe.metadata).length > 0">{{ JSON.stringify(dataframe.metadata, null, 2) }}</pre>
            <p v-else class="empty-hint">No metadata defined.</p>
          </div>
        </TabPanel>
      </TabView>
    </template>

    <!-- Create Column Dialog -->
    <Dialog
      v-model:visible="showCreateColumnDialog"
      header="Add Column"
      modal
      :style="{ width: '500px' }"
    >
      <div class="dialog-form">
        <Message v-if="createColError" severity="error" :closable="false">
          {{ createColError }}
        </Message>

        <div class="field">
          <label for="col-name">Name *</label>
          <InputText
            id="col-name"
            v-model="newColName"
            class="w-full"
            placeholder="e.g., temperature"
          />
        </div>

        <div class="field">
          <label for="col-source-type">Source Type *</label>
          <Select
            id="col-source-type"
            v-model="newColSourceType"
            :options="sourceTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="col-source">
            {{ newColSourceType === 'PiTag' ? 'Tag Path' : newColSourceType === 'Formula' ? 'Expression' : 'Value' }}
          </label>
          <Textarea
            v-if="newColSourceType === 'Formula'"
            id="col-source"
            v-model="newColSource"
            class="w-full"
            rows="3"
            placeholder="e.g., 'tag1' + 'tag2'"
          />
          <div v-else-if="newColSourceType === 'PiTag'" class="input-with-button">
            <InputText
              id="col-source"
              v-model="newColSource"
              class="flex-1"
              placeholder="\\\\SERVER\\TAG"
            />
            <Button
              icon="pi pi-search"
              severity="secondary"
              aria-label="Search tags"
              @click="openTagSearch"
            />
          </div>
          <InputText
            v-else
            id="col-source"
            v-model="newColSource"
            class="w-full"
            placeholder="42"
          />
        </div>

        <div class="field">
          <label for="col-unit">Engineering Unit</label>
          <InputText
            id="col-unit"
            v-model="newColUnit"
            class="w-full"
            placeholder="e.g., deg C, bar, m/s"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showCreateColumnDialog = false"
        />
        <Button
          label="Add"
          icon="pi pi-check"
          :loading="createColumnMutation.isPending.value"
          @click="handleCreateColumn"
        />
      </template>
    </Dialog>

    <!-- Delete Column Confirmation -->
    <Dialog
      v-model:visible="showDeleteColDialog"
      header="Confirm Delete"
      modal
      :style="{ width: '400px' }"
    >
      <p>Are you sure you want to delete column <strong>{{ deleteColTarget?.name }}</strong>?</p>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="showDeleteColDialog = false"
        />
        <Button
          label="Delete"
          severity="danger"
          icon="pi pi-trash"
          :loading="deleteColumnMutation.isPending.value"
          @click="handleDeleteColumn"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-header h1 {
  margin: 0;
}

.description {
  color: var(--p-text-muted-color);
  margin: 0.25rem 0 0;
}

.tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.columns-table {
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

.schema-preview,
.metadata-section {
  padding: 1rem;
}

.schema-preview h3,
.metadata-section h3 {
  margin-bottom: 1rem;
}

.schema-preview pre,
.metadata-section pre {
  background: var(--p-surface-100);
  padding: 1rem;
  border-radius: var(--p-border-radius);
  overflow-x: auto;
  font-family: monospace;
  white-space: pre;
}

.empty-hint {
  color: var(--p-text-muted-color);
  font-style: italic;
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

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
}
</style>
