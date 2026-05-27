<template>
  <div class="page creator-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink><span class="sep">/</span>
          <NuxtLink to="/builds">Builds</NuxtLink><span class="sep">/</span>
          {{ editCode ? 'Modifier' : 'Créer' }}
        </div>
        <h1>{{ editCode ? 'Modifier le build' : 'Build Creator' }}</h1>
      </div>
      <!-- Actions -->
      <div class="creator-actions">
        <button class="ds-btn" title="Partager sans compte (lien direct)" @click="copyGuestLink">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Lien rapide
        </button>
        <button
          class="ds-btn primary"
          :disabled="creator.isSaving.value || !auth.isAuthenticated.value"
          :title="!auth.isAuthenticated.value ? 'Connectez-vous pour sauvegarder ce build' : ''"
          @click="save"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {{ creator.isSaving.value ? 'Sauvegarde…' : (editCode ? 'Mettre à jour' : 'Sauvegarder') }}
        </button>
      </div>
    </div>

    <!-- Login reminder banner -->
    <div v-if="!auth.isAuthenticated.value" class="share-banner warning">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Vous devez être connecté pour sauvegarder et publier ce build.
      <NuxtLink :to="`/auth/login?redirect=${$route.fullPath}`" class="t-gold" style="margin-left: auto">Se connecter →</NuxtLink>
    </div>

    <!-- Share success banner -->
    <div v-if="savedCode" class="share-banner">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Build sauvegardé !
      <NuxtLink :to="`/builds/b/${savedCode}`" class="t-gold">Voir le build →</NuxtLink>
      <button class="share-copy" @click="copyBuildLink">Copier le lien</button>
    </div>

    <div v-if="copiedMsg" class="share-banner" style="background:rgba(125,154,74,0.12);border-color:var(--success)">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      {{ copiedMsg }}
    </div>

    <div class="panel info-panel">
      <div class="panel-header"><h3>Informations</h3></div>
      <div class="panel-body">
          <div class="form-fields">
            <div class="form-field">
              <label>Nom du build</label>
              <input v-model="creator.title.value" type="text" placeholder="Mon build ZvZ…" maxlength="120" />
            </div>
            <div class="form-field">
              <label>Contenus <span class="t-gold">*</span></label>
              <div class="mode-pills">
                <button
                  v-for="option in BUILD_CONTENT_TYPE_OPTIONS"
                  :key="option.value"
                  class="filter-pill sm"
                  :class="{ active: creator.contentTypes.value.includes(option.value) }"
                  @click="toggleContentType(option.value)"
                >{{ option.label }}</button>
              </div>
              <div v-if="validationError" class="field-error">{{ validationError }}</div>
            </div>
            <div class="form-field">
              <label>Rôles</label>
              <div class="mode-pills">
                <button
                  v-for="option in BUILD_ROLE_OPTIONS"
                  :key="option.value"
                  class="filter-pill sm"
                  :class="{ active: creator.roles.value.includes(option.value) }"
                  @click="toggleListValue(creator.roles.value, option.value)"
                >{{ option.label }}</button>
              </div>
            </div>
            <div class="form-field">
              <label>Taille du groupe</label>
              <div class="mode-pills">
                <button
                  v-for="option in BUILD_GROUP_SCALE_OPTIONS"
                  :key="option.value"
                  class="filter-pill sm"
                  :class="{ active: creator.groupScales.value.includes(option.value) }"
                  @click="toggleListValue(creator.groupScales.value, option.value)"
                >{{ option.label }}</button>
              </div>
            </div>
            <div class="form-field">
              <label>Style de jeu</label>
              <div class="mode-pills">
                <button
                  v-for="option in BUILD_PLAYSTYLE_OPTIONS"
                  :key="option.value"
                  class="filter-pill sm"
                  :class="{ active: creator.playstyles.value.includes(option.value) }"
                  @click="toggleListValue(creator.playstyles.value, option.value)"
                >{{ option.label }}</button>
              </div>
            </div>
            <div class="tag-grid">
              <div class="form-field">
                <label>Difficulté</label>
                <div class="mode-pills">
                  <button
                    v-for="option in BUILD_DIFFICULTY_OPTIONS"
                    :key="option.value"
                    class="filter-pill sm"
                    :class="{ active: creator.difficulty.value === option.value }"
                    @click="toggleSingleValue('difficulty', option.value)"
                  >{{ option.label }}</button>
                </div>
              </div>
              <div class="form-field">
                <label>Budget</label>
                <div class="mode-pills">
                  <button
                    v-for="option in BUILD_BUDGET_OPTIONS"
                    :key="option.value"
                    class="filter-pill sm"
                    :class="{ active: creator.budget.value === option.value }"
                    @click="toggleSingleValue('budget', option.value)"
                  >{{ option.label }}</button>
                </div>
              </div>
            </div>
            <div v-if="derivedWeaponLabel" class="derived-weapon">
              <span class="derived-weapon-label">Arme détectée</span>
              <span class="derived-weapon-value">{{ derivedWeaponLabel }}</span>
            </div>
            <div class="form-field">
              <label>Visibilité</label>
              <div class="vis-select" :class="{ disabled: !auth.isAuthenticated.value }">
                <button
                  v-for="vis in VISIBILITIES"
                  :key="vis.value"
                  class="vis-opt"
                  :class="{ active: creator.visibility.value === vis.value }"
                  :disabled="!auth.isAuthenticated.value"
                  @click="creator.visibility.value = vis.value"
                >
                  <span class="vis-dot" :class="vis.value.toLowerCase()" />
                  {{ vis.label }}
                </button>
              </div>
            </div>
            <div class="form-field">
              <label>Description <span class="t-dim" style="font-weight:400;font-size:11px">(optionnel)</span></label>
              <textarea v-model="creator.description.value" rows="3" placeholder="Notes, conseils d'utilisation…" maxlength="2000" />
            </div>
          </div>
      </div>
    </div>

    <!-- Body -->
    <div class="creator-body">

      <!-- Col gauche : équipement -->
      <div class="creator-left">
        <div class="panel">
          <div class="panel-header"><h3>Équipement</h3></div>
          <div class="panel-body">
            <div class="slots-layout">
              <div
                v-for="(column, columnIndex) in SLOT_COLUMNS"
                :key="`col-${columnIndex}`"
                class="slots-column"
                :class="{ center: columnIndex === 1 }"
              >
                <BuildSlot
                  v-for="slotKey in column"
                  :key="slotKey"
                  :label="slotDef(slotKey)?.label ?? slotKey"
                  :item="creator.equipment[slotKey]"
                  :active="creator.activeSlot.value === slotKey"
                  :disabled="slotDisabled(slotKey)"
                  @click="openPicker(slotKey)"
                  @remove="creator.setItem(slotKey, null)"
                />
              </div>
            </div>
            <div v-if="creator.baseIp.value !== null" class="base-ip-panel">
              <span class="base-ip-label">IP de base</span>
              <span class="base-ip-value">{{ creator.baseIp.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Col droite : sélection de spells -->
      <div class="creator-right">
        <div class="panel spells-panel">
          <div class="panel-header"><h3>Spells</h3></div>
          <div class="panel-body">
          <div v-if="!creator.hasEquipment.value" class="spells-empty">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <p>Équipez des items pour voir les spells disponibles</p>
          </div>

          <BuildSpellPicker
            v-else
            :selected="creator.selectedSpells"
            :groups="creator.spellGroups.value"
            @pick="creator.setSpell"
          />
          </div>
        </div>
      </div>
    </div>

    <!-- Item picker modal -->
    <ItemPickerModal
      :open="!!pickerSlot"
      :slot-label="activeSlotDef?.label ?? ''"
      :slot-filter="activeSlotDef?.filter"
      @close="pickerSlot = null"
      @select="onItemSelected"
    />
  </div>
</template>

<script setup lang="ts">
import {
  BUILD_BUDGET_OPTIONS,
  BUILD_CONTENT_TYPE_OPTIONS,
  BUILD_DIFFICULTY_OPTIONS,
  BUILD_GROUP_SCALE_OPTIONS,
  BUILD_PLAYSTYLE_OPTIONS,
  BUILD_ROLE_OPTIONS,
} from '@albion-tool/types'
import { EQUIPMENT_SLOTS, useBuildCreator } from '~/composables/useBuildCreator'
import type { SlotKey, EquippedItem } from '~/composables/useBuildCreator'
import { labelWeaponCategory, labelWeaponSubcategory } from '~/utils/buildTaxonomy'

const route = useRoute()
const VISIBILITIES = [
  { value: 'PRIVATE' as const, label: 'Privé' },
  { value: 'UNLISTED' as const, label: 'Non listé' },
  { value: 'PUBLIC' as const, label: 'Public' },
]
const SLOT_COLUMNS: SlotKey[][] = [
  ['bag', 'weapon', 'potion'],
  ['helmet', 'armor', 'shoes', 'mount'],
  ['cape', 'offhand', 'food'],
]

const creator = useBuildCreator()
const auth = useAuth()
const pickerSlot = ref<SlotKey | null>(null)
const savedCode = ref<string | null>(null)
const copiedMsg = ref<string | null>(null)
const validationError = ref('')
const loadingEdit = ref(false)
const editCode = computed(() => {
  const value = route.query.edit
  return typeof value === 'string' && value.trim().length > 0 ? value : null
})

const activeSlotDef = computed(() =>
  pickerSlot.value ? EQUIPMENT_SLOTS.find((s) => s.key === pickerSlot.value) ?? null : null
)
const derivedWeaponLabel = computed(() => {
  const weapon = creator.equipment.weapon
  if (!weapon) return null

  return [labelWeaponSubcategory(weapon.shopSubcategory), labelWeaponCategory(weapon.shopCategory)]
    .filter(Boolean)
    .join(' · ')
})

function openPicker(slot: SlotKey) {
  if (slot === 'offhand' && creator.offhandDisabled.value) return
  creator.activeSlot.value = slot
  pickerSlot.value = slot
}

function slotDef(slot: SlotKey) {
  return EQUIPMENT_SLOTS.find((entry) => entry.key === slot) ?? null
}

function slotDisabled(slot: SlotKey) {
  return slot === 'offhand' && creator.offhandDisabled.value
}

async function onItemSelected(item: EquippedItem) {
  if (!pickerSlot.value) return
  await creator.setItem(pickerSlot.value, item)
  creator.activeSlot.value = null
  pickerSlot.value = null
}

function toggleContentType(value: typeof BUILD_CONTENT_TYPE_OPTIONS[number]['value']) {
  const idx = creator.contentTypes.value.indexOf(value)
  if (idx >= 0) creator.contentTypes.value.splice(idx, 1)
  else creator.contentTypes.value.push(value)
  validationError.value = ''
}

function toggleListValue<T extends string>(list: T[], value: T) {
  const idx = list.indexOf(value)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(value)
}

function toggleSingleValue(field: 'difficulty' | 'budget', value: string) {
  if (field === 'difficulty') {
    creator.difficulty.value = creator.difficulty.value === value ? null : value as typeof creator.difficulty.value
    return
  }

  creator.budget.value = creator.budget.value === value ? null : value as typeof creator.budget.value
}

async function save() {
  if (!creator.primaryContentType.value) {
    validationError.value = 'Choisissez au moins un contenu avant de sauvegarder le build.'
    return
  }

  try {
    const result = editCode.value
      ? await creator.updateBuild(editCode.value)
      : await creator.saveBuild()
    savedCode.value = result.shareCode
  } catch (e: any) {
    alert(e?.data?.message ?? 'Erreur lors de la sauvegarde')
  }
}

watch(editCode, async (code) => {
  if (!code || loadingEdit.value) return

  loadingEdit.value = true
  try {
    if (!auth.user.value && process.client) {
      await auth.fetchUser().catch(() => {})
    }

    const res = await $fetch<{ data: any }>(`/api/v1/builds/${code}`)
    const build = res.data

    creator.reset()
    creator.title.value = build.title ?? 'Mon build'
    creator.description.value = build.description ?? ''
    creator.contentTypes.value = [...(build.contentTypes ?? [])]
    creator.roles.value = [...(build.roles ?? [])]
    creator.groupScales.value = [...(build.groupScales ?? [])]
    creator.playstyles.value = [...(build.playstyles ?? [])]
    creator.difficulty.value = build.difficulty ?? null
    creator.budget.value = build.budget ?? null
    creator.visibility.value = build.visibility ?? 'PRIVATE'

    const equipmentEntries = Object.entries(build.equipment ?? {}) as Array<[SlotKey, string | null]>
    for (const [slot, uniqueName] of equipmentEntries) {
      if (!uniqueName) continue
      try {
        const itemRes = await $fetch<{ data: any }>(`/api/v1/items/${uniqueName}`)
        const item = itemRes.data
        await creator.setItem(slot, {
          uniqueName: item.uniqueName,
          name: item.name,
          tier: item.tier,
          enchantmentLevel: item.enchantmentLevel,
          itemPower: typeof item.itemPower === 'number' ? item.itemPower : null,
          twoHanded: Boolean(item.twoHanded),
          iconUrl: item.iconUrl,
          itemType: item.itemType,
          shopCategory: item.shopCategory,
          shopSubcategory: item.shopSubcategory,
        })
      } catch {}
    }

    for (const selected of build.spells ?? []) {
      creator.setSpell(selected.slotKey, selected.spell)
    }
  } catch (e: any) {
    alert(e?.data?.message ?? 'Impossible de charger le build à modifier')
  } finally {
    loadingEdit.value = false
  }
}, { immediate: true })

onMounted(async () => {
  if (editCode.value) return

  const slotsToLoad = ['weapon', 'offhand', 'helmet', 'armor', 'shoes', 'cape', 'bag', 'food', 'potion', 'mount'] as const
  for (const slot of slotsToLoad) {
    const itemQuery = route.query[slot]
    if (typeof itemQuery === 'string' && itemQuery.trim().length > 0) {
      try {
        const itemRes = await $fetch<{ data: any }>(`/api/v1/items/${itemQuery}`)
        const item = itemRes.data
        if (item) {
          await creator.setItem(slot, {
            uniqueName: item.uniqueName,
            name: item.name,
            tier: item.tier,
            enchantmentLevel: item.enchantmentLevel,
            itemPower: typeof item.itemPower === 'number' ? item.itemPower : null,
            twoHanded: Boolean(item.twoHanded),
            iconUrl: item.iconUrl,
            itemType: item.itemType,
            shopCategory: item.shopCategory,
            shopSubcategory: item.shopSubcategory,
          })
        }
      } catch (err) {
        console.error(`[BuildCreator] Failed to pre-populate ${slot} with ${itemQuery}:`, err)
      }
    }
  }
})

function copyGuestLink() {
  const url = creator.buildGuestUrl()
  navigator.clipboard.writeText(url)
  showCopied('Lien de partage rapide copié !')
}

function copyBuildLink() {
  if (!savedCode.value) return
  navigator.clipboard.writeText(`${window.location.origin}/builds/b/${savedCode.value}`)
  showCopied('Lien copié dans le presse-papier !')
}

function showCopied(msg: string) {
  copiedMsg.value = msg
  setTimeout(() => { copiedMsg.value = null }, 3000)
}

useSeoMeta({ title: 'Build Creator — Albion - SilverMind' })
</script>

<style scoped>
.creator-page { max-width: 1200px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.creator-actions { display: flex; gap: 8px; align-items: center; }

.share-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(201,161,74,0.08);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--text-1);
  margin-bottom: 16px;
}
.share-banner.warning {
  background: rgba(201,74,74,0.08);
  border-color: rgba(201,74,74,0.2);
  color: var(--text-1);
}
.share-copy {
  margin-left: auto;
  font-size: 12px;
  color: var(--gold);
  text-decoration: underline;
}

.info-panel {
  margin-bottom: 16px;
}

.creator-body {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
  align-items: start;
}

.creator-left, .creator-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slots-layout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  margin-top: 6px;
}

