<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Paginador from '../components/Paginador.vue'
import ListaMovimentacoes from '../components/ListaMovimentacoes.vue'
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
    <div>
      <h1>Movimentações</h1>
      <p class="page-sub">Trilha de auditoria de entradas e saídas, da mais recente para a mais antiga</p>
    </div>
    <Button label="Exportar Excel" icon="pi pi-download" severity="secondary" outlined :loading="exportando" @click="exportarMovimentacoes" />
  </div>

  <div class="toolbar">
    <Select
      v-model="tipoFiltro"
      :options="tipoOpcoes"
      option-label="label"
      option-value="value"
      placeholder="Entradas e saídas"
      aria-label="Filtrar por tipo"
      show-clear
      style="min-width: 11rem"
    />
    <Select
      v-model="produtoFiltro"
      :options="produtos"
      option-label="nome"
      option-value="id"
      filter
      placeholder="Todos os produtos"
      aria-label="Filtrar por produto"
      show-clear
      style="min-width: 15rem"
    />
    <Select
      v-model="setorFiltro"
      :options="setores"
      option-label="nome"
      option-value="id"
      placeholder="Todos os setores"
      aria-label="Filtrar por setor"
      show-clear
      style="min-width: 11rem"
    />
    <DatePicker
      v-model="periodo"
      selection-mode="range"
      :manual-input="false"
      date-format="dd/mm/yy"
      placeholder="Qualquer data"
      aria-label="Filtrar por período"
      show-icon
      show-button-bar
      style="min-width: 15rem"
    />
    <Button
      v-if="temFiltro"
      label="Limpar filtros"
      icon="pi pi-filter-slash"
      text
      severity="secondary"
      @click="limparFiltros"
    />
  </div>

  <div class="card-panel" :aria-busy="carregando">
    <ul v-if="carregando && !movs.length" class="lista" aria-hidden="true">
      <li v-for="n in 8" :key="n"><span class="skel" style="width: 45%" /><span class="skel" style="width: 4rem" /></li>
    </ul>
    <ListaMovimentacoes
      v-else-if="movs.length"
      :movs="movs"
      :perfis-map="perfisMap"
      tempo="absoluto"
      detalhado
      :style="{ opacity: carregando ? 0.55 : 1, transition: 'opacity 0.15s' }"
    />
    <p v-else class="empty" style="margin: 0.25rem 0">
      <template v-if="temFiltro">
        Nenhuma movimentação para esses filtros.
        <a href="#" class="ver-todas" style="display: inline" @click.prevent="limparFiltros">Limpar filtros</a>
      </template>
      <template v-else>Nenhuma movimentação registrada ainda.</template>
    </p>

    <Paginador
      v-model:first="first"
      v-model:rows="rows"
      :total="total"
      :disabled="carregando"
    />
  </div>
</template>
