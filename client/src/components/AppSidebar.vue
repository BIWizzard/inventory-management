<template>
  <aside
    class="app-sidebar"
    :class="{ 'is-open': open, 'is-rail': isRail }"
  >
    <div class="brand">
      <div class="monogram" aria-hidden="true">CC</div>
      <div class="brand-text">
        <div class="wordmark">{{ t('nav.companyName') }}</div>
        <div class="brand-subtitle">{{ t('nav.subtitle') }}</div>
      </div>
    </div>

    <nav id="main-nav" class="nav" :aria-label="t('nav.main')">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-link"
        :title="isRail ? t(item.labelKey) : null"
        @click="onNavClick"
      >
        <svg
          class="nav-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path v-for="d in item.icon" :key="d" :d="d" />
        </svg>
        <span class="nav-label" :class="{ 'sr-only': isRail }">{{ t(item.labelKey) }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <LanguageSwitcher :compact="isRail" />
      <ProfileMenu
        :compact="isRail"
        @show-profile-details="$emit('show-profile-details')"
        @show-tasks="$emit('show-tasks')"
      />
      <button
        v-if="tier !== 'mobile'"
        type="button"
        class="collapse-toggle"
        :aria-expanded="String(toggleExpanded)"
        aria-controls="main-nav"
        :title="isRail ? collapseLabel : null"
        @click="onToggle"
      >
        <svg
          class="collapse-icon"
          :class="{ 'is-flipped': !toggleExpanded }"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span class="collapse-label" :class="{ 'sr-only': isRail }">{{ collapseLabel }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useSidebar } from '../composables/useSidebar'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ProfileMenu from './ProfileMenu.vue'

defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

defineEmits(['show-profile-details', 'show-tasks'])

const { t } = useI18n()
const { collapsed, drawerOpen, tier, isRail, toggleCollapsed, openDrawer, closeDrawer } = useSidebar()

// Icon paths are constants; one <path> per entry.
const navItems = [
  { to: '/', labelKey: 'nav.overview', icon: ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z'] },
  { to: '/inventory', labelKey: 'nav.inventory', icon: ['M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z', 'M3 7.5l9 4.5 9-4.5', 'M12 12v9'] },
  { to: '/orders', labelKey: 'nav.orders', icon: ['M8 4h8v3H8z', 'M6 5.5H5v15h14v-15h-1', 'M9 11h6', 'M9 15h6'] },
  { to: '/spending', labelKey: 'nav.finance', icon: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h3'] },
  { to: '/demand', labelKey: 'nav.demandForecast', icon: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'] },
  { to: '/reports', labelKey: 'nav.reports', icon: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 13h7', 'M9 17h5'] }
]

const toggleExpanded = computed(() =>
  tier.value === 'tablet' ? drawerOpen.value : !collapsed.value
)

const collapseLabel = computed(() => {
  if (tier.value === 'tablet') {
    return drawerOpen.value ? t('nav.closeSidebar') : t('nav.expandSidebar')
  }
  return collapsed.value ? t('nav.expandSidebar') : t('nav.collapseSidebar')
})

const onToggle = () => {
  if (tier.value === 'tablet') {
    if (drawerOpen.value) closeDrawer()
    else openDrawer()
  } else {
    toggleCollapsed()
  }
}

// Navigating to the current route doesn't change the path, so close explicitly
const onNavClick = () => {
  if (tier.value !== 'desktop') closeDrawer()
}
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  color: var(--sidebar-text);
}

.brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-3) var(--space-5) var(--space-4);
  min-height: calc(var(--topbar-h) + var(--space-6));
  flex-shrink: 0;
}

/* Blueprint grid: 16px cells, fading out downward. */
.brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--sidebar-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--sidebar-grid-line) 1px, transparent 1px);
  background-size: 16px 16px;
  -webkit-mask-image: linear-gradient(to bottom, currentColor, transparent);
  mask-image: linear-gradient(to bottom, currentColor, transparent);
  pointer-events: none;
}

.monogram {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--sidebar-text);
  border-radius: var(--radius-sm);
  color: var(--sidebar-active-text);
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-text {
  position: relative;
  min-width: 0;
}

.wordmark {
  color: var(--sidebar-active-text);
  font-size: var(--text-md);
  font-weight: 600;
  line-height: var(--leading-tight);
}

.brand-subtitle {
  margin-top: var(--space-1);
  color: var(--sidebar-text-muted);
  font-size: var(--text-xs);
  line-height: var(--leading-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  overflow-y: auto;
  min-height: 0;
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  font-size: var(--text-base);
  font-weight: 500;
  text-decoration: none;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.nav-link:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-active-text);
}

.nav-link.router-link-active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.nav-link.router-link-active::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--sidebar-active-rule);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 36px;
  padding: 0 var(--space-3);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.collapse-toggle:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-active-text);
}

.collapse-icon {
  flex-shrink: 0;
  transition: transform var(--duration-base) var(--ease-out);
}

.collapse-icon.is-flipped {
  transform: rotate(180deg);
}

/* Collapsed rail: icons and the monogram only. */
.app-sidebar.is-rail .brand {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.app-sidebar.is-rail .brand-text {
  display: none;
}

.app-sidebar.is-rail .nav-link,
.app-sidebar.is-rail .collapse-toggle {
  justify-content: center;
  padding: 0;
}
</style>
