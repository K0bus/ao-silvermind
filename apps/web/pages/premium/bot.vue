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
          <!-- Installed Guilds -->
          <div v-if="installedGuilds.length > 0">
            <div class="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest px-3 py-1 mt-1 mb-1">Serveurs Connectés</div>
            <button
              v-for="guild in installedGuilds"
              :key="guild.id"
              :class="['sn-link w-full text-left flex items-center justify-between', form.id === guild.id && 'active']"
              @click="selectActiveGuild(guild)"
            >
              <span class="flex items-center gap-2 truncate">
                <span class="guild-avatar-placeholder">🤖</span>
                <span class="truncate">{{ guild.name }}</span>
              </span>
              <span v-if="hasSavedConfig(guild.id)" class="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">Actif</span>
              <span v-else class="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">À configurer</span>
            </button>
          </div>

          <!-- Uninstalled Guilds -->
          <div v-if="uninstalledGuilds.length > 0">
            <div class="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest px-3 py-1 mt-3 mb-1">Serveurs Disponibles</div>
            <button
              v-for="guild in uninstalledGuilds"
              :key="guild.id"
              :class="['sn-link w-full text-left flex items-center justify-between opacity-80 hover:opacity-100', form.id === guild.id && 'active']"
              @click="selectInactiveGuild(guild)"
            >
              <span class="flex items-center gap-2 truncate text-gray-300">
                <span class="guild-avatar-placeholder">🛡️</span>
                <span class="truncate">{{ guild.name }}</span>
              </span>
              <span class="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">Installer</span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Config Panel -->
      <div class="settings-content animate-fade-in">
        <div class="panel settings-panel">
          <div class="sp-head flex items-center justify-between bg-surface-950 px-4 py-3 border-b border-surface-700/30">
            <span>{{ form.id ? `Configuration : ${form.name}` : 'Sélectionnez un serveur Discord pour configurer son Bot' }}</span>
            <button
              v-if="form.id && isBotInstalledOnSelected && hasSavedConfig(form.id)"
              class="ds-btn ghost danger sm hover:bg-red-500/10 hover:text-red-400"
              @click="deleteConfig(form.id)"
            >
              Déconnecter
            </button>
          </div>

          <!-- Empty state when no server is selected -->
          <div v-if="!form.id" class="p-12 text-center text-gray-500 space-y-4">
            <span class="text-4xl block">👈</span>
            <p class="text-sm">Veuillez sélectionner l'un de vos serveurs Discord dans le menu de gauche pour démarrer la configuration.</p>
          </div>

          <!-- Hero Panel when the bot is not installed on the selected server -->
          <div v-else-if="!isBotInstalledOnSelected" class="p-16 text-center space-y-6 max-w-xl mx-auto animate-scale-in">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-3xl">
              🤖
            </div>
            <div class="space-y-2">
              <h2 class="text-xl font-bold text-white">Installer Albion SilverMind sur {{ form.name }}</h2>
              <p class="text-sm text-gray-400 leading-relaxed">
                Le bot n'est pas encore présent sur votre serveur Discord. Pour activer et configurer les modules d'alertes de profit, de killboard et de statistiques, vous devez d'abord inviter le bot.
              </p>
            </div>
            <div class="pt-4 flex justify-center gap-3">
              <a :href="specificInviteLink" target="_blank" class="ds-btn primary md inline-flex items-center gap-2">
                <span>Inviter le Bot</span>
                <span>🔗</span>
              </a>
            </div>
          </div>

          <!-- Active Form when the bot is installed -->
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
                  <div class="sp-row-label">Guilde Albion</div>
                  <div class="sp-row-sub">Recherchez et sélectionnez votre guilde Albion en jeu pour synchroniser le killboard et les stats.</div>
                </div>
                <div class="relative animate-fade-in" style="width: 280px;">
                  <div class="ps-input-wrap">
                    <svg class="ps-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      v-model="searchQuery"
                      class="ds-input ps-input"
                      style="width: 100%; padding-left: 36px;"
                      type="text"
                      placeholder="Rechercher une guilde…"
                      autocomplete="off"
                      @focus="searchIsOpen = true"
                      @blur="onBlurSearch"
                    />
                    <button v-if="searchQuery" class="ps-clear" @mousedown.prevent="clearSearch" type="button">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <div v-if="searchIsOpen && (searchResults.length > 0 || searchSearching || searchQuery.length >= 2)" class="ps-dropdown">
                    <div v-if="searchSearching" class="ps-loading t-dim">Recherche…</div>
                    <template v-else-if="searchResults.length > 0">
                      <div class="ps-section">
                        <button
                          v-for="g in searchResults"
                          :key="g.Id"
                          class="ps-item"
                          type="button"
                          @mousedown.prevent="selectSearchGuild(g)"
                        >
                          <span class="ps-avatar guild">G</span>
                          <div class="flex flex-col text-left">
                            <span class="ps-item-name">{{ g.Name }}</span>
                            <span class="text-[10px] text-gray-500 font-mono leading-none mt-0.5">{{ g.Id }}</span>
                          </div>
                        </button>
                      </div>
                    </template>
                    <div v-else-if="searchQuery.length >= 2 && !searchSearching" class="ps-empty t-dim">
                      Aucun résultat pour "{{ searchQuery }}"
                    </div>
                  </div>
                </div>
              </div>

              <!-- Selected guild badge display -->
              <div v-if="form.guildId" class="sp-row pt-2 border-t border-dashed border-border-divider animate-fade-in">
                <div class="sp-row-info">
                  <div class="sp-row-label">Guilde Sélectionnée</div>
                  <div class="sp-row-sub">Détails de la guilde active synchronisée.</div>
                </div>
                <div class="flex flex-col items-end gap-1" style="width: 280px;">
                  <span class="text-sm font-semibold text-gold">{{ form.guildName }}</span>
                  <code class="text-[11px] bg-surface-800 px-2 py-0.5 rounded text-gray-400 font-mono">{{ form.guildId }}</code>
                </div>
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

              <div v-if="form.killboardEnabled" class="sp-row animate-fade-in">
                <div class="sp-row-info">
                  <div class="sp-row-label">Canal Discord pour le Killboard</div>
                  <div class="sp-row-sub">L'ID du salon textuel où publier les rapports de combats.</div>
                </div>
                <div class="flex gap-2" style="width: 280px;">
                  <input
                    v-model="form.killboardChannelId"
                    type="text"
                    class="ds-input flex-1"
                    placeholder="Ex: 987654321098765432"
                  />
                  <button class="ds-btn border border-border-divider px-3 flex items-center justify-center hover:bg-bg-4" type="button" @click="openChannelSelector('killboardChannelId', 'Sélectionner le salon Killboard')" title="Sélectionner le salon">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
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
                <div class="sp-row animate-fade-in">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour les statistiques</div>
                    <div class="sp-row-sub">L'ID du salon textuel où le bot enverra et modifiera le message de statistiques.</div>
                  </div>
                  <div class="flex gap-2" style="width: 280px;">
                    <input
                      v-model="form.statsChannelId"
                      type="text"
                      class="ds-input flex-1"
                      placeholder="Ex: 987654321098765432"
                    />
                    <button class="ds-btn border border-border-divider px-3 flex items-center justify-center hover:bg-bg-4" type="button" @click="openChannelSelector('statsChannelId', 'Sélectionner le salon Stats')" title="Sélectionner le salon">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
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
                <div class="sp-row animate-fade-in">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour le statut serveur</div>
                    <div class="sp-row-sub">Salon textuel pour héberger le tableau d'état des serveurs.</div>
                  </div>
                  <div class="flex gap-2" style="width: 280px;">
                    <input
                      v-model="form.serverStatusChannelId"
                      type="text"
                      class="ds-input flex-1"
                      placeholder="Ex: 987654321098765432"
                    />
                    <button class="ds-btn border border-border-divider px-3 flex items-center justify-center hover:bg-bg-4" type="button" @click="openChannelSelector('serverStatusChannelId', 'Sélectionner le salon Statut')" title="Sélectionner le salon">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                </div>

                <div v-if="form.serverStatusMessageId" class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Identifiant du Message Actif</div>
                    <div class="sp-row-sub">ID du message actuellement mis à jour. Effacer ce champ permet au bot de créer un nouveau message.</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <code class="text-xs bg-surface-800 px-2 py-1 rounded">{{ form.serverStatusMessageId }}</code>
                    <button class="text-xs text-red-400 underline hover:text-red-300" @click="form.serverStatusMessageId = null">Réinitialiser</button>
                  </div>
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
                <div class="sp-row animate-fade-in">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour les alertes</div>
                    <div class="sp-row-sub">Salon textuel où le bot publiera les opportunités économiques.</div>
                  </div>
                  <div class="flex gap-2" style="width: 280px;">
                    <input
                      v-model="form.profitAlertsChannelId"
                      type="text"
                      class="ds-input flex-1"
                      placeholder="Ex: 987654321098765432"
                    />
                    <button class="ds-btn border border-border-divider px-3 flex items-center justify-center hover:bg-bg-4" type="button" @click="openChannelSelector('profitAlertsChannelId', 'Sélectionner le salon Alertes')" title="Sélectionner le salon">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
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
                <div class="sp-row animate-fade-in">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour les annonces</div>
                    <div class="sp-row-sub">Salon textuel où le bot publiera la mise à jour de l'événement.</div>
                  </div>
                  <div class="flex gap-2" style="width: 280px;">
                    <input
                      v-model="form.dailyEventChannelId"
                      type="text"
                      class="ds-input flex-1"
                      placeholder="Ex: 987654321098765432"
                    />
                    <button class="ds-btn border border-border-divider px-3 flex items-center justify-center hover:bg-bg-4" type="button" @click="openChannelSelector('dailyEventChannelId', 'Sélectionner le salon Annonces')" title="Sélectionner le salon">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
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

            <!-- Tab: Top 5 Craft Embed -->
            <div v-if="activeTab === 'profitEmbed'" class="space-y-6">
              <div class="sp-row">
                <div class="sp-row-info">
                  <div class="sp-row-label">Activer l'embed du Top 5 rentabilité</div>
                  <div class="sp-row-sub">Affiche un message permanent actualisé avec le top 5 des crafts les plus profitables de la ville configurée.</div>
                </div>
                <label class="switch-label">
                  <input v-model="form.profitEmbedEnabled" type="checkbox" class="switch-input" />
                  <span class="switch-slider"></span>
                </label>
              </div>

              <template v-if="form.profitEmbedEnabled">
                <div class="sp-row animate-fade-in">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Canal Discord pour le Top 5</div>
                    <div class="sp-row-sub">L'ID du salon textuel où le bot publiera et actualisera le message du Top 5.</div>
                  </div>
                  <div class="flex gap-2" style="width: 280px;">
                    <input
                      v-model="form.profitEmbedChannelId"
                      type="text"
                      class="ds-input flex-1"
                      placeholder="Ex: 987654321098765432"
                    />
                    <button class="ds-btn border border-border-divider px-3 flex items-center justify-center hover:bg-bg-4" type="button" @click="openChannelSelector('profitEmbedChannelId', 'Sélectionner le salon Top 5')" title="Sélectionner le salon">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  </div>
                </div>

                <div v-if="form.profitEmbedMessageId" class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Identifiant du Message Actif</div>
                    <div class="sp-row-sub">ID du message actuellement mis à jour. Effacer ce champ permet au bot de créer un nouveau message.</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <code class="text-xs bg-surface-800 px-2 py-1 rounded">{{ form.profitEmbedMessageId }}</code>
                    <button class="text-xs text-red-400 underline hover:text-red-300" @click="form.profitEmbedMessageId = null">Réinitialiser</button>
                  </div>
                </div>

                <div class="sp-row">
                  <div class="sp-row-info">
                    <div class="sp-row-label">Ville pour le calcul</div>
                    <div class="sp-row-sub">Choisissez la ville de référence pour le calcul de rentabilité.</div>
                  </div>
                  <select v-model="form.profitEmbedCityId" class="ds-input" style="width: 280px;">
                    <option value="Caerleon">Caerleon</option>
                    <option value="Bridgewatch">Bridgewatch</option>
                    <option value="FortSterling">Fort Sterling</option>
                    <option value="Lymhurst">Lymhurst</option>
                    <option value="Martlock">Martlock</option>
                    <option value="Thetford">Thetford</option>
                    <option value="Brecilien">Brecilien</option>
                  </select>
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
  <!-- Channel Selector Modal -->
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="channelModalOpen" class="confirm-overlay" @click.self="channelModalOpen = false">
        <div class="confirm-modal channel-selector-modal animate-scale-in" role="dialog" aria-modal="true">
          <div class="confirm-head">
            <div>
              <p class="confirm-eyebrow">Discord Bot</p>
              <h3 class="confirm-title">{{ channelModalTitle }}</h3>
            </div>
            <button class="confirm-close" @click="channelModalOpen = false" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="my-4">
            <div class="ps-input-wrap mb-3">
              <svg class="ps-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                v-model="channelsSearchQuery"
                class="ds-input ps-input"
                style="width: 100%; padding-left: 36px;"
                type="text"
                placeholder="Filtrer les salons textuels…"
                autocomplete="off"
              />
              <button v-if="channelsSearchQuery" class="ps-clear" @click="channelsSearchQuery = ''" type="button">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div v-if="channelsLoading" class="flex flex-col items-center justify-center py-8 t-dim text-sm">
              <span class="animate-pulse">Chargement des salons Discord…</span>
            </div>

            <div v-else-if="filteredChannels.length === 0" class="py-8 text-center t-dim text-sm">
              Aucun salon textuel trouvé
            </div>

            <div v-else class="channel-list scrollable">
              <button
                v-for="c in filteredChannels"
                :key="c.id"
                class="channel-item"
                type="button"
                @click="selectChannel(c)"
              >
                <span class="channel-hashtag">#</span>
                <div class="flex flex-col text-left">
                  <span class="channel-name">{{ c.name }}</span>
                  <span class="channel-id">{{ c.id }}</span>
                </div>
              </button>
            </div>
          </div>

          <div class="confirm-actions">
            <button class="ds-btn" @click="channelModalOpen = false" type="button">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

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
  serverStatusMessageId?: string | null
  serverStatusRegion: string
  profitAlertsEnabled: boolean
  profitAlertsChannelId?: string | null
  profitAlertsMinMargin: number
  dailyEventEnabled: boolean
  dailyEventChannelId?: string | null
  dailyEventText?: string | null
  profitEmbedEnabled: boolean
  profitEmbedChannelId?: string | null
  profitEmbedMessageId?: string | null
  profitEmbedCityId?: string | null
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

