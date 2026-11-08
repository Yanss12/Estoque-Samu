import { createRouter, createWebHashHistory } from 'vue-router'
import { session, ehAdmin, podeAuditar, almoxVer, almoxGerir } from './lib/auth'

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
    meta: { requer: 'ehAdmin' },
  },
  { path: '/relatorios', name: 'relatorios', component: () => import('./pages/Relatorios.vue') },
  {
    path: '/almoxarifado',
    name: 'almox-estoque',
    component: () => import('./pages/almox/AlmoxEstoque.vue'),
    meta: { requer: 'almoxVer' },
  },
  {
    path: '/almoxarifado/movimentacoes',
    name: 'almox-movimentacoes',
    component: () => import('./pages/almox/AlmoxMovimentacoes.vue'),
    meta: { requer: 'almoxVer' },
  },
  {
    path: '/almoxarifado/transferencias',
    name: 'almox-transferencias',
    component: () => import('./pages/almox/AlmoxTransferencias.vue'),
    meta: { requer: 'almoxVer' },
  },
  {
    path: '/almoxarifado/inventario',
    name: 'almox-inventario',
    component: () => import('./pages/almox/AlmoxInventario.vue'),
    meta: { requer: 'almoxVer' },
  },
  {
    path: '/almoxarifado/relatorios',
    name: 'almox-relatorios',
    component: () => import('./pages/almox/AlmoxRelatorios.vue'),
    meta: { requer: 'almoxVer' },
  },
]

// Guarda por papel: meta.requer aponta para um computed exportado por lib/auth.
const guardas = { ehAdmin, podeAuditar, almoxVer, almoxGerir }

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
