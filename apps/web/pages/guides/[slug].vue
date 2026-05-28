<template>
  <div class="page">
    <!-- Page Header -->
    <div class="page-header" style="margin-bottom: 24px; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 16px;">
      <div>
        <div class="crumbs">
          <NuxtLink to="/">Accueil</NuxtLink>
          <span class="sep">/</span>
          <NuxtLink to="/guides">Guides</NuxtLink>
          <span class="sep">/</span>
          <span>Détail</span>
        </div>
        <h1 v-if="guideResponse?.data" style="margin-top: 4px;">{{ guideResponse.data.title }}</h1>
        <h1 v-else style="margin-top: 4px;">Chargement...</h1>
        <p v-if="guideResponse?.data" class="t-muted" style="margin-top:8px; font-size: 13px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; line-height: 1.4;">
          Rédigé par <span class="t-gold font-bold">{{ guideResponse.data.author?.username || 'Admin' }}</span>
          <span class="t-dim">•</span>
          Catégorie : <span class="tag gold" style="font-size: 10px; font-weight: bold; text-transform: uppercase; font-family: var(--font-display); letter-spacing: 0.05em;">{{ guideResponse.data.category?.name }}</span>
          <span class="t-dim">•</span>
          Publié le {{ formatDate(guideResponse.data.createdAt) }}
          <span class="t-dim">•</span>
          <span style="display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold)"><circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/></svg>
            {{ readTime }} min de lecture
          </span>
        </p>
      </div>
      <NuxtLink to="/guides" class="ds-btn" style="flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px; font-size: 13px;">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Retour
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="panel parchment framed" style="padding: 48px; text-align: center;">
      <div class="skel" style="width: 48px; height: 48px; border-radius: 50%; margin: 0 auto 16px;" />
      <p class="t-dim text-sm" style="font-size: 13px; text-transform: uppercase; font-family: var(--font-display); letter-spacing: 0.05em;">Chargement du guide...</p>
    </div>

    <!-- 404 / Error State -->
    <div v-else-if="error || !guideResponse?.data" class="panel empty-state" style="padding: 48px; text-align: center; margin-top: 12px;">
      <div class="es-icon" style="margin-bottom: 16px; font-size: 24px; color: var(--danger);">⚠</div>
      <p style="font-size: 15px; color: var(--text-1); margin-bottom: 6px; font-weight: bold;">Guide introuvable</p>
      <p class="t-muted" style="font-size: 13px; margin-bottom: 16px;">Ce guide n'existe pas ou a été désactivé par l'administration.</p>
      <NuxtLink to="/guides" class="ds-btn primary">
        Parcourir les autres guides
      </NuxtLink>
    </div>

    <!-- Article layout -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start mt-3 w-full">
      
      <!-- Mobile Expandable ToC banner -->
      <div v-if="headers.length > 0" class="panel parchment mobile-toc lg:hidden w-full" style="margin: 0 0 16px 0;">
        <button 
          @click="mobileTocExpanded = !mobileTocExpanded" 
          class="w-full flex justify-between items-center" 
          style="padding: 14px 18px; text-align: left; background: none; border: none;"
        >
          <span style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold);" class="font-cinzel">Table des matières</span>
          <svg 
            viewBox="0 0 24 24" 
            width="16" 
            height="16" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="transition-transform duration-200" 
            :style="{ transform: mobileTocExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--gold)' }"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div v-show="mobileTocExpanded" class="panel-body" style="padding: 0 18px 16px; border-top: 1px solid var(--border-divider);">
          <nav style="display: flex; flex-direction: column; gap: 4px; margin-top: 12px;">
            <a
              v-for="header in headers"
              :key="'mob-' + header.id"
              :href="`#${header.id}`"
              class="toc-link"
              :class="{ active: activeAnchor === header.id }"
              :style="[
                header.level === 2 
                  ? { fontWeight: 'bold', fontSize: '13px' } 
                  : header.level === 3
                    ? { paddingLeft: '12px', fontSize: '12px' }
                    : { paddingLeft: '24px', fontSize: '11px' }
              ]"
              @click="scrollToAnchor(header.id); mobileTocExpanded = false"
            >
              {{ header.text }}
            </a>
          </nav>
        </div>
      </div>

      <!-- Main Article Panel -->
      <article class="panel parchment framed" style="flex: 1; min-width: 0; margin: 0; width: 100%;">
        <div class="panel-body" style="padding: 24px sm:32px;">
          <!-- HTML Content safely rendered -->
          <div class="markdown-body" v-html="renderedHtml"></div>
        </div>
      </article>

      <!-- Desktop Sticky ToC Sidebar -->
      <aside v-if="headers.length > 0" class="hidden lg:block toc-sidebar">
        <div class="panel parchment framed" style="width: 100%; box-shadow: var(--shadow-lg);">
          <div class="panel-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border-divider);">
            <h3 style="font-size: 13px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold);" class="font-cinzel">Table des matières</h3>
          </div>
          <div class="panel-body" style="padding: 16px;">
            <nav style="display: flex; flex-direction: column; gap: 4px;" class="max-h-[65vh] overflow-y-auto pr-1">
              <a
                v-for="header in headers"
                :key="header.id"
                :href="`#${header.id}`"
                class="toc-link"
                :class="{ active: activeAnchor === header.id }"
                :style="[
                  header.level === 2 
                    ? { fontWeight: 'bold', fontSize: '13px' } 
                    : header.level === 3
                      ? { paddingLeft: '12px', fontSize: '12px' }
                      : { paddingLeft: '24px', fontSize: '11px' }
                ]"
                @click.prevent="scrollToAnchor(header.id)"
              >
                {{ header.text }}
              </a>
            </nav>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse, Guide } from '@albion-tool/types'
