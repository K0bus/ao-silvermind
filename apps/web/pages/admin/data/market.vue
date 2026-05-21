<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <h1 class="page-title">Market Sync Jobs</h1>
        <p class="page-subtitle">Real-time price synchronization history</p>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="skipHistory"
            :disabled="triggering || !!activeJobId"
            class="rounded border-surface-700 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-surface-900 w-4 h-4"
          />
          <span>Skip History (Fast Sync)</span>
        </label>
        <button class="btn-primary text-sm" :disabled="triggering || !!activeJobId" @click="triggerMarketSync">
          {{ triggering ? 'Queuing...' : activeJobId ? 'Sync running...' : 'Run Market Sync' }}
        </button>
      </div>
    </div>

    <!-- Progress indicator -->
    <div v-if="activeJobId && activeJob" class="mb-5 card p-4 border-l-4 border-primary-500">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-sm font-medium text-primary-300">
            Market sync is {{ activeJob.status.toLowerCase() }}
          </span>
          <span class="text-xs text-gray-500">{{ activeJob.type }}</span>
        </div>
        <span class="text-xs text-gray-400 font-mono">
          {{ progressPercent }}%
        </span>
      </div>

      <!-- Progress bar -->
      <div class="h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary-500 rounded-full transition-all duration-500"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>

      <div class="flex justify-between mt-2 text-xs text-gray-500">
        <span>{{ activeJob.itemsProcessed.toLocaleString() }} / {{ activeJob.itemsRequested.toLocaleString() }} items processed</span>
        <span class="text-xs text-gray-400">({{ activeJob.itemsUpdated.toLocaleString() }} updated, {{ activeJob.itemsFailed.toLocaleString() }} errors)</span>
      </div>
    </div>

    <!-- Jobs table -->
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-700 text-xs text-gray-500">
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="text-left px-4 py-3 font-medium">Type</th>
            <th class="text-right px-4 py-3 font-medium hidden sm:table-cell">Started</th>
            <th class="text-right px-4 py-3 font-medium hidden md:table-cell">Duration</th>
            <th class="text-right px-4 py-3 font-medium">Progress</th>
            <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Triggered By</th>
          </tr>
        </thead>
        <tbody v-if="loading" class="divide-y divide-surface-800">
          <tr v-for="i in 5" :key="i" class="animate-pulse">
            <td class="px-4 py-3"><div class="h-5 bg-surface-700 rounded w-20" /></td>
            <td class="px-4 py-3"><div class="h-4 bg-surface-800 rounded w-24" /></td>
            <td class="px-4 py-3 hidden sm:table-cell"><div class="h-4 bg-surface-800 rounded w-28 ml-auto" /></td>
            <td class="px-4 py-3 hidden md:table-cell"><div class="h-4 bg-surface-800 rounded w-16 ml-auto" /></td>
            <td class="px-4 py-3"><div class="h-4 bg-surface-800 rounded w-32 ml-auto" /></td>
            <td class="px-4 py-3 hidden lg:table-cell"><div class="h-4 bg-surface-800 rounded w-24" /></td>
          </tr>
        </tbody>
        <tbody v-else class="divide-y divide-surface-800">
          <template v-for="job in jobs" :key="job.id">
            <tr
              class="hover:bg-surface-800/30 transition-colors cursor-pointer"
              @click="expandedJobs[job.id] = !expandedJobs[job.id]"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <svg
                    class="w-3 h-3 text-gray-500 transition-transform duration-200"
                    :class="{ 'rotate-90 text-primary-400': expandedJobs[job.id] }"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="statusClass(job.status)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="statusDot(job.status)" />
                    {{ job.status.replace('_', ' ') }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-300">
                <span class="px-1.5 py-0.5 rounded bg-surface-700 text-[10px] font-bold">{{ job.type }}</span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs text-right hidden sm:table-cell">
                {{ formatDate(job.startedAt ?? job.createdAt) }}
              </td>
              <td class="px-4 py-3 text-gray-400 text-xs text-right hidden md:table-cell">
                {{ job.durationMs ? formatDuration(job.durationMs) : '—' }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">
                <div class="flex flex-col items-end">
                  <span class="text-xs text-gray-300">{{ job.itemsProcessed.toLocaleString() }} / {{ job.itemsRequested.toLocaleString() }}</span>
                  <div v-if="job.itemsFailed > 0" class="text-[10px] text-red-400">
                    {{ job.itemsFailed }} errors
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                {{ job.triggeredBy?.username ?? 'System' }}
              </td>
            </tr>

            <!-- Expanded Details Section -->
            <tr v-if="expandedJobs[job.id]" class="bg-surface-900/40">
              <td colspan="6" class="px-6 py-4 border-t border-b border-surface-800">
                <div class="space-y-4">
                  <!-- Header details -->
                  <div class="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400 border-b border-surface-800 pb-3">
                    <div>
                      <span>Job ID: <span class="font-mono text-gray-300 font-bold select-all">{{ job.id }}</span></span>
                      <span class="ml-4">Triggered By: <span class="text-gray-300 font-medium">{{ job.triggeredBy?.username ?? 'System' }}</span></span>
                    </div>
                    <div class="flex gap-4">
                      <span>Started: <span class="text-gray-300">{{ formatDate(job.startedAt ?? job.createdAt) }}</span></span>
                      <span v-if="job.completedAt">Ended: <span class="text-gray-300">{{ formatDate(job.completedAt) }}</span></span>
                    </div>
                  </div>

                  <!-- Error message block -->
                  <div v-if="job.errorMessage" class="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r">
                    <div class="flex items-center gap-2 text-xs font-bold text-red-400 mb-2">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Accumulated Batch Errors
                    </div>
                    <pre class="text-xs text-red-200 font-mono whitespace-pre-wrap break-all bg-red-950/20 p-2 rounded border border-red-500/20 max-h-[250px] overflow-y-auto">{{ job.errorMessage }}</pre>
                  </div>

                  <!-- Job Statistics Grid -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-950/30 p-3 rounded border border-surface-800/50">
                    <div>
                      <div class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Requested Items</div>
                      <div class="text-sm font-bold text-gray-200 font-mono mt-0.5">{{ job.itemsRequested.toLocaleString() }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Processed Items</div>
                      <div class="text-sm font-bold mt-0.5 font-mono text-gray-300">{{ job.itemsProcessed.toLocaleString() }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Prices Updated</div>
                      <div class="text-sm font-bold text-green-400 font-mono mt-0.5">+{{ job.itemsUpdated.toLocaleString() }}</div>
                    </div>
                    <div>
                      <div class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Sync Errors</div>
                      <div class="text-sm font-bold font-mono mt-0.5" :class="job.itemsFailed > 0 ? 'text-red-400' : 'text-gray-400'">{{ job.itemsFailed.toLocaleString() }}</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="!loading && jobs.length === 0" class="py-12 text-center text-gray-600 text-sm">
        No market sync jobs yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface MarketSyncJob {
  id: string
  type: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS'
  itemsRequested: number
  itemsProcessed: number
  itemsUpdated: number
  itemsFailed: number
  durationMs: number | null
  startedAt: string | null
  createdAt: string
  completedAt?: string | null
  triggeredBy: { username: string } | null
  errorMessage?: string | null
}

const jobs = ref<MarketSyncJob[]>([])
const loading = ref(false)
const triggering = ref(false)
const skipHistory = ref(true)
const expandedJobs = ref<Record<string, boolean>>({})

const activeJob = computed(() => jobs.value.find(j => j.status === 'RUNNING' || j.status === 'PENDING'))
const activeJobId = computed(() => activeJob.value?.id ?? null)

const progressPercent = computed(() => {
  if (!activeJob.value || activeJob.value.itemsRequested === 0) return 0
  return Math.round((activeJob.value.itemsProcessed / activeJob.value.itemsRequested) * 100)
})

async function loadJobs() {
  if (activeJobId.value) return // Handled by polling
  loading.value = true
  try {
    const res = await $fetch<{ data: MarketSyncJob[] }>('/api/v1/admin/market/jobs')
    jobs.value = res.data
  } finally {
    loading.value = false
  }
}

async function refreshJobs() {
  try {
    const res = await $fetch<{ data: MarketSyncJob[] }>('/api/v1/admin/market/jobs')
    jobs.value = res.data
  } catch {
    // ignore
  }
}

async function triggerMarketSync() {
  triggering.value = true
  try {
    const res = await $fetch<{ data: { jobId: string } }>('/api/v1/admin/market/sync', {
      method: 'POST',
      body: { type: 'FULL', skipHistory: skipHistory.value },
    })
    await refreshJobs()
  } catch (err: any) {
    alert(err?.data?.message ?? 'Failed to trigger market sync')
  } finally {
    triggering.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(ms: number) {
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = ((ms % 60000) / 1000).toFixed(0)
  return `${mins}m ${secs}s`
}

function statusClass(status: string) {
  return ({
    SUCCESS: 'bg-green-500/10 text-green-400',
    RUNNING: 'bg-primary-500/10 text-primary-400',
    FAILED: 'bg-red-500/10 text-red-400',
    PARTIAL_SUCCESS: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    PENDING: 'bg-gray-600/30 text-gray-400',
  } as Record<string, string>)[status] ?? 'bg-gray-600/30 text-gray-400'
}

function statusDot(status: string) {
  return ({
    SUCCESS: 'bg-green-400',
    RUNNING: 'bg-primary-400 animate-pulse',
    FAILED: 'bg-red-400',
    PARTIAL_SUCCESS: 'bg-amber-400',
    PENDING: 'bg-gray-500 animate-pulse',
  } as Record<string, string>)[status] ?? 'bg-gray-500'
}

onMounted(loadJobs)

// Poll only while a sync is active — stops automatically when done
const { pause: pausePolling, resume: resumePolling } = useIntervalFn(refreshJobs, 3000, { immediate: false })
watch(activeJobId, (id) => { id ? resumePolling() : pausePolling() }, { immediate: true })
</script>
