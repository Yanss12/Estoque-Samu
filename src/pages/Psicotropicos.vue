<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { ehAdmin } from '../lib/auth'
import MovimentacaoDialog from '../components/MovimentacaoDialog.vue'
import FichaProduto from '../components/FichaProduto.vue'
import ProdutoDialog from '../components/ProdutoDialog.vue'
import Paginador from '../components/Paginador.vue'
import BaixaVencidosDialog from '../components/BaixaVencidosDialog.vue'

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
const baixaVisible = ref(false)
const totalVencido = computed(() => linhas.value.reduce((s, r) => s + (r.saldo_vencido || 0), 0))

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
    <div>
      <h1>Psicotrópicos</h1>
      <p class="page-sub">Medicamentos controlados · Portaria 344/98</p>
    </div>
    <div class="page-acoes">
      <Button
        v-if="totalVencido > 0"
        :label="`Baixa de vencidos (${totalVencido})`"
        icon="pi pi-trash"
        severity="danger"
        outlined
        @click="baixaVisible = true"
      />
      <Button v-if="ehAdmin" label="Novo psicotrópico" icon="pi pi-plus" severity="secondary" outlined @click="novoProduto" />
    </div>
  </div>

  <div class="aviso-controlado" role="note">
    <i class="pi pi-shield" aria-hidden="true" />
    <span>
      Toda entrada e saída fica registrada com <strong>lote, usuário e horário</strong>.
      Confira o número do lote na embalagem antes de registrar.
    </span>
  </div>

  <div class="card-panel tabela">
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
    <template #empty>Nenhum psicotrópico cadastrado. Use "Novo psicotrópico" para começar.</template>
    <Column field="nome" header="Medicamento" sortable>
      <template #body="{ data }"><span class="prod-nome">{{ data.nome }}</span></template>
    </Column>
    <Column field="unidade_medida" header="Unidade" style="width: 8rem" header-class="col-opc" body-class="col-opc">
      <template #body="{ data }"><span class="cat-texto">{{ data.unidade_medida }}</span></template>
    </Column>
    <Column field="saldo_disponivel" header="Disponível" sortable style="width: 7.5rem" header-class="col-num" body-class="col-num">
      <template #body="{ data }">
        <span
          class="saldo"
          :class="{ baixo: data.abaixo_minimo || data.saldo_disponivel <= 0 }"
          :title="data.saldo_disponivel <= 0 ? 'Sem estoque utilizável' : data.abaixo_minimo ? 'Abaixo do mínimo' : null"
        >
          <i v-if="data.abaixo_minimo" class="pi pi-exclamation-triangle" aria-hidden="true" />{{ data.saldo_disponivel }}
        </span>
        <span v-if="data.saldo_vencido > 0" class="saldo-vencido" :title="`${data.saldo_vencido} em lote vencido — não usar`">
          +{{ data.saldo_vencido }} vencido
        </span>
      </template>
    </Column>
    <Column field="estoque_minimo" header="Mínimo" sortable style="width: 6.5rem" header-class="col-num col-opc" body-class="col-num col-opc">
      <template #body="{ data }"><span class="num muted">{{ data.estoque_minimo }}</span></template>
    </Column>
    <Column style="width: 9.5rem" header-class="col-num">
      <template #header><span class="sr-only">Ações</span></template>
      <template #body="{ data }">
        <div class="acoes">
          <Button icon="pi pi-arrow-down" text rounded severity="secondary" class="acao-entrada" v-tooltip.top="'Entrada'" :aria-label="`Entrada de ${data.nome}`" @click="abrir('entrada', data)" />
          <Button icon="pi pi-arrow-up" text rounded severity="secondary" class="acao-saida" v-tooltip.top="'Saída'" :aria-label="`Saída de ${data.nome}`" @click="abrir('saida', data)" />
          <Button v-if="ehAdmin" icon="pi pi-pencil" text rounded severity="secondary" v-tooltip.top="'Editar'" :aria-label="`Editar ${data.nome}`" @click="editarProduto(data)" />
          <Button icon="pi pi-list" text rounded severity="secondary" v-tooltip.top="'Lotes e histórico'" :aria-label="`Lotes e histórico de ${data.nome}`" @click="abrirFicha(data)" />
        </div>
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
  <BaixaVencidosDialog v-model:visible="baixaVisible" somente-controlados @saved="carregar" />
  <ProdutoDialog
    v-model:visible="produtoDialogVisible"
    :produto="produtoEdit"
    categoria-inicial="psicotropico"
    @saved="carregar"
  />
</template>
