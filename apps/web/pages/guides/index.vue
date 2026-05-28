<template>
  <div class="page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span class="sep">/</span>
          <span>Guides</span>
        </div>
        <h1>Guides & Tutoriels</h1>
        <p class="t-muted" style="margin-top:6px">
          Découvrez nos guides rédigés en Markdown pour maîtriser l'économie, le PvP, le PvE et le crafting sur Albion Online.
        </p>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="builds-filters" style="margin-bottom: 24px;">
      <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px; width: 100%;">
        <!-- Search Input -->
        <div class="filter-pillbox" style="flex: 1; max-width: 360px; min-width: 240px; display: flex; flex-direction: column;">
          <span class="fpl">Recherche</span>
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher un guide..."
              class="premium-search-input"
              @input="onSearchInput"
            />
            <button v-if="searchQuery" type="button" class="search-clear-btn" @click="clearSearch">✕</button>
          </div>
        </div>

        <!-- Category Select (Custom premium popover dropdown) -->
        <div class="filter-pillbox" style="min-width: 240px; display: flex; flex-direction: column; position: relative;">
          <span class="fpl">Catégorie</span>
          <div ref="dropdownRef" class="custom-select-wrapper">
            <button 
              type="button" 
              class="custom-select-trigger" 
              @click="isDropdownOpen = !isDropdownOpen"
            >
              <span>{{ activeCategoryName }}</span>
              <svg 
                viewBox="0 0 24 24" 
                width="16" 
                height="16" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2.5" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                class="transition-transform duration-250"
                :style="{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--gold)' }"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            <transition name="dropdown-slide">
              <div v-if="isDropdownOpen" class="custom-select-dropdown panel parchment framed">
                <div class="dropdown-options">
                  <button 
                    type="button" 
                    class="dropdown-option" 
                    :class="{ active: activeCategory === null }"
                    @click="selectCategory(null)"
                  >
                    <span>Toutes les catégories</span>
                    <svg v-if="activeCategory === null" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                  <button 
                    v-for="cat in categoriesResponse?.data || []" 
                    :key="cat.id" 
                    type="button" 
                    class="dropdown-option"
                    :class="{ active: activeCategory === cat.slug }"
                    @click="selectCategory(cat.slug)"
                  >
                    <span>{{ cat.name }}</span>
                    <span class="badge">{{ cat._count?.guides || 0 }}</span>
                    <svg v-if="activeCategory === cat.slug" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Filter Summary Tags -->
        <div class="filter-summary" style="margin-left: auto; justify-content: center;">
          <span class="fpl">Statistiques</span>
          <div class="filter-summary-tags" style="min-height: 38px; display: flex; align-items: center;">
            <span class="summary-tag">
              {{ guidesResponse?.meta?.total || 0 }} guides dispos
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0;">
      <div class="skel" style="width: 48px; height: 48px; border-radius: 50%; margin-bottom: 16px;" />
      <p class="t-dim text-sm" style="font-size: 13px; font-family: var(--font-display); letter-spacing: 0.05em; text-transform: uppercase;">Chargement des guides...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!guidesResponse?.data?.length" class="panel empty-state" style="padding: 48px; text-align: center; margin-top: 12px;">
      <div class="es-icon" style="margin-bottom: 16px; font-size: 24px; color: var(--gold);">❖</div>
      <p style="font-size: 15px; color: var(--text-1); margin-bottom: 6px; font-weight: bold;">Aucun guide trouvé</p>
      <p class="t-muted" style="font-size: 13px; margin-bottom: 16px;">Ajustez vos filtres ou relancez une recherche.</p>
      <button class="ds-btn primary" @click="resetFilters">
        Réinitialiser les filtres
      </button>
    </div>

    <!-- Guides List Grid -->
    <div v-else>
      <div class="guides-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 12px;">
        <div
          v-for="guide in guidesResponse.data"
          :key="guide.id"
          class="panel parchment framed"
          style="display: flex; flex-direction: column; height: 100%; margin: 0; min-height: 220px;"
        >
          <!-- Panel Header -->
          <div class="panel-header" style="padding: 14px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 15px; font-weight: bold; margin: 0; line-height: 1.4; color: var(--text-0);" class="line-clamp-1">
              {{ guide.title }}
            </h3>
            <span class="tag gold" style="font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-family: var(--font-display); font-weight: bold; letter-spacing: 0.05em;">
              {{ guide.category?.name }}
            </span>
          </div>

          <!-- Panel Body -->
          <div class="panel-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 16px;">
            <p class="t-muted line-clamp-3" style="font-size: 13px; line-height: 1.6; margin: 0 0 20px; flex-grow: 1;">
              {{ guide.summary || 'Découvrez ce guide de jeu complet expliquant en détail cette facette de Albion Online.' }}
            </p>

            <!-- Card Bottom Row -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-strong); width: 100%;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span class="t-dim" style="font-size: 11px; text-transform: uppercase; font-family: var(--font-display); letter-spacing: 0.05em;">Rédigé par</span>
                <span class="t-mono font-bold text-white" style="font-size: 12px;">{{ guide.author?.username || 'Admin' }}</span>
              </div>

              <NuxtLink :to="`/guides/${guide.slug}`" class="ds-btn primary sm" style="font-size: 12px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 4px;">
                Lire le guide
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 32px;">
        <button
          class="ds-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          Précédent
        </button>
        <span class="t-dim text-sm" style="font-size: 13px;">
          Page {{ currentPage }} sur {{ totalPages }}
        </span>
        <button
          class="ds-btn"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          Suivant
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Guide, GuideCategory } from '@albion-tool/types'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Guides & Tutoriels - Albion SilverMind',
  meta: [
    { name: 'description', content: 'Parcourez nos guides et tutoriels complets rédigés en Markdown pour tout savoir sur Albion Online : crafting, PvP, îles et économie.' }
  ]
})

