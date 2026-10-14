<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { supabase } from '../lib/supabase'
import { fetchPerfisMap } from '../lib/perfis'
import { motivoLabel } from '../lib/movimentacoes'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produto: { type: Object, default: null },
})
const emit = defineEmits(['update:visible'])

const lotes = ref([])
const movs = ref([])
const perfisMap = ref({})
const carregando = ref(false)

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto || !props.produto) return
    carregando.value = true
    const pid = props.produto.produto_id
    const [lo, mo, perfis] = await Promise.all([
      supabase
        .from('saldo_por_lote')
        .select('lote_id, numero_lote, validade, saldo')
        .eq('produto_id', pid)
        .gt('saldo', 0)
        .order('validade', { ascending: true, nullsFirst: false }),
      supabase
        .from('movimentacoes')
        .select('id, tipo, quantidade, motivo, observacao, data, usuario_id, estorno_de, setor:setores(nome)')
        .eq('produto_id', pid)
        .order('data', { ascending: false })
        .limit(10),
      fetchPerfisMap(),
    ])
    lotes.value = lo.data ?? []
    movs.value = mo.data ?? []
    perfisMap.value = perfis
    carregando.value = false
  }
)

function fmtData(d) {
  if (!d) return '—'
  // Datas 'YYYY-MM-DD' (validade) são parseadas como LOCAL p/ não cair 1 dia (fuso).
  if (typeof d === 'string' && d.length === 10) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('pt-BR')
  }
  return new Date(d).toLocaleDateString('pt-BR')
}
function autor(m) {
  return perfisMap.value[m.usuario_id] || 'usuário removido'
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    :header="produto?.nome || 'Ficha do produto'"
    :style="{ width: '42rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <h3 class="ficha-sec">Lotes com saldo <span class="muted" style="font-weight: 400">primeiro a vencer no topo</span></h3>
    <DataTable :value="lotes" :loading="carregando" size="small" class="tabela-moderna">
      <template #empty>Nenhum lote com saldo.</template>
      <Column header="Lote">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || 'sem nº' }}</span>
        </template>
      </Column>
      <Column header="Validade">
        <template #body="{ data }">
          <span class="num">{{ fmtData(data.validade) }}</span>
        </template>
      </Column>
      <Column header="Saldo" header-class="col-num" body-class="col-num">
        <template #body="{ data }"><span class="saldo">{{ data.saldo }}</span></template>
      </Column>
    </DataTable>

    <h3 class="ficha-sec">Últimas movimentações <span class="muted" style="font-weight: 400">10 mais recentes</span></h3>
    <DataTable :value="movs" :loading="carregando" size="small" class="tabela-moderna">
      <template #empty>Nenhuma movimentação deste produto.</template>
      <Column header="Data">
        <template #body="{ data }"><span class="num">{{ fmtData(data.data) }}</span></template>
      </Column>
      <Column header="Tipo">
        <template #body="{ data }">
          <span class="saldo" :style="{ color: data.tipo === 'entrada' ? 'var(--ok-fg)' : 'var(--danger-fg)' }">
            {{ data.tipo === 'entrada' ? '+' : '−' }}{{ data.quantidade }}
          </span>
        </template>
      </Column>
      <Column header="Motivo">
        <template #body="{ data }">
          <span v-if="data.estorno_de" class="tag-estorno" style="margin-right: 0.35rem">Estorno</span>{{ motivoLabel(data.motivo) }}<span v-if="data.setor?.nome" class="muted"> → {{ data.setor.nome }}</span>
          <div v-if="data.observacao" class="muted" style="font-size: 0.8rem">{{ data.observacao }}</div>
        </template>
      </Column>
      <Column header="Por">
        <template #body="{ data }"><span style="font-size: 0.85rem">{{ autor(data) }}</span></template>
      </Column>
    </DataTable>
  </Dialog>
</template>