const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchSearching = ref(false)
const searchIsOpen = ref(false)
let debounceTimeout: any = null
let ignoreSearchWatch = false

function triggerSearch() {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  debounceTimeout = setTimeout(async () => {
    searchSearching.value = true
    try {
      const res = await $fetch<any>('/api/v1/pvp/search', {
        query: { q: searchQuery.value },
      })
      searchResults.value = res.data?.guilds || []
    } catch (err) {
      console.error('Failed to search guilds:', err)
      searchResults.value = []
    } finally {
      searchSearching.value = false
    }
  }, 300)
}

watch(searchQuery, () => {
  if (ignoreSearchWatch) return
  triggerSearch()
})

function selectSearchGuild(g: any) {
  ignoreSearchWatch = true
  form.value.guildId = g.Id
  form.value.guildName = g.Name
  searchQuery.value = g.Name
  searchIsOpen.value = false
  setTimeout(() => {
    ignoreSearchWatch = false
  }, 100)
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  form.value.guildId = ''
  form.value.guildName = ''
}

function onBlurSearch() {
  setTimeout(() => {
    searchIsOpen.value = false
  }, 150)
}

const channelModalOpen = ref(false)
const channelModalField = ref<'killboardChannelId' | 'statsChannelId' | 'serverStatusChannelId' | 'profitAlertsChannelId' | 'dailyEventChannelId' | 'profitEmbedChannelId' | null>(null)
const channelModalTitle = ref('')
const discordChannels = ref<any[]>([])
const channelsLoading = ref(false)
const channelsSearchQuery = ref('')

