<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { CATEGORIAS, catLabel } from '../lib/categorias'
import MovimentacaoDialog from '../components/MovimentacaoDialog.vue'
import FichaProduto from '../components/FichaProduto.vue'
import ProdutoDialog from '../components/ProdutoDialog.vue'
import Paginador from '../components/Paginador.vue'
import { baixarPlanilhaSimples } from '../lib/relatorioExcel'

const toast = useToast()

const linhas = ref([])
const produtos = ref([])
const setores = ref([])
const validadePorProduto = ref({})
const carregando = ref(false)

const busca = ref('')
const categoriaFiltro = ref(null)

// Paginação (controla a DataTable; UI vem do <Paginador>)
const first = ref(0)
const rows = ref(15)

const dialogVisible = ref(false)
const preselect = ref(null)
const fichaVisible = ref(false)
const fichaProduto = ref(null)
const produtoDialogVisible = ref(false)
const produtoEdit = ref(null)

const linhasFiltradas = computed(() =>
  linhas.value.filter((r) => {
    if (categoriaFiltro.value && r.categoria !== categoriaFiltro.value) return false
    if (busca.value && !r.nome.toLowerCase().includes(busca.value.toLowerCase())) return false
    return true
  })
)

// Filtrar volta pra 1ª página
watch([busca, categoriaFiltro], () => (first.value = 0))

async function carregar() {
  carregando.value = true
  try {
    const [saldo, prods, sets, lotes] = await Promise.all([
      supabase.from('saldo_estoque').select('*').order('nome'),
      supabase.from('produtos').select('id, nome, categoria, controlado').order('nome'),
      supabase.from('setores').select('id, nome, grupo').eq('ativo', true).order('nome'),
      supabase.from('saldo_por_lote').select('produto_id, validade, saldo'),
    ])
    if (saldo.error) throw saldo.error
    if (prods.error) throw prods.error
    if (sets.error) throw sets.error

    const controlado = new Set((prods.data ?? []).filter((p) => p.controlado).map((p) => p.id))
    linhas.value = (saldo.data ?? []).map((r) => ({ ...r, controlado: controlado.has(r.produto_id) }))
    produtos.value = prods.data ?? []
    setores.value = sets.data ?? []

    // Próxima validade (FEFO) = menor validade entre os lotes COM saldo.
    const vmap = {}
    for (const l of lotes.data ?? []) {
      if (!l.validade || (l.saldo ?? 0) <= 0) continue
      if (!vmap[l.produto_id] || l.validade < vmap[l.produto_id]) vmap[l.produto_id] = l.validade
    }
    validadePorProduto.value = vmap
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro ao carregar o estoque', detail: err.message, life: 6000 })
  } finally {
    carregando.value = false
  }
}

