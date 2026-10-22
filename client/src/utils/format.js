// Locale-aware formatting helpers shared across views and modals
import { useI18n } from '../composables/useI18n'

// useI18n() state is module-level (not lifecycle-bound), so it is safe to call here
const { t, currentLocale } = useI18n()

// Format a date in the active locale; `options` go straight to toLocaleDateString.
// Returns `fallback` for empty or unparseable input.
export function formatDate(value, options = {}, fallback = '-') {
  if (!value) return fallback
  const date = new Date(value)
  if (isNaN(date.getTime())) return fallback
  const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
  return date.toLocaleDateString(locale, options)
}

// Translate product and spending category names; unknown names pass through unchanged.
// Reads t() on each call so results follow locale switches.
export function translateCategory(category) {
  const categoryMap = {
    // Product categories
    'Circuit Boards': 'categories.circuitBoards',
    'Sensors': 'categories.sensors',
    'Actuators': 'categories.actuators',
    'Controllers': 'categories.controllers',
    'Power Supplies': 'categories.powerSupplies',
    // Spending categories
    'Raw Materials': 'spendingCategories.rawMaterials',
    'Components': 'spendingCategories.components',
    'Equipment': 'spendingCategories.equipment',
    'Consumables': 'spendingCategories.consumables'
  }
  const key = categoryMap[category]
  return key ? t(key) : category
}