async function openChannelSelector(field: 'killboardChannelId' | 'statsChannelId' | 'serverStatusChannelId' | 'profitAlertsChannelId' | 'dailyEventChannelId' | 'profitEmbedChannelId', title: string) {
  channelModalField.value = field
  channelModalTitle.value = title
  channelsSearchQuery.value = ''
  channelModalOpen.value = true
  
  if (discordChannels.value.length === 0) {
    channelsLoading.value = true
    try {
      const res = await $fetch<any>('/api/v1/premium/bot/channels', {
        query: { guildId: form.value.id },
      })
      discordChannels.value = res.data || []
    } catch (err) {
      console.error('Failed to load channels:', err)
      discordChannels.value = []
    } finally {
      channelsLoading.value = false
    }
  }
}

const filteredChannels = computed(() => {
  if (!channelsSearchQuery.value) return discordChannels.value
  const q = channelsSearchQuery.value.toLowerCase()
  return discordChannels.value.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q))
})

function selectChannel(c: any) {
  if (channelModalField.value) {
    form.value[channelModalField.value] = c.id
  }
  channelModalOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && channelModalOpen.value) {
    channelModalOpen.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
const tabs = [
  { id: 'general', label: 'Général' },
  { id: 'killboard', label: 'Killboard' },
  { id: 'stats', label: 'Stats' },
  { id: 'status', label: 'Statut Serveur' },
  { id: 'alerts', label: 'Alerte Profits' },
  { id: 'event', label: 'Événement' },
  { id: 'profitEmbed', label: 'Top 5 Craft' },
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
  serverStatusMessageId: null,
  serverStatusRegion: 'ALL',
  profitAlertsEnabled: false,
  profitAlertsChannelId: '',
  profitAlertsMinMargin: 10,
  dailyEventEnabled: false,
  dailyEventChannelId: '',
  dailyEventText: '',
  profitEmbedEnabled: false,
  profitEmbedChannelId: '',
  profitEmbedMessageId: null,
  profitEmbedCityId: 'Caerleon',
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

const installedGuilds = computed(() => {
  return allGuilds.value.filter(g => g.botAdded)
})

const uninstalledGuilds = computed(() => {
  return allGuilds.value.filter(g => !g.botAdded)
})

const isBotInstalledOnSelected = computed(() => {
  if (!form.value.id) return false
  const match = allGuilds.value.find(g => g.id === form.value.id)
  return match ? match.botAdded : false
})

function hasSavedConfig(guildId: string) {
  return configs.value.some(c => c.id === guildId)
}

function selectActiveGuild(guild: DiscordGuildInfo) {
  const saved = configs.value.find(c => c.id === guild.id)
  if (saved) {
    selectedConfig.value = saved
    form.value = { ...saved }
    searchQuery.value = saved.guildName || ''
  } else {
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
      serverStatusMessageId: null,
      serverStatusRegion: 'ALL',
      profitAlertsEnabled: false,
      profitAlertsChannelId: '',
      profitAlertsMinMargin: 10,
      dailyEventEnabled: false,
      dailyEventChannelId: '',
      dailyEventText: '',
      profitEmbedEnabled: false,
      profitEmbedChannelId: '',
      profitEmbedMessageId: null,
      profitEmbedCityId: 'Caerleon',
      itemSearchEnabled: true,
      craftingTreeEnabled: true,
    }
    searchQuery.value = ''
  }
  searchResults.value = []
  discordChannels.value = []
  activeTab.value = 'general'
}

function selectInactiveGuild(guild: DiscordGuildInfo) {
  selectedConfig.value = null
  form.value = {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
  }
  searchQuery.value = ''
  searchResults.value = []
  discordChannels.value = []
  activeTab.value = 'general'
}

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
    
    // Select first active/installed server, otherwise the first uninstalled server
    if (installedGuilds.value.length > 0) {
      selectActiveGuild(installedGuilds.value[0])
    } else if (uninstalledGuilds.value.length > 0) {
      selectInactiveGuild(uninstalledGuilds.value[0])
    }
  } catch (err) {
    showStatus('Impossible de charger vos données Discord.', true)
  } finally {
    loading.value = false
  }
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
      selectActiveGuild(saved)
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
    
    if (installedGuilds.value.length > 0) {
      selectActiveGuild(installedGuilds.value[0])
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

/* Custom interactive search styles matching PVP Search Bar */
.relative {
  position: relative;
}

.ps-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ps-icon {
  position: absolute;
  left: 12px;
  color: var(--text-4);
  pointer-events: none;
}

.ps-clear {
  position: absolute;
  right: 10px;
  padding: 4px;
  color: var(--text-4);
  border-radius: 3px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ps-clear:hover { color: var(--text-1); }

.ps-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-3);
  border: 1px solid var(--border-divider);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  overflow: hidden;
  max-height: 250px;
  overflow-y: auto;
}

