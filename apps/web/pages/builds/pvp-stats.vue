<template>
  <div class="page">
    <!-- Breadcrumbs & Header -->
    <div class="page-header">
      <div>
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span class="sep">/</span>
          <NuxtLink to="/builds">Builds</NuxtLink>
          <span class="sep">/</span>
          <span>Conseils PvP</span>
        </div>
        <h1>Statistiques & Conseils PvP</h1>
        <p class="t-muted" style="margin-top:6px">
          Équipement recommandé basé sur les combats récents et réussis du killboard
        </p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="build-tabs">
      <NuxtLink to="/builds" class="tab-link">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
        Builds Publics
      </NuxtLink>
      <NuxtLink to="/builds/pvp-stats" class="tab-link active">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Conseils & Stats PvP
      </NuxtLink>
    </div>

    <!-- Top Grid Layout: Filters & Meta Weapons -->
    <div class="stats-top-row">
      <!-- Left: Filters Panel -->
      <div class="panel parchment framed filter-panel">
        <div class="filter-row">
          <!-- Weapon Family -->
          <div class="filter-col">
            <label class="filter-label">1. Famille d'armes</label>
            <select v-model="selectedFamily" class="ds-select">
              <option value="">Sélectionnez une famille</option>
              <option v-for="fam in weaponFamilies" :key="fam.value" :value="fam.value">
                {{ fam.label }}
              </option>
            </select>
          </div>

          <!-- Gameplay Size -->
          <div class="filter-col">
            <label class="filter-label">2. Mode / Gameplay PvP</label>
            <div class="gameplay-group">
              <button
                v-for="mode in GAMEPLAY_MODES"
                :key="mode.value"
                type="button"
                class="gameplay-btn"
                :class="{ active: selectedGameplay === mode.value }"
                @click="selectedGameplay = mode.value"
              >
                <span class="g-lbl">{{ mode.label }}</span>
                <span class="g-desc">{{ mode.desc }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Specific Weapon Drilldown -->
        <div v-if="selectedFamily && weapons.length > 0" class="drilldown-row animate-fade">
          <label class="filter-label">Affiner par arme spécifique (optionnel)</label>
          <div class="weapon-chips">
            <button
              type="button"
              class="weapon-chip"
              :class="{ active: !selectedWeaponId }"
              @click="selectedWeaponId = ''"
            >
              Toute la famille
            </button>
            <button
              v-for="wpn in weapons"
              :key="wpn.uniqueName"
              type="button"
              class="weapon-chip"
              :class="{ active: selectedWeaponId === wpn.uniqueName }"
              @click="selectedWeaponId = wpn.uniqueName"
            >
              <div class="chip-img-container">
                <AoItemImage :unique-name="wpn.uniqueName" :display-name="wpn.name" />
              </div>
              <span>{{ wpn.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Meta Weapons Panel -->
      <div class="panel parchment framed meta-weapons-panel">
        <div class="mw-header">
          <h3>🔥 Top Armes & Winrates</h3>
          <span class="mw-sub t-muted">Classement par popularité</span>
        </div>
        <div v-if="topWeapons.length === 0" class="mw-empty">
          <span class="empty-dot">·</span>
          <span>Données de méta indisponibles</span>
        </div>
        <div v-else class="meta-weapons-list">
          <div
            v-for="wpn in topWeapons.slice(0, 5)"
            :key="wpn.uniqueName"
            class="meta-weapon-row clickable"
            :class="{ 'active-filter': selectedWeaponId === wpn.uniqueName }"
            role="button"
            tabindex="0"
            title="Cliquer pour filtrer sur cette arme"
            @click="selectMetaWeapon(wpn)"
            @keydown.enter="selectMetaWeapon(wpn)"
          >
            <div class="mw-img">
              <AoItemImage :unique-name="wpn.uniqueName" :display-name="wpn.displayName" />
            </div>
            <div class="mw-info">
              <span class="mw-name">{{ wpn.displayName }}</span>
              <div class="mw-stats-row">
                <span class="mw-count t-mono">{{ wpn.total }} combats</span>
                <span class="mw-wins-badge t-mono">{{ wpn.wins }} W</span>
              </div>
            </div>
            <span class="mw-winrate" :class="getWinrateClass(wpn.winrate)">
              {{ wpn.winrate }}% WR
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Results Block -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Calcul des statistiques en cours…</p>
    </div>

    <div v-else-if="!selectedFamily" class="panel empty-state select-prompt animate-fade">
      <div class="es-icon">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
      </div>
      <h3>Sélectionnez une famille d'armes</h3>
      <p class="t-muted">Choisissez une famille ci-dessus pour découvrir les équipements de combat les plus efficaces.</p>
    </div>

    <div v-else-if="totalKills === 0" class="panel parchment empty-state data-empty animate-fade">
      <div class="es-icon t-gold">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3>Données insuffisantes</h3>
      <p class="t-muted" style="max-width: 480px; margin: 6px auto 12px;">
        Nous n'avons pas encore enregistré assez de combats réussis dans notre base de données pour cette arme et ce mode.
      </p>
      <div class="actions">
        <NuxtLink to="/killboard" class="ds-btn primary">
          Visiter le Killboard pour importer des données
        </NuxtLink>
      </div>
    </div>

    <div v-else class="results-dashboard animate-fade">
      <!-- Summary stats bar -->
      <div class="summary-bar">
        <span class="s-combat-count">
          📊 Analyse de <strong>{{ totalKills }}</strong> combats récents
        </span>
      </div>

      <!-- Warning and Fallback Banners -->
      <div class="banners-container">
        <!-- Specific Weapon Fallback -->
        <div v-if="statsData.isFallbackToFamily" class="banner-box info animate-fade">
          <span class="banner-icon">ℹ️</span>
          <div class="banner-text">
            <strong>Données spécifiques insuffisantes</strong>
            <p>
              Nous n'avons aucun combat enregistré pour cette arme spécifique. Affichage des statistiques globales pour la famille d'armes <strong>{{ activeFamilyLabel }}</strong>.
            </p>
          </div>
        </div>

        <!-- Low volume data warning -->
        <div v-if="totalKills > 0 && totalKills < 20" class="banner-box warning animate-fade">
          <span class="banner-icon">⚠️</span>
          <div class="banner-text">
            <strong>Données indicatives (échantillon réduit)</strong>
            <p>
              Ces statistiques sont basées sur seulement {{ totalKills }} combats récents. Les recommandations ci-dessous sont fournies à titre indicatif et peuvent être partielles.
            </p>
          </div>
        </div>
      </div>

      <!-- Equipment Recommendation Grid -->
      <!-- Equipment Recommendation Grid: In-game 3x3 layout & side stats panel -->
      <div class="pvp-dashboard-layout">
        <!-- Left Column: 3x3 silhouette character equipment grid -->
        <div class="character-preview-pane animate-fade">
          <div class="panel parchment framed character-card">
            <div class="panel-header">
              <h3>👤 Silhouette d'Équipement</h3>
            </div>
            <div class="panel-body character-body-container">
              <div class="equipment-grid-3x3">
                <div
                  v-for="(column, columnIndex) in SLOT_COLUMNS"
                  :key="`col-${columnIndex}`"
                  class="eq-column"
                  :class="{ center: columnIndex === 1 }"
                >
                  <div
                    v-for="slotKey in column"
                    :key="slotKey"
                    class="eq-slot-interactive"
                    :class="[
                      {
                        filled: !!getTopItemForSlot(slotKey),
                        active: activeSlot === slotKey,
                        disabled: slotKey === 'OffHand' && isTwoHanded,
                        'non-selectable': slotKey === 'Bag'
                      }
                    ]"
                    @click="onSlotClick(slotKey)"
                  >
                    <!-- Slot Tier Label -->
                    <div v-if="getTopItemForSlot(slotKey) && slotKey !== 'MainHand'" class="eq-slot-tier">
                      {{ getItemTierLabel(getTopItemForSlot(slotKey).uniqueName) }}
                    </div>

                    <!-- Slot Icon/Image -->
                    <div class="eq-slot-icon">
                      <AoItemImage
                        v-if="getTopItemForSlot(slotKey)"
                        :unique-name="getTopItemForSlot(slotKey).uniqueName"
                        :display-name="getTopItemForSlot(slotKey).displayName"
                      />
                      <span v-else class="eq-slot-empty">
                        {{ slotKey === 'Bag' ? '🎒' : slotKey === 'OffHand' && isTwoHanded ? '🔒' : '·' }}
                      </span>
                    </div>

                    <!-- Slot Label -->
                    <span class="eq-slot-label">
                      {{ getTopItemForSlot(slotKey) ? getTopItemForSlot(slotKey).displayName : SLOT_LABELS[slotKey] }}
                    </span>

                    <!-- Percentage Badge -->
                    <div v-if="getTopItemForSlot(slotKey) && slotKey !== 'MainHand' && slotKey !== 'Bag'" class="eq-slot-percentage">
                      {{ getTopItemForSlot(slotKey).percentage }}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons Row -->
          <div class="character-action-buttons">
            <button class="ds-btn primary gold-cta-btn" @click="openInBuilder">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
              Ouvrir dans le Build Creator
            </button>
            <NuxtLink
              :to="{ path: '/builds/pvp-stats/kills', query: { weaponFamily: selectedFamily, weaponId: selectedWeaponId || undefined, gameplayType: selectedGameplay } }"
              class="ds-btn secondary history-cta-btn"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Historique des combats
            </NuxtLink>
          </div>
        </div>

        <!-- Right Column: Interactive Details Panel -->
        <div class="slot-details-pane animate-fade">
          <div class="panel parchment framed details-card">
            <div class="panel-header">
              <h3>
                <span class="details-slot-icon">{{ SLOT_ICONS[activeSlot] }}</span>
                Détails : {{ SLOT_LABELS[activeSlot] }}
              </h3>
            </div>
            <div class="panel-body">
              <div v-if="activeSlot === 'OffHand' && isTwoHanded" class="details-locked-state">
                <span class="lock-icon">🔒</span>
                <h4>Main secondaire indisponible</h4>
                <p class="t-muted">L'arme principale actuellement équipée est une arme à deux mains.</p>
              </div>
              <div v-else-if="statsData.slots[activeSlot] && statsData.slots[activeSlot].length > 0" class="details-active-content">
                <!-- #1 Recommended Item Card -->
                <div class="details-top-card">
                  <div class="top-item-visual">
                    <AoItemImage
                      :unique-name="statsData.slots[activeSlot][0].uniqueName"
                      :display-name="statsData.slots[activeSlot][0].displayName"
                    />
                    <span class="usage-percentage">{{ statsData.slots[activeSlot][0].percentage }}%</span>
                  </div>
                  <div class="top-item-info">
                    <span class="item-rank">#1 Recommandé</span>
                    <span class="item-name">{{ statsData.slots[activeSlot][0].displayName }}</span>
                    <span class="item-count">{{ statsData.slots[activeSlot][0].count }} victoires</span>
                  </div>
                </div>

                <!-- Progress bar -->
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" :style="{ width: `${statsData.slots[activeSlot][0].percentage}%` }"></div>
                </div>

                <!-- Alternatives List -->
                <div v-if="statsData.slots[activeSlot].length > 1" class="alternatives-section">
                  <span class="section-title">Alternatives populaires</span>
                  <div class="alt-list">
                    <div
                      v-for="(alt, idx) in statsData.slots[activeSlot].slice(1)"
                      :key="alt.uniqueName"
                      class="alt-row"
                    >
                      <div class="alt-item-img">
                        <AoItemImage :unique-name="alt.uniqueName" :display-name="alt.displayName" />
                      </div>
                      <div class="alt-item-details">
                        <span class="alt-name">#{{ idx + 2 }} {{ alt.displayName }}</span>
                        <span class="alt-percentage">{{ alt.percentage }}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty recommendation state -->
              <div v-else class="details-empty-state">
                <span class="empty-dot">·</span>
                <span class="empty-text">Aucune recommandation dominante pour ce slot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BuildTaxonomyResponse } from '~/utils/buildTaxonomy'

definePageMeta({ layout: 'default' })
useHead({ title: 'Statistiques & Conseils Builds PvP — Albion SilverMind' })

const selectedFamily = ref('')
const selectedWeaponId = ref('')
const selectedGameplay = ref('ALL')
const loading = ref(false)
const weapons = ref<any[]>([])
const activeSlot = ref('Head')

const GAMEPLAY_MODES = [
  { value: 'ALL', label: 'Tous', desc: 'Tout type de combat' },
  { value: 'SOLO', label: 'Solo', desc: '1v1 (sans assist)' },
  { value: 'DUO', label: 'Duo', desc: '2v2 (1 assist)' },
  { value: 'TRIO', label: 'Trio', desc: '3v3 (2 assists)' },
  { value: 'SMALL_SCALE', label: 'Groupe', desc: '4-9 assists' },
  { value: 'ZERG', label: 'Zerg', desc: '10+ assists' },
]

const SLOT_COLUMNS = [
  ['Bag', 'MainHand', 'Potion'],
  ['Head', 'Armor', 'Shoes', 'Mount'],
  ['Cape', 'OffHand', 'Food'],
] as const

const SLOT_LABELS: Record<string, string> = {
  MainHand: 'Arme',
  OffHand: 'Secondaire',
  Head: 'Casque',
  Armor: 'Armure',
  Shoes: 'Bottes',
  Bag: 'Sac',
  Cape: 'Cape',
  Mount: 'Monture',
  Potion: 'Potion',
  Food: 'Nourriture',
}

const SLOT_ICONS: Record<string, string> = {
  MainHand: '⚔️',
  OffHand: '🗡️',
  Head: '🪖',
  Armor: '🛡️',
  Shoes: '🥾',
  Bag: '🎒',
  Cape: '🧣',
  Mount: '🐴',
  Potion: '🧪',
  Food: '🍖',
}

// Fetch Taxonomy for Weapon Families
const { data: taxonomyData } = await useFetch<{ data: BuildTaxonomyResponse }>('/api/v1/build-taxonomy')
const weaponFamilies = computed(() => taxonomyData.value?.data?.slots.weapon.families ?? [])
const activeFamilyLabel = computed(() => {
  const resolvedFamily = statsData.value.resolvedFamily
  return weaponFamilies.value.find((f) => f.value === resolvedFamily)?.label ?? resolvedFamily ?? ''
})

// Fetch Weapons when family changes
watch(selectedFamily, async (newFamily) => {
  selectedWeaponId.value = ''
  if (!newFamily) {
    weapons.value = []
    return
  }
  try {
    const res = await $fetch<{ data: any[] }>(`/api/v1/items`, {
      query: {
        itemType: 'WEAPON',
        subcategory: newFamily,
        enchantment: 0,
        limit: 96,
      },
    })
    weapons.value = res.data ?? []
  } catch (err) {
    console.error('Failed to load weapons:', err)
  }
})

// Query Build Stats
const statsData = ref<{ totalKills: number; isFallbackToFamily: boolean; resolvedFamily: string | null; slots: Record<string, any[]> }>({
  totalKills: 0,
  isFallbackToFamily: false,
  resolvedFamily: null,
  slots: {},
})

const totalKills = computed(() => statsData.value.totalKills)

async function fetchStats() {
  if (!selectedFamily.value) return
  loading.value = true
  try {
    const res = await $fetch<any>('/api/v1/builds/pvp-stats', {
      query: {
        weaponFamily: selectedFamily.value,
        weaponId: selectedWeaponId.value || undefined,
        gameplayType: selectedGameplay.value,
      },
    })
    statsData.value = res
  } catch (err) {
    console.error('Failed to load pvp build stats:', err)
  } finally {
    loading.value = false
  }
}

// Trigger query when selections change
watch([selectedFamily, selectedWeaponId, selectedGameplay], () => {
  fetchStats()
})

const isTwoHanded = computed(() => {
  const activeWeapon = selectedWeaponId.value || weapons.value[0]?.uniqueName
  return activeWeapon ? activeWeapon.includes('_2H_') : false
})

watch(isTwoHanded, (newVal) => {
  if (newVal && activeSlot.value === 'OffHand') {
    activeSlot.value = 'Head'
  }
})

function getItemTierLabel(uniqueName: string) {
  const match = uniqueName.match(/^T(\d)/)
  return match ? `T${match[1]}` : ''
}

function getTopItemForSlot(slotKey: string) {
  if (slotKey === 'Bag') return null
  if (slotKey === 'OffHand' && isTwoHanded.value) return null
  if (slotKey === 'MainHand') {
    const activeWeapon = selectedWeaponId.value || weapons.value[0]?.uniqueName
    if (!activeWeapon) return null
    return {
      uniqueName: activeWeapon,
      displayName: weapons.value.find(w => w.uniqueName === activeWeapon)?.name || activeWeapon,
      percentage: 100
    }
  }
  
  const slotData = statsData.value.slots[slotKey]
  if (slotData && slotData.length > 0) {
    return slotData[0]
  }
  return null
}

function onSlotClick(slotKey: string) {
  if (slotKey === 'Bag') return
  if (slotKey === 'MainHand') return
  if (slotKey === 'OffHand' && isTwoHanded.value) return
  activeSlot.value = slotKey
}

function openInBuilder() {
  const query: Record<string, string> = {}
  
  // Weapon
  const activeWeapon = selectedWeaponId.value || weapons.value[0]?.uniqueName
  if (activeWeapon) {
    query.weapon = activeWeapon
  }
  
  // Equipment slots
  const slotMap: Record<string, string> = {
    Head: 'helmet',
    Armor: 'armor',
    Shoes: 'shoes',
    OffHand: 'offhand',
    Cape: 'cape',
    Potion: 'potion',
    Food: 'food',
    Mount: 'mount'
  }
  
  for (const [statsSlot, creatorSlot] of Object.entries(slotMap)) {
    if (statsSlot === 'OffHand' && isTwoHanded.value) continue
    
    const topItem = statsData.value.slots[statsSlot]?.[0]?.uniqueName
    if (topItem) {
      query[creatorSlot] = topItem
    }
  }
  
  navigateTo({
    path: '/builds/create',
    query
  })
}

// Fetch Weapons Meta rankings (popularity & winrate)
const { data: weaponsMeta } = await useFetch<{ data: any[] }>('/api/v1/builds/weapons-meta')
const topWeapons = computed(() => weaponsMeta.value?.data ?? [])

function getWinrateClass(winrate: number) {
  if (winrate >= 53) return 'wr-high'
  if (winrate <= 47) return 'wr-low'
  return 'wr-mid'
}

async function selectMetaWeapon(wpn: any) {
  if (!wpn.family) return
  selectedFamily.value = wpn.family
  await nextTick()
  selectedWeaponId.value = wpn.uniqueName
}
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}

