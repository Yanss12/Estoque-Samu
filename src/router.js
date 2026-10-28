import { createRouter, createWebHashHistory } from 'vue-router'
import { session, podeAuditar } from './lib/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./pages/Login.vue'),
    meta: { public: true },
  },
  { path: '/', name: 'dashboard', component: () => import('./pages/Dashboard.vue') },
  { path: '/estoque', name: 'estoque', component: () => import('./pages/Estoque.vue') },
  {
    path: '/movimentacoes',
    name: 'movimentacoes',
    component: () => import('./pages/Movimentacoes.vue'),
  },
  {
    path: '/psicotropicos',
    name: 'psicotropicos',
    component: () => import('./pages/Psicotropicos.vue'),
  },
  {
    path: '/auditoria',
    name: 'auditoria',
    component: () => import('./pages/Auditoria.vue'),
    meta: { requer: 'podeAuditar' },
  },
  { path: '/relatorios', name: 'relatorios', component: () => import('./pages/Relatorios.vue') },
]

// Guarda por papel: meta.requer aponta para um computed exportado por lib/auth.
const guardas = { podeAuditar }

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (!to.meta.public && !session.value) return { name: 'login' }
  if (to.name === 'login' && session.value) return { name: 'dashboard' }
  if (to.meta.requer && !guardas[to.meta.requer]?.value) return { name: 'dashboard' }
})

export default router
