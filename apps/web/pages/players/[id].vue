<template>
  <div class="page">
    <template v-if="data">
      <div class="page-header">
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span>·</span>
          <NuxtLink to="/killboard">Killboard</NuxtLink>
          <span>·</span>
          <span>{{ data.Name }}</span>
        </div>
        <h1 class="page-title">{{ data.Name }}</h1>
        <div class="player-meta">
          <NuxtLink v-if="data.GuildId" :to="`/guilds/${data.GuildId}`" class="meta-link t-gold">
            {{ data.GuildName }}
          </NuxtLink>
          <NuxtLink v-if="data.AllianceId" :to="`/alliances/${data.AllianceId}`" class="meta-link t-dim">
            [{{ data.AllianceTag || data.AllianceName }}]
          </NuxtLink>
        </div>
      </div>

      <div class="kb-toolbar">
        <PvpSearchBar />
      </div>

      <div class="pvp-player-grid">
        <!-- Colonne gauche : stats + équipement -->
        <div class="pvp-player-left">

          <!-- Stats PvP -->
          <div class="panel parchment">
            <div class="panel-header"><h3>Statistiques PvP</h3></div>
            <div class="panel-body">
              <div class="stat-row">
                <span class="label">Kill Fame</span>
                <span class="val t-gold t-mono">{{ formatFame(data.KillFame) }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Death Fame</span>
                <span class="val t-mono">{{ formatFame(data.DeathFame) }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Ratio K/D</span>
                <span class="val t-mono">{{ fameRatio(data.KillFame, data.DeathFame) }}</span>
              </div>
              <div class="stat-row">
                <span class="label">IP moyen</span>
                <span class="val t-mono">{{ data.AverageItemPower > 0 ? data.AverageItemPower.toFixed(0) : '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Équipement détaillé avec IP par slot -->
          <div v-if="hasEquipment" class="panel" style="margin-top:16px">
            <div class="panel-header">
              <h3>Équipement</h3>
              <span class="t-dim" style="font-size:11px">~IP estimé</span>
            </div>
            <div class="eq-detailed-grid">
              <div
                v-for="slot in equipmentSlots"
                :key="slot.key"
                class="eq-card"
                :class="slot.qualityClass"
              >
                <div class="eq-card-icon">
                  <template v-if="slot.type">
                    <AoItemImage
                      :unique-name="slot.type"
                      :alt="slot.type"
                    />
                  </template>
                  <span v-else class="eq-placeholder">·</span>
                </div>
                <div class="eq-card-info">
                  <div class="eq-card-slot t-eyebrow">{{ slot.label }}</div>
                  <div v-if="slot.type" class="eq-card-name">{{ slot.tierLabel }}</div>
                  <div v-if="slot.type" class="eq-card-ip t-mono t-gold">{{ slot.ip }} IP</div>
                  <div v-else class="eq-card-empty t-dim">Vide</div>
                </div>
                <div v-if="slot.type" class="eq-card-quality" :style="{ background: slot.qualityColor }">
                  {{ slot.qualityLabel }}
                </div>
              </div>
            </div>
          </div>

          <!-- Fame détaillée (LifetimeStatistics) -->
          <div v-if="data.LifetimeStatistics" class="panel parchment" style="margin-top:16px">
            <div class="panel-header">
              <h3>Fame Détaillée</h3>
            </div>
            
            <div class="fame-tabs">
              <button
                class="fame-tab-btn"
                :class="{ active: activeFameTab === 'pve' }"
                @click="activeFameTab = 'pve'"
              >
                ⚔️ PvE
              </button>
              <button
                class="fame-tab-btn"
                :class="{ active: activeFameTab === 'gathering' }"
                @click="activeFameTab = 'gathering'"
              >
                🎒 Récolte
              </button>
              <button
                class="fame-tab-btn"
                :class="{ active: activeFameTab === 'crafting' }"
                @click="activeFameTab = 'crafting'"
              >
                🔨 Artisanat
              </button>
              <button
                class="fame-tab-btn"
                :class="{ active: activeFameTab === 'misc' }"
                @click="activeFameTab = 'misc'"
              >
                ❖ Autres
              </button>
            </div>

            <div class="fame-tab-content">
              <!-- Onglet PvE -->
              <template v-if="activeFameTab === 'pve'">
                <div class="fame-summary-card">
                  <div class="fame-summary-label">Fame PvE Totale (Somme)</div>
                  <div class="fame-summary-val t-gold t-mono">{{ formatFame(pveSum) }}</div>
                </div>
                
                <div class="fame-breakdown-list">
                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Continent Royal</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.Royal ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill pve-fill" :style="{ width: getPercentage(data.LifetimeStatistics.PvE.Royal, pveSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Terres Sauvages</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.Outlands ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill pve-fill" :style="{ width: getPercentage(data.LifetimeStatistics.PvE.Outlands, pveSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Routes d'Avalon</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.Avalon ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill pve-fill" :style="{ width: getPercentage(data.LifetimeStatistics.PvE.Avalon, pveSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Portes de l'Enfer</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.Hellgate ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill pve-fill" :style="{ width: getPercentage(data.LifetimeStatistics.PvE.Hellgate, pveSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Donjons Corrompus</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.CorruptedDungeon ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill pve-fill" :style="{ width: getPercentage(data.LifetimeStatistics.PvE.CorruptedDungeon, pveSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Brumes</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.Mists ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill pve-fill" :style="{ width: getPercentage(data.LifetimeStatistics.PvE.Mists, pveSum) + '%' }"></div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Onglet Récolte (Gathering) -->
              <template v-if="activeFameTab === 'gathering'">
                <div class="fame-summary-card">
                  <div class="fame-summary-label">Fame Récolte Totale (Somme)</div>
                  <div class="fame-summary-val t-gold t-mono">{{ formatFame(gatheringSum) }}</div>
                </div>

                <div class="resources-list">
                  <div v-for="res in gatheringList" :key="res.key" class="resource-card">
                    <div class="resource-main">
                      <span class="resource-icon">{{ res.icon }}</span>
                      <span class="resource-label">{{ res.label }}</span>
                      <span class="spacer"></span>
                      <span class="resource-total t-mono t-gold">{{ formatFame(res.total) }}</span>
                    </div>
                    
                    <!-- Progress bar relative to gatheringSum -->
                    <div class="prog-bar">
                      <div class="prog-fill gathering-fill" :style="{ width: getPercentage(res.total, gatheringSum) + '%' }"></div>
                    </div>
                    
                    <!-- Mini details par zone -->
                    <div class="resource-zones" v-if="res.key !== 'Fishing' && res.total > 0">
                      <span class="zone-pill">Royal: {{ formatFame(res.royal) }}</span>
                      <span class="zone-pill">Outlands: {{ formatFame(res.outlands) }}</span>
                      <span class="zone-pill">Avalon: {{ formatFame(res.avalon) }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Onglet Artisanat (Crafting) -->
              <template v-if="activeFameTab === 'crafting'">
                <div class="fame-summary-card">
                  <div class="fame-summary-label">Fame Artisanat Totale (Somme)</div>
                  <div class="fame-summary-val t-gold t-mono">{{ formatFame(craftingSum) }}</div>
                </div>

                <div class="fame-breakdown-list">
                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Continent Royal</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.Crafting.Royal ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill craft-fill" :style="{ width: getPercentage(data.LifetimeStatistics.Crafting.Royal, craftingSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Terres Sauvages</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.Crafting.Outlands ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill craft-fill" :style="{ width: getPercentage(data.LifetimeStatistics.Crafting.Outlands, craftingSum) + '%' }"></div>
                    </div>
                  </div>

                  <div class="fame-breakdown-item">
                    <div class="fame-breakdown-header">
                      <span class="label">Routes d'Avalon</span>
                      <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.Crafting.Avalon ?? 0) }}</span>
                    </div>
                    <div class="prog-bar">
                      <div class="prog-fill craft-fill" :style="{ width: getPercentage(data.LifetimeStatistics.Crafting.Avalon, craftingSum) + '%' }"></div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Onglet Autres -->
              <template v-if="activeFameTab === 'misc'">
                <div class="misc-grid">
                  <div class="misc-card">
                    <span class="misc-icon">🌾</span>
                    <div class="misc-info">
                      <div class="misc-label">Agriculture</div>
                      <div class="misc-val t-mono t-gold">{{ formatFame(data.LifetimeStatistics.FarmingFame ?? 0) }}</div>
                    </div>
                  </div>

                  <div class="misc-card">
                    <span class="misc-icon">🛡️</span>
                    <div class="misc-info">
                      <div class="misc-label">Ligue de Cristal</div>
                      <div class="misc-val t-mono t-gold">{{ formatFame(data.LifetimeStatistics.CrystalLeague ?? 0) }}</div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Colonne droite : kills/deaths -->
        <div class="pvp-player-right">
          <div class="panel parchment">
            <div class="player-tabs">
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'kills' }"
                @click="activeTab = 'kills'"
              >
                Kills ({{ data.recentKills?.length ?? 0 }})
              </button>
              <button
                class="tab-btn"
                :class="{ active: activeTab === 'deaths' }"
                @click="activeTab = 'deaths'"
              >
                Morts ({{ data.recentDeaths?.length ?? 0 }})
              </button>
            </div>

            <div class="pvp-feed">
              <template v-if="activeTab === 'kills'">
                <KillEventRow
                  v-for="ev in data.recentKills"
                  :key="ev.EventId"
                  :event="ev"
                />
                <div v-if="!data.recentKills?.length" class="tab-empty t-dim">
                  Aucun kill récent.
                </div>
              </template>
              <template v-else>
                <KillEventRow
                  v-for="ev in data.recentDeaths"
                  :key="ev.EventId"
                  :event="ev"
                />
                <div v-if="!data.recentDeaths?.length" class="tab-empty t-dim">
                  Aucune mort récente.
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="status === 'error'" class="page-error">
      <h2>Joueur introuvable</h2>
      <p class="t-dim">Cet identifiant de joueur n'existe pas ou n'est plus disponible.</p>
      <NuxtLink to="/killboard" class="ds-btn" style="margin-top:16px">← Killboard</NuxtLink>
    </div>

    <div v-else class="page-loading t-dim">Chargement…</div>
  </div>
</template>

<script setup lang="ts">
import type { KillEventEquipment } from '@albion-tool/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = computed(() => route.params.id as string)
const { data, status } = usePvpPlayer(id)

const activeTab = ref<'kills' | 'deaths'>('kills')

// Fame and Equipment detailed dashboard states & helpers
const activeFameTab = ref<'pve' | 'gathering' | 'crafting' | 'misc'>('pve')

const hasEquipment = computed(() => {
  if (!data.value || !data.value.Equipment) return false
  return Object.values(data.value.Equipment).some((item) => item && item.Type)
})

const getPercentage = (value?: number, total?: number) => {
  if (!value || !total) return 0
  return Math.min(100, Math.max(0, (value / total) * 100))
}

// Sum calculation for indicators rather than relying on global totals
const pveSum = computed(() => {
  if (!data.value?.LifetimeStatistics?.PvE) return 0
  const pve = data.value.LifetimeStatistics.PvE
  return (pve.Royal ?? 0) + (pve.Outlands ?? 0) + (pve.Avalon ?? 0) + (pve.Hellgate ?? 0) + (pve.CorruptedDungeon ?? 0) + (pve.Mists ?? 0)
})

const craftingSum = computed(() => {
  if (!data.value?.LifetimeStatistics?.Crafting) return 0
  const c = data.value.LifetimeStatistics.Crafting
  return (c.Royal ?? 0) + (c.Outlands ?? 0) + (c.Avalon ?? 0)
})

const gatheringSum = computed(() => {
  if (!data.value?.LifetimeStatistics) return 0
  const stats = data.value.LifetimeStatistics
  const g = stats.Gathering
  const wood = g?.Wood?.Total ?? 0
  const fiber = g?.Fiber?.Total ?? 0
  const hide = g?.Hide?.Total ?? 0
  const ore = g?.Ore?.Total ?? 0
  const rock = g?.Rock?.Total ?? 0
  const fish = stats.FishingFame ?? 0
  return wood + fiber + hide + ore + rock + fish
})

const gatheringList = computed(() => {
  if (!data.value?.LifetimeStatistics) return []
  const stats = data.value.LifetimeStatistics
  const g = stats.Gathering
  return [
    { key: 'Wood', label: 'Bois', icon: '🌲', total: g?.Wood?.Total ?? 0, royal: g?.Wood?.Royal ?? 0, outlands: g?.Wood?.Outlands ?? 0, avalon: g?.Wood?.Avalon ?? 0 },
    { key: 'Fiber', label: 'Fibre', icon: '🌾', total: g?.Fiber?.Total ?? 0, royal: g?.Fiber?.Royal ?? 0, outlands: g?.Fiber?.Outlands ?? 0, avalon: g?.Fiber?.Avalon ?? 0 },
    { key: 'Hide', label: 'Peau', icon: '🐺', total: g?.Hide?.Total ?? 0, royal: g?.Hide?.Royal ?? 0, outlands: g?.Hide?.Outlands ?? 0, avalon: g?.Hide?.Avalon ?? 0 },
    { key: 'Ore', label: 'Minerai', icon: '⛏️', total: g?.Ore?.Total ?? 0, royal: g?.Ore?.Royal ?? 0, outlands: g?.Ore?.Outlands ?? 0, avalon: g?.Ore?.Avalon ?? 0 },
    { key: 'Rock', label: 'Pierre', icon: '🪨', total: g?.Rock?.Total ?? 0, royal: g?.Rock?.Royal ?? 0, outlands: g?.Rock?.Outlands ?? 0, avalon: g?.Rock?.Avalon ?? 0 },
    { key: 'Fishing', label: 'Pêche', icon: '🐟', total: stats.FishingFame ?? 0, royal: 0, outlands: 0, avalon: 0 },
  ]
})

useHead(() => ({
  title: data.value ? `${data.value.Name} — Albion SilverMind` : 'Joueur — Albion SilverMind',
}))

const SLOT_LABELS: Record<keyof KillEventEquipment, string> = {
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

const QUALITY_LABELS = ['', 'Normal', 'Good', 'Outstanding', 'Excellent', 'Masterpiece']
const QUALITY_COLORS_CSS = ['', 'var(--q-normal)', 'var(--q-good)', 'var(--q-outstanding)', 'var(--q-excellent)', 'var(--q-masterpiece)']
const QUALITY_CLASSES = ['', '', 'q-good', 'q-outstanding', 'q-excellent', 'q-masterpiece']

const SLOT_ORDER = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Bag', 'Cape', 'Mount', 'Potion', 'Food'] as const

const equipmentSlots = computed(() => {
  if (!data.value) return []
  const eq = data.value.Equipment
  return SLOT_ORDER.map((key) => {
    const item = eq[key]
    if (!item?.Type) {
      return {
        key,
        label: SLOT_LABELS[key],
        type: null as string | null,
        tierLabel: '',
        ip: 0,
        qualityClass: '',
        qualityLabel: '',
        qualityColor: '',
      }
    }
    const type = item.Type
    const t = itemTier(type)
    const e = itemEnchant(type)
    const ip = calcItemPower(type, item.Quality)
    return {
      key,
      label: SLOT_LABELS[key],
      type,
      tierLabel: e > 0 ? `T${t}.${e}` : `T${t}`,
      ip,
      qualityClass: QUALITY_CLASSES[item.Quality] ?? '',
      qualityLabel: QUALITY_LABELS[item.Quality] ?? '',
      qualityColor: QUALITY_COLORS_CSS[item.Quality] ?? '',
    }
  })
})

</script>

<style scoped>
.player-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.meta-link {
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.meta-link:hover { text-decoration: underline; }

.kb-toolbar {
  margin-bottom: 20px;
}

.pvp-player-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  align-items: start;
}

.pvp-player-left,
.pvp-player-right {
  display: flex;
  flex-direction: column;
}

/* Équipement détaillé */
.eq-detailed-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.eq-card {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-divider);
  transition: background 0.12s;
}
.eq-card:last-child { border-bottom: none; }
.eq-card:hover { background: var(--bg-3); }

/* Bordure gauche colorée selon qualité */
.eq-card.q-good    { border-left: 2px solid var(--q-good); padding-left: 12px; }
.eq-card.q-outstanding { border-left: 2px solid var(--q-outstanding); padding-left: 12px; }
.eq-card.q-excellent   { border-left: 2px solid var(--q-excellent); padding-left: 12px; }
.eq-card.q-masterpiece { border-left: 2px solid var(--q-masterpiece); padding-left: 12px; }

.eq-card-icon {
  width: 44px;
  height: 44px;
  background: var(--bg-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.eq-card-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eq-placeholder {
  font-size: 18px;
  color: var(--text-4);
  opacity: 0.3;
}

.eq-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.eq-card-slot {
  font-size: 10px;
  color: var(--text-4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.eq-card-name {
  font-size: 14px;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-0);
}

.eq-card-ip {
  font-size: 12px;
}

.eq-card-empty {
  font-size: 12px;
  font-style: italic;
}

.eq-card-quality {
  font-size: 9px;
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--bg-0);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Tabs kills/deaths */
.player-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-divider);
}

.tab-btn {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover { color: var(--text-1); }
.tab-btn.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

.pvp-feed {
  display: flex;
  flex-direction: column;
}

.tab-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
}

.page-error,
.page-loading {
  padding: 48px 0;
  text-align: center;
}
.page-error h2 {
  font-family: var(--font-display);
  color: var(--text-0);
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .pvp-player-grid {
    grid-template-columns: 1fr;
  }
}

/* Fame Tabbed Dashboard */
.fame-tabs {
  display: flex;
  background: var(--bg-1);
  border-bottom: 1px solid var(--border-divider);
  padding: 2px;
  gap: 2px;
}

.fame-tab-btn {
  flex: 1;
  padding: 8px 4px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--text-3);
  background: transparent;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.fame-tab-btn:hover {
  color: var(--text-1);
  background: rgba(201, 161, 74, 0.04);
}

.fame-tab-btn.active {
  color: var(--gold);
  background: rgba(201, 161, 74, 0.08);
  box-shadow: inset 0 0 0 1px var(--border);
}

.fame-tab-content {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fame-summary-card {
  background: var(--bg-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius);
  padding: 12px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.fame-summary-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-3);
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.fame-summary-val {
  font-size: 18px;
  font-weight: 700;
}

.fame-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fame-breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fame-breakdown-header {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
}

.fame-breakdown-header .label {
  color: var(--text-2);
}

.fame-breakdown-header .val {
  color: var(--text-0);
  font-weight: 600;
}

/* Progress bar customization for Fame details */
.prog-fill.pve-fill {
  background: linear-gradient(90deg, var(--gold-deep), var(--gold));
  box-shadow: 0 0 8px rgba(201, 161, 74, 0.3);
}

.prog-fill.craft-fill {
  background: linear-gradient(90deg, var(--copper), var(--copper-bright));
  box-shadow: 0 0 8px rgba(160, 107, 60, 0.3);
}

.prog-fill.gathering-fill {
  background: linear-gradient(90deg, #4d682a, var(--success));
  box-shadow: 0 0 8px rgba(125, 154, 74, 0.3);
}

/* Gathering resources */
.resources-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-card {
  background: var(--bg-1);
  border: 1px solid var(--border-divider);
  border-radius: var(--radius);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s, background 0.15s;
}

.resource-card:hover {
  border-color: var(--border-strong);
  background: var(--bg-3);
}

.resource-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-icon {
  font-size: 14px;
}

.resource-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-1);
}

.resource-total {
  font-size: 13px;
  font-weight: 700;
}

.resource-zones {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--border-divider);
}

.zone-pill {
  font-size: 9px;
  font-family: var(--font-mono);
  background: var(--bg-2);
  border: 1px solid var(--border-subtle);
  padding: 2px 5px;
  border-radius: 3px;
  color: var(--text-2);
}

/* Misc Grid */
.misc-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.misc-card {
  background: var(--bg-1);
  border: 1px solid var(--border-divider);
  border-radius: var(--radius);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.misc-icon {
  font-size: 18px;
}

.misc-info {
  display: flex;
  flex-direction: column;
}

.misc-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-3);
  letter-spacing: 0.06em;
}

.misc-val {
  font-size: 14px;
  font-weight: 700;
}
</style>
