<script setup>
import { motivoLabel } from '../lib/movimentacoes'
import { tempoRelativo } from '../lib/format'

// Feed de movimentações (Visão geral + Movimentações). Uma linha por registro.
const props = defineProps({
  movs: { type: Array, default: () => [] },
  perfisMap: { type: Object, default: () => ({}) },
  // 'relativo' = "há 2h" (visão geral); 'absoluto' = data/hora (auditoria)
  tempo: { type: String, default: 'relativo' },
  detalhado: { type: Boolean, default: false }, // mostra lote e observação
})

function autor(m) {
  return props.perfisMap[m.usuario_id] || 'usuário removido'
}
function entrada(m) {
  return m.tipo === 'entrada'
}
function destino(m) {
  if (m.motivo === 'liberacao' && m.setor?.nome) return `Liberação → ${m.setor.nome}`
  return motivoLabel(m.motivo)
}
function icone(m) {
  if (entrada(m)) return 'pi pi-arrow-down'
  if (m.motivo === 'avariado') return 'pi pi-times'
  return 'pi pi-arrow-up'
}
function quando(d) {
  if (props.tempo === 'relativo') return tempoRelativo(d)
  return d
    ? new Date(d).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'
}
</script>

<template>
  <ul class="feed" role="list">
    <li v-for="(m, i) in movs" :key="m.id ?? i" class="feed-row">
      <span
        class="feed-dir"
        :class="entrada(m) ? 'in' : 'out'"
        :title="entrada(m) ? 'Entrada' : m.motivo === 'avariado' ? 'Saída por avaria' : 'Saída'"
      >
        <i :class="icone(m)" aria-hidden="true" />
      </span>
      <div class="feed-main">
        <div class="feed-title">
          {{ m.produto?.nome || '—' }}
          <span v-if="m.produto?.controlado" class="tag-controlado">Controlado</span>
        </div>
        <div class="feed-sub">
          {{ entrada(m) ? 'Entrada' : 'Saída' }} · {{ destino(m) }}
          <template v-if="detalhado && m.lote?.numero_lote">
            · lote <span class="mono">{{ m.lote.numero_lote }}</span>
          </template>
          <span class="sep" aria-hidden="true">/</span>{{ autor(m) }}
        </div>
        <div v-if="detalhado && m.observacao" class="feed-obs">{{ m.observacao }}</div>
      </div>
      <div class="feed-right">
        <div class="feed-qty" :class="entrada(m) ? 'in' : 'out'">
          <span class="sr-only">{{ entrada(m) ? 'Entrada de' : 'Saída de' }}</span>
          {{ entrada(m) ? '+' : '−' }}{{ m.quantidade }}
        </div>
        <div class="feed-time">{{ quando(m.data) }}</div>
      </div>
    </li>
  </ul>
</template>
