<template>
  <div class="page">
    <template v-if="guild.data.value">
      <div class="page-header">
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span>·</span>
          <NuxtLink to="/killboard">Killboard</NuxtLink>
          <span>·</span>
          <span>{{ guild.data.value.Name }}</span>
        </div>
        <h1 class="page-title">{{ guild.data.value.Name }}</h1>
        <div class="guild-meta">
          <span v-if="guild.data.value.AllianceName" class="meta-tag">
            <NuxtLink :to="`/alliances/${guild.data.value.AllianceId}`" class="t-gold">
              [{{ guild.data.value.AllianceTag ?? guild.data.value.AllianceName }}]
            </NuxtLink>
          </span>
          <span v-if="guild.data.value.MemberCount" class="meta-tag t-dim">
            {{ guild.data.value.MemberCount }} membres
          </span>
          <span v-if="guild.data.value.Founded" class="meta-tag t-dim">
            Fondée {{ new Date(guild.data.value.Founded).getFullYear() }}
          </span>
        </div>
      </div>

      <div class="kb-toolbar">
        <PvpSearchBar />
      </div>

      <div class="pvp-guild-grid">
        <div class="pvp-guild-left">
          <div class="panel parchment">
            <div class="panel-header"><h3>Statistiques de la guilde</h3></div>
            <div class="panel-body">
              <div class="guild-stats-grid">
                <div class="stats-group">
                  <div class="stat-row">
                    <span class="label">Kill Fame Total</span>
                    <span class="val t-gold t-mono">{{ formatFame(guildAggregates.killFame) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="label">Death Fame Total</span>
                    <span class="val t-mono">{{ formatFame(guildAggregates.deathFame) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="label">Ratio Global</span>
                    <span class="val t-mono">{{ fameRatio(guildAggregates.killFame, guildAggregates.deathFame) }}</span>
                  </div>
                </div>
                <div class="stats-group">
                  <div class="stat-row">
                    <span class="label">PvE Total</span>
                    <span class="val t-mono">{{ formatFame(guildAggregates.pve) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="label">Gathering Total</span>
                    <span class="val t-mono">{{ formatFame(guildAggregates.gathering) }}</span>
                  </div>
                  <div class="stat-row">
                    <span class="label">Crafting Total</span>
                    <span class="val t-mono">{{ formatFame(guildAggregates.crafting) }}</span>
                  </div>
                </div>
              </div>

              <div class="top-players-section">
                <h4>Meilleurs contributeurs</h4>
                <div class="top-players-grid">
                  <div v-if="topPlayers.killFame" class="top-player-card">
                    <span class="top-label">Kill Fame</span>
                    <NuxtLink :to="`/players/${topPlayers.killFame.Id}`" class="top-name">{{ topPlayers.killFame.Name }}</NuxtLink>
                    <span class="top-val t-gold">{{ formatFame(topPlayers.killFame.KillFame) }}</span>
                  </div>
                  <div v-if="topPlayers.pve" class="top-player-card">
                    <span class="top-label">PvE</span>
                    <NuxtLink :to="`/players/${topPlayers.pve.Id}`" class="top-name">{{ topPlayers.pve.Name }}</NuxtLink>
                    <span class="top-val">{{ formatFame(topPlayers.pve.LifetimeStatistics?.PvE?.Total ?? 0) }}</span>
                  </div>
                  <div v-if="topPlayers.gathering" class="top-player-card">
                    <span class="top-label">Gathering</span>
                    <NuxtLink :to="`/players/${topPlayers.gathering.Id}`" class="top-name">{{ topPlayers.gathering.Name }}</NuxtLink>
                    <span class="top-val">{{ formatFame(topPlayers.gathering.LifetimeStatistics?.Gathering?.All?.Total ?? 0) }}</span>
                  </div>
                  <div v-if="topPlayers.crafting" class="top-player-card">
                    <span class="top-label">Crafting</span>
                    <NuxtLink :to="`/players/${topPlayers.crafting.Id}`" class="top-name">{{ topPlayers.crafting.Name }}</NuxtLink>
                    <span class="top-val">{{ formatFame(topPlayers.crafting.LifetimeStatistics?.Crafting?.Total ?? 0) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel parchment" style="margin-top:16px">
            <div class="panel-header">
              <h3>Statistiques des membres</h3>
              <span class="t-dim t-mono" style="font-size:12px">{{ members.data.value?.length ?? 0 }}</span>
            </div>
            <div v-if="members.pending.value" class="panel-body t-dim" style="padding:16px">
              Chargement…
            </div>
            <div v-else-if="members.data.value?.length" class="members-table-wrap">
              <table class="ds-table sortable">
                <thead>
                  <tr>
                    <th @click="sortBy('Name')" :class="{ active: sortKey === 'Name' }">Joueur</th>
                    <th @click="sortBy('KillFame')" :class="{ active: sortKey === 'KillFame' }" class="num">Kill Fame</th>
                    <th @click="sortBy('DeathFame')" :class="{ active: sortKey === 'DeathFame' }" class="num">Death Fame</th>
                    <th @click="sortBy('FameRatio')" :class="{ active: sortKey === 'FameRatio' }" class="num">Ratio</th>
                    <th @click="sortBy('PvE')" :class="{ active: sortKey === 'PvE' }" class="num">PvE Total</th>
                    <th @click="sortBy('Gathering')" :class="{ active: sortKey === 'Gathering' }" class="num">Gathering</th>
                    <th @click="sortBy('Crafting')" :class="{ active: sortKey === 'Crafting' }" class="num">Crafting</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in sortedMembers" :key="m.Id">
                    <td>
                      <NuxtLink :to="`/players/${m.Id}`" class="member-link">
                        {{ m.Name }}
                      </NuxtLink>
                    </td>
                    <td class="num t-mono t-gold">{{ formatFame(m.KillFame) }}</td>
                    <td class="num t-mono">{{ formatFame(m.DeathFame) }}</td>
                    <td class="num t-mono">{{ m.FameRatio.toFixed(2) }}</td>
                    <td class="num t-mono">
                      {{ m.LifetimeStatistics?.PvE?.Total ? formatFame(m.LifetimeStatistics.PvE.Total) : '—' }}
                    </td>
                    <td class="num t-mono">
                      {{ m.LifetimeStatistics?.Gathering?.All?.Total ? formatFame(m.LifetimeStatistics.Gathering.All.Total) : '—' }}
                    </td>
                    <td class="num t-mono">
                      {{ m.LifetimeStatistics?.Crafting?.Total ? formatFame(m.LifetimeStatistics.Crafting.Total) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="panel-body t-dim" style="padding:16px;font-size:13px">
              Aucun membre trouvé.
            </div>
          </div>
        </div>

        <div class="pvp-guild-right">
          <div v-if="guild.data.value.AllianceId" class="panel" style="margin-bottom:16px">
            <div class="panel-header"><h3>Alliance</h3></div>
            <div class="panel-body" style="padding:14px 16px">
              <NuxtLink :to="`/alliances/${guild.data.value.AllianceId}`" class="t-gold" style="font-weight:600">
                {{ guild.data.value.AllianceName }}
              </NuxtLink>
            </div>
          </div>

          <div class="panel parchment">
            <div class="panel-header">
              <h3>Top kills récents</h3>
            </div>
            <div v-if="topKills.pending.value && !topKills.data.value?.length" class="panel-body t-dim" style="padding:16px">
              Chargement…
            </div>
            <div v-else-if="topKills.data.value?.length" class="pvp-feed">
              <KillEventRow
                v-for="ev in topKills.data.value.slice(0, 10)"
                :key="ev.EventId"
                :event="ev"
                :hide-equipment="true"
              />
            </div>
            <div v-else class="panel-body t-dim" style="padding:16px;font-size:13px">
              Aucun kill récent trouvé.
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="guild.status.value === 'error'" class="page-error">
      <h2>Guilde introuvable</h2>
      <p class="t-dim">Cet identifiant de guilde n'existe pas ou n'est plus disponible.</p>
      <NuxtLink to="/killboard" class="ds-btn" style="margin-top:16px">← Killboard</NuxtLink>
    </div>

    <div v-else class="page-loading t-dim">Chargement…</div>
  </div>
</template>

<script setup lang="ts">
import type { GuildMember } from '@albion-tool/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = computed(() => route.params.id as string)
const { guild, members, topKills } = usePvpGuild(id)

// Aggregates & Top Players
const guildAggregates = computed(() => {
  const totals = {
    killFame: 0,
    deathFame: 0,
    pve: 0,
    gathering: 0,
    crafting: 0
  }
  
  if (!members.data.value) return totals

  for (const m of members.data.value) {
    totals.killFame += m.KillFame || 0
    totals.deathFame += m.DeathFame || 0
    totals.pve += m.LifetimeStatistics?.PvE?.Total || 0
    totals.gathering += m.LifetimeStatistics?.Gathering?.All?.Total || 0
    totals.crafting += m.LifetimeStatistics?.Crafting?.Total || 0
  }
  
  return totals
})

const topPlayers = computed(() => {
  if (!members.data.value?.length) return {}

  const list = members.data.value
  return {
    killFame: [...list].sort((a, b) => b.KillFame - a.KillFame)[0],
    pve: [...list].sort((a, b) => (b.LifetimeStatistics?.PvE?.Total || 0) - (a.LifetimeStatistics?.PvE?.Total || 0))[0],
    gathering: [...list].sort((a, b) => (b.LifetimeStatistics?.Gathering?.All?.Total || 0) - (a.LifetimeStatistics?.Gathering?.All?.Total || 0))[0],
    crafting: [...list].sort((a, b) => (b.LifetimeStatistics?.Crafting?.Total || 0) - (a.LifetimeStatistics?.Crafting?.Total || 0))[0]
  }
})

// Sorting
const sortKey = ref<string>('KillFame')
const sortOrder = ref<'asc' | 'desc'>('desc')

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
}

const sortedMembers = computed(() => {
  if (!members.data.value) return []
  const data = [...members.data.value]
  
  data.sort((a, b) => {
    let valA: any = 0
    let valB: any = 0

    switch (sortKey.value) {
      case 'Name':
        valA = a.Name.toLowerCase()
        valB = b.Name.toLowerCase()
        break
      case 'KillFame':
        valA = a.KillFame
        valB = b.KillFame
        break
      case 'DeathFame':
        valA = a.DeathFame
        valB = b.DeathFame
        break
      case 'FameRatio':
        valA = a.FameRatio
        valB = b.FameRatio
        break
      case 'PvE':
        valA = a.LifetimeStatistics?.PvE?.Total ?? 0
        valB = b.LifetimeStatistics?.PvE?.Total ?? 0
        break
      case 'Gathering':
        valA = a.LifetimeStatistics?.Gathering?.All?.Total ?? 0
        valB = b.LifetimeStatistics?.Gathering?.All?.Total ?? 0
        break
      case 'Crafting':
        valA = a.LifetimeStatistics?.Crafting?.Total ?? 0
        valB = b.LifetimeStatistics?.Crafting?.Total ?? 0
        break
    }

    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return data
})

useHead(() => ({
  title: guild.data.value ? `${guild.data.value.Name} — Albion SilverMind` : 'Guilde — Albion SilverMind',
}))
</script>

<style scoped>
.guild-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.meta-tag {
  font-size: 13px;
}

.kb-toolbar {
  margin-bottom: 20px;
}

.guild-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 16px;
  border-bottom: 1px solid var(--border-divider);
}

.stats-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.top-players-section {
  padding: 16px;
}
.top-players-section h4 {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--text-2);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.top-players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.top-player-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
}

.top-label {
  font-size: 11px;
  color: var(--text-3);
  margin-bottom: 4px;
}

.top-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-0);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.top-name:hover {
  color: var(--gold);
}

.top-val {
  font-family: var(--font-mono);
  font-size: 12px;
  margin-top: 2px;
}

.pvp-guild-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 16px;
  align-items: start;
}

.pvp-guild-left,
.pvp-guild-right {
  display: flex;
  flex-direction: column;
}

.pvp-feed {
  display: flex;
  flex-direction: column;
}

.members-table-wrap {
  max-height: 600px;
  overflow-y: auto;
}

.ds-table.sortable th {
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.ds-table.sortable th:hover {
  background: var(--bg-3);
}
.ds-table.sortable th.active {
  color: var(--gold);
}

.member-link {
  color: var(--text-0);
  text-decoration: none;
  font-size: 13px;
}
.member-link:hover {
  color: var(--gold);
  text-decoration: underline;
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
  .pvp-guild-grid {
    grid-template-columns: 1fr;
  }
}
</style>
