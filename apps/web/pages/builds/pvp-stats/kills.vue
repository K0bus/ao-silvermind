<template>
  <div class="page pvp-kills-history-page">
    <!-- Breadcrumbs & Header -->
    <div class="page-header">
      <div>
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span class="sep">/</span>
          <NuxtLink to="/builds">Builds</NuxtLink>
          <span class="sep">/</span>
          <NuxtLink to="/builds/pvp-stats">Conseils PvP</NuxtLink>
          <span class="sep">/</span>
          <span>Historique des combats</span>
        </div>
        <h1>Historique des combats</h1>
        <p class="t-muted" style="margin-top:6px">
          Combats récents réussis et enregistrés en base de données pour cette configuration
        </p>
      </div>
    </div>

    <!-- Active Filter Summary Panel -->
    <div class="panel parchment framed filter-summary-panel animate-fade">
      <div class="summary-visual">
        <AoItemImage v-if="activeWeaponName" :unique-name="activeWeaponName" :display-name="activeWeaponLabel" />
        <span v-else class="summary-icon">⚔️</span>
      </div>
      <div class="summary-details">
        <span class="summary-category">{{ activeFamilyLabel }}</span>
        <h3>{{ activeWeaponLabel }}</h3>
        <div class="summary-meta-badges">
          <span class="meta-badge gameplay t-gold-dim">
            👥 Mode: {{ gameplayModeLabel }}
          </span>
          <span class="meta-badge count">
            📊 {{ kills.length }} combats affichés
          </span>
        </div>
      </div>
      <NuxtLink
        :to="{ path: '/builds/pvp-stats', query: { weaponFamily: route.query.weaponFamily, weaponId: route.query.weaponId, gameplayType: route.query.gameplayType } }"
        class="ds-btn secondary back-btn"
      >
        ← Retour aux Statistiques
      </NuxtLink>
    </div>

    <!-- Main Content List -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement de l'historique des combats…</p>
    </div>

    <div v-else-if="kills.length === 0" class="panel parchment empty-state animate-fade">
      <div class="es-icon t-gold">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3>Aucun combat trouvé</h3>
      <p class="t-muted" style="max-width: 480px; margin: 6px auto 16px;">
        Aucun combat récent n'a été enregistré en base de données avec cette arme et ces critères de filtrage.
      </p>
      <NuxtLink :to="{ path: '/builds/pvp-stats', query: { weaponFamily: route.query.weaponFamily, weaponId: route.query.weaponId } }" class="ds-btn primary">
        Retourner aux conseils PvP
      </NuxtLink>
    </div>

    <div v-else class="panel parchment framed kills-list-container animate-fade">
      <div class="panel-header">
        <h3>⚔️ combats récents réussis (Killer)</h3>
      </div>
      <div class="panel-body list-body">
        <div class="kills-list">
          <KillEventRow
            v-for="kill in kills"
            :key="kill.EventId"
            :event="kill"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KillEvent } from '@albion-tool/types'
import type { BuildTaxonomyResponse } from '~/utils/buildTaxonomy'

definePageMeta({ layout: 'default' })
useHead({ title: 'Historique des Combats PvP — Albion SilverMind' })

const route = useRoute()
const loading = ref(true)
const kills = ref<KillEvent[]>([])
const weaponNameMap = ref<Record<string, string>>({})

// Fetch Taxonomy to resolve Weapon Family label
const { data: taxonomyData } = await useFetch<{ data: BuildTaxonomyResponse }>('/api/v1/build-taxonomy')
const weaponFamilies = computed(() => taxonomyData.value?.data?.slots.weapon.families ?? [])

const activeFamilyLabel = computed(() => {
  const family = route.query.weaponFamily
  if (!family || typeof family !== 'string') return 'Arme Inconnue'
  return weaponFamilies.value.find((f) => f.value === family)?.label ?? family
})

const activeWeaponName = computed(() => {
  const wpnId = route.query.weaponId
  return typeof wpnId === 'string' && wpnId.trim().length > 0 ? wpnId : null
})

const activeWeaponLabel = ref('Toute la famille')

// Gameplay Mode helper labels
const GAMEPLAY_LABELS: Record<string, string> = {
  ALL: 'Tous les modes',
  SOLO: 'Solo (1v1)',
  DUO: 'Duo (2v2)',
  TRIO: 'Trio (3v3)',
  SMALL_SCALE: 'Groupe (4-9 assists)',
  ZERG: 'Zerg (10+ assists)',
}
const gameplayModeLabel = computed(() => {
  const mode = route.query.gameplayType
  if (typeof mode !== 'string') return GAMEPLAY_LABELS.ALL
  return GAMEPLAY_LABELS[mode] ?? GAMEPLAY_LABELS.ALL
})

// Fetch kills on mount
onMounted(async () => {
  loading.value = true
  try {
    // 1. Fetch combat events for this weapon
    const res = await $fetch<{ data: KillEvent[] }>('/api/v1/builds/pvp-kills', {
      query: {
        weaponFamily: route.query.weaponFamily || undefined,
        weaponId: route.query.weaponId || undefined,
        gameplayType: route.query.gameplayType || undefined,
        limit: 50,
      },
    })
    kills.value = res.data ?? []

    // 2. Fetch specific weapon name from localized API if weaponId is selected
    if (activeWeaponName.value) {
      try {
        const itemRes = await $fetch<{ data: any }>(`/api/v1/items/${activeWeaponName.value}`)
        if (itemRes?.data?.name) {
          activeWeaponLabel.value = itemRes.data.name
        }
      } catch (err) {
        console.error('Failed to load item label:', err)
      }
    }
  } catch (err) {
    console.error('Failed to load PvP combats list:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
}

.filter-summary-panel {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  margin-bottom: 24px;
  background: rgba(201, 161, 74, 0.02);
  border-color: rgba(201, 161, 74, 0.15);
}

.summary-visual {
  width: 64px;
  height: 64px;
  border-radius: var(--radius);
  background: var(--bg-1);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.summary-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-icon {
  font-size: 28px;
}

.summary-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex-grow: 1;
}

.summary-category {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--gold);
}

.summary-details h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-0);
  margin-top: 4px;
}

.summary-meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.meta-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-1);
}

.meta-badge.gameplay {
  border-color: rgba(201, 161, 74, 0.18);
  background: rgba(201, 161, 74, 0.04);
}

.back-btn {
  height: 38px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(201, 161, 74, 0.15);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  border-radius: var(--radius-lg);
}

.es-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bg-2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--text-3);
  border: 1px solid var(--border);
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}

.kills-list-container {
  padding: 0;
}

.list-body {
  padding: 0;
}

.kills-list {
  display: flex;
  flex-direction: column;
}

.animate-fade {
  animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .filter-summary-panel {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .back-btn {
    width: 100%;
    text-align: center;
    justify-content: center;
  }
}
</style>