.build-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-divider);
  padding-bottom: 8px;
}

.tab-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-3);
  text-decoration: none;
  border-radius: var(--radius);
  transition: all 0.15s;
}

.tab-link svg {
  opacity: 0.6;
}

.tab-link:hover {
  color: var(--text-1);
  background: var(--bg-3);
}

.tab-link.active {
  color: var(--gold);
  background: rgba(201, 161, 74, 0.08);
  font-weight: 600;
  border: 1px solid rgba(201, 161, 74, 0.18);
}

.tab-link.active svg {
  color: var(--gold);
  opacity: 1;
}

/* Two-column top layout */
.stats-top-row {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 992px) {
  .stats-top-row {
    grid-template-columns: 1fr;
  }
}

.filter-panel {
  padding: 24px;
}

.filter-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .filter-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.filter-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--gold);
}

.ds-select {
  height: 42px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-1);
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: all 0.15s;
}

.ds-select:hover, .ds-select:focus {
  border-color: var(--gold);
}

.gameplay-group {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

@media (max-width: 1200px) {
  .gameplay-group {
    grid-template-columns: repeat(3, 1fr);
  }
}

.gameplay-btn {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 46px;
}

.gameplay-btn:hover {
  background: var(--bg-3);
  border-color: var(--border-strong);
}

.gameplay-btn.active {
  background: rgba(201, 161, 74, 0.08);
  border-color: var(--gold);
  box-shadow: 0 0 12px rgba(201, 161, 74, 0.08);
}

.gameplay-btn .g-lbl {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-1);
}

