<script setup>
import { ref, computed, onMounted } from 'vue'
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

const toast = useToast()

const linhas = ref([])
const produtos = ref([])
const setores = ref([])
const validadePorProduto = ref({})
const carregando = ref(false)

const busca = ref('')
const categoriaFiltro = ref(null)

const dt = ref(null)
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

async function carregar() {
  carregando.value = true
  try {
    const [saldo, prods, sets, alertas] = await Promise.all([
      supabase.from('saldo_estoque').select('*').order('nome'),
      supabase.from('produtos').select('id, nome, categoria, controlado').order('nome'),
      supabase.from('setores').select('id, nome, grupo').eq('ativo', true).order('nome'),
      supabase.from('alerta_validade').select('produto_id, validade'),
    ])
    if (saldo.error) throw saldo.error
    if (prods.error) throw prods.error
    if (sets.error) throw sets.error

    const controlado = new Set((prods.data ?? []).filter((p) => p.controlado).map((p) => p.id))
    linhas.value = (saldo.data ?? []).map((r) => ({ ...r, controlado: controlado.has(r.produto_id) }))
    produtos.value = prods.data ?? []
    setores.value = sets.data ?? []

    const vmap = {}
    for (const a of alertas.data ?? []) {
      if (!vmap[a.produto_id] || a.validade < vmap[a.produto_id]) vmap[a.produto_id] = a.validade
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
function diasParaVencer(produtoId) {
  const v = validadePorProduto.value[produtoId]
  if (!v) return null
  return Math.ceil((new Date(v) - new Date()) / 86400000)
}
function exportar() {
  dt.value?.exportCSV()
}

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <h1>Estoque · Farmácia Central</h1>
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap">
      <Button label="Novo produto" icon="pi pi-plus-circle" severity="secondary" outlined @click="novoProduto" />
      <Button label="Exportar CSV" icon="pi pi-download" severity="secondary" outlined @click="exportar" />
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
    ref="dt"
    :value="linhasFiltradas"
    :loading="carregando"
    data-key="produto_id"
    paginator
    :rows="15"
    :rows-per-page-options="[15, 30, 50, 100]"
    removable-sort
    size="small"
    class="tabela-moderna"
    export-filename="estoque-samu"
    current-page-report-template="{first}–{last} de {totalRecords}"
    paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
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
    <Column header="Validade" style="width: 9rem">
      <template #body="{ data }">
        <template v-if="diasParaVencer(data.produto_id) !== null">
          <span :style="{ color: diasParaVencer(data.produto_id) < 0 ? 'var(--samu-red)' : 'var(--samu-orange)', fontWeight: 600 }">
            <i class="pi pi-hourglass" style="margin-right: 0.3rem" />
            {{ diasParaVencer(data.produto_id) < 0 ? 'Vencido' : diasParaVencer(data.produto_id) + 'd' }}
          </span>
        </template>
        <span v-else style="color: var(--text-muted)">—</span>
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
