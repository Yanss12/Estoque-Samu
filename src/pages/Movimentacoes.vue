<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Paginador from '../components/Paginador.vue'
import { supabase } from '../lib/supabase'
import { motivoLabel } from '../lib/movimentacoes'
import { catLabel } from '../lib/categorias'
import { fetchPerfisMap } from '../lib/perfis'
import { baixarPlanilhaSimples } from '../lib/relatorioExcel'

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

// Export Excel: a LISTA de movimentações (respeita os filtros atuais).
const exportando = ref(false)
async function exportarMovimentacoes() {
  exportando.value = true
  try {
    const todas = []
    const size = 1000
    for (let from = 0; ; from += size) {
      let q = supabase
        .from('movimentacoes')
        .select(
          'tipo, quantidade, motivo, observacao, data, usuario_id, produto:produtos(nome, categoria), setor:setores(nome), lote:lotes(numero_lote)'
        )
        .order('data', { ascending: false })
      if (tipoFiltro.value) q = q.eq('tipo', tipoFiltro.value)
      if (produtoFiltro.value) q = q.eq('produto_id', produtoFiltro.value)
      if (setorFiltro.value) q = q.eq('setor_id', setorFiltro.value)
      if (periodo.value?.[0]) q = q.gte('data', inicioDia(periodo.value[0]))
      if (periodo.value?.[1]) q = q.lte('data', fimDia(periodo.value[1]))
      q = q.range(from, from + size - 1)
      const { data, error } = await q
      if (error) throw error
      todas.push(...(data ?? []))
      if (!data || data.length < size) break
    }
    if (!todas.length) {
      toast.add({ severity: 'warn', summary: 'Nada para exportar', detail: 'Nenhuma movimentação para os filtros escolhidos.', life: 5000 })
      return
    }
    const linhas = todas.map((m) => [
      fmt(m.data),
      m.produto?.nome || '',
      m.produto?.categoria ? catLabel(m.produto.categoria) : '',
      m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      m.quantidade,
      m.lote?.numero_lote || '',
      m.setor?.nome || '',
      motivoLabel(m.motivo),
      m.observacao || '',
      perfisMap.value[m.usuario_id] || '',
    ])
    const h = new Date()
    const stamp = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
    await baixarPlanilhaSimples(
      `Movimentacoes_${stamp}.xlsx`,
      'Movimentações',
      ['Data/Hora', 'Produto', 'Categoria', 'Tipo', 'Qtd', 'Lote', 'Setor', 'Motivo', 'Observação', 'Por'],
      linhas,
      [16, 34, 14, 9, 7, 14, 14, 16, 30, 16]
    )
    toast.add({ severity: 'success', summary: 'Excel gerado', detail: `${linhas.length} movimentações exportadas.`, life: 4000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro ao gerar Excel', detail: e.message, life: 6000 })
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
      <Button label="Exportar Excel" icon="pi pi-file-excel" severity="secondary" outlined :loading="exportando" @click="exportarMovimentacoes" />
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
</template>
