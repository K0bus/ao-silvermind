<template>
  <div class="h-[calc(100vh-6rem)] flex flex-col">
    <!-- Header Controls -->
    <div class="flex justify-between items-center mb-4 shrink-0">
      <div>
        <h1 class="text-xl font-black text-white font-cinzel tracking-wider uppercase">
          {{ isEditing ? 'ÉDITER LE GUIDE' : 'RÉDIGER UN GUIDE' }}
        </h1>
        <p class="text-xs text-gray-500">Rédigez en Markdown et visualisez le rendu en temps réel.</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Status Indicator -->
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-gray-500 uppercase tracking-wider font-semibold">Statut :</span>
          <span
            class="px-2 py-0.5 rounded font-bold uppercase tracking-wider border"
            :class="form.published ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400' : 'bg-amber-950/40 border-amber-900/60 text-amber-400'"
          >
            {{ form.published ? 'Publié' : 'Brouillon' }}
          </span>
        </div>

        <button
          class="px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white text-xs font-semibold rounded transition-colors"
          @click="cancel"
        >
          Annuler
        </button>
        <button
          class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5 shadow-glow"
          :disabled="saving"
          @click="saveGuide"
        >
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <!-- Main Workspace (Split View) -->
    <div class="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
      <!-- Left Column: Form & Editor -->
      <div class="w-full lg:w-1/2 flex flex-col gap-4 bg-surface-900 border border-surface-800 rounded-lg p-5 overflow-y-auto">
        <!-- Title and Slug -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Titre du guide *</label>
            <input
              v-model="form.title"
              type="text"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              placeholder="ex: Guide de débutant pour le Craft"
              @input="onTitleInput"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Slug (URL) *</label>
            <input
              v-model="form.slug"
              type="text"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              placeholder="ex: guide-debutant-craft"
            />
          </div>
        </div>

        <!-- Category & Published Toggle -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Catégorie *</label>
            <div v-if="pendingCats" class="text-xs text-gray-500 py-2">Chargement...</div>
            <div v-else-if="!categoriesResponse?.data?.length" class="text-xs text-red-400 py-2">
              Aucune catégorie disponible.
              <NuxtLink to="/admin/guides" class="underline hover:text-red-300">Créez-en une d'abord</NuxtLink>.
            </div>
            <select
              v-else
              v-model="form.categoryId"
              class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="" disabled>Sélectionnez une catégorie</option>
              <option v-for="cat in categoriesResponse.data" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="flex flex-col justify-end pb-1.5 pl-2">
            <label class="inline-flex items-center gap-2 cursor-pointer mt-auto">
              <input
                v-model="form.published"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-9 h-5 bg-surface-950 border border-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-white peer-checked:bg-primary-600 peer-checked:border-primary-500 relative"></div>
              <span class="text-xs font-bold uppercase tracking-wider text-gray-400 peer-checked:text-white select-none">
                {{ form.published ? 'Publier immédiatement' : 'Conserver en brouillon' }}
              </span>
            </label>
          </div>
        </div>

        <!-- Summary -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Résumé du guide * (1 à 2 phrases max)</label>
          <textarea
            v-model="form.summary"
            class="w-full bg-surface-950 border border-surface-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 h-16 resize-none"
            placeholder="ex: Apprenez les bases indispensables pour optimiser votre rentabilité lors du raffinage et crafting."
          ></textarea>
        </div>

        <!-- Content Area -->
        <div class="flex-1 flex flex-col min-h-[300px]">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Contenu (Markdown) *</label>
          <textarea
            v-model="form.content"
            class="flex-1 w-full bg-surface-950 border border-surface-700 rounded p-4 text-white font-mono text-sm focus:outline-none focus:border-primary-500 resize-none"
            placeholder="Rédigez votre guide ici... Utilisez # pour les titres, - pour les listes, ** pour le gras, [Texte](Lien) pour les liens et ``` pour les blocs de code."
          ></textarea>
        </div>
      </div>

      <!-- Right Column: Real-time Markdown Preview -->
      <div class="w-full lg:w-1/2 flex flex-col bg-surface-900 border border-surface-800 rounded-lg p-5 overflow-hidden">
        <h3 class="text-xs font-black uppercase tracking-wider text-primary-500 border-b border-surface-850 pb-2 mb-4 shrink-0 font-cinzel">
          Aperçu du rendu
        </h3>
        
        <div class="flex-1 overflow-y-auto pr-1">
          <!-- Guide Heading Mimic inside preview -->
          <div v-if="form.title" class="mb-6 pb-4 border-b border-surface-800">
            <h1 class="text-2xl font-black text-white uppercase font-cinzel leading-tight mb-2 tracking-wide">
              {{ form.title }}
            </h1>
            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Catégorie : <span class="text-primary-500 font-bold">{{ activeCategoryName }}</span>
            </p>
          </div>

          <!-- Parsed HTML -->
          <div v-if="form.content" class="markdown-body" v-html="previewHtml"></div>
          <div v-else class="text-gray-500 text-sm flex items-center justify-center h-full">
            Écrivez du texte en Markdown pour voir le rendu ici...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse, Guide, GuideCategory } from '@albion-tool/types'
import { renderMarkdown } from '~/utils/markdown'

definePageMeta({
  layout: 'admin'
})

useHead({
  title: 'Rédacteur de Guides - Administration'
})

const route = useRoute()
const router = useRouter()

