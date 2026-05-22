<template>
  <div class="min-h-screen bg-surface-950 flex items-center justify-center p-4">
    <!-- Subtle background grid -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

    <div class="relative w-full max-w-md">
      <!-- Logo centered -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center shadow-glow">
            <span class="text-sm font-black text-white">AO</span>
          </div>
          <span class="text-xl font-bold text-white">Albion SilverMind</span>
        </NuxtLink>
      </div>

      <!-- Card -->
      <div class="card p-6 sm:p-8">
        <slot />
      </div>
    </div>
  </div>
</template>