// Filters State
const searchQuery = ref('')
const activeCategory = ref<string | null>(null)
const currentPage = ref(1)
const itemsPerPage = 9

// Custom select dropdown state
const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const activeCategoryName = computed(() => {
  if (!activeCategory.value) return 'Toutes les catégories'
  const match = categoriesResponse.value?.data?.find(c => c.slug === activeCategory.value)
  return match ? `${match.name} (${match._count?.guides || 0})` : 'Toutes les catégories'
})

const selectCategory = (slug: string | null) => {
  activeCategory.value = slug
  currentPage.value = 1
  isDropdownOpen.value = false
}

onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
      isDropdownOpen.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

// Debounced search logic
const debouncedSearch = ref('')
let searchTimeout: any = null

const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = searchQuery.value
    currentPage.value = 1
  }, 250)
}

const clearSearch = () => {
  searchQuery.value = ''
  debouncedSearch.value = ''
  currentPage.value = 1
}

const changePage = (page: number) => {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const resetFilters = () => {
  searchQuery.value = ''
  debouncedSearch.value = ''
  activeCategory.value = null
  currentPage.value = 1
}

// Fetch categories
const { data: categoriesResponse } = await useFetch<{ data: GuideCategory[] }>('/api/v1/guides/categories')

// Fetch guides query parameters reactive
const queryParams = computed(() => {
  const params: Record<string, string> = {
    page: currentPage.value.toString(),
    limit: itemsPerPage.toString()
  }
  if (activeCategory.value) {
    params.category = activeCategory.value
  }
  if (debouncedSearch.value) {
    params.search = debouncedSearch.value
  }
  return params
})

// Fetch guides with reactive query watch
const { data: guidesResponse, pending } = await useFetch<{ data: Guide[], meta: { total: number } }>(
  '/api/v1/guides',
  {
    query: queryParams,
    watch: [queryParams]
  }
)

const totalPages = computed(() => {
  const total = guidesResponse.value?.meta?.total || 0
  return Math.ceil(total / itemsPerPage)
})
</script>

<style scoped>
/* Search input clean styles */
.search-input-wrapper {
  position: relative;
  width: 100%;
}

.premium-search-input {
  width: 100%;
  border-radius: var(--radius-sm);
  padding: 0 36px 0 14px;
  height: 38px;
  background: var(--bg-3);
  border: 1px solid var(--border-strong);
  color: var(--text-0);
  font-size: 13px;
  transition: all 0.2s ease;
  font-family: var(--font-body);
}

.premium-search-input:hover {
  border-color: var(--gold-dim);
  background: var(--bg-elevated);
}

.premium-search-input:focus {
  outline: none;
  border-color: var(--gold);
  background: var(--bg-elevated);
  box-shadow: 0 0 0 2px rgba(201, 161, 74, 0.15);
}

.search-clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--text-3);
  background: none;
  border: none;
  font-size: 14px;
  transition: color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.search-clear-btn:hover {
  color: var(--gold-bright);
}

/* Custom premium select styles */
.custom-select-wrapper {
  position: relative;
  width: 100%;
}

.custom-select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 38px;
  padding: 0 14px;
  background: var(--bg-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-0);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-body);
}

.custom-select-trigger:hover {
  border-color: var(--gold-dim);
  background: var(--bg-elevated);
}

.custom-select-trigger:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(201, 161, 74, 0.15);
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-strong);
  margin: 0;
  background: var(--bg-2);
}

.dropdown-options {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-1);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  justify-content: space-between;
}

.dropdown-option:hover {
  background: rgba(201, 161, 74, 0.04);
  color: var(--gold-bright);
}

.dropdown-option.active {
  background: rgba(201, 161, 74, 0.08);
  color: var(--gold);
  font-weight: 600;
}

.dropdown-option .badge {
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(201, 161, 74, 0.1);
  border: 1px solid rgba(201, 161, 74, 0.15);
  border-radius: 4px;
  color: var(--text-2);
}

.dropdown-option.active .badge {
  background: rgba(201, 161, 74, 0.15);
  border-color: var(--gold-dim);
  color: var(--gold-bright);
}

.check-icon {
  color: var(--gold);
}

/* Custom Dropdown Animation */
.dropdown-slide-enter-active,
.dropdown-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-slide-enter-from,
.dropdown-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
