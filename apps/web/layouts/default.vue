<template>
  <div class="app" @click="handleOutsideClick">
    <!-- ===== STICKY HEADER (navbar + mega menus) ===== -->
    <header class="sticky-header" @mouseleave="startClose">
      <nav class="navbar">
        <!-- Brand -->
        <NuxtLink to="/" class="nav-brand">
          <span class="glyph" aria-hidden="true">
            <img src="/images/silvermind/silvermind-logo.png" alt="SilverMind" width="48" height="48" />
          </span>
          <span>
            ALBION
            <span class="brand-sub">SilverMind</span>
          </span>
        </NuxtLink>

        <span class="nav-divider" />

        <!-- Nav links -->
        <div class="nav-links">
          <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }">Accueil</NuxtLink>

          <NuxtLink to="/items" class="nav-link" :class="{ active: route.path.startsWith('/items') }">Items</NuxtLink>

          <button
            class="nav-link"
            :class="{ active: route.path.startsWith('/crafting'), 'mega-open': activeMega === 'crafting' }"
            @mouseenter="openMega('crafting')"
            @click="navigate('/crafting')"
          >
            Crafting
            <svg class="caret" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <button
            class="nav-link"
            :class="{ active: route.path.startsWith('/market') || route.path.startsWith('/items/flip'), 'mega-open': activeMega === 'market' }"
            @mouseenter="openMega('market')"
            @click="navigate('/market')"
          >
            Marché
            <svg class="caret" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <NuxtLink to="/islands" class="nav-link" :class="{ active: route.path.startsWith('/islands') }">Îles</NuxtLink>
 
          <NuxtLink to="/killboard" class="nav-link" :class="{ active: route.path.startsWith('/killboard') || route.path.startsWith('/guilds') || route.path.startsWith('/alliances') || route.path.startsWith('/players') }">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;color:var(--gold)"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 3.5-3.5"/><path d="m16 16 4 4"/><path d="m9.5 4.5 5 5"/><path d="m4.5 9.5 5 5"/></svg>
            PvP
          </NuxtLink>

          <button
            class="nav-link nav-link--builds"
            :class="{ active: route.path.startsWith('/builds'), 'mega-open': activeMega === 'builds' }"
            @mouseenter="openMega('builds')"
            @click="navigate('/builds')"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;color:var(--gold)"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
            Builds
            <svg class="caret" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <button
            class="nav-link"
            :class="{ active: route.path.startsWith('/tools'), 'mega-open': activeMega === 'tools' }"
            @mouseenter="openMega('tools')"
            @click="navigate('/tools')"
          >
            Outils
            <svg class="caret" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <button
            v-if="auth.isAdmin.value"
            class="nav-link"
            :class="{ active: route.path.startsWith('/admin'), 'mega-open': activeMega === 'admin' }"
            @mouseenter="openMega('admin')"
            @click="navigate('/admin')"
          >
            Admin
            <svg class="caret" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>

        <!-- Search -->
        <ItemSearchBar ref="searchInput" is-navbar />

        <NuxtLink to="/settings" class="nav-icon-btn" aria-label="Paramètres">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
        </NuxtLink>

        <div v-if="auth.isAuthenticated.value" class="nav-user-wrap">
          <button
            type="button"
            class="nav-user-trigger"
            :aria-expanded="userMenuOpen"
            aria-haspopup="menu"
            aria-label="Menu compte"
            @click.stop="toggleUserMenu"
          >
            <span class="nav-avatar" aria-hidden="true">
              <img v-if="auth.user.value?.avatar" :src="`/game_assets/gui/avatars/${auth.user.value.avatar}`" alt="" class="nav-avatar-img" />
              <template v-else>{{ (auth.user.value?.username?.[0] ?? '?').toUpperCase() }}</template>
            </span>
            <svg class="nav-user-caret" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div v-show="userMenuOpen" class="nav-user-dropdown" role="menu">
            <div class="nav-user-meta">
              <div class="nav-user-name">{{ auth.user.value?.username }}</div>
              <div class="nav-user-email">{{ auth.user.value?.email }}</div>
            </div>
            <NuxtLink to="/builds/me" class="nav-user-item" role="menuitem" @click="userMenuOpen = false">Mes builds</NuxtLink>
            <NuxtLink to="/settings" class="nav-user-item" role="menuitem" @click="userMenuOpen = false">Paramètres</NuxtLink>
            <button type="button" class="nav-user-item nav-user-logout" role="menuitem" @click="onLogout">
              Se déconnecter
            </button>
          </div>
        </div>
        <template v-else>
          <NuxtLink to="/auth/login" class="ds-btn primary sm nav-login-btn">Se connecter</NuxtLink>
        </template>
      </nav>

      <!-- ===== MEGA MENUS ===== -->


      <div v-if="activeMega === 'crafting'" class="mega" @mouseenter="cancelClose">
        <div class="mega-grid">
          <div class="mega-col">
            <h4>Outils</h4>
            <ul>
              <li><NuxtLink to="/crafting"><div><div>Crafting Tree</div><div class="desc">Arbre vertical complet</div></div></NuxtLink></li>
              <li><NuxtLink to="/items/profit"><div><div>Analyse de profit</div><div class="desc">Profit direct · tous les items</div></div></NuxtLink></li>
              <li><NuxtLink to="/crafting"><div><div>Liste de courses</div><div class="desc">Ressources agrégées</div></div></NuxtLink></li>
            </ul>
          </div>
          <div class="mega-cta">
            <span class="label">Profit du moment</span>
            <template v-if="topProfit">
              <p style="margin-bottom:6px">
                <span style="font-weight:600;color:var(--text-0)">{{ topProfit.name }}</span>
                <span v-if="topProfit.enchantmentLevel > 0" style="color:var(--gold);margin-left:3px">.{{ topProfit.enchantmentLevel }}</span>
                <span style="color:var(--text-3);font-size:11px;margin-left:4px">T{{ topProfit.tier }}</span>
              </p>
              <p style="font-size:12px;color:var(--text-3)">
                Marge moy. <span class="t-gold t-mono" style="font-weight:600">{{ topProfit.avgMargin >= 0 ? '+' : '' }}{{ topProfit.avgMargin.toFixed(1) }}%</span>
                · meilleure à <span class="t-gold">{{ topProfit.bestCity }}</span>
              </p>
              <div style="display:flex;gap:6px;margin-top:auto">
                <NuxtLink :to="`/items/${topProfit.uniqueName}`" class="ds-btn primary sm">Voir l'item →</NuxtLink>
                <NuxtLink to="/items/profit" class="ds-btn sm">Tous les profits</NuxtLink>
              </div>
            </template>
            <template v-else>
              <p>Calcul de la meilleure opportunité craft en cours…</p>
              <NuxtLink to="/items/profit" class="ds-btn primary sm" style="margin-top:auto">Analyse de profit →</NuxtLink>
            </template>
          </div>
        </div>
      </div>
 
      <div v-if="activeMega === 'market'" class="mega" @mouseenter="cancelClose">
        <div class="mega-grid" style="grid-template-columns: 1fr;">
          <div class="mega-col">
            <h4>Outils de marché</h4>
            <ul>
              <li><NuxtLink to="/market"><div><div>Détails du marché</div><div class="desc">Prix en temps réel par cité</div></div></NuxtLink></li>
              <li><NuxtLink to="/items/flip"><div><div>Flip inter-cités</div><div class="desc">Acheter bas · revendre haut</div></div></NuxtLink></li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="activeMega === 'builds'" class="mega" @mouseenter="cancelClose">
        <div class="mega-grid">
          <div class="mega-col">
            <h4>Créer</h4>
            <ul>
              <li>
                <NuxtLink to="/builds/create">
                  <div>
                    <div>Créateur de build</div>
                    <div class="desc">Composez votre setup complet</div>
                  </div>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/builds/create?mode=zvz">
                  <div>
                    <div>Template ZvZ</div>
                    <div class="desc">Préconfiguration guerre de guildes</div>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </div>
          <div class="mega-col">
            <h4>Parcourir</h4>
            <ul>
              <li><NuxtLink to="/builds">Tous les builds publics</NuxtLink></li>
              <li>
                <NuxtLink to="/builds/pvp-stats">
                  <span style="display:inline-flex;align-items:center;gap:6px">
                    Conseils & Stats PvP
                    <span style="font-size:9px;padding:1px 4px;border-radius:3px;background:rgba(201,161,74,0.15);color:var(--gold);font-weight:700;line-height:1">Nouveau</span>
                  </span>
                </NuxtLink>
              </li>
              <li><NuxtLink to="/builds?gameMode=Solo+PvP">Solo PvP</NuxtLink></li>
              <li><NuxtLink to="/builds?gameMode=ZvZ">ZvZ</NuxtLink></li>
              <li><NuxtLink to="/builds?gameMode=Ganking">Ganking</NuxtLink></li>
              <li><NuxtLink to="/builds?gameMode=HCE">HCE</NuxtLink></li>
              <li><NuxtLink to="/builds/collections">Collections</NuxtLink></li>
            </ul>
          </div>
          <div class="mega-col">
            <h4>Mes builds</h4>
            <ul>
              <li><NuxtLink to="/builds/me">Mes builds sauvegardés</NuxtLink></li>
              <li><NuxtLink to="/builds/me/collections">Mes collections</NuxtLink></li>
            </ul>
          </div>
          <div class="mega-cta">
            <span class="label">Build Creator</span>
            <p>Construisez votre setup complet, choisissez vos spells Q/W/E, partagez en un lien — même sans compte.</p>
            <NuxtLink to="/builds/create" class="ds-btn primary sm" style="margin-top:auto">
              Créer un build →
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-if="activeMega === 'tools'" class="mega" @mouseenter="cancelClose">
        <div class="mega-grid">
          <div class="mega-col">
            <h4>Outils d'Économie</h4>
            <ul>
              <li><NuxtLink to="/tools/dungeon-payout"><div><div>Payout Donjon</div><div class="desc">Répartition équitable de butin</div></div></NuxtLink></li>
              <li><NuxtLink to="/crafting"><div><div>Liste de courses</div><div class="desc">Ressources de craft agrégées</div></div></NuxtLink></li>
            </ul>
          </div>
          <div class="mega-col">
            <h4>Analyses de Marché</h4>
            <ul>
              <li><NuxtLink to="/items/profit"><div><div>Analyse de profit</div><div class="desc">Toutes les marges en un coup d'œil</div></div></NuxtLink></li>
              <li><NuxtLink to="/items/flip"><div><div>Flip inter-cités</div><div class="desc">Arbitrage de prix entre cités</div></div></NuxtLink></li>
            </ul>
          </div>
          <div class="mega-cta">
            <span class="label">Codex Outils</span>
            <p>Accédez à tous nos simulateurs et calculateurs avancés pour optimiser votre rentabilité sur Albion Online.</p>
            <NuxtLink to="/tools" class="ds-btn primary sm" style="margin-top:auto">Voir tous les outils →</NuxtLink>
          </div>
        </div>
      </div>



      <div v-if="activeMega === 'admin'" class="mega" @mouseenter="cancelClose">
        <div class="mega-grid">
          <div class="mega-col">
            <h4>Supervision</h4>
            <ul>
              <li><NuxtLink to="/admin">Tableau de bord</NuxtLink></li>
              <li><NuxtLink to="/admin/data/imports">Workers & imports</NuxtLink></li>
              <li><NuxtLink to="/admin/data/market">Prix marché</NuxtLink></li>
              <li><NuxtLink to="/admin/data/system">Config système</NuxtLink></li>
            </ul>
          </div>
          <div class="mega-col">
            <h4>Utilisateurs</h4>
            <ul>
              <li><NuxtLink to="/admin/users">Gestion utilisateurs</NuxtLink></li>
            </ul>
          </div>
          <div class="mega-col">
            <h4>Sources</h4>
            <ul>
              <li><NuxtLink to="/admin">API officielle Albion</NuxtLink></li>
              <li><NuxtLink to="/admin">API prix communautaire</NuxtLink></li>
              <li><NuxtLink to="/admin">Client du jeu (trad.)</NuxtLink></li>
            </ul>
          </div>
          <div class="mega-cta">
            <span class="label">État système</span>
            <p><span class="status live">Workers actifs</span><br/>Dernier import : <span class="t-mono t-gold">récent</span></p>
            <NuxtLink to="/admin" class="ds-btn primary sm" style="margin-top:auto">Ouvrir la console →</NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- ===== PAGE CONTENT ===== -->
    <main style="flex:1;position:relative;z-index:2">
      <slot />
    </main>

    <!-- ===== FOOTER ===== -->
    <footer class="app-footer" style="position:relative;z-index:2">
      <div class="footer-inner">
        <div class="row" style="gap:14px">
          <span class="t-eyebrow">Albion Codex</span>
          <span class="t-dim" style="font-size:12px">v{{ version }} · build {{ build }}</span>
        </div>
        <div class="row" style="gap:16px">
          <NuxtLink v-if="auth.isAdmin.value" to="/admin" class="t-dim" style="font-size:12px">État système</NuxtLink>
          <NuxtLink to="/settings" class="t-dim" style="font-size:12px">Paramètres</NuxtLink>
          <span class="t-dim" style="font-size:12px">Outil tiers · non affilié à Sandbox Interactive</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const auth = useAuth()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const version = config.public.appVersion