function abrir(tipo, row = null) {
  preselect.value = { tipo, produto_id: row?.produto_id ?? null }
  dialogVisible.value = true
}
function abrirFicha(row) {
  fichaProduto.value = row
  fichaVisible.value = true
}
function novoProduto() {
  produtoEdit.value = null
  produtoDialogVisible.value = true
}
function editarProduto(row) {
  produtoEdit.value = row
  produtoDialogVisible.value = true
}
// Datas 'YYYY-MM-DD' viram Date no fuso LOCAL (evita o off-by-one do UTC).
function parseData(v) {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function diasParaVencer(produtoId) {
  const v = validadePorProduto.value[produtoId]
  if (!v) return null
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.ceil((parseData(v) - hoje) / 86400000)
}
function proxValidadeFmt(produtoId) {
  const v = validadePorProduto.value[produtoId]
  if (!v) return null
  return parseData(v).toLocaleDateString('pt-BR')
}
// Cor por urgência: vencido = vermelho, ≤60d = laranja, senão texto normal.
function corValidade(produtoId) {
  const d = diasParaVencer(produtoId)
  if (d === null) return 'var(--text-muted)'
  if (d < 0) return 'var(--samu-red)'
  if (d <= 60) return 'var(--samu-orange)'
  return 'var(--text)'
}
async function exportar() {
  try {
    const rows = linhasFiltradas.value.map((r) => [
      r.nome,
      catLabel(r.categoria),
      r.unidade_medida,
      r.saldo,
      r.estoque_minimo,
      proxValidadeFmt(r.produto_id) || '—',
    ])
    const h = new Date()
    const stamp = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
    await baixarPlanilhaSimples(
      `Estoque_atual_${stamp}.xlsx`,
      'Estoque',
      ['Produto', 'Categoria', 'Unidade', 'Saldo', 'Mínimo', 'Próx. validade'],
      rows,
      [40, 14, 14, 8, 8, 14]
    )
    toast.add({ severity: 'success', summary: 'Excel gerado', detail: 'O download foi iniciado.', life: 3500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro ao gerar Excel', detail: e.message, life: 6000 })
  }
}

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <h1>Estoque · Farmácia Central</h1>
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
      <Button label="Novo produto" icon="pi pi-plus-circle" severity="secondary" outlined @click="novoProduto" />
      <Button label="Exportar Excel" icon="pi pi-file-excel" severity="secondary" outlined @click="exportar" />
      <Button label="Entrada" icon="pi pi-plus" severity="success" @click="abrir('entrada')" />
      <Button label="Saída" icon="pi pi-minus" severity="danger" @click="abrir('saida')" />
    </div>
  </div>

  <div class="toolbar">
    <IconField class="grow">
      <InputIcon class="pi pi-search" />
      <InputText v-model="busca" placeholder="Buscar produto..." class="full" />
    </IconField>
    <Select
      v-model="categoriaFiltro"
      :options="CATEGORIAS"
      option-label="label"
      option-value="value"
      placeholder="Categoria"
      show-clear
      style="min-width: 12rem"
    />
  </div>

  <div class="card-panel" style="padding: 0.35rem 0.85rem">
  <DataTable
    :value="linhasFiltradas"
    :loading="carregando"
    data-key="produto_id"
    paginator
    v-model:first="first"
    v-model:rows="rows"
    removable-sort
    size="small"
    class="tabela-moderna sem-paginador-nativo"
  >
    <template #empty>Nenhum produto encontrado.</template>

    <Column field="nome" header="Produto" sortable />
    <Column field="categoria" header="Categoria" sortable style="width: 11rem">
      <template #body="{ data }">
        <span class="cat-pill" :class="{ controlado: data.controlado }">{{ catLabel(data.categoria) }}</span>
      </template>
    </Column>
    <Column field="unidade_medida" header="Unidade" sortable style="width: 8rem" />
    <Column field="saldo" header="Saldo" sortable style="width: 8rem">
      <template #body="{ data }">
        <span class="saldo-pill" :class="{ baixo: data.abaixo_minimo }">
          <i v-if="data.abaixo_minimo" class="pi pi-exclamation-triangle" />{{ data.saldo }}
        </span>
      </template>
    </Column>
    <Column field="estoque_minimo" header="Mínimo" sortable style="width: 7rem" />
    <Column header="Próx. validade" style="width: 11rem">
      <template #body="{ data }">
        <template v-if="proxValidadeFmt(data.produto_id)">
          <span :style="{ color: corValidade(data.produto_id), fontWeight: diasParaVencer(data.produto_id) <= 60 ? 600 : 500 }">
            <i class="pi pi-hourglass" style="margin-right: 0.3rem; font-size: 0.8rem" />
            {{ proxValidadeFmt(data.produto_id) }}
            <small v-if="diasParaVencer(data.produto_id) < 0"> · vencido</small>
            <small v-else-if="diasParaVencer(data.produto_id) <= 60"> · {{ diasParaVencer(data.produto_id) }}d</small>
          </span>
        </template>
        <span v-else style="color: var(--text-muted)" title="Sem lote com validade">—</span>
      </template>
    </Column>
    <Column header="Ações" style="width: 11rem">
      <template #body="{ data }">
        <Button icon="pi pi-plus" text rounded severity="success" title="Entrada" @click="abrir('entrada', data)" />
        <Button icon="pi pi-minus" text rounded severity="danger" title="Saída" @click="abrir('saida', data)" />
        <Button icon="pi pi-pencil" text rounded severity="secondary" title="Editar" @click="editarProduto(data)" />
        <Button icon="pi pi-eye" text rounded severity="secondary" title="Ficha" @click="abrirFicha(data)" />
      </template>
    </Column>
  </DataTable>
  <Paginador
    v-model:first="first"
    v-model:rows="rows"
    :total="linhasFiltradas.length"
    :rows-options="[15, 30, 50, 100]"
    :disabled="carregando"
  />
  </div>

  <MovimentacaoDialog
    v-model:visible="dialogVisible"
    :produtos="produtos"
    :setores="setores"
    :preselect="preselect"
    @saved="carregar"
  />
  <FichaProduto v-model:visible="fichaVisible" :produto="fichaProduto" />
  <ProdutoDialog v-model:visible="produtoDialogVisible" :produto="produtoEdit" @saved="carregar" />
</template>