.gameplay-btn.active .g-lbl {
  color: var(--gold);
}

.gameplay-btn .g-desc {
  font-size: 8px;
  color: var(--text-3);
  margin-top: 1px;
}

.drilldown-row {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weapon-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.weapon-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.12s;
}

.weapon-chip:hover {
  background: var(--bg-3);
  border-color: var(--border-strong);
}

.weapon-chip.active {
  background: rgba(201, 161, 74, 0.12);
  border-color: var(--gold);
  color: var(--gold);
  font-weight: 600;
}

.chip-img-container {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-img-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Meta Weapons Panel Styles */
.meta-weapons-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.mw-header {
  border-bottom: 1px solid var(--border-divider);
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.mw-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
}

.mw-sub {
  font-size: 10px;
}

.mw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-4);
  font-size: 11px;
  flex-grow: 1;
}

.meta-weapons-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-weapon-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  transition: all 0.12s;
}

.meta-weapon-row.clickable {
  cursor: pointer;
}

.meta-weapon-row.clickable:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: -1px;
}

.meta-weapon-row.clickable.active-filter {
  border-color: var(--gold);
  background: rgba(201, 161, 74, 0.05);
  box-shadow: 0 0 10px rgba(201, 161, 74, 0.08);
}

.meta-weapon-row.clickable:hover {
  background: var(--bg-3);
  border-color: var(--border-strong);
  transform: translateX(2px);
}

