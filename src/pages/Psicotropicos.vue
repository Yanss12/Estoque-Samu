<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import MovimentacaoDialog from '../components/MovimentacaoDialog.vue'
import FichaProduto from '../components/FichaProduto.vue'
import ProdutoDialog from '../components/ProdutoDialog.vue'
import Paginador from '../components/Paginador.vue'

const toast = useToast()
const linhas = ref([])
const produtos = ref([])
const setores = ref([])
const carregando = ref(false)

const first = ref(0)
const rows = ref(15)

const dialogVisible = ref(false)
const preselect = ref(null)
const fichaVisible = ref(false)
const fichaProduto = ref(null)
const produtoDialogVisible = ref(false)
const produtoEdit = ref(null)

async function carregar() {
  carregando.value = true
  try {
    const [saldo, prods, sets] = await Promise.all([
      supabase.from('saldo_estoque').select('*').eq('categoria', 'psicotropico').order('nome'),
      supabase.from('produtos').select('id, nome, categoria, controlado').eq('categoria', 'psicotropico').order('nome'),
      supabase.from('setores').select('id, nome, grupo').eq('ativo', true).order('nome'),
    ])
    if (saldo.error) throw saldo.error
    linhas.value = saldo.data ?? []
    produtos.value = prods.data ?? []
    setores.value = sets.data ?? []
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro', detail: err.message, life: 6000 })
  } finally {
    carregando.value = false
  }
}

function abrir(tipo, row) {
  preselect.value = { tipo, produto_id: row.produto_id }
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

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <h1><i class="pi pi-shield" style="color: var(--samu-orange)" /> Psicotrópicos</h1>
    <Button label="Novo psicotrópico" icon="pi pi-plus-circle" severity="secondary" outlined @click="novoProduto" />
  </div>

  <div class="aviso-controlado" style="margin-bottom: 1.25rem">
    <i class="pi pi-exclamation-triangle" />
    <span>
      <strong>Área de medicamentos controlados (Portaria 344/98).</strong>
      Toda entrada e saída é registrada com lote e auditoria (quem/quando). Use sempre o lote correto.
    </span>
  </div>

  <div class="card-panel" style="padding: 0.35rem 0.85rem">
  <DataTable
    :value="linhas"
    :loading="carregando"
    data-key="produto_id"
    paginator
    v-model:first="first"
    v-model:rows="rows"
    removable-sort
    size="small"
    class="tabela-moderna sem-paginador-nativo"
  >
    <template #empty>Nenhum psicotrópico cadastrado.</template>
    <Column field="nome" header="Medicamento" sortable />
    <Column field="unidade_medida" header="Unidade" style="width: 9rem" />
    <Column field="saldo" header="Saldo" sortable style="width: 8rem">
      <template #body="{ data }">
        <span class="saldo-pill" :class="{ baixo: data.abaixo_minimo }">{{ data.saldo }}</span>
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
    :total="linhas.length"
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
  <ProdutoDialog
    v-model:visible="produtoDialogVisible"
    :produto="produtoEdit"
    categoria-inicial="psicotropico"
    @saved="carregar"
  />
</template>
