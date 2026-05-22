<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-white">Create account</h1>
      <p class="text-sm text-gray-400 mt-1">Join Albion SilverMind</p>
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="label" for="username">Username</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          class="input"
          placeholder="CoolCrafter"
          autocomplete="username"
          minlength="3"
          maxlength="32"
          required
        />
        <p class="text-xs text-gray-600 mt-1">Letters, numbers, _ and - only</p>
      </div>

      <div>
        <label class="label" for="email">Email</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="input"
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
      </div>

      <div>
        <label class="label" for="password">Password</label>
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

      <div
        v-if="success"
        class="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-md px-3 py-2"
      >
        Account created! You can now sign in.
      </div>

      <button
        type="submit"
        class="btn-primary w-full"
        :disabled="loading || success"
      >
        <span v-if="loading">Creating account...</span>
        <span v-else>Create Account</span>
      </button>
    </form>

    <p class="text-center text-sm text-gray-500 mt-6">
      Already have an account?
      <NuxtLink to="/auth/login" class="text-primary-400 hover:text-primary-300 font-medium">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuth()

const form = reactive({ username: '', email: '', password: '' })
const error = ref<string | null>(null)
const success = ref(false)
const loading = ref(false)

async function handleSubmit() {
  error.value = null
  loading.value = true

  const result = await auth.register(form.username, form.email, form.password)

  if (!result.success) {
    error.value = result.error
  } else {
    success.value = true
    setTimeout(() => navigateTo('/auth/login'), 2000)
  }

  loading.value = false
}
</script>
