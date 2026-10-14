<script setup>
import Button from 'primevue/button'
import { motivoLabel } from '../lib/movimentacoes'
import { tempoRelativo } from '../lib/format'

// Feed de movimentações (Visão geral + Movimentações). Uma linha por registro.
const props = defineProps({
  movs: { type: Array, default: () => [] },
  perfisMap: { type: Object, default: () => ({}) },
  // 'relativo' = "há 2h" (visão geral); 'absoluto' = data/hora (auditoria)
  tempo: { type: String, default: 'relativo' },
  detalhado: { type: Boolean, default: false }, // mostra lote e observação
  // ids de movimentações que já têm estorno (Set)
  estornadas: { type: Object, default: () => new Set() },
  estornavel: { type: Boolean, default: false }, // mostra o botão "Estornar"
})
const emit = defineEmits(['estornar'])

function autor(m) {
  return props.perfisMap[m.usuario_id] || 'usuário removido'
}
function entrada(m) {
  return m.tipo === 'entrada'
}
function ehEstorno(m) {
  return !!m.estorno_de
}
function foiEstornada(m) {
  return props.estornadas.has(m.id)
}
function destino(m) {
  if (m.motivo === 'liberacao' && m.setor?.nome) return `Liberação → ${m.setor.nome}`
  return motivoLabel(m.motivo)
}
function icone(m) {
  if (ehEstorno(m)) return 'pi pi-replay'
  if (entrada(m)) return 'pi pi-arrow-down'
  if (m.motivo === 'avariado') return 'pi pi-times'
  return 'pi pi-arrow-up'
}
function titulo(m) {
  if (ehEstorno(m)) return 'Estorno'
  if (entrada(m)) return 'Entrada'
  return m.motivo === 'avariado' ? 'Saída por avaria' : 'Saída'
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
    <li
      v-for="(m, i) in movs"
      :key="m.id ?? i"
      class="feed-row"
      :class="{ 'feed-estornada': foiEstornada(m), 'com-acao': estornavel }"
    >
      <span
        class="feed-dir"
        :class="ehEstorno(m) ? 'estorno' : entrada(m) ? 'in' : 'out'"
        :title="titulo(m)"
      >
        <i :class="icone(m)" aria-hidden="true" />
      </span>
      <div class="feed-main">
        <div class="feed-title">
          {{ m.produto?.nome || '—' }}
          <span v-if="m.produto?.controlado" class="tag-controlado">Controlado</span>
          <span v-if="ehEstorno(m)" class="tag-estorno">Estorno</span>
          <span v-else-if="foiEstornada(m)" class="tag-estorno">Estornada</span>
        </div>
        <div class="feed-sub">
          <template v-if="ehEstorno(m)">Desfaz {{ entrada(m) ? 'saída' : 'entrada' }} · {{ destino(m) }}</template>
          <template v-else>{{ entrada(m) ? 'Entrada' : 'Saída' }} · {{ destino(m) }}</template>
          <template v-if="detalhado && m.lote?.numero_lote">
            · lote <span class="mono">{{ m.lote.numero_lote }}</span>
          </template>
          <span class="sep" aria-hidden="true">/</span>{{ autor(m) }}
        </div>
        <div v-if="detalhado && m.observacao" class="feed-obs">{{ m.observacao }}</div>
      </div>
      <div class="feed-right">
        <div class="feed-qty" :class="ehEstorno(m) ? 'estorno' : entrada(m) ? 'in' : 'out'">
          <span class="sr-only">{{ entrada(m) ? 'Entrada de' : 'Saída de' }}</span>
          {{ entrada(m) ? '+' : '−' }}{{ m.quantidade }}
        </div>
        <div class="feed-time">{{ quando(m.data) }}</div>
      </div>
      <div v-if="estornavel" class="feed-acao">
        <Button
          v-if="!ehEstorno(m) && !foiEstornada(m)"
          icon="pi pi-replay"
          text
          rounded
          severity="secondary"
          size="small"
          v-tooltip.left="'Estornar (desfazer este lançamento)'"
          :aria-label="`Estornar ${titulo(m).toLowerCase()} de ${m.produto?.nome || 'produto'}`"
          @click="emit('estornar', m)"
        />
      </div>
    </li>
  </ul>
</template>
