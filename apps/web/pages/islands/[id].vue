<template>
  <div class="page island-detail">
    <div v-if="pending" class="skel-loader">
      <div class="skel" style="height: 40px; width: 200px; margin-bottom: 20px"></div>
      <div class="grid-layout skel" style="height: 500px"></div>
    </div>

    <template v-else-if="island">
      <!-- HEADER / METRICS BAR -->
      <div class="page-header parchment framed">
        <NuxtLink to="/islands" class="back-link">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour aux îles
        </NuxtLink>
        <div class="header-main">
          <div class="header-title-row">
            <h1 class="t-display">{{ island.name }}</h1>
            <div class="header-actions">
              <button class="ds-btn ghost sm" :class="{ 'is-premium-active': island.isPremium }" @click="togglePremium">
                👑 Premium : {{ island.isPremium ? 'Actif (+100%)' : 'Inactif' }}
              </button>
              <button class="ds-btn sm gold" @click="showIslandEdit = true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
                Gérer l'île
              </button>
            </div>
          </div>
          
          <div class="header-meta-row">
            <div class="header-meta">
              <span class="tag gold sm">Niv. {{ island.level }}</span>
              <span class="t-dim">•</span>
              <span class="t-muted">{{ island.location?.name }}</span>
              <span class="t-dim">•</span>
              <span class="tag sm" :class="island.type === 'PERSONAL' ? 'info' : 'success'">
                {{ island.type === 'PERSONAL' ? 'Personnelle' : 'Guilde' }}
              </span>
            </div>
            
            <div class="header-summary-stats">
              <div class="stat-pill">
                <span class="s-label">Profit quotidien estimé</span>
                <span class="s-val t-success">{{ Math.round(island.profitability?.totalNetProfit || 0).toLocaleString() }} <span class="silver-tag">S</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BATCH OPERATION TOOLBAR -->
      <div class="batch-toolbar panel parchment framed">
        <div class="bt-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="t-gold"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <strong>Actions rapides de l'île</strong>
        </div>
        <div class="bt-actions">
          <label class="focus-toggle">
            <input type="checkbox" v-model="batchFocus" />
            <span>💧 Utiliser le Focus</span>
          </label>
          <button class="ds-btn ghost sm" @click="runBatchAction('replant-all')" :disabled="batching">
            🔄 Tout replanter à l'identique
          </button>
          <button class="ds-btn danger ghost sm" @click="runBatchAction('harvest-all')" :disabled="batching">
            🌾 Tout récolter (Vider)
          </button>
        </div>
      </div>

      <!-- VISUAL ISLAND GRID SECTORS -->
      <div class="island-grid-layout">
        <!-- SECTOR 1: AGRICULTURAL FIELDS (Farming Plots) -->
        <div class="sector-container farming-sector parchment framed">
          <div class="sector-header">
            <h3>🚜 Emplacements Agricoles (Champs & Élevages)</h3>
            <span class="sector-count">{{ farmingBuildings.length }} / {{ maxFarmingPlots }} Terrains</span>
          </div>
          
          <div class="sector-grid">
            <div 
              v-for="plotIdx in maxFarmingPlots" 
              :key="`farm-${plotIdx}`"
              class="plot-wrapper"
            >
              <!-- Building is present -->
              <div 
                v-if="getBuildingAtSlot(plotIdx, true)" 
                class="plot-card visual-farm panel framed"
                :class="getBuildingClass(getBuildingAtSlot(plotIdx, true))"
                @click="openEditBuilding(getBuildingAtSlot(plotIdx, true))"
              >
                <div class="plot-card-header">
                  <span class="b-title">{{ getBuildingAtSlot(plotIdx, true).buildingName }}</span>
                  <span class="b-tier">T{{ getBuildingAtSlot(plotIdx, true).tier }}</span>
                </div>

                <!-- 3x3 Mini Grid showing crop/animal slots -->
                <div class="mini-grid-3x3">
                  <div 
                    v-for="slot in 9" 
                    :key="slot" 
                    class="mini-slot"
                    :class="getSlotStateClass(getBuildingAtSlot(plotIdx, true), slot)"
                  >
                    <template v-if="getSlotResource(getBuildingAtSlot(plotIdx, true), slot)">
                      <AoItemImage :unique-name="getSlotResource(getBuildingAtSlot(plotIdx, true), slot).itemId" size="xs" />
                      <div class="slot-indicators">
                        <span v-if="getSlotResource(getBuildingAtSlot(plotIdx, true), slot).isFocusUsed" class="slot-focus">💧</span>
                        <div class="slot-progress" :style="{ width: getGrowthPercent(getSlotResource(getBuildingAtSlot(plotIdx, true), slot)) + '%' }"></div>
                      </div>
                    </template>
                    <span v-else class="slot-empty">+</span>
                  </div>
                </div>

                <!-- Plot footer info -->
                <div class="plot-card-footer">
                  <div class="plot-profit">
                    <span class="t-success" v-if="getBuildingProfit(getBuildingAtSlot(plotIdx, true).id) > 0">
                      +{{ Math.round(getBuildingProfit(getBuildingAtSlot(plotIdx, true).id)).toLocaleString() }} <span class="silver-tag sm">S</span>
                    </span>
                    <span class="t-dim" v-else>0 S</span>
                  </div>
                  <span class="t-gold font-sm">Gérer →</span>
                </div>
              </div>

              <!-- Plot is empty -->
              <div v-else class="plot-card visual-farm is-empty panel dashed" @click="openAddBuilding(plotIdx, true)">
                <div class="empty-layout">
                  <span class="plus-icon">+</span>
                  <span class="empty-label">Emplacement Agricole</span>
                  <span class="empty-sub">Friche libre</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTOR 2: SYSTEM PLOTS (Town Buildings, Refiners, Houses) -->
        <div class="sector-container town-sector parchment framed">
          <div class="sector-header">
            <h3>🏛️ Emplacements Urbains (Artisanat & Habitations)</h3>
            <span class="sector-count">{{ townBuildings.length }} / {{ maxTownPlots }} Terrains</span>
          </div>

          <div class="sector-grid">
            <div 
              v-for="plotIdx in maxTownPlots" 
              :key="`town-${plotIdx}`"
              class="plot-wrapper"
            >
              <!-- Building is present -->
              <div 
                v-if="getBuildingAtSlot(plotIdx, false)" 
                class="plot-card visual-town panel framed"
                @click="openEditBuilding(getBuildingAtSlot(plotIdx, false))"
              >
                <div class="plot-card-header">
                  <span class="b-title">{{ getBuildingAtSlot(plotIdx, false).buildingName }}</span>
                  <span class="b-tier">T{{ getBuildingAtSlot(plotIdx, false).tier }}</span>
                </div>

                <div class="town-building-content">
                  <div class="town-icon-wrap">
                    <img v-if="getBuildingAtSlot(plotIdx, false).buildingIcon" :src="getBuildingAtSlot(plotIdx, false).buildingIcon" class="town-icon" />
                    <div v-else class="town-placeholder">🏢</div>
                  </div>
                  <div class="town-details">
                    <div class="nut-status" v-if="getBuildingAtSlot(plotIdx, false).nutrition !== null">
                      <span class="font-sm t-muted">Nutrition : {{ getBuildingAtSlot(plotIdx, false).nutrition }}%</span>
                      <div class="nut-bar"><div class="nut-fill" :style="{ width: getBuildingAtSlot(plotIdx, false).nutrition + '%' }"></div></div>
                    </div>
                    <span v-else class="t-dim font-sm">Bâtiment de guilde / maison</span>
                  </div>
                </div>

                <div class="plot-card-footer">
                  <span class="t-dim">Slot #{{ plotIdx }}</span>
                  <span class="t-gold font-sm">Gérer →</span>
                </div>
              </div>

              <!-- Plot is empty -->
              <div v-else class="plot-card visual-town is-empty panel dashed" @click="openAddBuilding(plotIdx, false)">
                <div class="empty-layout">
                  <span class="plus-icon">+</span>
                  <span class="empty-label">Terrain Urbain</span>
                  <span class="empty-sub">Parcelle libre</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- MODALS -->
    
    <!-- Building & Crops Management Modal -->
    <div v-if="activeBuilding" class="modal-overlay" @click.self="activeBuilding = null">
      <div class="modal panel parchment framed">
        <div class="modal-header">
          <h3>Gérer {{ activeBuilding.buildingName }}</h3>
          <button class="close-btn" @click="activeBuilding = null">&times;</button>
        </div>
        <div class="modal-body modal-scrollable">
          <div class="b-mgmt-header">
             <div class="b-mgmt-icon-box">
                <img v-if="activeBuilding.buildingIcon" :src="activeBuilding.buildingIcon" style="width: 40px" />
                <div v-else style="font-size: 24px">🏢</div>
             </div>
             <div class="b-mgmt-title">
                <strong>{{ activeBuilding.buildingName }}</strong>
                <span class="t-dim">Tier {{ activeBuilding.tier }}</span>
             </div>
          </div>

          <!-- Nutrition management for Town Crafting Stations -->
          <div v-if="activeBuilding.nutrition !== null" class="form-group" style="margin-top: 20px">
            <label>Nutrition du bâtiment (%)</label>
            <div class="nut-input-row">
               <input v-model.number="activeBuilding.nutrition" type="number" class="ds-input" min="0" max="100" @change="updateBuildingNutrition" />
               <div class="nut-bar-lg"><div class="nut-fill" :style="{ width: activeBuilding.nutrition + '%' }"></div></div>
            </div>
          </div>

          <!-- Agriculture & Crop management -->
          <div v-if="isAgricultural(activeBuilding)" class="mgmt-resources">
             <div class="section-header">
                <h4>Productions Actives ({{ activeBuilding.resources.length }}/9 emplacements)</h4>
                <div class="res-quick-actions">
                  <button class="ds-btn gold xs" @click="showAddResource = !showAddResource">
                    {{ showAddResource ? 'Fermer' : '🌾 Planter' }}
                  </button>
                </div>
             </div>

             <!-- Aggregated Grouped Crop List Visualizer -->
             <div class="res-list-mgmt">
                <div v-if="groupedResources.length === 0" class="empty-building-state">
                  <p class="t-dim text-center" style="padding: 16px 0;">Aucune production sur ce terrain actuellement.</p>
                </div>
                <div v-else v-for="group in groupedResources" :key="group.itemId" class="res-mgmt-item">
                   <AoItemImage :unique-name="group.itemId" size="sm" />
                   <div class="res-m-info">
                      <div class="res-m-name">
                        {{ group.itemName }}
                        <span class="tag sm gold" style="margin-left: 6px; font-weight:700;">x{{ group.count }}</span>
                        <span class="tag sm focus-tag" style="margin-left: 6px;" v-if="group.isFocusUsed">💧 Focus</span>
                      </div>
                      <div class="res-m-status">
                        Croissance moyenne : {{ group.growthPercentage }}%
                        <span v-if="group.growthPercentage >= 100" class="t-success font-sm" style="margin-left: 6px; font-weight: 700;">✓ Prêt !</span>
                      </div>
                   </div>
                   <button 
                     class="ds-btn ghost xs danger" 
                     style="padding: 4px 8px; font-size: 11px; font-weight: 700; border-color: rgba(239, 68, 68, 0.4);"
                     @click="deleteResourceGroup(group.ids)"
                   >
                      Récolter
                   </button>
                </div>
             </div>

             <!-- Expected Harvest Estimation -->
             <div v-if="expectedHarvests.length > 0" class="expected-harvests panel parchment framed bg-alt" style="margin-top: 24px; padding: 16px;">
                <span class="font-xs t-muted uppercase" style="display: block; margin-bottom: 12px; letter-spacing: 0.05em; font-weight: 700; color: var(--gold)">
                  🌾 Rendement Estimé à la Récolte
                </span>
                <div class="expected-harvest-list" style="display: flex; flex-direction: column; gap: 8px;">
                   <div v-for="item in expectedHarvests" :key="item.itemId" class="expected-harvest-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0, 0, 0, 0.15); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.02);">
                      <div style="display: flex; align-items: center; gap: 10px;">
                         <AoItemImage :unique-name="item.itemId" size="xs" style="width: 24px; height: 24px;" />
                         <span style="font-size: 13px; font-weight: 600;">{{ item.itemName }}</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                         <span v-if="item.estimatedValue > 0" class="t-success font-sm" style="font-weight: 600; font-family: var(--font-mono)">
                            +{{ Math.round(item.estimatedValue).toLocaleString() }} <span class="silver-tag sm">S</span>
                         </span>
                         <span class="tag sm" :class="item.isSeed ? 'info' : 'success'" style="font-weight: 700;">
                            x{{ item.expectedQty }}
                         </span>
                      </div>
                   </div>
                </div>
             </div>

              <!-- Financial Breakdown -->
              <div v-if="buildingFinancials" class="financial-breakdown panel parchment framed bg-alt" style="margin-top: 20px; padding: 16px;">
                 <span class="font-xs t-muted uppercase" style="display: block; margin-bottom: 12px; letter-spacing: 0.05em; font-weight: 700; color: var(--gold)">
                   📊 Bilan Financier Estimé (Quotidien)
                 </span>
                 <div class="fin-sheet" style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between;">
                       <span class="t-muted">Revenus bruts (Récolte) :</span>
                       <span style="font-family: var(--font-mono)">{{ buildingFinancials.grossRevenue.toLocaleString() }} S</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;" v-if="buildingFinancials.tax > 0">
                       <span class="t-muted">Taxe de vente (4%) :</span>
                       <span class="t-danger" style="font-family: var(--font-mono)">-{{ buildingFinancials.tax.toLocaleString() }} S</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;" v-if="buildingFinancials.seedCost !== 0">
                       <span class="t-muted">{{ buildingFinancials.seedCost > 0 ? 'Achat de semences :' : 'Gains de semences (Focus) :' }}</span>
                       <span :class="buildingFinancials.seedCost > 0 ? 't-danger' : 't-success'" style="font-family: var(--font-mono)">
                          {{ buildingFinancials.seedCost > 0 ? '-' : '+' }}{{ Math.abs(buildingFinancials.seedCost).toLocaleString() }} S
                       </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;" v-if="buildingFinancials.foodCost > 0">
                       <span class="t-muted">Coût de nourriture (Élevage) :</span>
                       <span class="t-danger" style="font-family: var(--font-mono)">-{{ buildingFinancials.foodCost.toLocaleString() }} S</span>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.06); margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
                       <span class="t-gold">Profit net quotidien :</span>
                       <span :class="buildingFinancials.netProfit >= 0 ? 't-success' : 't-danger'" style="font-family: var(--font-mono)">
                          {{ buildingFinancials.netProfit.toLocaleString() }} S
                       </span>
                    </div>
                 </div>
              </div>

             <!-- Direct Planting Grid List -->
             <div v-if="showAddResource" class="add-res-inline panel framed bg-alt" style="margin-top: 20px">
                <span class="font-xs t-muted uppercase" style="display: block; margin-bottom: 12px; letter-spacing: 0.05em">
                  Planter une ressource (Cliquez pour remplir les 9 slots) :
                </span>
                
                <div v-if="loadingItems" class="text-center pad-sm">
                  <span class="t-dim">Chargement des semences possibles...</span>
                </div>
                <div v-else class="permitted-crops-grid">
                  <div 
                    v-for="item in searchResults" 
                    :key="item.uniqueName" 
                    class="crop-select-card panel parchment framed"
                    @click="quickPlantItem(item.uniqueName)"
                  >
                     <AoItemImage :unique-name="item.uniqueName" size="sm" />
                     <div class="csc-info">
                       <span class="csc-name">{{ item.name }}</span>
                       <span class="csc-tier t-dim">Tier {{ item.tier }}</span>
                     </div>
                  </div>
                </div>
             </div>
          </div>

          <div class="modal-actions" style="margin-top: 32px">
            <button class="ds-btn danger ghost sm" @click="deleteBuilding(activeBuilding.id)">
              💥 Détruire le bâtiment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Building Modal: Direct compatible listing -->
    <div v-if="showAddBuildingModal" class="modal-overlay" @click.self="showAddBuildingModal = false">
      <div class="modal panel parchment framed">
        <div class="modal-header">
          <h3>Bâtir sur le terrain #{{ targetSlotIndex }}</h3>
          <button class="close-btn" @click="showAddBuildingModal = false">&times;</button>
        </div>
        <div class="modal-body modal-scrollable">
          <div v-if="loadingBuildings" class="loader-wrap text-center">
            <span class="t-dim">Chargement des constructions possibles...</span>
          </div>
          <div v-else class="compatible-buildings-wrap">
            <span class="font-xs t-muted uppercase" style="display: block; margin-bottom: 16px; letter-spacing: 0.05em">
              Constructions possibles (Cliquez pour bâtir) :
            </span>
            <div class="c-buildings-grid">
              <div 
                v-for="b in buildingResults" 
                :key="b.id" 
                class="c-building-card panel parchment framed" 
                @click="createBuilding(b)"
              >
                <div class="cb-icon-box">
                  <img v-if="b.uiBuildMenuTexture" :src="`/game_assets/${b.uiBuildMenuTexture.toLowerCase()}.png`" class="cb-icon" />
                  <div v-else style="font-size: 24px">🏢</div>
                </div>
                <div class="cb-info">
                  <span class="cb-name">{{ b.name }}</span>
                  <span class="cb-type t-dim">Tier {{ b.tier }} • {{ getBuildingTypeName(b.type) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Island Metadata Modal -->
    <div v-if="showIslandEdit" class="modal-overlay" @click.self="showIslandEdit = false">
      <div class="modal panel parchment framed">
        <div class="modal-header">
          <h3>Modifier l'île</h3>
          <button class="close-btn" @click="showIslandEdit = false">&times;</button>
        </div>
        <form class="modal-body" @submit.prevent="updateIslandMetadata">
          <div class="form-group">
            <label>Nom de l'île</label>
            <input v-model="editForm.name" type="text" class="ds-input" required />
          </div>
          <div class="form-group">
            <label>Niveau de l'île (1 - 6)</label>
            <select v-model.number="editForm.level" class="ds-select" required>
              <option :value="1">Niveau 1 (1 Champ)</option>
              <option :value="2">Niveau 2 (1 Champ, 1 Bâtiment)</option>
              <option :value="3">Niveau 3 (2 Champs, 3 Bâtiments)</option>
              <option :value="4">Niveau 4 (3 Champs, 6 Bâtiments)</option>
              <option :value="5">Niveau 5 (4 Champs, 9 Bâtiments)</option>
              <option :value="6">Niveau 6 (5 Champs, 11 Bâtiments)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Type d'île</label>
            <div class="radio-group">
              <label><input type="radio" v-model="editForm.type" value="PERSONAL" /> Personnelle</label>
              <label><input type="radio" v-model="editForm.type" value="GUILD" /> Guilde</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="ds-btn ghost sm" @click="showIslandEdit = false">Annuler</button>
            <button type="submit" class="ds-btn primary sm" :disabled="updatingMetadata">
              {{ updatingMetadata ? 'Sauvegarde...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data: islandRaw, pending, refresh } = await useFetch(`/api/v1/islands/${id}`)
const island = computed(() => (islandRaw.value as any)?.data ?? null)

// Visual grid states
const showIslandEdit = ref(false)
const showAddBuildingModal = ref(false)
const activeBuilding = ref<any>(null)
const showAddResource = ref(false)
const batchFocus = ref(false)
const batching = ref(false)

const targetSlotIndex = ref(1)
const targetSlotIsFarming = ref(true)

// Loading states
const loadingBuildings = ref(false)
const loadingItems = ref(false)

// Forms & results lists
const editForm = ref({
  name: '',
  level: 6,
  type: 'PERSONAL'
})
const updatingMetadata = ref(false)

const buildingSearch = ref('')
const buildingResults = ref<any[]>([])
const itemSearch = ref('')
const searchResults = ref<any[]>([])

// Watch island data to pre-populate edit form
watch(island, (newVal) => {
  if (newVal) {
    editForm.value = {
      name: newVal.name,
      level: newVal.level,
      type: newVal.type
    }
  }
}, { immediate: true })

// Maximum plots config matching Albion level rules
const maxFarmingPlots = computed(() => {
  if (!island.value) return 0
  const lvl = island.value.level
  if (lvl === 1) return 1
  if (lvl === 2) return 1
  if (lvl === 3) return 2
  if (lvl === 4) return 3
  if (lvl === 5) return 4
  return 5 // Level 6 has 5 farming fields
})

const maxTownPlots = computed(() => {
  if (!island.value) return 0
  const lvl = island.value.level
  if (lvl === 1) return 0
  if (lvl === 2) return 1
  if (lvl === 3) return 3
  if (lvl === 4) return 6
  if (lvl === 5) return 9
  return 11 // Level 6 has 11 system plots
})

const farmingBuildings = computed(() => {
  if (!island.value?.buildings) return []
  return island.value.buildings.filter((b: any) => isAgricultural(b))
})

const townBuildings = computed(() => {
  if (!island.value?.buildings) return []
  return island.value.buildings.filter((b: any) => !isAgricultural(b))
})

function isAgricultural(building: any) {
  const type = building.building?.id || ''
  return ['FARM', 'HERB_GARDEN', 'PASTURE', 'KENNEL'].some(t => type.includes(t)) || building.building?.type === 'farmbuilding'
}

function getBuildingClass(building: any) {
  if (!building) return ''
  const type = building.building?.id?.toLowerCase() || ''
  if (type.includes('farm')) return 'farm'
  if (type.includes('herb')) return 'herb_garden'
  if (type.includes('pasture')) return 'pasture'
  if (type.includes('kennel')) return 'kennel'
  return 'building'
}

function getBuildingProfit(buildingId: string) {
  if (!island.value?.profitability) return 0
  const b = island.value.profitability.buildings.find((b: any) => b.buildingId === buildingId)
  return b?.totalNetProfit ?? 0
}

function getBuildingAtSlot(slotIdx: number, isFarming: boolean) {
  if (!island.value?.buildings) return null
  return island.value.buildings.find((b: any) => {
    const isAgri = isAgricultural(b)
    return isFarming === isAgri && b.slotIndex === slotIdx
  })
}

// 3x3 slot visualization handlers
function getSlotResource(building: any, slotNum: number) {
  if (!building?.resources) return null
  return building.resources[slotNum - 1] || null
}

function getSlotStateClass(building: any, slotNum: number) {
  const res = getSlotResource(building, slotNum)
  if (!res) return 'is-empty'
  const p = getGrowthPercent(res)
  if (p >= 100) return 'is-ready'
  return 'is-growing'
}

function getGrowthPercent(res: any) {
  if (!res?.plantedAt) return 0
  const elapsed = Date.now() - new Date(res.plantedAt).getTime()
  return Math.min(100, Math.max(0, (elapsed / (22 * 60 * 60 * 1000)) * 100))
}

function getGrowthText(res: any) {
  const p = getGrowthPercent(res)
  return p >= 100 ? 'Récolte prête !' : `${Math.round(p)}%`
}

function getBuildingTypeName(type: string) {
  if (type === 'farmbuilding') return 'Agricole'
  if (type === 'playerbuilding') return 'Habitation'
  return 'Artisanat'
}

// Group similar slots inside activeBuilding resource list for readability
const groupedResources = computed(() => {
  if (!activeBuilding.value?.resources) return []
  
  const groups: Record<string, {
    itemId: string
    itemName: string
    count: number
    isFocusUsed: boolean
    growthPercentage: number
    ids: string[]
  }> = {}
  
  for (const res of activeBuilding.value.resources) {
    const key = res.itemId
    const growth = getGrowthPercent(res)
    
    if (!groups[key]) {
      groups[key] = {
        itemId: res.itemId,
        itemName: res.itemName,
        count: 0,
        isFocusUsed: res.isFocusUsed,
        growthPercentage: 0,
        ids: []
      }
    }
    
    groups[key].count++
    groups[key].ids.push(res.id)
    groups[key].growthPercentage += growth
  }
  
  return Object.values(groups).map(g => ({
    ...g,
    growthPercentage: Math.round(g.growthPercentage / g.count)
  }))
})

// Expected crop and seed return estimation pre-computed by the server
const expectedHarvests = computed(() => {
  if (!activeBuilding.value) return []
  const b = island.value?.buildings.find((x: any) => x.id === activeBuilding.value.id)
  return b?.expectedHarvests ?? []
})

// Itemized financial sheet pre-computed by the server
const buildingFinancials = computed(() => {
  if (!activeBuilding.value) return null
  const b = island.value?.buildings.find((x: any) => x.id === activeBuilding.value.id)
  return b?.financials ?? null
})

// Interactive Visual Building Placement (Direct listing, no search input)
async function openAddBuilding(slotIdx: number, isFarming: boolean) {
  targetSlotIndex.value = slotIdx
  targetSlotIsFarming.value = isFarming
  buildingResults.value = []
  showAddBuildingModal.value = true
  
  loadingBuildings.value = true
  try {
    if (isFarming) {
      // Fetch farming buildings directly
      const resp = await $fetch('/api/v1/buildings', { params: { type: 'farmbuilding', limit: 10 } })
      buildingResults.value = (resp as any).data
    } else {
      // Fetch crafting and housing buildings directly
      const resp = await $fetch('/api/v1/buildings', { params: { limit: 100 } })
      buildingResults.value = (resp as any).data.filter((b: any) => b.type !== 'farmbuilding')
    }
  } catch (err) {
    console.error('Failed to load buildings:', err)
  } finally {
    loadingBuildings.value = false
  }
}

async function createBuilding(b: any) {
  try {
    await $fetch(`/api/v1/islands/${id}/buildings`, {
      method: 'POST',
      body: { 
        buildingId: b.id, 
        level: b.tier,
        slotIndex: targetSlotIndex.value
      }
    })
    showAddBuildingModal.value = false
    await refresh()
  } catch (err) {
    console.error(err)
  }
}

// Manage crops (Direct permitted items listing, no search input)
async function openEditBuilding(building: any) {
  activeBuilding.value = { ...building }
  showAddResource.value = false
  searchResults.value = []
  
  if (isAgricultural(building)) {
    loadingItems.value = true
    try {
      // Load all permitted seeds/animals directly from building permittedItemIds relation
      const resp = await $fetch('/api/v1/items', { params: { stationId: building.building?.id, limit: 80 } })
      searchResults.value = (resp as any).data ?? []
    } catch (err) {
      console.error('Failed to load compatible items:', err)
    } finally {
      loadingItems.value = false
    }
  }
}

// Toggle premium and recalculate profitability
async function togglePremium() {
  try {
    await $fetch(`/api/v1/islands/${id}`, {
      method: 'PATCH',
      body: { isPremium: !island.value.isPremium }
    })
    await refresh()
  } catch (err) {
    console.error(err)
  }
}

// Batch Actions
async function runBatchAction(actionName: 'harvest-all' | 'replant-all') {
  if (actionName === 'harvest-all' && !confirm('Voulez-vous récolter et vider tous les emplacements de cette île ?')) return
  batching.value = true
  try {
    await $fetch(`/api/v1/islands/${id}/batch`, {
      method: 'POST',
      body: {
        action: actionName,
        isFocusUsed: batchFocus.value
      }
    })
    await refresh()
  } catch (err) {
    console.error('Batch operation failed:', err)
  } finally {
    batching.value = false
  }
}

async function quickPlantItem(seedItemId: string) {
  if (!activeBuilding.value) return
  try {
    await $fetch(`/api/v1/islands/${id}/batch`, {
      method: 'POST',
      body: {
        action: 'plant-crop',
        buildingId: activeBuilding.value.id,
        itemId: seedItemId,
        isFocusUsed: batchFocus.value
      }
    })
    showAddResource.value = false
    await refresh()
    // Re-sync modal details
    const updated = island.value.buildings.find((b: any) => b.id === activeBuilding.value.id)
    if (updated) activeBuilding.value = { ...updated }
  } catch (err) {
    console.error('Quick plant failed:', err)
  }
}

// Custom Metadata Edit PATCH
async function updateIslandMetadata() {
  updatingMetadata.value = true
  try {
    await $fetch(`/api/v1/islands/${id}`, {
      method: 'PATCH',
      body: editForm.value
    })
    showIslandEdit.value = false
    await refresh()
  } catch (err) {
    console.error(err)
  } finally {
    updatingMetadata.value = false
  }
}

async function updateBuildingNutrition() {
  if (!activeBuilding.value) return
  try {
    await $fetch(`/api/v1/buildings/${activeBuilding.value.id}`, {
      method: 'PATCH',
      body: { nutrition: activeBuilding.value.nutrition }
    })
    await refresh()
  } catch (err) {
    console.error(err)
  }
}

async function deleteBuilding(buildingId: string) {
  if (!confirm('Détruire complètement ce bâtiment et vider le plot ?')) return
  try {
    await $fetch(`/api/v1/buildings/${buildingId}`, { method: 'DELETE' })
    activeBuilding.value = null
    await refresh()
  } catch (err) {
    console.error(err)
  }
}

// Bulk delete a grouped resource from the modal
async function deleteResourceGroup(ids: string[]) {
  try {
    await Promise.all(ids.map(id => $fetch(`/api/v1/resources/${id}`, { method: 'DELETE' })))
    await refresh()
    const updated = island.value.buildings.find((b: any) => b.id === activeBuilding.value.id)
    if (updated) activeBuilding.value = { ...updated }
  } catch (err) {
    console.error('Failed to harvest crop group:', err)
  }
}

async function addResource(item: any) {
  if (!activeBuilding.value) return
  try {
    await $fetch(`/api/v1/buildings/${activeBuilding.value.id}/resources`, {
      method: 'POST',
      body: { itemId: item.uniqueName, count: 9, plantedAt: new Date().toISOString() }
    })
    showAddResource.value = false
    itemSearch.value = ''
    searchResults.value = []
    await refresh()
    const updated = island.value.buildings.find((b: any) => b.id === activeBuilding.value.id)
    if (updated) activeBuilding.value = { ...updated }
  } catch (err) {
    console.error(err)
  }
}

async function deleteResource(resId: string) {
  try {
    await $fetch(`/api/v1/resources/${resId}`, { method: 'DELETE' })
    await refresh()
    const updated = island.value.buildings.find((b: any) => b.id === activeBuilding.value.id)
    if (updated) activeBuilding.value = { ...updated }
  } catch (err) {
    console.error(err)
  }
}

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.page-header {
  padding: 24px;
  margin-bottom: 24px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-3);
  font-size: 13px;
  text-decoration: none;
  margin-bottom: 16px;
  width: fit-content;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--gold);
}

.header-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.is-premium-active {
  background: rgba(234, 179, 8, 0.15) !important;
  color: var(--gold) !important;
  border-color: var(--gold) !important;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.2);
}

.header-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-summary-stats {
  display: flex;
  gap: 24px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-pill .s-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-3);
  letter-spacing: 0.05em;
}

