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
          <div class="panel" style="margin-top:16px">
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

          <!-- Stats globales -->
          <div v-if="data.LifetimeStatistics" class="panel" style="margin-top:16px">
            <div class="panel-header"><h3>Statistiques globales</h3></div>
            <div class="panel-body">
              <div class="stat-row">
                <span class="label">PvE Fame</span>
                <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.PvE.Total) }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Gathering Fame</span>
                <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.Gathering?.All?.Total ?? 0) }}</span>
              </div>
              <div class="stat-row">
                <span class="label">Crafting Fame</span>
                <span class="val t-mono">{{ formatFame(data.LifetimeStatistics.Crafting.Total) }}</span>
              </div>
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
</style>
