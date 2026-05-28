<template>
  <div>
    <div class="page-header flex items-center justify-between">
      <div>
        <h1 class="page-title">Users</h1>
        <p class="page-subtitle">{{ total }} registered users</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <input
        v-model="filters.q"
        type="search"
        class="input flex-1 min-w-48 max-w-xs"
        placeholder="Search by username or email..."
        @input="debouncedLoad"
      />
      <select v-model="filters.role" class="input w-auto" @change="load">
        <option value="">All Roles</option>
        <option value="ADMIN">Admin</option>
        <option value="MODERATOR">Moderator</option>
        <option value="USER">User</option>
      </select>
      <select v-model="filters.status" class="input w-auto" @change="load">
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="PENDING_VERIFICATION">Pending</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-surface-700 text-xs text-gray-500">
            <th class="text-left px-4 py-3 font-medium">User</th>
            <th class="text-left px-4 py-3 font-medium">Role</th>
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Last Login</th>
            <th class="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
            <th class="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody v-if="loading" class="divide-y divide-surface-800">
          <tr v-for="i in 10" :key="i" class="animate-pulse">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-surface-700" />
                <div>
                  <div class="h-3 bg-surface-700 rounded w-24 mb-1.5" />
                  <div class="h-3 bg-surface-800 rounded w-32" />
                </div>
              </div>
            </td>
            <td class="px-4 py-3"><div class="h-5 bg-surface-700 rounded w-16" /></td>
            <td class="px-4 py-3"><div class="h-5 bg-surface-700 rounded w-14" /></td>
            <td class="px-4 py-3 hidden lg:table-cell"><div class="h-3 bg-surface-800 rounded w-24" /></td>
            <td class="px-4 py-3 hidden lg:table-cell"><div class="h-3 bg-surface-800 rounded w-20" /></td>
            <td class="px-4 py-3" />
          </tr>
        </tbody>
        <tbody v-else class="divide-y divide-surface-800">
          <tr
            v-for="user in users"
            :key="user.id"
            class="hover:bg-surface-800/30 transition-colors"
          >
            <!-- User info -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center text-xs font-bold text-white shrink-0 relative">
                  {{ user.username[0]?.toUpperCase() }}
                  <span v-if="isPremium(user)" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border border-surface-900 flex items-center justify-center text-[8px] text-black font-extrabold" title="Premium Member">★</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="font-medium text-white truncate">{{ user.username }}</p>
                    <span v-if="isPremium(user)" class="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider shrink-0">Premium</span>
                  </div>
                  <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
                </div>
              </div>
            </td>

            <!-- Role -->
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" :class="roleBadge(user.role)">
                {{ user.role }}
              </span>
            </td>

            <!-- Status -->
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" :class="statusBadge(user.status)">
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDot(user.status)" />
                {{ user.status === 'PENDING_VERIFICATION' ? 'Pending' : user.status.toLowerCase() }}
              </span>
            </td>

            <!-- Last login -->
            <td class="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
              {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}
            </td>

            <!-- Created -->
            <td class="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
              {{ formatDate(user.createdAt) }}
            </td>

            <!-- Actions -->
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <NuxtLink :to="`/admin/users/${user.id}`" class="btn-ghost text-xs px-2 py-1">
                  Edit
                </NuxtLink>
                <button
                  class="text-xs px-2 py-1 rounded transition-colors"
                  :class="user.status === 'SUSPENDED' ? 'text-green-400 hover:bg-green-400/10' : 'text-yellow-400 hover:bg-yellow-400/10'"
                  @click="toggleSuspend(user)"
                >
                  {{ user.status === 'SUSPENDED' ? 'Activate' : 'Suspend' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div v-if="!loading && users.length === 0" class="py-12 text-center text-gray-600 text-sm">
        No users found
      </div>

      <!-- Load more -->
      <div v-if="nextCursor" class="border-t border-surface-700 px-4 py-3 flex justify-center">
        <button class="btn-secondary text-xs" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading...' : 'Load more' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface AdminUser {
  id: string
  email: string
  username: string
  role: string
  status: string
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  isPremium: boolean
  premiumExpiresAt: string | null
}

const filters = reactive({ q: '', role: '', status: '' })
const users = ref<AdminUser[]>([])
const total = ref(0)
const nextCursor = ref<string | null>(null)
const loading = ref(false)
const loadingMore = ref(false)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.role) params.set('role', filters.role)
    if (filters.status) params.set('status', filters.status)

    const res = await $fetch<{ data: AdminUser[]; meta: { total: number; nextCursor: string | null } }>(
      `/api/v1/admin/users?${params.toString()}`
    )
    users.value = res.data
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
    const res = await $fetch<{ data: AdminUser[]; meta: { nextCursor: string | null } }>(
      `/api/v1/admin/users?cursor=${nextCursor.value}`
    )
    users.value.push(...res.data)
    nextCursor.value = res.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}

async function toggleSuspend(user: AdminUser) {
  const newStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
  await $fetch(`/api/v1/admin/users/${user.id}`, {
    method: 'PATCH',
    body: { status: newStatus },
  })
  user.status = newStatus
}

const debouncedLoad = useDebounceFn(load, 300)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function roleBadge(role: string) {
  return {
    ADMIN: 'bg-primary-500/15 text-primary-400',
    MODERATOR: 'bg-blue-500/15 text-blue-400',
    USER: 'bg-gray-700 text-gray-400',
  }[role] ?? 'bg-gray-700 text-gray-400'
}

function statusBadge(status: string) {
  return {
    ACTIVE: 'bg-green-500/10 text-green-400',
    SUSPENDED: 'bg-red-500/10 text-red-400',
    PENDING_VERIFICATION: 'bg-yellow-500/10 text-yellow-400',
  }[status] ?? 'bg-gray-700 text-gray-400'
}

function statusDot(status: string) {
  return {
    ACTIVE: 'bg-green-400',
    SUSPENDED: 'bg-red-400',
    PENDING_VERIFICATION: 'bg-yellow-400',
  }[status] ?? 'bg-gray-400'
}

function isPremium(u: AdminUser) {
  if (u.role === 'ADMIN') return true
  if (!u.isPremium) return false
  if (!u.premiumExpiresAt) return true
  return new Date(u.premiumExpiresAt) > new Date()
}

onMounted(load)
</script>