.mw-img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mw-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mw-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex-grow: 1;
}

.mw-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mw-count {
  font-size: 9px;
  color: var(--text-3);
}

.mw-stats-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 1px;
}

.mw-wins-badge {
  font-size: 8px;
  font-weight: 700;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: 4px;
  padding: 0 4px;
  line-height: 1.35;
}

.mw-winrate {
  font-size: 10px;
  font-family: var(--font-mono);
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.mw-winrate.wr-high {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.mw-winrate.wr-mid {
  background: rgba(201, 161, 74, 0.12);
  color: var(--gold);
  border: 1px solid rgba(201, 161, 74, 0.2);
}

.mw-winrate.wr-low {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
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

.select-prompt {
  background: rgba(201, 161, 74, 0.02);
  border: 1px dashed rgba(201, 161, 74, 0.15);
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

.summary-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
}

.banners-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.banner-box {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.banner-box.warning {
  background: rgba(234, 179, 8, 0.04);
  border-color: rgba(234, 179, 8, 0.2);
}

.banner-box.info {
  background: rgba(59, 130, 246, 0.04);
  border-color: rgba(59, 130, 246, 0.2);
}

.banner-icon {
  font-size: 20px;
  line-height: 1;
}

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.banner-text strong {
  font-size: 13px;
  color: var(--text-1);
}

.banner-box.warning .banner-text strong {
  color: #fbbf24;
}

.banner-box.info .banner-text strong {
  color: #60a5fa;
}

.banner-text p {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.4;
}

.pvp-dashboard-layout {
  display: grid;
  grid-template-columns: 440px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 992px) {
  .pvp-dashboard-layout {
    grid-template-columns: 1fr;
  }
}

.character-preview-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.character-card {
  width: 100%;
  padding: 16px;
}

.character-body-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
  background: rgba(11, 10, 8, 0.4);
  border-radius: var(--radius);
  border: 1px solid var(--border-divider);
}

.equipment-grid-3x3 {
  display: grid;
  grid-template-columns: repeat(3, 110px);
  gap: 12px;
  justify-content: center;
  align-items: start;
}

.eq-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.eq-column.center {
  transform: translateY(-16px);
}

.eq-slot-interactive {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px 8px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
  width: 110px;
  min-height: 124px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.eq-slot-interactive.non-selectable {
  cursor: default;
  opacity: 0.5;
}

.eq-slot-interactive:not(.non-selectable):hover {
  background: var(--bg-3);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.eq-slot-interactive.active {
  background: rgba(201, 161, 74, 0.08);
  border-color: var(--gold);
  box-shadow: 0 0 12px rgba(201, 161, 74, 0.2);
}

.eq-slot-interactive.filled {
  border-color: rgba(201, 161, 74, 0.25);
}

.eq-slot-interactive.disabled {
  opacity: 0.35;
  background: rgba(239, 68, 68, 0.02);
  border-color: rgba(239, 68, 68, 0.15);
  cursor: not-allowed;
}

.eq-slot-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  background: var(--bg-1);
  border: 1px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--text-4);
  flex-shrink: 0;
  transition: all 0.15s;
}

.eq-slot-interactive.active .eq-slot-icon {
  border-color: var(--gold-dim);
}

.eq-slot-interactive.filled .eq-slot-icon {
  border-style: solid;
  border-color: rgba(201, 161, 74, 0.15);
}

.eq-slot-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eq-slot-empty {
  font-size: 18px;
  opacity: 0.35;
}

.eq-slot-label {
  font-size: 9px;
  color: var(--text-3);
  line-height: 1.2;
  min-height: 22px;
  max-width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.eq-slot-interactive.active .eq-slot-label {
  color: var(--gold);
}

.eq-slot-interactive.filled .eq-slot-label {
  color: var(--text-1);
}

.eq-slot-tier {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 8px;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--gold);
  background: rgba(11, 10, 8, 0.8);
  border-radius: 3px;
  padding: 1px 3px;
  line-height: 1;
  z-index: 2;
}

.eq-slot-percentage {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(11, 10, 8, 0.85);
  color: var(--gold);
  font-size: 8px;
  font-family: var(--font-mono);
  font-weight: 700;
  padding: 1px 3px;
  line-height: 1;
  border-top-left-radius: 3px;
}

/* Gold CTA Button styling */
.character-action-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
}

.gold-cta-btn,
.history-cta-btn {
  flex: 1;
  height: 48px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius);
  text-decoration: none;
}

.gold-cta-btn {
  border-color: var(--gold);
  background: linear-gradient(135deg, rgba(201, 161, 74, 0.15), rgba(201, 161, 74, 0.04));
  color: var(--gold) !important;
  box-shadow: 0 4px 16px rgba(201, 161, 74, 0.15);
}

.gold-cta-btn:hover {
  background: linear-gradient(135deg, rgba(201, 161, 74, 0.25), rgba(201, 161, 74, 0.08));
  color: var(--text-0) !important;
  box-shadow: 0 6px 20px rgba(201, 161, 74, 0.25);
  transform: translateY(-1px);
}

.history-cta-btn {
  border: 1px solid var(--border);
  background: var(--bg-1);
  color: var(--text-2) !important;
}

.history-cta-btn:hover {
  background: var(--bg-3);
  border-color: var(--border-strong);
  color: var(--text-0) !important;
  transform: translateY(-1px);
}

.slot-details-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.details-card {
  padding: 24px;
  min-height: 440px;
}

.details-slot-icon {
  margin-right: 6px;
}

.details-locked-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 20px;
  color: var(--text-4);
  gap: 12px;
}

