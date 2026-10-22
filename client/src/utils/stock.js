// Stock status helpers shared by the Inventory table and its detail modal
import { useI18n } from '../composables/useI18n'

// Module-level i18n state; safe to use outside components
const { t } = useI18n()

// Status key: 'lowStock', 'adequate' or 'inStock'. Doubles as the sort key and
// the suffix of the translation key (status.<key>).
export function getStockStatusKey(item) {
  if (item.quantity_on_hand <= item.reorder_point) {
    return 'lowStock'
  } else if (item.quantity_on_hand <= item.reorder_point * 1.5) {
    return 'adequate'
  } else {
    return 'inStock'
  }
}

// Badge class for the status: 'danger', 'warning' or 'success'
export function getStockStatusClass(item) {
  const key = getStockStatusKey(item)
  if (key === 'lowStock') return 'danger'
  if (key === 'adequate') return 'warning'
  return 'success'
}

// Localized status label for display
export function getStockStatusLabel(item) {
  return t(`status.${getStockStatusKey(item)}`)
}