.slots-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slots-column.center {
  transform: translateY(calc(-108px / 8));
}

.base-ip-panel {
  margin-top: 14px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border-divider);
}

.base-ip-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-3);
  font-family: var(--font-display);
}

.base-ip-value {
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  color: var(--gold);
  font-family: var(--font-mono);
}

.form-fields { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-2);
}
.form-field input,
.form-field textarea {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  color: var(--text-0);
  font-size: 13px;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus { border-color: var(--gold-dim); }

.mode-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.tag-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field-error {
  color: var(--danger);
  font-size: 12px;
}

.derived-weapon {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid rgba(201,161,74,0.2);
  background: rgba(201,161,74,0.06);
}

.derived-weapon-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
}

.derived-weapon-value {
  color: var(--gold);
  font-size: 13px;
  font-weight: 600;
}

.vis-select { display: flex; gap: 6px; }
.vis-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-1);
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.vis-opt.active {
  border-color: var(--gold-dim);
  color: var(--text-0);
  background: rgba(201,161,74,0.07);
}
.vis-select.disabled {
  opacity: 0.6;
  pointer-events: none;
}
.vis-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-3);
}
.vis-dot.public { background: var(--success); }
.vis-dot.unlisted { background: var(--warning); }
.vis-dot.private { background: var(--text-4); }

.spells-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-3);
}
.spells-empty p { font-size: 13px; max-width: 200px; line-height: 1.5; }


@media (max-width: 900px) {
  .creator-body {
    grid-template-columns: 1fr;
  }
  .slots-layout {
    grid-template-columns: 1fr;
  }
  .slots-column.center {
    transform: none;
  }
  .tag-grid {
    grid-template-columns: 1fr;
  }
}
</style>
