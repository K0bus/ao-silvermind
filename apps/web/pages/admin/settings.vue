<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">System Settings</h1>
      <p class="page-subtitle">Configure global application parameters</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <!-- Notifications Section -->
        <div class="card p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold">Notifications</h2>
              <p class="text-sm text-gray-500">Configure where to receive system alerts</p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="label">Discord Webhook URL (System)</label>
              <div class="flex gap-2">
                <input 
                  v-model="settings.discord_webhook_url" 
                  type="password" 
                  class="input flex-1 font-mono text-xs" 
                  placeholder="https://discord.com/api/webhooks/..." 
                />
                <button 
                  class="btn-secondary px-3" 
                  type="button"
                  @click="toggleVisibility($event)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <p class="mt-1 text-[10px] text-gray-500">
                Used for worker completion summaries and critical errors.
              </p>
            </div>

            <div>
              <label class="label">Discord Webhook URL (Market Highlights)</label>
              <div class="flex gap-2">
                <input 
                  v-model="settings.discord_market_highlight_webhook_url" 
                  type="password" 
                  class="input flex-1 font-mono text-xs" 
                  placeholder="https://discord.com/api/webhooks/..." 
                />
                <button 
                  class="btn-secondary px-3" 
                  type="button"
                  @click="toggleVisibility($event)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <p class="mt-1 text-[10px] text-gray-500">
                Used to announce top profit opportunities after each market sync.
              </p>
            </div>

            <div>
              <label class="label">Public App URL</label>
              <input 
                v-model="settings.public_app_url" 
                type="text" 
                class="input font-mono text-xs" 
                placeholder="https://albion-silvermind.com" 
              />
              <p class="mt-1 text-[10px] text-gray-500">
                Used to generate absolute links in notifications.
              </p>
            </div>

            <div>
              <label class="label">Global Embed Image URL</label>
              <input 
                v-model="settings.discord_embed_image_url" 
                type="text" 
                class="input font-mono text-xs" 
                placeholder="https://example.com/image.png" 
              />
              <p class="mt-1 text-[10px] text-gray-500">
                Optional image displayed at the bottom of all Discord notifications.
              </p>
            </div>
          </div>
        </div>

        <!-- Premium Access Control Section -->
        <div class="card p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold">Premium Access Control</h2>
              <p class="text-sm text-gray-500">Configure which features require a Premium Membership</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 rounded bg-surface-800/40 border border-surface-700/30">
              <div>
                <span class="text-sm font-semibold text-white block">Profit Analysis (/items/profit)</span>
                <span class="text-xs text-gray-500">Enable premium restriction on profit analysis tool.</span>
              </div>
              <input v-model="settings.premium_lock_items_profit" type="checkbox" class="text-amber-500 rounded border-gray-600 focus:ring-amber-500 bg-surface-800" />
            </div>

            <div class="flex items-center justify-between p-3 rounded bg-surface-800/40 border border-surface-700/30">
              <div>
                <span class="text-sm font-semibold text-white block">Crafting Calculator (/crafting)</span>
                <span class="text-xs text-gray-500">Enable premium restriction on crafting calculation tool.</span>
              </div>
              <input v-model="settings.premium_lock_crafting" type="checkbox" class="text-amber-500 rounded border-gray-600 focus:ring-amber-500 bg-surface-800" />
            </div>

            <div class="flex items-center justify-between p-3 rounded bg-surface-800/40 border border-surface-700/30">
              <div>
                <span class="text-sm font-semibold text-white block">Item Flipping (/items/flip)</span>
                <span class="text-xs text-gray-500">Enable premium restriction on item flipping analyzer.</span>
              </div>
              <input v-model="settings.premium_lock_items_flip" type="checkbox" class="text-amber-500 rounded border-gray-600 focus:ring-amber-500 bg-surface-800" />
            </div>

            <div class="flex items-center justify-between p-3 rounded bg-surface-800/40 border border-surface-700/30">
              <div>
                <span class="text-sm font-semibold text-white block">Market Prices (/market)</span>
                <span class="text-xs text-gray-500">Enable premium restriction on market price monitoring.</span>
              </div>
              <input v-model="settings.premium_lock_market" type="checkbox" class="text-amber-500 rounded border-gray-600 focus:ring-amber-500 bg-surface-800" />
            </div>

            <div class="flex items-center justify-between p-3 rounded bg-surface-800/40 border border-surface-700/30">
              <div>
                <span class="text-sm font-semibold text-white block">Islands Manager (/islands)</span>
                <span class="text-xs text-gray-500">Enable premium restriction on personal and guild islands tracking.</span>
              </div>
              <input v-model="settings.premium_lock_islands" type="checkbox" class="text-amber-500 rounded border-gray-600 focus:ring-amber-500 bg-surface-800" />
            </div>
          </div>
        </div>

        <!-- General Info Card -->
        <div class="card p-6 opacity-60">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center text-gray-400">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold">Maintenance Mode</h2>
              <p class="text-sm text-gray-500 text-yellow-500/80 italic">Coming Soon</p>
            </div>
          </div>
          <p class="text-sm text-gray-500">
            Allow disabling public access while performing heavy data updates.
          </p>
        </div>
      </div>

      <!-- Action Sidebar -->
      <div class="space-y-6">
        <div class="card p-6">
          <h3 class="font-bold mb-4">Actions</h3>
          <button 
            class="btn-primary w-full justify-center" 
            :disabled="saving || loading"
            @click="saveSettings"
          >
            {{ saving ? 'Saving Changes...' : 'Save Settings' }}
          </button>
          
          <div v-if="lastSaved" class="mt-4 text-center">
            <p class="text-[10px] text-gray-500">Last saved: {{ lastSaved }}</p>
          </div>
        </div>

        <div class="card p-6 border-red-500/20">
          <h3 class="font-bold text-red-400 mb-4">System Cache</h3>
          <p class="text-xs text-gray-500 mb-4">
            Clear all application cache, including Redis and Nuxt SSR cache.
          </p>
          <button class="ds-btn ghost danger sm w-full">Purge All Cache</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const settings = ref<Record<string, any>>({
  discord_webhook_url: '',
  discord_market_highlight_webhook_url: '',
  discord_embed_image_url: '',
  public_app_url: '',
  premium_lock_items_profit: false,
  premium_lock_crafting: false,
  premium_lock_items_flip: false,
  premium_lock_market: false,
  premium_lock_islands: false
})

const loading = ref(false)
const saving = ref(false)
const lastSaved = ref<string | null>(null)

async function loadSettings() {
  loading.value = true
  try {
    const res = await $fetch<{ data: any }>('/api/v1/admin/settings')
    settings.value = { ...settings.value, ...res.data }
  } catch (err) {
    console.error('Failed to load settings', err)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await $fetch('/api/v1/admin/settings', {
      method: 'PATCH',
      body: settings.value
    })
    lastSaved.value = new Date().toLocaleTimeString()
  } catch (err: any) {
    alert(err?.data?.message ?? 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

function toggleVisibility(e: Event) {
  const input = (e.currentTarget as HTMLElement).previousElementSibling as HTMLInputElement
  input.type = input.type === 'password' ? 'text' : 'password'
}

onMounted(loadSettings)
</script>
