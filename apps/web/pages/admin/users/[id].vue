<template>
  <div>
    <div class="page-header flex items-center gap-4">
      <NuxtLink to="/admin/users" class="btn-ghost text-xs px-2 py-1">
        ← Users
      </NuxtLink>
      <div>
        <h1 class="page-title">{{ user?.username ?? 'User Detail' }}</h1>
        <p v-if="user" class="page-subtitle">{{ user.email }}</p>
      </div>
    </div>

    <div v-if="pending" class="animate-pulse space-y-4">
      <div class="card p-6 h-40" />
      <div class="card p-6 h-32" />
    </div>

    <div v-else-if="user" class="grid gap-4 lg:grid-cols-3">
      <!-- Main info -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-4">Account Information</h2>
          <dl class="space-y-3">
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">ID</dt>
              <dd class="text-gray-200 font-mono text-xs">{{ user.id }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Username</dt>
              <dd class="text-white font-medium">{{ user.username }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Email</dt>
              <dd class="text-gray-200">{{ user.email }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Email verified</dt>
              <dd>
                <span :class="user.emailVerified ? 'text-green-400' : 'text-red-400'">
                  {{ user.emailVerified ? 'Yes' : 'No' }}
                </span>
              </dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Last login</dt>
              <dd class="text-gray-200">{{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Last IP</dt>
              <dd class="text-gray-400 font-mono text-xs">{{ user.lastLoginIp ?? '—' }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Joined</dt>
              <dd class="text-gray-200">{{ formatDate(user.createdAt) }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500">Active sessions</dt>
              <dd class="text-gray-200">{{ user._count?.sessions ?? 0 }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Actions sidebar -->
      <div class="space-y-4">
        <!-- Role -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-3">Role</h2>
          <div class="space-y-2">
            <label
              v-for="role in ['USER', 'MODERATOR', 'ADMIN']"
              :key="role"
              class="flex items-center gap-2.5 p-2.5 rounded cursor-pointer hover:bg-surface-800 transition-colors"
              :class="{ 'bg-surface-700': form.role === role }"
            >
              <input v-model="form.role" type="radio" :value="role" class="text-primary-500" />
              <span class="text-sm text-gray-200">{{ role }}</span>
            </label>
          </div>
        </div>

        <!-- Status -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-3">Status</h2>
          <div class="space-y-2">
            <label
              v-for="status in ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']"
              :key="status"
              class="flex items-center gap-2.5 p-2.5 rounded cursor-pointer hover:bg-surface-800 transition-colors"
              :class="{ 'bg-surface-700': form.status === status }"
            >
              <input v-model="form.status" type="radio" :value="status" class="text-primary-500" />
              <span class="text-sm text-gray-200">{{ status }}</span>
            </label>
          </div>
        </div>

        <!-- Premium Status -->
        <div class="card p-5">
          <h2 class="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <span>★</span> Premium Membership
          </h2>
          <div class="space-y-4">
            <label class="flex items-center gap-2.5 p-2 rounded cursor-pointer hover:bg-surface-800 transition-colors">
              <input v-model="form.isPremium" type="checkbox" class="text-primary-500 rounded border-gray-600 focus:ring-primary-500 bg-surface-800" />
              <span class="text-sm text-gray-200 font-medium">Premium Grade Active</span>
            </label>

            <div v-if="form.isPremium" class="space-y-3 pt-3 border-t border-surface-800">
              <label class="flex items-center gap-2.5 p-2 rounded cursor-pointer hover:bg-surface-800 transition-colors">
                <input v-model="form.hasExpiration" type="checkbox" class="text-primary-500 rounded border-gray-600 focus:ring-primary-500 bg-surface-800" />
                <span class="text-sm text-gray-200">Limited Duration</span>
              </label>

              <div v-if="form.hasExpiration" class="space-y-1">
                <span class="text-xs text-gray-500">Expiration Date</span>
                <input
                  v-model="form.premiumExpiresAt"
                  type="datetime-local"
                  class="input w-full text-sm bg-surface-800 text-white border-gray-700 focus:border-amber-500"
                />
              </div>
              <div v-else class="text-xs text-green-400/80 bg-green-400/5 rounded px-2.5 py-1.5 border border-green-500/10">
                Premium grade is permanent (no expiration).
              </div>
            </div>
          </div>
        </div>

        <!-- Save -->
        <div class="space-y-2">
          <button
            class="btn-primary w-full"
            :disabled="saving || !isDirty"
            @click="save"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>

          <div v-if="saved" class="text-xs text-green-400 text-center py-1">
            Changes saved successfully
          </div>

          <div
            v-if="saveError"
            class="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2"
          >
            {{ saveError }}
          </div>
        </div>

        <!-- Danger zone -->
        <div class="card p-5 border-red-600/20">
          <h2 class="text-sm font-semibold text-red-400 mb-3">Danger Zone</h2>
          <button
            class="btn-danger w-full text-sm"
            @click="confirmDelete"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const userId = route.params.id as string

interface UserDetail {
  id: string
  email: string
  username: string
  role: string
  status: string
  emailVerified: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  createdAt: string
  updatedAt: string
  isPremium: boolean
  premiumExpiresAt: string | null
  _count: { sessions: number; importJobs: number }
}

const { data, pending, refresh } = await useFetch<{ data: UserDetail }>(`/api/v1/admin/users/${userId}`)
const user = computed(() => data.value?.data ?? null)

const form = reactive({
  role: '',
  status: '',
  isPremium: false,
  hasExpiration: false,
  premiumExpiresAt: ''
})
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

function toLocalDatetimeString(dateInput: Date | string) {
  const d = new Date(dateInput)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

watch(user, (v) => {
  if (v) {
    form.role = v.role
    form.status = v.status
    form.isPremium = v.isPremium
    form.hasExpiration = !!v.premiumExpiresAt
    form.premiumExpiresAt = v.premiumExpiresAt
      ? toLocalDatetimeString(v.premiumExpiresAt)
      : ''
  }
}, { immediate: true })

watch(() => form.hasExpiration, (newVal) => {
  if (newVal && !form.premiumExpiresAt) {
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    form.premiumExpiresAt = toLocalDatetimeString(thirtyDaysLater)
  }
})

const isDirty = computed(() => {
  if (!user.value) return false
  
  const dbExpiresAt = user.value.premiumExpiresAt
    ? toLocalDatetimeString(user.value.premiumExpiresAt)
    : ''
  const formExpiresAt = form.hasExpiration && form.premiumExpiresAt ? form.premiumExpiresAt : ''

  return (
    form.role !== user.value.role ||
    form.status !== user.value.status ||
    form.isPremium !== user.value.isPremium ||
    (form.isPremium && formExpiresAt !== dbExpiresAt)
  )
})

async function save() {
  if (!isDirty.value || !user.value) return
  saving.value = true
  saved.value = false
  saveError.value = null

  try {
    const updates: Record<string, any> = {}
    if (form.role !== user.value.role) updates.role = form.role
    if (form.status !== user.value.status) updates.status = form.status
    
    // Check if premium status changed
    if (form.isPremium !== user.value.isPremium) {
      updates.isPremium = form.isPremium
    }

    // Check if premium expiration changed
    if (form.isPremium) {
      const dbExpiresAt = user.value.premiumExpiresAt
        ? toLocalDatetimeString(user.value.premiumExpiresAt)
        : ''
      const formExpiresAt = form.hasExpiration && form.premiumExpiresAt ? form.premiumExpiresAt : ''
      if (formExpiresAt !== dbExpiresAt) {
        updates.premiumExpiresAt = form.hasExpiration && form.premiumExpiresAt
          ? new Date(form.premiumExpiresAt).toISOString()
          : null
      }
    } else if (user.value.isPremium) {
      // If turning premium off, make sure to reset expiration
      updates.premiumExpiresAt = null
    }

    await $fetch(`/api/v1/admin/users/${userId}`, { method: 'PATCH', body: updates })
    await refresh()
    
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
  } catch (err: any) {
    saveError.value = err?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!user.value) return
  if (!confirm(`Delete account "${user.value.username}"? This cannot be undone.`)) return

  await $fetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE' })
  await navigateTo('/admin/users')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>