const isEditing = ref(false)
const guideId = ref<string | null>(null)
const saving = ref(false)

const form = ref({
  title: '',
  slug: '',
  categoryId: '',
  summary: '',
  content: '',
  published: false
})

// Fetch categories
const { data: categoriesResponse, pending: pendingCats } = await useFetch<{ data: GuideCategory[] }>('/api/v1/admin/guide-categories')

const activeCategoryName = computed(() => {
  if (!form.value.categoryId || !categoriesResponse.value?.data) return 'Non définie'
  const match = categoriesResponse.value.data.find(c => c.id === form.value.categoryId)
  return match ? match.name : 'Non définie'
})

// Generate live HTML preview
const previewHtml = computed(() => {
  return renderMarkdown(form.value.content)
})

// Load guide details if editing
onMounted(async () => {
  const queryId = route.query.id as string
  if (queryId) {
    isEditing.value = true
    guideId.value = queryId
    
    try {
      const response = await $fetch<ApiResponse<Guide>>(`/api/v1/admin/guides/${queryId}`)
      if (response?.data) {
        form.value = {
          title: response.data.title,
          slug: response.data.slug,
          categoryId: response.data.categoryId,
          summary: response.data.summary || '',
          content: response.data.content,
          published: response.data.published
        }
      }
    } catch (error: any) {
      alert("Erreur lors de la récupération des détails du guide. Redirection vers l'accueil.")
      router.push('/admin/guides')
    }
  }
})

// Auto slugification
const onTitleInput = () => {
  if (!isEditing.value) {
    form.value.slug = form.value.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '') // keep only letters, numbers, spaces, hyphens
      .trim()
      .replace(/\s+/g, '-') // convert spaces to hyphens
  }
}

const cancel = () => {
  router.push('/admin/guides')
}

const saveGuide = async () => {
  if (!form.value.title || !form.value.slug || !form.value.categoryId || !form.value.content || !form.value.summary) {
    alert('Veuillez remplir tous les champs obligatoires (*).')
    return
  }

  saving.value = true

  const endpoint = isEditing.value
    ? `/api/v1/admin/guides/${guideId.value}`
    : '/api/v1/admin/guides'
    
  const method = isEditing.value ? 'PATCH' : 'POST'

  try {
    await $fetch(endpoint, {
      method,
      body: form.value
    })
    router.push('/admin/guides')
  } catch (error: any) {
    alert(error.data?.message || "Erreur lors de l'enregistrement de l'article.")
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Styling variables for Markdown live rendering */
.markdown-body :deep(h1) {
  display: none;
}
.markdown-body :deep(h2) {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--gold);
  margin-top: 2rem;
  margin-bottom: 1rem;
  border-b: 1px solid var(--border-strong);
  padding-bottom: 0.5rem;
  scroll-margin-top: 5rem;
}
.markdown-body :deep(h3) {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--gold-bright);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  scroll-margin-top: 5rem;
}
.markdown-body :deep(h4) {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-0);
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(p) {
  margin-bottom: 1.25rem;
  line-height: 1.75;
  color: var(--text-1);
}
.markdown-body :deep(strong) {
  color: var(--text-0);
  font-weight: 700;
}
.markdown-body :deep(a) {
  color: var(--gold);
  text-decoration: none;
  border-bottom: 1px dashed var(--gold-dim);
  transition: all 0.15s ease;
}
.markdown-body :deep(a:hover) {
  color: var(--gold-bright);
  border-bottom: 1px solid var(--gold-bright);
}
.markdown-body :deep(pre) {
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}
.markdown-body :deep(pre code) {
  background: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
  color: var(--text-1);
}
.markdown-body :deep(code) {
  background-color: var(--bg-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--gold-bright);
}
.markdown-body :deep(ul) {
  list-style-type: disc;
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}
.markdown-body :deep(ol) {
  list-style-type: decimal;
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}
.markdown-body :deep(li) {
  margin-bottom: 0.5rem;
  color: var(--text-1);
}
.markdown-body :deep(li p) {
  margin-bottom: 0.25rem;
}
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1.75rem 0;
  font-size: 0.875rem;
  background-color: rgba(21, 19, 15, 0.5);
  border-radius: var(--radius);
  overflow: hidden;
}
.markdown-body :deep(th) {
  border: 1px solid var(--border-divider);
  padding: 0.75rem 1rem;
  background-color: var(--bg-3);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: var(--gold);
  letter-spacing: 0.05em;
  text-align: left;
}
.markdown-body :deep(td) {
  border: 1px solid var(--border-divider);
  padding: 0.75rem 1rem;
  color: var(--text-1);
}
.markdown-body :deep(tr:hover) {
  background-color: var(--border-subtle);
}
.markdown-body :deep(hr) {
  border: 0;
  border-top: 1px solid var(--border-strong);
  margin: 2.5rem 0;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--gold);
  background-color: var(--bg-3);
  padding: 1.25rem;
  margin: 1.5rem 0;
  color: var(--text-2);
  font-style: italic;
  border-top-right-radius: var(--radius);
  border-bottom-right-radius: var(--radius);
}
.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  margin: 2rem auto;
  display: block;
}
.markdown-body :deep(input[type="checkbox"]) {
  width: 1rem;
  height: 1rem;
  accent-color: var(--gold);
  margin-right: 0.5rem;
  vertical-align: middle;
}
.shadow-glow {
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.1);
}
</style>
