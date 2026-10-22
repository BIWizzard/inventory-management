<template>
  <div class="language-switcher">
    <button
      class="language-button"
      :class="{ 'is-compact': compact }"
      :aria-label="compact ? t('language.currentLanguage', { name: localeName }) : undefined"
      :title="compact ? t('language.currentLanguage', { name: localeName }) : undefined"
      @click="toggleDropdown"
      @blur="handleBlur"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        class="globe-icon"
      >
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3 10H17" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 3C10 3 7.5 5.5 7.5 10C7.5 14.5 10 17 10 17" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 3C10 3 12.5 5.5 12.5 10C12.5 14.5 10 17 10 17" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <span v-if="!compact" class="language-label">{{ localeName }}</span>
      <svg
        v-if="!compact"
        class="chevron"
        :class="{ 'chevron-open': isDropdownOpen }"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <div v-if="isDropdownOpen" class="dropdown-menu" :class="{ 'is-side': compact }">
      <button
        v-for="locale in availableLocales"
        :key="locale"
        class="dropdown-item"
        :class="{ active: currentLocale === locale }"
        @mousedown.prevent="selectLanguage(locale)"
      >
        <span class="language-name">{{ getLanguageName(locale) }}</span>
        <svg
          v-if="currentLocale === locale"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          class="check-icon"
        >
          <path d="M4 9L7.5 12.5L14 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t, currentLocale, setLocale, availableLocales, localeName } = useI18n()

defineProps({
  compact: {
    type: Boolean,
    default: false
  }
})

const isDropdownOpen = ref(false)

const languageNames = {
  en: 'English',
  ja: '日本語'
}

const getLanguageName = (locale) => {
  return languageNames[locale] || locale
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handleBlur = () => {
  // Delay to allow mousedown events on dropdown items to fire first
  setTimeout(() => {
    isDropdownOpen.value = false
  }, 200)
}

const selectLanguage = (locale) => {
  setLocale(locale)
  isDropdownOpen.value = false
}
</script>

<style scoped>
.language-switcher {
  position: relative;
}

.language-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: none;
  border: 1px solid var(--sidebar-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--sidebar-text);
}

.language-button.is-compact {
  justify-content: center;
  padding: var(--space-2) 0;
}

.language-button:hover {
  background: var(--sidebar-hover);
}

.globe-icon {
  color: var(--sidebar-text-muted);
  flex-shrink: 0;
}

.language-label {
  flex: 1;
  text-align: left;
  font-weight: 500;
}

.chevron {
  flex-shrink: 0;
  color: var(--sidebar-text-muted);
  transform: rotate(180deg);
  transition: transform var(--duration-base) var(--ease-out);
}

/* Menu opens upward, so the closed chevron points up. */
.chevron-open {
  transform: none;
}

.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: var(--space-2);
  min-width: 160px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.dropdown-item:hover {
  background: var(--color-surface-hover);
}

.dropdown-item.active {
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
}

.language-name {
  flex: 1;
}

.check-icon {
  color: var(--color-accent-text);
  flex-shrink: 0;
}

/* In the 72px rail the menu opens beside it instead of upward */
.dropdown-menu.is-side {
  bottom: 0;
  left: 100%;
  margin-bottom: 0;
  /* clear the footer's own padding so the menu sits just past the rail edge */
  margin-left: calc(var(--space-3) + var(--space-2));
}
</style>
