<template>
  <div class="page">
    <div class="page-header">
      <div class="crumbs">
        <NuxtLink to="/">Accueil</NuxtLink>
        <span>·</span>
        <span>Killboard</span>
      </div>
      <h1 class="page-title">Killboard</h1>
      <p class="page-sub t-dim">Évènements PvP récents — Europe</p>
    </div>

    <div class="kb-toolbar">
      <PvpSearchBar />
    </div>

    <div class="panel parchment framed">
      <div class="panel-header">
        <h3>Kills récents</h3>
        <span class="t-dim t-mono" style="font-size:12px">{{ events.length }} évènements</span>
      </div>

      <div v-if="pending && !events.length" class="kb-skeleton">
        <div v-for="i in 10" :key="i" class="kb-skel-row" />
      </div>

      <div v-else-if="error && !events.length" class="kb-error t-danger">
        Impossible de charger le killboard. Réessaie dans un instant.
      </div>

      <div v-else class="pvp-feed">
        <KillEventRow v-for="ev in events" :key="ev.EventId" :event="ev" />
      </div>

      <div class="kb-footer">
        <button
          v-if="hasMore"
          class="ds-btn"
          :disabled="pending"
          @click="loadMore"
        >
          {{ pending ? 'Chargement…' : 'Charger plus' }}
        </button>
        <span v-else class="t-dim" style="font-size:12px">Fin des résultats</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Killboard — Albion SilverMind' })

const { events, pending, error, hasMore, loadMore } = usePvpEvents()
</script>

<style scoped>
.page-sub {
  font-size: 13px;
  margin-top: 4px;
}

.kb-toolbar {
  margin-bottom: 20px;
}

.pvp-feed {
  display: flex;
  flex-direction: column;
}

.kb-footer {
  display: flex;
  justify-content: center;
  padding: 16px;
  border-top: 1px solid var(--border-divider);
}

.kb-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.kb-skel-row {
  height: 56px;
  border-bottom: 1px solid var(--border-divider);
  background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.kb-error {
  padding: 24px 16px;
  text-align: center;
  font-size: 14px;
}
</style>
