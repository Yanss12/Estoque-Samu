<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Paginador from '../components/Paginador.vue'
import { supabase } from '../lib/supabase'
import { motivoLabel } from '../lib/movimentacoes'
import { fetchPerfisMap } from '../lib/perfis'
import { exportarRelatorioMensal } from '../lib/relatorioExcel'

const toast = useToast()
const movs = ref([])
const perfisMap = ref({})
const produtos = ref([])
const setores = ref([])
const carregando = ref(false)

// Filtros
const tipoFiltro = ref(null)
const produtoFiltro = ref(null)
const setorFiltro = ref(null)
const periodo = ref(null) // [inicio, fim]
const tipoOpcoes = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Saída', value: 'saida' },
]

// Paginação (server-side)
const first = ref(0)
const rows = ref(25)
const total = ref(0)

const temFiltro = computed(
  () => !!(tipoFiltro.value || produtoFiltro.value || setorFiltro.value || periodo.value?.[0])
)

// Export Excel (formato da planilha base, mensal)
const exportVisible = ref(false)
const mesExport = ref(new Date())
const exportando = ref(false)
async function fazerExport() {
  exportando.value = true
  try {
    const d = mesExport.value
    await exportarRelatorioMensal(d.getFullYear(), d.getMonth() + 1)
    toast.add({ severity: 'success', summary: 'Excel gerado', detail: 'O download foi iniciado.', life: 4000 })
    exportVisible.value = false
  } catch (e) {
    const semDados = e.message?.includes('Sem dados')
    toast.add({
      severity: semDados ? 'warn' : 'error',
      summary: semDados ? 'Nada para exportar' : 'Erro ao gerar Excel',
      detail: e.message,
      life: 6000,
    })
  } finally {
    exportando.value = false
  }
}