.stat-pill .s-val {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.silver-tag {
  font-size: 11px;
  color: var(--gold);
  border: 1px solid var(--gold);
  padding: 0 4px;
  border-radius: 4px;
  margin-left: 2px;
}

.silver-tag.sm {
  font-size: 9px;
  padding: 0 2px;
}

/* Batch Toolbar */
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
  background: rgba(255, 255, 255, 0.01);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
}

.bt-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.bt-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.focus-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-2);
  cursor: pointer;
}

.focus-toggle input {
  cursor: pointer;
  accent-color: var(--info);
  width: 16px;
  height: 16px;
}

/* Sectors Layout */
.island-grid-layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sector-container {
  padding: 24px;
}

.sector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 12px;
}

.sector-header h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.02em;
}

.sector-count {
  font-size: 13px;
  color: var(--text-3);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 20px;
}

.sector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* Plot Cards */
.plot-card {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.08);
}

.plot-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  border-color: var(--gold);
}

.plot-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  border-top: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 8px;
}

.plot-card-header .b-title {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.03em;
  color: var(--text-1);
}

.plot-card-header .b-tier {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-3);
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 6px;
  border-radius: 4px;
}

.plot-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 10px;
}

.font-sm {
  font-size: 12px;
}

/* 3x3 Mini Grid for agricultural assets */
.mini-grid-3x3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 6px;
  flex: 1;
  max-width: 180px;
  margin: 0 auto;
  aspect-ratio: 1;
}

