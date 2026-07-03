<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { supabase } from '../lib/supabase'
import { fetchPerfisMap } from '../lib/perfis'

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
        .select('id, tipo, quantidade, motivo, observacao, data, usuario_id, setor:setores(nome)')
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
    <h3 style="margin: 0 0 0.5rem">Lotes com saldo</h3>
    <DataTable :value="lotes" :loading="carregando" size="small">
      <template #empty>Sem lotes cadastrados.</template>
      <Column header="Lote">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || '—' }}</span>
        </template>
      </Column>
      <Column header="Validade">
        <template #body="{ data }">
          <span class="mono">{{ fmtData(data.validade) }}</span>
        </template>
      </Column>
      <Column field="saldo" header="Saldo" />
    </DataTable>

    <h3 style="margin: 1.25rem 0 0.5rem">
      Últimas movimentações
      <span style="font-weight: 400; color: var(--text-muted); font-size: 0.85rem">(10 mais recentes)</span>
    </h3>
    <DataTable :value="movs" :loading="carregando" size="small">
      <template #empty>Sem movimentações.</template>
      <Column header="Data">
        <template #body="{ data }">{{ fmtData(data.data) }}</template>
      </Column>
      <Column header="Tipo">
        <template #body="{ data }">
          <Tag
            :value="data.tipo === 'entrada' ? 'Entrada' : 'Saída'"
            :severity="data.tipo === 'entrada' ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column field="quantidade" header="Qtd" />
      <Column header="Destino">
        <template #body="{ data }">{{ data.setor?.nome || '—' }}</template>
      </Column>
      <Column field="motivo" header="Motivo" />
      <Column header="Obs.">
        <template #body="{ data }">
          <span style="font-size: 0.85rem; color: var(--text-muted)">{{ data.observacao || '—' }}</span>
        </template>
      </Column>
      <Column header="Por">
        <template #body="{ data }"><span style="font-size: 0.85rem">{{ autor(data) }}</span></template>
      </Column>
    </DataTable>
  </Dialog>
</template>
