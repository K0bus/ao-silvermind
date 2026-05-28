export const usePremiumLocks = () => {
  const locks = useState<Record<string, boolean>>('premium.locks', () => ({
    items_profit: false,
    crafting: false,
    items_flip: false,
    market: false,
    islands: false,
  }))
  const loaded = useState<boolean>('premium.locks.loaded', () => false)

  async function fetchLocks() {
    const apiFetch = useRequestFetch()
    try {
      const res = await apiFetch<{ data: Record<string, boolean> }>('/api/v1/premium/locks')
      locks.value = res.data
      loaded.value = true
    } catch (e) {
      console.error('Failed to load premium locks', e)
    }
  }

  return {
    locks,
    loaded,
    fetchLocks,
  }
}
