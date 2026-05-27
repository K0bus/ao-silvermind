<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <h1 class="page-title">Job Scheduler</h1>
        <p class="page-subtitle">Manage automated background tasks</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-ghost text-sm" :disabled="seeding" @click="triggerSeed">
          {{ seeding ? 'Seeding...' : 'Seed Defaults' }}
        </button>
        <button class="btn-secondary text-sm" @click="syncSchedules">
          Sync with BullMQ
        </button>
        <button class="btn-primary text-sm" @click="openCreateModal">
          New Schedule
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-700 text-xs text-gray-500">
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="text-left px-4 py-3 font-medium">Job Name</th>
            <th class="text-left px-4 py-3 font-medium">Cron Expression</th>
            <th class="text-right px-4 py-3 font-medium">Last Run</th>
            <th class="text-right px-4 py-3 font-medium text-blue-400">Next Run</th>
            <th class="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody v-if="loading" class="divide-y divide-surface-800">
          <tr v-for="i in 3" :key="i" class="animate-pulse">
            <td class="px-4 py-3"><div class="h-5 bg-surface-700 rounded w-16" /></td>
            <td class="px-4 py-3"><div class="h-4 bg-surface-800 rounded w-32" /></td>
            <td class="px-4 py-3"><div class="h-4 bg-surface-800 rounded w-24" /></td>
            <td class="px-4 py-3 text-right"><div class="h-4 bg-surface-800 rounded w-20 ml-auto" /></td>
            <td class="px-4 py-3 text-right"><div class="h-4 bg-surface-800 rounded w-20 ml-auto" /></td>
            <td class="px-4 py-3 text-right"><div class="h-8 bg-surface-800 rounded w-24 ml-auto" /></td>
          </tr>
        </tbody>
        <tbody v-else class="divide-y divide-surface-800">
          <tr v-for="s in schedules" :key="s.id" class="hover:bg-surface-800/30 transition-colors">
            <td class="px-4 py-3">
              <span 
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                :class="s.enabled ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="s.enabled ? 'bg-green-400' : 'bg-gray-500'" />
                {{ s.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </td>
            <td class="px-4 py-3 font-medium text-gray-200">
              {{ s.label }}
              <div class="text-[10px] text-gray-500 font-mono">{{ s.name }}</div>
            </td>
            <td class="px-4 py-3">
              <code class="px-1.5 py-0.5 bg-surface-800 rounded text-yellow-500 font-mono text-xs">
                {{ s.cron }}
              </code>
            </td>
            <td class="px-4 py-3 text-right text-xs text-gray-500">
              {{ formatDate(s.lastRunAt) }}
            </td>
            <td class="px-4 py-3 text-right text-xs font-medium text-blue-400">
              <span v-if="s.enabled">{{ formatDate(s.nextRunAt) }}</span>
              <span v-else class="text-gray-600">—</span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button 
                  class="p-1.5 hover:bg-surface-700 rounded text-gray-400 hover:text-white transition-colors"
                  title="Run Now"
                  @click="runNow(s)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button 
                  class="p-1.5 hover:bg-surface-700 rounded text-gray-400 hover:text-white transition-colors"
                  title="Edit"
                  @click="editSchedule(s)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && schedules.length === 0" class="py-12 text-center text-gray-600 text-sm">
        No schedules found.
      </div>
    </div>

    <!-- Edit/Create Modal -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="card w-full max-w-md p-6">
        <h2 class="text-xl font-bold mb-4">{{ editingId ? 'Edit Schedule' : 'New Schedule' }}</h2>
        
        <form @submit.prevent="saveSchedule" class="space-y-4">
          <div v-if="!editingId">
            <label class="label">Internal Name</label>
            <input v-model="form.name" type="text" class="input" placeholder="e.g. market_full_sync" required />
          </div>
          
          <div>
            <label class="label">Label</label>
            <input v-model="form.label" type="text" class="input" placeholder="e.g. Market Full Sync" required />
          </div>

          <div>
            <label class="label">Cron Expression</label>
            <input v-model="form.cron" type="text" class="input font-mono" placeholder="0 * * * *" required />
            <p class="mt-1 text-[10px] text-gray-500">Minute Hour Day Month DayOfWeek</p>
          </div>

          <div v-if="!editingId">
            <label class="label">Target Worker</label>
            <select v-model="form.target" class="input">
              <option value="albion-import">Albion Import</option>
              <option value="albion-market">Albion Market</option>
              <option value="pvp-sync">PvP Sync</option>
              <option value="pvp-historical-sync">PvP Historical Sync</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <input v-model="form.enabled" type="checkbox" id="enabled" />
            <label for="enabled" class="text-sm text-gray-300">Enabled</label>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button type="button" class="btn-ghost" @click="modalOpen = false">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Schedule' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface JobSchedule {
  id: string
  name: string
  label: string
  cron: string
  enabled: boolean
  target: string
  options: any
  lastRunAt: string | null
  nextRunAt: string | null
}

const schedules = ref<JobSchedule[]>([])
const loading = ref(false)
const seeding = ref(false)
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const form = ref({
  name: '',
  label: '',
  cron: '0 * * * *',
  target: 'albion-market',
  enabled: true
})

async function loadSchedules() {
  loading.value = true
  try {
    const res = await $fetch<{ data: JobSchedule[] }>('/api/v1/admin/scheduler')
    schedules.value = res.data
  } catch (err: any) {
    console.error('Failed to load schedules', err)
  } finally {
    loading.value = false
  }
}

async function triggerSeed() {
  if (!confirm('This will add or reset default schedules. Continue?')) return
  seeding.value = true
  try {
    await $fetch('/api/v1/admin/scheduler/seed', { method: 'POST' })
    await loadSchedules()
  } catch (err: any) {
    alert(err?.data?.message ?? 'Failed to seed schedules')
  } finally {
    seeding.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = {
    name: '',
    label: '',
    cron: '0 * * * *',
    target: 'albion-market',
    enabled: true
  }
  modalOpen.value = true
}

function editSchedule(s: JobSchedule) {
  editingId.value = s.id
  form.value = {
    name: s.name,
    label: s.label,
    cron: s.cron,
    target: s.target,
    enabled: s.enabled
  }
  modalOpen.value = true
}

async function saveSchedule() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/v1/admin/scheduler/${editingId.value}`, {
        method: 'PATCH',
        body: {
          label: form.value.label,
          cron: form.value.cron,
          enabled: form.value.enabled
        }
      })
    } else {
      await $fetch('/api/v1/admin/scheduler', {
        method: 'POST',
        body: form.value
      })
    }
    modalOpen.value = false
    await loadSchedules()
  } catch (err: any) {
    alert(err?.data?.message ?? 'Failed to save schedule')
  } finally {
    saving.value = false
  }
}

async function runNow(s: JobSchedule) {
  if (!confirm(`Trigger "${s.label}" now?`)) return
  try {
    await $fetch(`/api/v1/admin/scheduler/${s.id}/run`, { method: 'POST' })
    alert('Job queued successfully')
  } catch (err: any) {
    alert(err?.data?.message ?? 'Failed to trigger job')
  }
}

async function syncSchedules() {
  // We can add a specialized sync endpoint if needed, but patching/creating already syncs.
  // For now, just reload.
  await loadSchedules()
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

onMounted(loadSchedules)
</script>
