<template>
  <div class="min-h-screen flex bg-surface-950">
    <!-- Sidebar -->
    <aside class="w-56 shrink-0 border-r border-surface-700 flex flex-col bg-surface-900">
      <!-- Logo -->
      <div class="h-14 flex items-center px-4 border-b border-surface-700">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-primary-600 flex items-center justify-center">
            <span class="text-xs font-black text-white">AO</span>
          </div>
          <span class="text-sm font-bold text-white">Albion SilverMind</span>
        </NuxtLink>
        <span class="ml-auto text-xs text-primary-500 font-semibold">ADMIN</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 p-3 space-y-0.5 text-sm">
        <p class="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Overview</p>
        <AdminNavLink to="/admin" icon="grid" label="Dashboard" :exact="true" />

        <p class="px-3 py-2 mt-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Users</p>
        <AdminNavLink to="/admin/users" icon="users" label="Manage Users" />

        <p class="px-3 py-2 mt-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</p>
        <AdminNavLink to="/admin/data/imports" icon="download" label="Imports" />
        <AdminNavLink to="/admin/data/scheduler" icon="clock" label="Scheduler" />
        <AdminNavLink to="/admin/data/market" icon="chart" label="Market Prices" />
        <AdminNavLink to="/admin/data/system" icon="settings" label="System Config" />
        <AdminNavLink to="/admin/data/game-data" icon="database" label="Game Data" />
        <AdminNavLink to="/admin/data/database" icon="server" label="Database Stats" />
        <AdminNavLink to="/admin/data/discord" icon="message" label="Discord Bots" />

        <p class="px-3 py-2 mt-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Editorial</p>
        <AdminNavLink to="/admin/guides" icon="book" label="Manage Guides" />

        <p class="px-3 py-2 mt-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">System</p>
        <AdminNavLink to="/admin/settings" icon="settings" label="Global Settings" />
      </nav>

      <!-- User info bottom -->
      <div class="p-3 border-t border-surface-700">
        <div class="flex items-center gap-2 px-3 py-2">
          <div
            class="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center text-xs font-bold text-white">
            {{ auth.user.value?.username?.[0]?.toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-white truncate">{{ auth.user.value?.username }}</p>
            <p class="text-xs text-gray-500">{{ auth.user.value?.role }}</p>
          </div>
          <button class="text-gray-500 hover:text-gray-300 transition-colors" title="Logout" @click="auth.logout()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Content area -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 border-b border-surface-700 flex items-center px-6 bg-surface-900/50">
        <nav class="flex items-center gap-2 text-sm">
          <NuxtLink to="/admin" class="text-gray-400 hover:text-gray-200 transition-colors">Administration</NuxtLink>
          <template v-if="breadcrumb.length > 0">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"
              class="text-gray-600 shrink-0">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <template v-for="(crumb, i) in breadcrumb" :key="i">
              <NuxtLink v-if="crumb.to && i < breadcrumb.length - 1" :to="crumb.to"
                class="text-gray-400 hover:text-gray-200 transition-colors">{{ crumb.label }}</NuxtLink>
              <span v-else class="font-semibold text-white">{{ crumb.label }}</span>
              <svg v-if="i < breadcrumb.length - 1" viewBox="0 0 24 24" width="12" height="12" fill="none"
                stroke="currentColor" stroke-width="2" class="text-gray-600 shrink-0">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </template>
          </template>
          <template v-else>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"
              class="text-gray-600 shrink-0">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span class="font-semibold text-white">Dashboard</span>
          </template>
        </nav>
      </header>
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuth()
const route = useRoute()

interface Crumb { label: string; to?: string }

const breadcrumb = computed<Crumb[]>(() => {
  const p = route.path
  if (p === '/admin') return []
  if (p.startsWith('/admin/users/') && p !== '/admin/users') {
    return [{ label: 'Utilisateurs', to: '/admin/users' }, { label: 'Détail' }]
  }
  if (p === '/admin/users') return [{ label: 'Utilisateurs' }]
  if (p === '/admin/data/imports') return [{ label: 'Data' }, { label: 'Imports' }]
  if (p === '/admin/data/scheduler') return [{ label: 'Data' }, { label: 'Scheduler' }]
  if (p === '/admin/data/market') return [{ label: 'Data' }, { label: 'Market Prices' }]
  if (p === '/admin/data/system') return [{ label: 'Data' }, { label: 'System Config' }]
  if (p === '/admin/data/icons') return [{ label: 'Data' }, { label: 'Icons Sync' }]
  if (p === '/admin/data/discord') return [{ label: 'Data' }, { label: 'Discord Bots' }]
  if (p === '/admin/guides') return [{ label: 'Editorial' }, { label: 'Guides' }]
  if (p === '/admin/guides/editor') return [{ label: 'Editorial', to: '/admin/guides' }, { label: 'Éditeur de Guide' }]
  if (p === '/admin/settings') return [{ label: 'System' }, { label: 'Settings' }]
  return [{ label: p.split('/').pop() ?? '' }]
})
</script>
