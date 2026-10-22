import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'sidebar-collapsed'

// Keep in sync with the breakpoints in App.vue and AppSidebar.vue. The .98 edges
// leave no gap at fractional widths (browser zoom, DPR scaling) where neither the
// CSS tier nor the JS tier would match.
const DESKTOP_QUERY = '(min-width: 1280px)'
const MOBILE_QUERY = '(max-width: 767.98px)'

// localStorage can throw (private mode, blocked storage); fall back to expanded.
function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
const desktopMql = hasMatchMedia ? window.matchMedia(DESKTOP_QUERY) : null
const mobileMql = hasMatchMedia ? window.matchMedia(MOBILE_QUERY) : null

function readTier() {
  if (!hasMatchMedia || desktopMql.matches) return 'desktop'
  return mobileMql.matches ? 'mobile' : 'tablet'
}

// Shared state (singleton pattern)
const collapsed = ref(readCollapsed())
const drawerOpen = ref(false)
const tier = ref(readTier())

if (hasMatchMedia) {
  const updateTier = () => { tier.value = readTier() }
  desktopMql.addEventListener('change', updateTier)
  mobileMql.addEventListener('change', updateTier)
}

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // Preference just won't persist across reloads
  }
})

// An overlay opened at one width shouldn't survive a resize or rotation into another tier
watch(tier, () => {
  drawerOpen.value = false
})

// Icons-only rail: the user's choice on desktop, automatic on tablet unless the
// overlay is open, never on mobile (the drawer always shows full labels)
const isRail = computed(() => {
  if (tier.value === 'desktop') return collapsed.value
  if (tier.value === 'tablet') return !drawerOpen.value
  return false
})

export function useSidebar() {
  const toggleCollapsed = () => {
    collapsed.value = !collapsed.value
  }

  const openDrawer = () => {
    drawerOpen.value = true
  }

  const closeDrawer = () => {
    drawerOpen.value = false
  }

  return {
    // State
    collapsed,
    drawerOpen,
    tier,

    // Computed
    isRail,

    // Methods
    toggleCollapsed,
    openDrawer,
    closeDrawer
  }
}
