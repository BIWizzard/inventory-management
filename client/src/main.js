import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './styles/tokens.css'
import App from './App.vue'

// Views are lazy-loaded: each one now ships in its own chunk and is fetched on first navigation.
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/Dashboard.vue') },
    { path: '/inventory', component: () => import('./views/Inventory.vue') },
    { path: '/orders', component: () => import('./views/Orders.vue') },
    { path: '/demand', component: () => import('./views/Demand.vue') },
    { path: '/spending', component: () => import('./views/Spending.vue') },
    { path: '/reports', component: () => import('./views/Reports.vue') }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
