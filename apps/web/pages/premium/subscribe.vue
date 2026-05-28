<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden">
    <!-- Starry background glows -->
    <div class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] animate-pulse shrink-0"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-600/10 blur-[120px] animate-pulse shrink-0" style="animation-delay: 2s;"></div>

    <div class="max-w-2xl w-full text-center relative z-10 space-y-8 py-12">
      <!-- Star header -->
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-3xl animate-bounce shadow-[0_0_20px_rgba(245,158,11,0.15)] shrink-0">
        ★
      </div>

      <!-- Main titles -->
      <div class="space-y-3">
        <span class="text-xs uppercase font-extrabold tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
          Espace Réservé
        </span>
        <h1 class="text-4xl sm:text-5xl font-black text-white leading-tight font-display tracking-tight">
          Rejoignez <span class="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">SilverMind Premium</span>
        </h1>
        <p class="text-gray-400 text-base max-w-lg mx-auto">
          Accédez à la suite d'outils d'analyses avancées d'Albion Online pour maximiser vos rendements et dominer le marché.
        </p>
      </div>

      <!-- Features grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left my-6">
        <div class="card p-5 border border-surface-700/30 bg-surface-900/60 backdrop-blur-md hover:border-amber-500/30 hover:bg-surface-800/40 transition-all duration-300 group">
          <div class="flex items-start gap-3">
            <span class="text-amber-500 text-lg group-hover:scale-110 transition-transform">📊</span>
            <div>
              <h3 class="font-bold text-sm text-white">Analyseur de Profits</h3>
              <p class="text-xs text-gray-500 mt-1">Évaluez instantanément les meilleures opportunités de raffinage et d'artisanat.</p>
            </div>
          </div>
        </div>

        <div class="card p-5 border border-surface-700/30 bg-surface-900/60 backdrop-blur-md hover:border-amber-500/30 hover:bg-surface-800/40 transition-all duration-300 group">
          <div class="flex items-start gap-3">
            <span class="text-amber-500 text-lg group-hover:scale-110 transition-transform">💰</span>
            <div>
              <h3 class="font-bold text-sm text-white">Market Flip Analyzer</h3>
              <p class="text-xs text-gray-500 mt-1">Repérez les anomalies de prix et achetez/revendez aux meilleurs marges.</p>
            </div>
          </div>
        </div>

        <div class="card p-5 border border-surface-700/30 bg-surface-900/60 backdrop-blur-md hover:border-amber-500/30 hover:bg-surface-800/40 transition-all duration-300 group">
          <div class="flex items-start gap-3">
            <span class="text-amber-500 text-lg group-hover:scale-110 transition-transform">⚒️</span>
            <div>
              <h3 class="font-bold text-sm text-white">Calculateur d'Artisanat</h3>
              <p class="text-xs text-gray-500 mt-1">Simulez vos coûts avec focalisation, taxes de villes et taux de retour.</p>
            </div>
          </div>
        </div>

        <div class="card p-5 border border-surface-700/30 bg-surface-900/60 backdrop-blur-md hover:border-amber-500/30 hover:bg-surface-800/40 transition-all duration-300 group">
          <div class="flex items-start gap-3">
            <span class="text-amber-500 text-lg group-hover:scale-110 transition-transform">🏝️</span>
            <div>
              <h3 class="font-bold text-sm text-white">Gestionnaire d'Îles</h3>
              <p class="text-xs text-gray-500 mt-1">Optimisez vos îles personnelles et de guilde pour générer des passifs.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Info gateway card -->
      <div class="card p-6 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm max-w-xl mx-auto space-y-4">
        <h2 class="text-lg font-black text-amber-400">
          ⚠️ Inscription indisponible
        </h2>
        <p class="text-sm text-gray-300 leading-relaxed">
          Les abonnements en ligne automatiques ne sont pas ouverts pour le moment. Pour activer ou prolonger votre grade premium, veuillez contacter directement **l'administration** de la plateforme.
        </p>
        <div class="pt-2">
          <NuxtLink to="/" class="btn-primary inline-flex items-center gap-2">
            <span>←</span> Retour à l'accueil
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Page de gateway d'abonnement premium
</script>

<style scoped>
.animate-pulse {
  animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.animate-bounce {
  animation: bounce 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(1.1); }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