import { renderMarkdown } from '~/utils/markdown'

const route = useRoute()
const slug = route.params.slug as string
const mobileTocExpanded = ref(false)

// Fetch guide by slug
const { data: guideResponse, pending, error } = await useFetch<ApiResponse<Guide>>(`/api/v1/guides/${slug}`)

// Estimated read time
const readTime = computed(() => {
  const content = guideResponse.value?.data?.content || ''
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / 200) || 1
})

// Set browser title dynamically
watchEffect(() => {
  if (guideResponse.value?.data) {
    useHead({
      title: `${guideResponse.value.data.title} - Guide Albion SilverMind`,
      meta: [
        { name: 'description', content: guideResponse.value.data.summary || `Guide complet : ${guideResponse.value.data.title}` }
      ]
    })
  }
})

// Generate rendered safe html
const renderedHtml = computed(() => {
  return renderMarkdown(guideResponse.value?.data?.content || '')
})

// Parse headers from rendered HTML for the ToC (avoiding code blocks and supporting hierarchy H2, H3, H4)
const headers = computed(() => {
  const html = renderedHtml.value
  if (!html) return []
  
  const regex = /<(h[2-4])\s+id="([^"]+)">([\s\S]*?)<\/\1>/gi
  const extracted: { text: string; id: string; level: number }[] = []
  
  let match
  regex.lastIndex = 0
  while ((match = regex.exec(html)) !== null) {
    const tag = match[1].toLowerCase()
    const id = match[2]
    const rawText = match[3]
    // Strip inner HTML tags (e.g. <strong>, <code>) to get clean text
    const text = rawText.replace(/<[^>]*>/g, '').trim()
    const level = parseInt(tag.substring(1), 10)
    
    extracted.push({ text, id, level })
  }
  return extracted
})

// Smooth scrolling to anchors
const scrollToAnchor = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
    history.pushState(null, '', `#${id}`)
    activeAnchor.value = id
  }
}

// Active anchor tracker on scroll
const activeAnchor = ref('')

onMounted(() => {
  const handleScroll = () => {
    if (headers.value.length === 0) return
    
    const scrollPosition = window.scrollY + 100
    
    // Find header closest to current scroll position
    let currentAnchor = ''
    for (const header of headers.value) {
      const el = document.getElementById(header.id)
      if (el) {
        const top = el.offsetTop
        if (scrollPosition >= top) {
          currentAnchor = header.id
        }
      }
    }
    
    if (currentAnchor) {
      activeAnchor.value = currentAnchor
    }
  }
  
  window.addEventListener('scroll', handleScroll)
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
</script>

<style scoped>
/* Styling variables for safe markdown body */
.markdown-body :deep(h1) {
  display: none; /* Already rendered in main layout */
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
  background-color: rgba(21, 19, 15, 0.5); /* translucent var(--bg-2) */
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

/* Premium Table of Contents styles */
.toc-link {
  display: block;
  padding: 6px 12px;
  color: var(--text-2);
  border-left: 2px solid rgba(201, 161, 74, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-body);
  text-decoration: none;
  line-height: 1.4;
}

.toc-link:hover {
  color: var(--gold-bright);
  background-color: rgba(201, 161, 74, 0.03);
  border-left-color: rgba(201, 161, 74, 0.3);
  padding-left: 14px; /* subtle push in */
}

.toc-link.active {
  color: var(--gold);
  border-left-color: var(--gold);
  background-color: rgba(201, 161, 74, 0.06);
  font-weight: bold;
  box-shadow: inset 4px 0 12px -4px rgba(201, 161, 74, 0.15);
  padding-left: 14px;
}

.mobile-toc {
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all 0.2s ease;
}

.mobile-toc:hover {
  border-color: var(--border-strong);
}

.toc-sidebar {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--nav-h) + 24px);
  margin: 0;
  height: fit-content;
  align-self: start;
  z-index: 10;
}
</style>
