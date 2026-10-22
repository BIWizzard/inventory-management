<template>
  <div class="app-shell" :class="{ 'is-collapsed': collapsed && tier === 'desktop' }">
    <AppSidebar
      :open="drawerOpen"
      @show-profile-details="openProfileDetails"
      @show-tasks="openTasks"
    />

    <div
      v-if="drawerOpen"
      class="scrim"
      aria-hidden="true"
      @click="closeDrawer"
    ></div>

    <div class="main-column" :inert="drawerOpen || undefined">
      <div class="topbar">
        <button
          ref="menuButton"
          type="button"
          class="menu-button"
          :aria-label="t('nav.openNavigation')"
          :aria-expanded="String(drawerOpen)"
          aria-controls="main-nav"
          @click="openDrawer"
        >
          <svg
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
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>
        <div class="topbar-brand" aria-hidden="true">
          <span class="topbar-monogram">CC</span>
          <span class="topbar-wordmark">{{ t('nav.companyName') }}</span>
        </div>
        <FilterBar />
      </div>

      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import { useSidebar } from './composables/useSidebar'
import AppSidebar from './components/AppSidebar.vue'
import FilterBar from './components/FilterBar.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'

export default {
  name: 'App',
  components: {
    AppSidebar,
    FilterBar,
    ProfileDetailsModal,
    TasksModal
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const route = useRoute()
    const { collapsed, drawerOpen, tier, openDrawer, closeDrawer } = useSidebar()
    const menuButton = ref(null)
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    // Drawer behavior: close on navigation and Escape, manage focus on open/close
    watch(() => route.fullPath, closeDrawer)

    watch(drawerOpen, async (isOpen) => {
      await nextTick()
      if (isOpen) {
        document.querySelector('#main-nav a')?.focus()
      } else if (tier.value === 'tablet') {
        document.querySelector('.collapse-toggle')?.focus()
      } else if (tier.value === 'mobile') {
        menuButton.value?.focus()
      }
    })

    // Close the drawer first so Escape and focus restore don't act behind the modal
    const openProfileDetails = () => {
      closeDrawer()
      showProfileDetails.value = true
    }

    const openTasks = () => {
      closeDrawer()
      showTasks.value = true
    }

    const onKeydown = (event) => {
      if (event.key === 'Escape' && drawerOpen.value) closeDrawer()
    }

    onMounted(() => {
      loadTasks()
      document.addEventListener('keydown', onKeydown)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', onKeydown)
    })

    return {
      t,
      collapsed,
      tier,
      drawerOpen,
      openDrawer,
      closeDrawer,
      menuButton,
      showProfileDetails,
      showTasks,
      openProfileDetails,
      openTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button,
select,
input {
  font: inherit;
}

:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}

.app-sidebar :focus-visible {
  outline-color: var(--sidebar-focus);
}

/* Shell */
.app-shell {
  --sidebar-w: var(--sidebar-w-expanded);
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-bg);
}

.app-shell.is-collapsed {
  --sidebar-w: var(--sidebar-w-collapsed); /* desktop only; the class is applied only at that tier */
}

.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: var(--z-sidebar);
}

/* The sidebar leaves the grid flow when fixed, so pin the content column explicitly */
.main-column {
  grid-column: 2;
}

.main-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-topbar);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--topbar-h);
  padding: var(--space-2) var(--space-8);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.menu-button {
  display: none;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
}

.menu-button:hover {
  background: var(--color-surface-hover);
}

.topbar-brand {
  display: none;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.topbar-monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.topbar-wordmark {
  color: var(--color-text);
  font-size: var(--text-md);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-8) var(--space-12);
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-scrim);
  background: var(--scrim);
}

/* Tablet: the rail holds its 72px column; the expanded overlay floats above the content */
@media (min-width: 768px) and (max-width: 1279.98px) {
  .app-shell,
  .app-shell.is-collapsed {
    --sidebar-w: var(--sidebar-w-collapsed);
  }

  .app-sidebar.is-open {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--sidebar-w-expanded);
    z-index: var(--z-sidebar);
    box-shadow: var(--shadow-overlay);
  }

  .topbar {
    padding: var(--space-2) var(--space-6);
  }

  .main-content {
    padding: var(--space-6);
  }
}

/* Mobile: no grid column; the sidebar is an off-canvas drawer */
@media (max-width: 767.98px) {
  .app-shell,
  .app-shell.is-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }

  .main-column {
    grid-column: 1;
  }

  .app-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--sidebar-w-expanded);
    z-index: var(--z-sidebar);
    transform: translateX(-100%);
    visibility: hidden;
    transition:
      transform var(--duration-base) var(--ease-out),
      visibility 0s linear var(--duration-base);
  }

  .app-sidebar.is-open {
    transform: none;
    visibility: visible;
    transition-delay: 0s;
    box-shadow: var(--shadow-overlay);
  }

  .topbar {
    flex-wrap: wrap;
    padding: var(--space-2) var(--space-4);
  }

  .topbar > .filters-bar {
    flex-basis: 100%;
  }

  .menu-button {
    display: flex;
  }

  .topbar-brand {
    display: flex;
  }

  .main-content {
    padding: var(--space-4) var(--space-4) var(--space-10);
  }
}

/* Shared page patterns */
.page-header {
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-1);
  letter-spacing: -0.01em;
  line-height: var(--leading-tight);
}

.page-header p {
  color: var(--color-text-muted);
  font-size: var(--text-base);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  background: var(--color-surface);
  padding: var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.stat-label {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--color-text);
  line-height: var(--leading-tight);
  font-variant-numeric: tabular-nums;
}

.stat-card.warning .stat-value {
  color: var(--color-warning);
}

.stat-card.success .stat-value {
  color: var(--color-success);
}

.stat-card.danger .stat-value {
  color: var(--color-danger);
}

.stat-card.info .stat-value {
  color: var(--color-info);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-5);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--color-surface-sunken);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  background: var(--color-surface-sunken);
}

td {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

tbody tr {
  transition: background-color var(--duration-fast) var(--ease-out);
}

tbody tr:hover {
  background: var(--color-surface-sunken);
}

.badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: var(--leading-tight);
}

.badge.success,
.badge.increasing {
  background: var(--color-success-soft);
  color: var(--color-success-text);
}

.badge.warning,
.badge.medium {
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
}

.badge.danger,
.badge.decreasing,
.badge.high {
  background: var(--color-danger-soft);
  color: var(--color-danger-text);
}

.badge.info,
.badge.stable,
.badge.low {
  background: var(--color-info-soft);
  color: var(--color-info-text);
}

.loading {
  text-align: center;
  padding: var(--space-12);
  color: var(--color-text-muted);
  font-size: var(--text-md);
}

.error {
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger);
  color: var(--color-danger-text);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
  font-size: var(--text-md);
}
</style>