function inicioDia(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}
function fimDia(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

async function carregar() {
  carregando.value = true
  let q = supabase
    .from('movimentacoes')
    .select(
      'id, tipo, quantidade, motivo, observacao, data, usuario_id, produto:produtos(nome, controlado), setor:setores(nome), lote:lotes(numero_lote)',
      { count: 'exact' }
    )
    .order('data', { ascending: false })

  if (tipoFiltro.value) q = q.eq('tipo', tipoFiltro.value)
  if (produtoFiltro.value) q = q.eq('produto_id', produtoFiltro.value)
  if (setorFiltro.value) q = q.eq('setor_id', setorFiltro.value)
  if (periodo.value?.[0]) q = q.gte('data', inicioDia(periodo.value[0]))
  if (periodo.value?.[1]) q = q.lte('data', fimDia(periodo.value[1]))

  q = q.range(first.value, first.value + rows.value - 1)

  const { data, count, error } = await q
  if (error) toast.add({ severity: 'error', summary: 'Erro', detail: error.message, life: 6000 })
  else {
    movs.value = data ?? []
    total.value = count ?? 0
  }
  carregando.value = false
}

function limparFiltros() {
  tipoFiltro.value = null
  produtoFiltro.value = null
  setorFiltro.value = null
  periodo.value = null
}

// Qualquer mudança de filtro/tamanho volta pra 1ª página e recarrega.
watch([tipoFiltro, produtoFiltro, setorFiltro, periodo, rows], () => {
  first.value = 0
  carregar()
})
watch(first, carregar)

function autor(m) {
  return perfisMap.value[m.usuario_id] || 'usuário removido'
}
function subtitulo(m) {
  const t = m.tipo === 'entrada' ? 'Entrada' : 'Saída'
  let s =
    m.motivo === 'liberacao' && m.setor?.nome
      ? `${t} · Liberação → ${m.setor.nome}`
      : `${t} · ${motivoLabel(m.motivo)}`
  if (m.lote?.numero_lote) s += ` · lote ${m.lote.numero_lote}`
  return s
}
function ehAvariado(m) {
  return m.tipo === 'saida' && m.motivo === 'avariado'
}
function fmt(d) {
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

onMounted(async () => {
  const [perfis, prods, sets] = await Promise.all([
    fetchPerfisMap(),
    supabase.from('produtos').select('id, nome').order('nome'),
    supabase.from('setores').select('id, nome').eq('ativo', true).order('nome'),
  ])
  perfisMap.value = perfis
  produtos.value = prods.data ?? []
  setores.value = sets.data ?? []
  carregar()
})
</script>

<template>
  <div class="page-head">
    <h1>Movimentações</h1>
    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap">
      <span style="color: var(--text-muted); font-size: 0.9rem">Trilha de auditoria — entradas e saídas</span>
      <Button label="Exportar Excel" icon="pi pi-file-excel" severity="secondary" outlined @click="exportVisible = true" />
    </div>
  </div>

  <div class="toolbar" style="flex-wrap: wrap">
    <Select
      v-model="tipoFiltro"
      :options="tipoOpcoes"
      option-label="label"
      option-value="value"
      placeholder="Tipo"
      show-clear
      style="min-width: 9rem"
    />
    <Select
      v-model="produtoFiltro"
      :options="produtos"
      option-label="nome"
      option-value="id"
      filter
      placeholder="Produto"
      show-clear
      style="min-width: 15rem"
    />
    <Select
      v-model="setorFiltro"
      :options="setores"
      option-label="nome"
      option-value="id"
      placeholder="Setor"
      show-clear
      style="min-width: 10rem"
    />
    <DatePicker
      v-model="periodo"
      selection-mode="range"
      :manual-input="false"
      date-format="dd/mm/yy"
      placeholder="Período"
      show-icon
      show-button-bar
      style="min-width: 15rem"
    />
    <Button
      v-if="temFiltro"
      label="Limpar"
      icon="pi pi-filter-slash"
      text
      severity="secondary"
      @click="limparFiltros"
    />
  </div>

  <div class="card-panel">
    <div v-if="movs.length" class="feed">
      <div v-for="m in movs" :key="m.id" class="feed-row">
        <span class="feed-chip" :class="m.tipo === 'entrada' ? 'in' : 'out'">
          <i :class="m.tipo === 'entrada' ? 'pi pi-arrow-down-left' : ehAvariado(m) ? 'pi pi-exclamation-triangle' : 'pi pi-arrow-up-right'" />
        </span>
        <div class="feed-main">
          <div class="feed-title">
            {{ m.produto?.nome || '—' }}
            <span v-if="m.produto?.controlado" class="pill-controlado">controlado</span>
          </div>
          <div class="feed-sub">
            {{ subtitulo(m) }}
            <span class="feed-autor"><i class="pi pi-user" /> {{ autor(m) }}</span>
          </div>
          <div v-if="m.observacao" class="feed-obs">
            <i class="pi pi-comment" /> {{ m.observacao }}
          </div>
        </div>
        <div class="feed-right">
          <div class="feed-qty" :class="m.tipo === 'entrada' ? 'in' : 'out'">
            {{ m.tipo === 'entrada' ? '+' : '−' }}{{ m.quantidade }}
          </div>
          <div class="feed-time">{{ fmt(m.data) }}</div>
        </div>
      </div>
    </div>
    <div v-else class="empty" style="padding: 0.5rem 0">
      {{ carregando ? 'Carregando...' : temFiltro ? 'Nenhuma movimentação para os filtros escolhidos.' : 'Nenhuma movimentação registrada ainda.' }}
    </div>

    <!-- Paginação -->
    <Paginador
      v-model:first="first"
      v-model:rows="rows"
      :total="total"
      :disabled="carregando"
    />
  </div>

  <!-- Export Excel (formato da planilha base) -->
  <Dialog v-model:visible="exportVisible" modal header="Exportar Excel (mensal)" :style="{ width: '26rem' }" :breakpoints="{ '640px': '95vw' }">
    <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0">
      Gera um arquivo <strong>.xlsx</strong> no formato da planilha base (uma aba por categoria, com consumo diário PSM/SAMU, entradas, validade e estoque final) para o mês escolhido.
    </p>
    <div class="field" style="display: flex; flex-direction: column; gap: 0.4rem">
      <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted)">Mês de referência</label>
      <DatePicker v-model="mesExport" view="month" date-format="mm/yy" show-icon class="full" />
    </div>
    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="exportando" @click="exportVisible = false" />
      <Button label="Gerar Excel" icon="pi pi-download" :loading="exportando" @click="fazerExport" />
    </template>
  </Dialog>
</template>