.mini-slot {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: background 0.2s;
  aspect-ratio: 1;
}

.mini-slot:hover {
  background: rgba(255, 255, 255, 0.03);
}

.mini-slot :deep(img) {
  width: 75% !important;
  height: 75% !important;
  object-fit: contain;
}

.slot-empty {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.15);
  font-weight: 300;
}

.slot-indicators {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  pointer-events: none;
}

.slot-focus {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 8px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}

.slot-progress {
  height: 3px;
  background: var(--success);
  border-radius: 0 0 2px 2px;
}

.is-ready {
  border-color: rgba(234, 179, 8, 0.35);
  background: rgba(234, 179, 8, 0.05);
  box-shadow: inset 0 0 6px rgba(234, 179, 8, 0.15);
  animation: pulse-gold 2s infinite alternate;
}

@keyframes pulse-gold {
  0% { border-color: rgba(234, 179, 8, 0.3); }
  100% { border-color: rgba(234, 179, 8, 0.85); }
}

/* Town slots styles */
.town-building-content {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
}

.town-icon-wrap {
  width: 40px;
  height: 40px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.town-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.town-placeholder {
  font-size: 24px;
}

.town-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.nut-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nut-bar {
  height: 5px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
}

.nut-fill {
  height: 100%;
  background: var(--info);
  border-radius: 3px;
}

/* Empty plots styling */
.dashed {
  border-style: dashed !important;
  opacity: 0.55;
  background: rgba(255, 255, 255, 0.005) !important;
  justify-content: center !important;
  align-items: center !important;
}

.dashed:hover {
  opacity: 0.95;
  border-color: var(--gold);
  background: rgba(255, 255, 255, 0.015) !important;
}

.empty-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.empty-layout .plus-icon {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.15);
  font-weight: 200;
  transition: transform 0.2s;
}