.lock-icon {
  font-size: 32px;
  opacity: 0.3;
}

.details-locked-state h4 {
  font-size: 14px;
  color: var(--text-2);
}

.details-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-4);
  gap: 8px;
}

.details-top-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.top-item-visual {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  border: 1px solid var(--border);
  overflow: hidden;
  flex-shrink: 0;
}

.top-item-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.usage-percentage {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(11, 10, 8, 0.85);
  color: var(--gold);
  font-size: 9px;
  font-family: var(--font-mono);
  font-weight: 700;
  padding: 1px 3px;
  line-height: 1;
  border-top-left-radius: 3px;
}

.top-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-rank {
  font-size: 9px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
}

.item-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-count {
  font-size: 10px;
  color: var(--text-3);
  margin-top: 2px;
}

.progress-bar-container {
  height: 4px;
  background: var(--bg-1);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 20px;
}

.progress-bar-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 99px;
  box-shadow: 0 0 8px rgba(201, 161, 74, 0.4);
}

.alternatives-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px dashed var(--border-divider);
  padding-top: 14px;
  flex-grow: 1;
}

.alternatives-section .section-title {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-3);
  letter-spacing: 0.05em;
}

.alt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alt-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.alt-item-img {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alt-item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.alt-item-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
  min-width: 0;
  gap: 8px;
}

.alt-name {
  font-size: 11px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alt-percentage {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-3);
  font-weight: 600;
}

.animate-fade {
  animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
