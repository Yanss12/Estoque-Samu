import { computed } from 'vue'
import router from '../router'
import { almoxVer } from './auth'

const CHAVE_FARMACIA = 'samu.ctx.ultima.farmacia'
const CHAVE_ALMOX = 'samu.ctx.ultima.almoxarifado'

// Fonte da verdade = a ROTA atual.
export const contexto = computed(() => {
  const path = router.currentRoute.value?.path || ''
  return path.startsWith('/almoxarifado') ? 'almoxarifado' : 'farmacia'
})

function lerRotaSalva(chave) {
  try {
    return sessionStorage.getItem(chave)
  } catch {
    return null
  }
}

function salvarRota(chave, valor) {
  try {
    sessionStorage.setItem(chave, valor)
  } catch {
    // Ignora caso sessionStorage esteja indisponível
  }
}

export function limparContextoStorage() {
  try {
    sessionStorage.removeItem(CHAVE_FARMACIA)
    sessionStorage.removeItem(CHAVE_ALMOX)
  } catch {
    // Ignora caso sessionStorage esteja indisponível
  }
}

export function trocarContexto(alvo) {
  if (alvo !== 'farmacia' && alvo !== 'almoxarifado') return
  if (alvo === 'almoxarifado' && !almoxVer.value) return

  const atual = contexto.value
  if (alvo === atual) return

  const rotaAtual = router.currentRoute.value?.fullPath || '/'
  if (atual === 'farmacia' && !rotaAtual.startsWith('/almoxarifado') && rotaAtual !== '/login') {
    salvarRota(CHAVE_FARMACIA, rotaAtual)
  } else if (atual === 'almoxarifado' && rotaAtual.startsWith('/almoxarifado')) {
    salvarRota(CHAVE_ALMOX, rotaAtual)
  }

  if (alvo === 'almoxarifado') {
    const destino = lerRotaSalva(CHAVE_ALMOX)
    if (destino && destino.startsWith('/almoxarifado')) {
      router.push(destino)
    } else {
      router.push({ name: 'almox-estoque' })
    }
  } else {
    const destino = lerRotaSalva(CHAVE_FARMACIA)
    if (destino && !destino.startsWith('/almoxarifado') && destino !== '/login') {
      router.push(destino)
    } else {
      router.push({ name: 'dashboard' })
    }
  }
}