.dashed:hover .plus-icon {
  transform: scale(1.15) rotate(90deg);
  color: var(--gold);
}

.empty-layout .empty-label {
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.02em;
}

.empty-layout .empty-sub {
  font-size: 11px;
  color: var(--text-3);
}

/* Sectors aesthetics colors */
.farming-sector {
  border-left: 5px solid #22c55e !important;
  background: linear-gradient(to right, rgba(34, 197, 94, 0.015), transparent);
}

.town-sector {
  border-left: 5px solid #64748b !important;
  background: linear-gradient(to right, rgba(100, 116, 139, 0.015), transparent);
}

.farm { border-left: 4px solid #84cc16; }
.herb_garden { border-left: 4px solid #a855f7; }
.pasture { border-left: 4px solid #f59e0b; }
.kennel { border-left: 4px solid #ef4444; }

/* Modals & lists */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal {
  width: 100%;
  max-width: 520px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.modal-scrollable {
  overflow-y: auto;
  flex: 1;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modal-body {
  padding: 24px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 26px;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--gold);
}

.b-mgmt-header {
  display: flex;
  gap: 16px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.b-mgmt-icon-box {
  width: 48px;
  height: 48px;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.06);
}

.b-mgmt-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nut-input-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nut-bar-lg {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.mgmt-resources {
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 20px;
}

.res-list-mgmt {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 4px;
}

.res-mgmt-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.res-mgmt-item :deep(img) {
  width: 32px !important;
  height: 32px !important;
  object-fit: contain;
}

.res-m-info {
  flex: 1;
}

.res-m-name {
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.focus-tag {
  background: rgba(56, 189, 248, 0.15) !important;
  color: #38bdf8 !important;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.res-m-status {
  font-size: 11px;
  color: var(--text-3);
}

.add-res-inline {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
}

.bg-alt {
  background: rgba(255, 255, 255, 0.015);
}

/* Crop selection grid directly listed */
.permitted-crops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 4px;
}

.crop-select-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0,0,0,0.2) !important;
}

.crop-select-card:hover {
  transform: scale(1.03);
  border-color: var(--gold) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.crop-select-card :deep(img) {
  width: 28px !important;
  height: 28px !important;
  margin-bottom: 8px;
}

.csc-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.csc-name {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.csc-tier {
  font-size: 9px;
}

/* Compatible building card grid */
.c-buildings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}

.c-building-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(0,0,0,0.2) !important;
}

.c-building-card:hover {
  transform: translateX(4px);
  border-color: var(--gold) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.cb-icon-box {
  width: 32px;
  height: 32px;
  background: rgba(0,0,0,0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}

.cb-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cb-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cb-name {
  font-size: 13px;
  font-weight: 700;
}

.cb-type {
  font-size: 11px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-group label {
  text-transform: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.modal-footer {
  margin-top: 28px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
