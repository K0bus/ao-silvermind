<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-white">Initial setup</h1>
      <p class="text-sm text-gray-400 mt-1">
        Create the first administrator account and initialize system settings.
      </p>
    </div>

    <div
      v-if="status && !status.installed"
      class="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2 mb-4"
    >
      Missing:
      {{ !status.hasAdmin ? 'administrator account' : '' }}{{ !status.hasAdmin && !status.hasSystemConfig ? ' and ' : '' }}{{ !status.hasSystemConfig ? 'system settings' : '' }}
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="label" for="username">Admin username</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          class="input"
          placeholder="admin"
          autocomplete="username"
          minlength="3"
          maxlength="32"
          required
        />
      </div>

      <div>
        <label class="label" for="email">Admin email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="input"
          placeholder="admin@example.com"
          autocomplete="email"
          required
        />
      </div>

      <div>
        <label class="label" for="password">Admin password</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          class="input"
          placeholder="Min. 8 characters"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </div>

      <div
        v-if="error"
        class="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2"
      >
        {{ error }}
      </div>

      <button
        type="submit"
        class="btn-primary w-full"
        :disabled="loading"
      >
        <span v-if="loading">Installing...</span>
        <span v-else>Complete installation</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

type InstallationStatus = {
  installed: boolean
  hasAdmin: boolean
  hasSystemConfig: boolean
}

const auth = useAuth()
const installState = useState<InstallationStatus | null>('install.status', () => null)
const form = reactive({ username: 'admin', email: '', password: '' })
const error = ref<string | null>(null)
const loading = ref(false)

const { data: statusData } = await useFetch<{ data: InstallationStatus }>('/api/v1/install/status')
const status = computed(() => statusData.value?.data ?? installState.value)

if (status.value) {
  installState.value = status.value
}

async function handleSubmit() {
  error.value = null
  loading.value = true

  try {
    const res = await $fetch<{ data: { id: string; email: string; username: string; role: 'ADMIN'; status: 'ACTIVE'; isPremium: boolean; premiumExpiresAt: string | null } }>('/api/v1/install/bootstrap', {
      method: 'POST',
      body: form,
    })

    auth.setUser(res.data)
    installState.value = {
      installed: true,
      hasAdmin: true,
      hasSystemConfig: true,
    }

    await navigateTo('/admin')
  } catch (err: unknown) {
    error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Installation failed'
  } finally {
    loading.value = false
  }
}
</script>