const build = config.public.appBuild

const { data: topProfitRaw } = useTopProfit()
const topProfit = computed(() => (topProfitRaw.value ?? [])[0] ?? null)

const activeMega = ref<string | null>(null)
const userMenuOpen = ref(false)
const searchInput = ref<any>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function openMega(key: string) {
  cancelClose()
  userMenuOpen.value = false
  activeMega.value = key
}

function startClose() {
  closeTimer = setTimeout(() => { activeMega.value = null }, 120)
}

function cancelClose() {
  if (closeTimer) clearTimeout(closeTimer)
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
  if (userMenuOpen.value) activeMega.value = null
}

async function onLogout() {
  userMenuOpen.value = false
  await auth.logout()
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as Element
  if (!target.closest('.sticky-header')) {
    activeMega.value = null
  }
  if (!target.closest('.nav-user-wrap')) {
    userMenuOpen.value = false
  }
}

function navigate(path: string) {
  activeMega.value = null
  userMenuOpen.value = false
  router.push(path)
}

function tierLabel(t: number) {
  return ['', 'Novice', 'Apprenti', 'Journeyman', 'Adepte', 'Expert', 'Maître', 'Granmaître', 'Légendaire'][t] ?? ''
}

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      searchInput.value?.focus()
    }
    if (e.key === 'Escape') {
      activeMega.value = null
      userMenuOpen.value = false
    }
  })
})
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-login-btn {
  margin-left: 4px;
  white-space: nowrap;
}

.nav-avatar {
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.8);
}
</style>
