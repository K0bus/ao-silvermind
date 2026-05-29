<template>
  <div class="page premium-bot-page">
    <div class="page-header">
      <div>
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span class="sep">/</span>
          <span class="t-gold">Premium</span>
          <span class="sep">/</span>
          Mes Bots
        </div>
        <h1 class="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent" style="font-weight: 900;">
          Mes Bots Discord
        </h1>
        <p class="t-muted" style="margin-top: 6px;">
          Associez votre compte Discord et gérez des configurations personnalisées du bot pour chacun de vos serveurs de guilde.
        </p>
      </div>
      <div v-if="discordLinked && clientId" class="header-actions">
        <a :href="inviteLink" target="_blank" class="ds-btn primary sm flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Inviter le Bot Général
        </a>
      </div>
    </div>

    <!-- Alert / Toast Banner -->
    <div v-if="statusMessage" :class="['alert-banner', isError ? 'error' : 'success']" class="mb-6 p-4 rounded border flex items-center justify-between">
      <span>{{ statusMessage }}</span>
      <button class="text-xs opacity-70 hover:opacity-100" @click="statusMessage = ''">✕</button>
    </div>

    <!-- Discord OAuth Linkage Banner -->
    <div v-if="!discordLinked && !loading" class="panel p-8 text-center max-w-xl mx-auto space-y-6 bg-surface-900/60 border border-surface-700/30 backdrop-blur-md" style="margin-top: 40px;">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-3xl">
        🔌
      </div>
      <div class="space-y-2">
        <h2 class="text-xl font-bold text-white">Lier mon compte Discord</h2>
        <p class="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
          Associez votre compte Discord pour récupérer automatiquement vos serveurs et configurer vos alertes de combat, stats et opportunités.
        </p>
      </div>
      <div class="pt-2">
        <a href="/api/v1/auth/discord/login" class="ds-btn primary md inline-flex items-center gap-2">
          <span>Connexion avec Discord</span>
          <span>→</span>
        </a>
      </div>
    </div>

    <div v-else-if="!loading" class="settings-layout">
      <!-- Sidenav - Configurations & Guilds List -->
      <nav class="settings-nav panel">
        <div class="panel-header px-4 py-3 border-b border-surface-700/30 flex items-center justify-between bg-surface-950">
          <span class="text-xs uppercase font-extrabold tracking-widest text-amber-500">Mes Serveurs</span>
          <span class="text-[10px] text-gray-400 bg-surface-800 px-2 py-0.5 rounded">@{{ discordUsername }}</span>
        </div>
        
        <div class="sn-links p-2 space-y-1">
          <!-- Active Configs -->
          <div v-if="configs.length > 0">
            <div class="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest px-3 py-1 mt-1 mb-1">Bots Actifs</div>
            <button
              v-for="config in configs"
              :key="config.id"
              :class="['sn-link w-full text-left flex items-center justify-between', selectedConfig?.id === config.id && 'active']"
              @click="selectConfig(config)"
            >
              <span class="flex items-center gap-2 truncate">
                <span class="guild-avatar-placeholder">🤖</span>
                <span class="truncate">{{ config.name }}</span>
              </span>
            </button>
          </div>

          <!-- Unconfigured Guilds retrieved from OAuth -->
          <div v-if="unconfiguredGuilds.length > 0">
            <div class="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest px-3 py-1 mt-3 mb-1">Mes Serveurs Discord</div>
            <button
              v-for="guild in unconfiguredGuilds"
              :key="guild.id"
              :class="['sn-link w-full text-left flex items-center justify-between opacity-80 hover:opacity-100', selectedConfig?.id === guild.id && 'active']"
              @click="selectGuild(guild)"
            >
              <span class="flex items-center gap-2 truncate text-gray-300">
                <span class="guild-avatar-placeholder">🛡️</span>
                <span class="truncate">{{ guild.name }}</span>
              </span>
              <span class="text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 shrink-0">Lier</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Config Panel -->
      <div class="settings-content">
        <div class="panel settings-panel">
          <div class="sp-head flex items-center justify-between">
            <span>{{ selectedConfig?.id ? `Configuration : ${form.name}` : 'Sélectionnez un serveur Discord pour configurer son Bot' }}</span>
            <button
              v-if="selectedConfig?.id"
              class="ds-btn ghost danger sm hover:bg-red-500/10 hover:text-red-400"
              @click="deleteConfig(selectedConfig.id)"
            >
              Déconnecter
            </button>
          </div>

          <!-- Empty state when no server is selected -->
          <div v-if="!form.id" class="p-12 text-center text-gray-500 space-y-4">
            <span class="text-4xl block">👈</span>
            <p class="text-sm">Veuillez sélectionner l'un de vos serveurs Discord dans le menu de gauche pour démarrer la configuration.</p>
          </div>

          <div v-else class="sp-body sp-rows">
            <!-- Tabs inside panel body to clean up form -->
            <div class="flex border-b border-surface-700/30 mb-6 gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                :class="['px-4 py-2 text-xs font-bold transition-all border-b-2', activeTab === tab.id ? 'border-amber-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200']"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <!-- Tab 1: General Settings -->
            <div v-if="activeTab === 'general'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Discord Server ID</div>
                  <div class="sp-row-sub">L'identifiant unique de votre serveur Discord (rempli automatiquement).</div>
                </div>
                <input
                  v-model="form.id"
                  type="text"
                  class="ds-input"
                  style="width: 280px;"
                  disabled
                />
              </div>

              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Nom du Serveur</div>
                  <div class="sp-row-sub">Le nom de votre communauté Discord tel qu'affiché.</div>
                </div>
                <input
                  v-model="form.name"
                  type="text"
                  class="ds-input"
                  style="width: 280px;"
                  placeholder="Ex: Guilde Albion FR"
                />
              </div>

              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">ID de Guilde Albion</div>
                  <div class="sp-row-sub">L'ID technique de votre guilde en jeu pour synchroniser le killboard et les stats.</div>
                </div>
                <input
                  v-model="form.guildId"
                  type="text"
                  class="ds-input"
                  style="width: 280px;"
                  placeholder="Ex: d1A2f... ou nom exact"
                />
              </div>

              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Nom de Guilde Albion</div>
                  <div class="sp-row-sub">Le nom affiché en jeu de votre guilde.</div>
                </div>
                <input
                  v-model="form.guildName"
                  type="text"
                  class="ds-input"
                  style="width: 280px;"
                  placeholder="Ex: La confrerie"
                />
              </div>

              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Connexion Serveur Albion</div>
                  <div class="sp-row-sub">Spécifiez sur quelle région de serveur votre guilde Albion est installée.</div>
                </div>
                <select v-model="form.serverConnection" class="ds-input" style="width: 280px;">
                  <option value="WEST">Americas (West)</option>
                  <option value="EAST">Asia (East)</option>
                  <option value="EUROPE">Europe</option>
                </select>
              </div>
            </div>

            <!-- Tab 2: Killboard Module -->
            <div v-if="activeTab === 'killboard'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer le module Killboard</div>
                  <div class="sp-row-sub">Diffusez en temps réel les combats (kills et décès) de votre guilde.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.killboardEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div v-if="form.killboardEnabled" class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Canal Discord pour le Killboard</div>
                  <div class="sp-row-sub">L'ID du salon textuel où publier les rapports de combats.</div>
                </div>
                <input
                  v-model="form.killboardChannelId"
                  type="text"
                  class="ds-input"
                  style="width: 280px;"
                  placeholder="Ex: 987654321098765432"
                />
              </div>
            </div>

            <!-- Tab 3: Guild Stats Dashboard -->
            <div v-if="activeTab === 'stats'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer le module de statistiques de Guilde</div>
                  <div class="sp-row-sub">Affiche un message permanent actualisé chaque minute avec les scores et effectifs de votre guilde.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.statsEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <template v-if="form.statsEnabled">
                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour les statistiques</div>
                    <div class="sp-row-sub">L'ID du salon textuel où le bot enverra et modifiera le message de statistiques.</div>
                  </div>
                  <input
                    v-model="form.statsChannelId"
                    type="text"
                    class="ds-input"
                    style="width: 280px;"
                    placeholder="Ex: 987654321098765432"
                  />
                </div>

                <div v-if="form.statsMessageId" class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Identifiant du Message Actif</div>
                    <div class="sp-row-sub">ID du message actuellement mis à jour. Effacer ce champ permet au bot de créer un nouveau message.</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <code class="text-xs bg-surface-800 px-2 py-1 rounded">{{ form.statsMessageId }}</code>
                    <button class="text-xs text-red-400 underline hover:text-red-300" @click="form.statsMessageId = null">Réinitialiser</button>
                  </div>
                </div>
              </template>
            </div>

            <!-- Tab 4: Server Status -->
            <div v-if="activeTab === 'status'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer le suivi de l'état des serveurs</div>
                  <div class="sp-row-sub">Affiche et modifie dynamiquement le statut en ligne/maintenance des serveurs officiels d'Albion.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.serverStatusEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <template v-if="form.serverStatusEnabled">
                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour le statut serveur</div>
                    <div class="sp-row-sub">Salon textuel pour héberger le tableau d'état des serveurs.</div>
                  </div>
                  <input
                    v-model="form.serverStatusChannelId"
                    type="text"
                    class="ds-input"
                    style="width: 280px;"
                    placeholder="Ex: 987654321098765432"
                  />
                </div>

                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Région à surveiller</div>
                    <div class="sp-row-sub">Choisissez de surveiller tous les serveurs Albion ou un seul en particulier.</div>
                  </div>
                  <select v-model="form.serverStatusRegion" class="ds-input" style="width: 280px;">
                    <option value="ALL">Tous les serveurs (ALL)</option>
                    <option value="WEST">Americas (West) seulement</option>
                    <option value="EAST">Asia (East) seulement</option>
                    <option value="EUROPE">Europe seulement</option>
                  </select>
                </div>
              </template>
            </div>

            <!-- Tab 5: Profit Alerts -->
            <div v-if="activeTab === 'alerts'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer les alertes de profit de craft</div>
                  <div class="sp-row-sub">Publie automatiquement des fiches d'opportunités de marchés à fortes marges directement dans votre serveur.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.profitAlertsEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <template v-if="form.profitAlertsEnabled">
                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour les alertes</div>
                    <div class="sp-row-sub">Salon textuel où le bot publiera les opportunités économiques.</div>
                  </div>
                  <input
                    v-model="form.profitAlertsChannelId"
                    type="text"
                    class="ds-input"
                    style="width: 280px;"
                    placeholder="Ex: 987654321098765432"
                  />
                </div>

                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Marge minimale de Profit (%)</div>
                    <div class="sp-row-sub">Le seuil de rentabilité minimal nécessaire pour déclencher une alerte.</div>
                  </div>
                  <input
                    v-model="form.profitAlertsMinMargin"
                    type="number"
                    min="1"
                    max="100"
                    class="ds-input"
                    style="width: 280px;"
                  />
                </div>
              </template>
            </div>

            <!-- Tab: Daily Event -->
            <div v-if="activeTab === 'event'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer les annonces d'événements journaliers</div>
                  <div class="sp-row-sub">Publiez automatiquement les bonus d'activités (Renommée, Craft, Récolte) dans votre Discord.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.dailyEventEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <template v-if="form.dailyEventEnabled">
                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour les annonces</div>
                    <div class="sp-row-sub">Salon textuel où le bot publiera la mise à jour de l'événement.</div>
                  </div>
                  <input
                    v-model="form.dailyEventChannelId"
                    type="text"
                    class="ds-input"
                    style="width: 280px;"
                    placeholder="Ex: 987654321098765432"
                  />
                </div>

                <div class="sp-row flex-col items-start gap-3">
                  <div class="sp-row-info w-full">
                    <div class="sp-row-label">Description de l'événement actif du jour</div>
                    <div class="sp-row-sub">Entrez les bonus du jour à annoncer à vos joueurs (ex: "+20% Fame en Hellgates et +10% de RRR sur les Bâtons de Nature à Lymhurst").</div>
                  </div>
                  <textarea
                    v-model="form.dailyEventText"
                    class="ds-input w-full min-h-[120px] py-2 px-3 resize-none bg-surface-900 border border-surface-700/50 rounded-lg text-sm text-white"
                    placeholder="Saisissez les bonus actifs du jour..."
                  ></textarea>
                </div>
              </template>
            </div>

            <!-- Tab 6: Commands & Features -->
            <div v-if="activeTab === 'commands'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer la commande /item</div>
                  <div class="sp-row-sub">Permet aux membres de rechercher un item et de voir ses prix en direct via le chat.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.itemSearchEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer la commande /crafting-tree</div>
                  <div class="sp-row-sub">Permet d'afficher la hiérarchie d'artisanat complète et les composants d'un item.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.craftingTreeEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex justify-end gap-3 pt-6 border-t border-surface-700/30">
              <a :href="specificInviteLink" target="_blank" class="ds-btn secondary sm flex items-center gap-1">
                🔗 Inviter le Bot sur ce serveur
              </a>
              <button
                class="ds-btn primary sm"
                :disabled="saving"
                @click="saveConfig"
              >
                {{ saving ? 'Enregistrement...' : 'Enregistrer la configuration' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const auth = useAuth()

onMounted(() => {
  if (!auth.isPremium.value) {
    navigateTo('/premium/subscribe')
  } else {
    loadGuildsAndConfigs()
  }
})

interface DiscordGuildConfig {
  id: string
  name: string
  icon?: string | null
  userId: string
  guildId?: string | null
  guildName?: string | null
  serverConnection: string
  killboardEnabled: boolean
  killboardChannelId?: string | null
  statsEnabled: boolean
  statsChannelId?: string | null
  statsMessageId?: string | null
  serverStatusEnabled: boolean
  serverStatusChannelId?: string | null
  serverStatusRegion: string
  profitAlertsEnabled: boolean
  profitAlertsChannelId?: string | null
  profitAlertsMinMargin: number
  dailyEventEnabled: boolean
  dailyEventChannelId?: string | null
  dailyEventText?: string | null
  itemSearchEnabled: boolean
  craftingTreeEnabled: boolean
}

interface DiscordGuildInfo {
  id: string
  name: string
  icon?: string | null
  botAdded?: boolean
}

const discordLinked = ref(false)
const discordUsername = ref('')
const configs = ref<DiscordGuildConfig[]>([])
const allGuilds = ref<DiscordGuildInfo[]>([])

const selectedConfig = ref<DiscordGuildConfig | null>(null)
const clientId = ref('123456789012345678')
const loading = ref(true)
const saving = ref(false)
const statusMessage = ref('')
const isError = ref(false)

const activeTab = ref('general')
const tabs = [
  { id: 'general', label: 'Général' },
  { id: 'killboard', label: 'Killboard' },
  { id: 'stats', label: 'Stats' },
  { id: 'status', label: 'Statut Serveur' },
  { id: 'alerts', label: 'Alerte Profits' },
  { id: 'event', label: 'Événement' },
  { id: 'commands', label: 'Commandes' },
]

const form = ref<Partial<DiscordGuildConfig>>({
  id: '',
  name: '',
  icon: null,
  guildId: '',
  guildName: '',
  serverConnection: 'WEST',
  killboardEnabled: false,
  killboardChannelId: '',
  statsEnabled: false,
  statsChannelId: '',
  statsMessageId: null,
  serverStatusEnabled: false,
  serverStatusChannelId: '',
  serverStatusRegion: 'ALL',
  profitAlertsEnabled: false,
  profitAlertsChannelId: '',
  profitAlertsMinMargin: 10,
  dailyEventEnabled: false,
  dailyEventChannelId: '',
  dailyEventText: '',
  itemSearchEnabled: true,
  craftingTreeEnabled: true,
})

const inviteLink = computed(() => {
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId.value}&permissions=2147483648&scope=bot%20applications.commands`
})

const specificInviteLink = computed(() => {
  if (!form.value.id) return inviteLink.value
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId.value}&permissions=2147483648&scope=bot%20applications.commands&guild_id=${form.value.id}&disable_guild_select=true`
})

const unconfiguredGuilds = computed(() => {
  const activeIds = new Set(configs.value.map(c => c.id))
  return allGuilds.value.filter(g => !activeIds.has(g.id))
})

async function loadGuildsAndConfigs() {
  loading.value = true
  try {
    // 1. Fetch OAuth status and user's administrable guilds
    const resGuilds = await $fetch<{ linked: boolean, discordUsername?: string, guilds: DiscordGuildInfo[] }>('/api/v1/premium/bot/guilds')
    discordLinked.value = resGuilds.linked
    if (resGuilds.linked) {
      discordUsername.value = resGuilds.discordUsername || ''
      allGuilds.value = resGuilds.guilds
    }

    // 2. Fetch existing saved configs in the DB
    const resConfigs = await $fetch<{ data: DiscordGuildConfig[], clientId: string }>('/api/v1/premium/bot')
    configs.value = resConfigs.data
    clientId.value = resConfigs.clientId
    
    // Select first active configuration if available, otherwise stay clean
    if (configs.value.length > 0) {
      selectConfig(configs.value[0])
    } else if (unconfiguredGuilds.value.length > 0) {
      selectGuild(unconfiguredGuilds.value[0])
    }
  } catch (err) {
    showStatus('Impossible de charger vos données Discord.', true)
  } finally {
    loading.value = false
  }
}

function selectConfig(config: DiscordGuildConfig) {
  selectedConfig.value = config
  form.value = { ...config }
  activeTab.value = 'general'
}

function selectGuild(guild: DiscordGuildInfo) {
  selectedConfig.value = null
  form.value = {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    guildId: '',
    guildName: '',
    serverConnection: 'WEST',
    killboardEnabled: false,
    killboardChannelId: '',
    statsEnabled: false,
    statsChannelId: '',
    statsMessageId: null,
    serverStatusEnabled: false,
    serverStatusChannelId: '',
    serverStatusRegion: 'ALL',
    profitAlertsEnabled: false,
    profitAlertsChannelId: '',
    profitAlertsMinMargin: 10,
    dailyEventEnabled: false,
    dailyEventChannelId: '',
    dailyEventText: '',
    itemSearchEnabled: true,
    craftingTreeEnabled: true,
  }
  activeTab.value = 'general'
}

async function saveConfig() {
  if (!form.value.id || !form.value.name) {
    showStatus('Le serveur sélectionné est invalide.', true)
    return
  }

  saving.value = true
  try {
    const res = await $fetch<{ data: DiscordGuildConfig }>('/api/v1/premium/bot', {
      method: 'POST',
      body: form.value,
    })
    
    showStatus('Configuration du bot enregistrée avec succès !', false)
    await loadGuildsAndConfigs()
    
    const saved = configs.value.find(c => c.id === res.data.id)
    if (saved) {
      selectConfig(saved)
    }
  } catch (err: any) {
    const msg = err.data?.message ?? "Erreur lors de l'enregistrement de la configuration."
    showStatus(msg, true)
  } finally {
    saving.value = false
  }
}

async function deleteConfig(id: string) {
  if (!confirm('Êtes-vous sûr de vouloir déconnecter ce serveur Discord ? Toutes les alertes et configurations associées seront supprimées.')) return

  try {
    await $fetch(`/api/v1/premium/bot/${id}`, {
      method: 'DELETE',
    })
    
    showStatus('Configuration du serveur déconnectée.', false)
    await loadGuildsAndConfigs()
    
    if (configs.value.length > 0) {
      selectConfig(configs.value[0])
    } else {
      selectedConfig.value = null
      form.value = {}
    }
  } catch (err) {
    showStatus('Erreur lors du retrait de la configuration.', true)
  }
}

function showStatus(msg: string, error: boolean = false) {
  statusMessage.value = msg
  isError.value = error
  setTimeout(() => {
    if (statusMessage.value === msg) {
      statusMessage.value = ''
    }
  }, 5000)
}
</script>

<style scoped>
.switch-label {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  flex-shrink: 0;
}
.switch-input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-3);
  border: 1px solid var(--border-divider);
  transition: .2s;
  border-radius: 24px;
}
.switch-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-3);
  transition: .2s;
  border-radius: 50%;
}
.switch-input:checked + .switch-slider {
  background-color: rgba(201,161,74,0.2);
  border-color: var(--gold);
}
.switch-input:checked + .switch-slider:before {
  transform: translateX(24px);
  background-color: var(--gold);
}
.guild-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--bg-3);
  border: 1px solid var(--border-divider);
  font-size: 11px;
}
.alert-banner {
  background-color: rgba(34,197,94,0.1);
  border-color: rgba(34,197,94,0.3);
  color: #4ade80;
}
.alert-banner.error {
  background-color: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.3);
  color: #f87171;
}
</style>
