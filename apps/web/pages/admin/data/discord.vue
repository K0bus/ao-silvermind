<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <h1 class="page-title">Discord Bots</h1>
        <p class="page-subtitle">{{ total }} active Discord bot configurations</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <input
        v-model="filters.q"
        type="search"
        class="input flex-1 min-w-48 max-w-xs"
        placeholder="Search by server name, ID, or user email..."
        @input="debouncedLoad"
      />
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-700 text-xs text-gray-500">
            <th class="text-left px-4 py-3 font-medium">Discord Server</th>
            <th class="text-left px-4 py-3 font-medium">Owner</th>
            <th class="text-left px-4 py-3 font-medium">Region</th>
            <th class="text-left px-4 py-3 font-medium">Active Modules</th>
            <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Connected</th>
            <th class="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody v-if="loading" class="divide-y divide-surface-800">
          <tr v-for="i in 5" :key="i" class="animate-pulse">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-surface-700" />
                <div>
                  <div class="h-3 bg-surface-700 rounded w-24 mb-1.5" />
                  <div class="h-3 bg-surface-800 rounded w-32" />
                </div>
              </div>
            </td>
            <td class="px-4 py-3"><div class="h-3 bg-surface-700 rounded w-24" /></td>
            <td class="px-4 py-3"><div class="h-3 bg-surface-700 rounded w-12" /></td>
            <td class="px-4 py-3">
              <div class="flex gap-1">
                <div class="h-5 bg-surface-700 rounded w-12" v-for="j in 3" :key="j" />
              </div>
            </td>
            <td class="px-4 py-3 hidden lg:table-cell"><div class="h-3 bg-surface-800 rounded w-20" /></td>
            <td class="px-4 py-3" />
          </tr>
        </tbody>
        <tbody v-else class="divide-y divide-surface-800">
          <tr
            v-for="config in configs"
            :key="config.id"
            class="hover:bg-surface-800/30 transition-colors"
          >
            <!-- Server info -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-surface-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  🤖
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-white truncate">{{ config.name }}</p>
                  <code class="text-[10px] text-gray-500 font-mono select-all">{{ config.id }}</code>
                </div>
              </div>
            </td>

            <!-- Owner -->
            <td class="px-4 py-3">
              <div class="min-w-0" v-if="config.user">
                <p class="text-white truncate">{{ config.user.username }}</p>
                <p class="text-xs text-gray-500 truncate">{{ config.user.email }}</p>
              </div>
              <span v-else class="text-gray-600 italic">Unknown</span>
            </td>

            <!-- Region -->
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-800 border border-surface-700 text-gray-400 uppercase tracking-wider">
                {{ config.serverConnection }}
              </span>
            </td>

            <!-- Active Modules -->
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <span 
                  class="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider" 
                  :class="config.killboardEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-gray-500 border border-surface-700/50'"
                >
                  Kill
                </span>
                <span 
                  class="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider" 
                  :class="config.statsEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-gray-500 border border-surface-700/50'"
                >
                  Stats
                </span>
                <span 
                  class="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider" 
                  :class="config.serverStatusEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-gray-500 border border-surface-700/50'"
                >
                  Status
                </span>
                <span 
                  class="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider" 
                  :class="config.profitAlertsEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-gray-500 border border-surface-700/50'"
                >
                  Alerts
                </span>
                <span 
                  class="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider" 
                  :class="config.dailyEventEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-gray-500 border border-surface-700/50'"
                >
                  Event
                </span>
                <span 
                  class="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider" 
                  :class="config.profitEmbedEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-gray-500 border border-surface-700/50'"
                >
                  Top5
                </span>
              </div>
            </td>

            <!-- Created -->
            <td class="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
              {{ formatDate(config.createdAt) }}
            </td>

            <!-- Actions -->
            <td class="px-4 py-3 text-right">
              <button
                class="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                @click="confirmDelete(config)"
              >
                Disconnect
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div v-if="!loading && configs.length === 0" class="py-12 text-center text-gray-600 text-sm">
        No active bot configurations found
      </div>

      <!-- Load more -->
      <div v-if="nextCursor" class="border-t border-surface-700 px-4 py-3 flex justify-center">
        <button class="btn-secondary text-xs" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading...' : 'Load more' }}
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      :open="isDeleteModalOpen"
      title="Disconnect Discord Bot"
      :message="`Are you sure you want to disconnect and delete the configuration for Discord server '${selectedConfig?.name}'? The bot will stop syncing logs and stats for this guild immediately.`"
      confirm-label="Disconnect"
      cancel-label="Cancel"
      loading-label="Disconnecting..."
      :loading="deleting"
      variant="danger"
      eyebrow="Discord Bot Management"
      @confirm="onDeleteConfirm"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

definePageMeta({ layout: 'admin' })

interface DiscordConfig {
  id: string
  name: string
  icon: string | null
  userId: string
  guildId: string | null
  guildName: string | null
  serverConnection: string
  killboardEnabled: boolean
  statsEnabled: boolean
  serverStatusEnabled: boolean
  profitAlertsEnabled: boolean
  dailyEventEnabled: boolean
  profitEmbedEnabled: boolean
  createdAt: string
  user?: {
    id: string
    username: string
    email: string
  }
}

const filters = reactive({ q: '' })
const configs = ref<DiscordConfig[]>([])
const total = ref(0)
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)

const isDeleteModalOpen = ref(false)
const selectedConfig = ref<DiscordConfig | null>(null)
const deleting = ref(false)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)

    const res = await $fetch<{ data: DiscordConfig[]; meta: { total: number; nextCursor: string | null } }>(
      `/api/v1/admin/discord?${params.toString()}`
    )
    configs.value = res.data
    total.value = res.meta.total
    nextCursor.value = res.meta.nextCursor
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value) return
  loadingMore.value = true
  try {
    const res = await $fetch<{ data: DiscordConfig[]; meta: { nextCursor: string | null } }>(
      `/api/v1/admin/discord?cursor=${nextCursor.value}`
    )
    configs.value.push(...res.data)
    nextCursor.value = res.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}

function confirmDelete(config: DiscordConfig) {
  selectedConfig.value = config
  isDeleteModalOpen.value = true
}

async function onDeleteConfirm() {
  if (!selectedConfig.value) return
  deleting.value = true
  try {
    await $fetch(`/api/v1/admin/discord/${selectedConfig.value.id}`, {
      method: 'DELETE',
    })
    configs.value = configs.value.filter((c) => c.id !== selectedConfig.value?.id)
    total.value = Math.max(0, total.value - 1)
    isDeleteModalOpen.value = false
  } catch (err: any) {
    alert(err?.data?.message ?? 'Failed to disconnect discord bot config.')
  } finally {
    deleting.value = false
  }
}

const debouncedLoad = useDebounceFn(load, 300)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>
