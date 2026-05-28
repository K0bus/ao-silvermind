<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-black text-white font-cinzel tracking-wider">EDITORIAL - GUIDES & CATÉGORIES</h1>
        <p class="text-sm text-gray-500">Gérez les guides d'apprentissage rédigés en Markdown et organisez-les par catégories.</p>
      </div>

      <div class="flex gap-2">
        <button
          v-if="activeTab === 'categories'"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-glow"
          @click="openCategoryModal(null)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle Catégorie
        </button>
        <NuxtLink
          v-else
          to="/admin/guides/editor"
          class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-glow"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Rédiger un Guide
        </NuxtLink>
      </div>
    </div>

    <!-- Tabs Menu -->
    <div class="flex border-b border-surface-800 mb-6">
      <button
        class="px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all duration-200"
        :class="activeTab === 'guides' ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:text-gray-300'"
        @click="activeTab = 'guides'"
      >
        Guides ({{ guidesResponse?.data?.length || 0 }})
      </button>
      <button
        class="px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all duration-200"
        :class="activeTab === 'categories' ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:text-gray-300'"
        @click="activeTab = 'categories'"
      >
        Catégories ({{ categoriesResponse?.data?.length || 0 }})
      </button>
    </div>

    <!-- Tab Content: Guides -->
    <div v-if="activeTab === 'guides'" class="bg-surface-900 border border-surface-800 rounded-lg shadow-card">
      <div v-if="pendingGuides" class="p-16 flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 border-r-2 border-surface-900 mb-3"></div>
        <p class="text-gray-500 text-sm">Chargement des articles...</p>
      </div>

      <div v-else-if="!guidesResponse?.data?.length" class="p-12 text-center text-gray-500 text-sm">
        Aucun guide de rédigé pour le moment. Cliquez sur "Rédiger un Guide" pour commencer !
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-surface-800 text-xs font-black uppercase tracking-wider text-gray-400 bg-surface-950/40">
              <th class="p-4 pl-6">Guide</th>
              <th class="p-4">Catégorie</th>
              <th class="p-4">Statut</th>
              <th class="p-4">Rédacteur</th>
              <th class="p-4">Créé le</th>
              <th class="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800 text-sm">
            <tr v-for="guide in guidesResponse.data" :key="guide.id" class="hover:bg-surface-850/30 transition-colors">
              <td class="p-4 pl-6">
                <div class="font-bold text-white leading-snug">{{ guide.title }}</div>
                <div class="text-xs text-gray-500 font-mono mt-0.5">/guides/{{ guide.slug }}</div>
              </td>
              <td class="p-4">
                <span class="bg-surface-950 border border-surface-800 text-primary-500 font-bold px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                  {{ guide.category?.name || 'Inconnue' }}
                </span>
              </td>
              <td class="p-4">
                <button
                  class="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded transition-all duration-200 cursor-pointer border"
                  :class="guide.published ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/40' : 'bg-amber-950/40 border-amber-900/60 text-amber-400 hover:bg-amber-900/40'"
                  @click="togglePublish(guide)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="guide.published ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
                  {{ guide.published ? 'Publié' : 'Brouillon' }}
                </button>
              </td>
              <td class="p-4 text-xs text-gray-400">{{ guide.author?.username || 'Admin' }}</td>
              <td class="p-4 text-xs text-gray-400">{{ formatDate(guide.createdAt) }}</td>
              <td class="p-4 pr-6 text-right space-x-2">
                <NuxtLink
                  :to="`/admin/guides/editor?id=${guide.id}`"
                  class="inline-flex items-center justify-center p-1.5 bg-surface-800 hover:bg-surface-700 text-gray-300 hover:text-white rounded border border-surface-700 transition-colors"
                  title="Modifier l'article"
                >
                  <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </NuxtLink>
                <button
                  class="inline-flex items-center justify-center p-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded border border-red-900/30 transition-colors cursor-pointer"
                  title="Supprimer l'article"
                  @click="promptDeleteGuide(guide)"
                >
                  <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab Content: Categories -->
    <div v-if="activeTab === 'categories'" class="bg-surface-900 border border-surface-800 rounded-lg shadow-card">
      <div v-if="pendingCategories" class="p-16 flex flex-col items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 border-r-2 border-surface-900 mb-3"></div>
        <p class="text-gray-500 text-sm">Chargement des catégories...</p>
      </div>

      <div v-else-if="!categoriesResponse?.data?.length" class="p-12 text-center text-gray-500 text-sm">
        Aucune catégorie de guide de créée. Cliquez sur "Nouvelle Catégorie" pour en créer une.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-surface-800 text-xs font-black uppercase tracking-wider text-gray-400 bg-surface-950/40">
              <th class="p-4 pl-6">Nom</th>
              <th class="p-4">Slug</th>
              <th class="p-4">Description</th>
              <th class="p-4">Ordre de tri</th>
              <th class="p-4">Nombre de Guides</th>
              <th class="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-800 text-sm">
            <tr v-for="cat in categoriesResponse.data" :key="cat.id" class="hover:bg-surface-850/30 transition-colors">
              <td class="p-4 pl-6 font-bold text-white">{{ cat.name }}</td>
              <td class="p-4 font-mono text-xs text-primary-500">{{ cat.slug }}</td>
              <td class="p-4 text-xs text-gray-400 truncate max-w-xs">{{ cat.description || '-' }}</td>
              <td class="p-4 text-xs text-gray-400 font-mono">{{ cat.sortOrder }}</td>
              <td class="p-4 text-xs text-gray-400 font-semibold pl-8">{{ cat._count?.guides || 0 }}</td>
              <td class="p-4 pr-6 text-right space-x-2">
                <button
                  class="inline-flex items-center justify-center p-1.5 bg-surface-800 hover:bg-surface-700 text-gray-300 hover:text-white rounded border border-surface-700 transition-colors cursor-pointer"
                  title="Modifier la catégorie"
                  @click="openCategoryModal(cat)"
                >
                  <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  class="inline-flex items-center justify-center p-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded border border-red-900/30 transition-colors cursor-pointer"
                  title="Supprimer la catégorie"
                  @click="promptDeleteCategory(cat)"
                >
                  <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Category Modal -->
    <div v-if="catModalOpen" class="fixed inset-0 z-1300 flex items-center justify-center p-4 bg-black/75">
      <div class="w-full max-w-md bg-surface-900 border border-surface-850 rounded-lg p-6 shadow-card">
        <h3 class="text-lg font-black text-white font-cinzel uppercase border-b border-surface-850 pb-2 mb-4">
          {{ selectedCategory ? 'Modifier la catégorie' : 'Créer une catégorie' }}
        </h3>

        <!-- Form fields -->
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nom de la catégorie *</label>
            <input
              v-model="catForm.name"
              type="text"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              placeholder="ex: PvP Guide"
              @input="onNameInput"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Slug (URL) *</label>
            <input
              v-model="catForm.slug"
              type="text"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              placeholder="ex: pvp-guide"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Description</label>
            <textarea
              v-model="catForm.description"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 h-20 resize-none"
              placeholder="Brève explication de la thématique des guides de cette catégorie."
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Ordre de tri</label>
            <input
              v-model.number="catForm.sortOrder"
              type="number"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2.5 mt-6 pt-4 border-t border-surface-850">
          <button
            class="px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white text-sm rounded font-semibold transition-colors"
            @click="closeCategoryModal"
          >
            Annuler
          </button>
          <button
            class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded font-semibold transition-colors shadow-glow"
            :disabled="savingCat"
            @click="saveCategory"
          >
            {{ savingCat ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reusable Deletion Confirmation Modals -->
    <ConfirmationModal
      :open="deleteModalOpen"
      :title="deleteTargetType === 'guide' ? 'Supprimer le guide ?' : 'Supprimer la catégorie ?'"
      :message="deleteTargetType === 'guide' ? 'Êtes-vous sûr de vouloir supprimer définitivement ce guide ? Cette opération est irréversible.' : 'ATTENTION : La suppression de cette catégorie supprimera également définitivement TOUS les guides associés à cette catégorie. Cette opération est irréversible et destructrice !'"
      confirm-label="Supprimer définitivement"
      cancel-label="Annuler"
      variant="danger"
      :loading="deleting"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { Guide, GuideCategory } from '@albion-tool/types'

definePageMeta({
  layout: 'admin'
})

useHead({
  title: 'Gestion Éditoriale - Administration'
})

const activeTab = ref<'guides' | 'categories'>('guides')

// Fetch data dynamically
const { data: guidesResponse, pending: pendingGuides, refresh: refreshGuides } = await useFetch<{ data: Guide[] }>('/api/v1/admin/guides')
const { data: categoriesResponse, pending: pendingCategories, refresh: refreshCategories } = await useFetch<{ data: GuideCategory[] }>('/api/v1/admin/guide-categories')

// Deletion State
const deleteModalOpen = ref(false)
const deleting = ref(false)
const deleteTargetType = ref<'guide' | 'category' | null>(null)
const deleteTargetId = ref<string | null>(null)

const promptDeleteGuide = (guide: Guide) => {
  deleteTargetType.value = 'guide'
  deleteTargetId.value = guide.id
  deleteModalOpen.value = true
}

const promptDeleteCategory = (cat: GuideCategory) => {
  deleteTargetType.value = 'category'
  deleteTargetId.value = cat.id
  deleteModalOpen.value = true
}

const executeDelete = async () => {
  if (!deleteTargetId.value || !deleteTargetType.value) return
  deleting.value = true
  
  const endpoint = deleteTargetType.value === 'guide'
    ? `/api/v1/admin/guides/${deleteTargetId.value}`
    : `/api/v1/admin/guide-categories/${deleteTargetId.value}`
    
  try {
    await $fetch(endpoint, { method: 'DELETE' })
    if (deleteTargetType.value === 'guide') {
      await refreshGuides()
    } else {
      await Promise.all([refreshCategories(), refreshGuides()])
    }
    deleteModalOpen.value = false
  } catch (error: any) {
    alert(error.data?.message || 'Une erreur est survenue lors de la suppression.')
  } finally {
    deleting.value = false
    deleteTargetId.value = null
    deleteTargetType.value = null
  }
}

const cancelDelete = () => {
  deleteModalOpen.value = false
  deleteTargetId.value = null
  deleteTargetType.value = null
}

// Toggle published state on guide
const togglePublish = async (guide: Guide) => {
  try {
    await $fetch(`/api/v1/admin/guides/${guide.id}`, {
      method: 'PATCH',
      body: { published: !guide.published }
    })
    await refreshGuides()
  } catch (error: any) {
    alert(error.data?.message || 'Erreur lors du changement de publication.')
  }
}

// Category Creation/Edition State
const catModalOpen = ref(false)
const selectedCategory = ref<GuideCategory | null>(null)
const savingCat = ref(false)

const catForm = ref({
  name: '',
  slug: '',
  description: '',
  sortOrder: 0
})

const openCategoryModal = (cat: GuideCategory | null) => {
  selectedCategory.value = cat
  if (cat) {
    catForm.value = {
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      sortOrder: cat.sortOrder
    }
  } else {
    catForm.value = {
      name: '',
      slug: '',
      description: '',
      sortOrder: 0
    }
  }
  catModalOpen.value = true
}

const closeCategoryModal = () => {
  catModalOpen.value = false
  selectedCategory.value = null
}

const onNameInput = () => {
  if (!selectedCategory.value) {
    catForm.value.slug = catForm.value.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '') // keep only letters, numbers, spaces, hyphens
      .trim()
      .replace(/\s+/g, '-') // convert spaces to hyphens
  }
}

const saveCategory = async () => {
  if (!catForm.value.name || !catForm.value.slug) {
    alert('Veuillez renseigner les champs obligatoires (*).')
    return
  }
  
  savingCat.value = true
  
  const endpoint = selectedCategory.value
    ? `/api/v1/admin/guide-categories/${selectedCategory.value.id}`
    : '/api/v1/admin/guide-categories'
    
  const method = selectedCategory.value ? 'PATCH' : 'POST'
  
  try {
    await $fetch(endpoint, {
      method,
      body: catForm.value
    })
    await refreshCategories()
    catModalOpen.value = false
  } catch (error: any) {
    alert(error.data?.message || "Erreur lors de l'enregistrement de la catégorie.")
  } finally {
    savingCat.value = false
  }
}

// Helpers
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<style scoped>
.shadow-glow {
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.1);
}
</style>
