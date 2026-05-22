<template>
  <div class="page">
    <template v-if="data">
      <div class="page-header">
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span>·</span>
          <NuxtLink to="/killboard">Killboard</NuxtLink>
          <span>·</span>
          <span>{{ data.AllianceName }}</span>
        </div>
        <h1 class="page-title">
          {{ data.AllianceName }}
          <span v-if="data.AllianceTag" class="alliance-tag t-gold">[{{ data.AllianceTag }}]</span>
        </h1>
        <div class="alliance-meta">
          <span v-if="data.NumPlayers" class="meta-tag t-dim">{{ data.NumPlayers.toLocaleString('fr-FR') }} joueurs</span>
          <span v-if="data.Founded" class="meta-tag t-dim">
            Fondée {{ new Date(data.Founded).getFullYear() }}
          </span>
          <span v-if="data.FounderName" class="meta-tag t-dim">
            Fondateur : {{ data.FounderName }}
          </span>
        </div>
      </div>

      <div class="kb-toolbar">
        <PvpSearchBar />
      </div>

      <div class="panel parchment framed">
        <div class="panel-header">
          <h3>Guildes membres</h3>
          <span class="t-dim t-mono" style="font-size:12px">{{ data.Guilds.length }} guildes</span>
        </div>
        <table class="ds-table">
          <thead>
            <tr>
              <th>Guilde</th>
              <th class="num">Membres</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in data.Guilds" :key="g.Id">
              <td>
                <NuxtLink :to="`/guilds/${g.Id}`" class="guild-link">
                  {{ g.Name }}
                </NuxtLink>
              </td>
              <td class="num t-mono t-dim">
                {{ g.MemberCount ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else-if="status === 'error'" class="page-error">
      <h2>Alliance introuvable</h2>
      <p class="t-dim">Cet identifiant d'alliance n'existe pas ou n'est plus disponible.</p>
      <NuxtLink to="/killboard" class="ds-btn" style="margin-top:16px">← Killboard</NuxtLink>
    </div>

    <div v-else class="page-loading t-dim">Chargement…</div>
  </div>
</template>

<script setup lang="ts">
import type { Alliance } from '@albion-tool/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data, status } = useFetch(() => `/api/v1/pvp/alliances/${id.value}`, {
  key: () => `pvp-alliance-${id.value}`,
  transform: (r: { data: Alliance }) => r.data,
})

useHead(() => ({
  title: data.value ? `${data.value.AllianceName} — Albion SilverMind` : 'Alliance — Albion SilverMind',
}))
</script>

<style scoped>
.alliance-tag {
  font-size: 0.7em;
  font-family: var(--font-display);
  vertical-align: middle;
  margin-left: 8px;
}

.alliance-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.meta-tag { font-size: 13px; }

.kb-toolbar {
  margin-bottom: 20px;
}

.guild-link {
  color: var(--text-0);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}
.guild-link:hover {
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
</style>