.ps-loading,
.ps-empty {
  padding: 12px 16px;
  font-size: 13px;
}

.ps-section { padding: 6px 0; }

.ps-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  transition: background 0.1s;
  background: transparent;
  border: none;
  cursor: pointer;
}
.ps-item:hover { background: var(--bg-4); }

.ps-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(201,161,74,0.15);
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ps-avatar.guild {
  background: rgba(99,136,168,0.15);
  color: var(--info);
}

.ps-item-name {
  font-size: 13px;
  color: var(--text-0);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Modal and list styles for Discord Channel Selector */
.channel-selector-modal {
  max-width: 480px;
}

.channel-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border-divider);
  border-radius: var(--radius);
  background: var(--bg-3);
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.channel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.channel-item:hover {
  background: var(--bg-4);
}

.channel-hashtag {
  font-size: 18px;
  color: var(--text-4);
  font-weight: 500;
  width: 18px;
  text-align: center;
}

.channel-name {
  font-size: 13px;
  color: var(--text-0);
  font-weight: 500;
}

.channel-id {
  font-size: 10px;
  color: var(--text-4);
  font-family: var(--font-mono);
}

.my-4 {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

/* Base Modal & Overlay Styles extracted from ConfirmationModal */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirm-modal {
  width: 100%;
  max-width: 420px;
  background: var(--bg-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 18px;
}

.confirm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.confirm-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-3);
  font-family: var(--font-display);
}

.confirm-title {
  margin: 0;
  font-size: 18px;
  color: var(--text-0);
}

.confirm-close {
  padding: 4px;
  border-radius: 4px;
  color: var(--text-3);
  transition: color 0.1s, background 0.1s;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-close:hover {
  color: var(--text-0);
  background: var(--bg-3);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.16s ease;
}

.confirm-fade-enter-active .confirm-modal,
.confirm-fade-leave-active .confirm-modal {
  transition: transform 0.16s ease, opacity 0.16s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-modal,
.confirm-fade-leave-to .confirm-modal {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}
</style>
