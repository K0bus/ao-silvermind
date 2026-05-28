export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isAdmin } = useAuth()
  const installState = useState<{
    installed: boolean
    hasAdmin: boolean
    hasSystemConfig: boolean
  } | null>('install.status', () => null)
  const apiFetch = useRequestFetch()

  if (!installState.value) {
    try {
      const res = await apiFetch<{
        data: {
          installed: boolean
          hasAdmin: boolean
          hasSystemConfig: boolean
        }
      }>('/api/v1/install/status')
      installState.value = res.data
    } catch {
      installState.value = {
        installed: true,
        hasAdmin: true,
        hasSystemConfig: true,
      }
    }
  }

  const isInstalled = installState.value?.installed !== false

  if (!isInstalled) {
    if (to.path !== '/install') {
      return navigateTo('/install')
    }
    return
  }

  if (to.path === '/install') {
    return navigateTo(isAuthenticated.value && isAdmin.value ? '/admin' : '/')
  }

  if (to.path === '/premium/subscribe') return

  const premiumRoutes = [
    { path: '/items/profit', key: 'items_profit' },
    { path: '/items/flip', key: 'items_flip' },
    { path: '/crafting', key: 'crafting' },
    { path: '/market', key: 'market' },
    { path: '/islands', key: 'islands' },
  ]

  const matched = premiumRoutes.find(r => to.path === r.path || to.path.startsWith(r.path + '/'))
  
  if (matched) {
    const { locks, loaded, fetchLocks } = usePremiumLocks()
    if (!loaded.value) {
      await fetchLocks()
    }
    
    if (locks.value[matched.key]) {
      const { isPremium } = useAuth()
      
      if (!isAuthenticated.value) {
        return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
      }
      
      if (!isPremium.value) {
        return navigateTo('/premium/subscribe')
      }
    }
  }

  // Routes publiques
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/reset-password']
  if (publicRoutes.includes(to.path)) return

  // Routes items — accessibles sans compte
  if (to.path.startsWith('/items')) return

  // Routes builds — publiques sauf /builds/me
  if (to.path.startsWith('/builds')) {
    if (to.path === '/builds/me' || to.path.startsWith('/builds/me/')) {
      if (!isAuthenticated.value) {
        return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
      }
    }
    return
  }

  // Routes admin
  if (to.path.startsWith('/admin')) {
    if (!isAuthenticated.value) {
      return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    if (!isAdmin.value) {
      return navigateTo('/')
    }
    return
  }

  // Toutes les autres routes nécessitent d'être connecté
  if (!isAuthenticated.value) {
    return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
