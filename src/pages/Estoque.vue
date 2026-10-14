<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { ehAdmin } from '../lib/auth'
import { CATEGORIAS, catLabel } from '../lib/categorias'
import MovimentacaoDialog from '../components/MovimentacaoDialog.vue'
import FichaProduto from '../components/FichaProduto.vue'
import ProdutoDialog from '../components/ProdutoDialog.vue'
import Paginador from '../components/Paginador.vue'
import BaixaVencidosDialog from '../components/BaixaVencidosDialog.vue'
import { exportarRelatorioMensal } from '../lib/relatorioExcel'

const toast = useToast()
const route = useRoute()
const router = useRouter()

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

// Export Excel (relatório mensal, formato da planilha base)
const exportVisible = ref(false)
const mesExport = ref(new Date())
const exportando = ref(false)

const dialogVisible = ref(false)
const preselect = ref(null)
const fichaVisible = ref(false)
const fichaProduto = ref(null)
const produtoDialogVisible = ref(false)
const produtoEdit = ref(null)
const baixaVisivel = ref(false)
// Unidades em lote vencido no estoque inteiro (aparece o botão de baixa).
const totalVencido = computed(() => linhas.value.reduce((s, r) => s + (r.saldo_vencido || 0), 0))

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
      // Só lotes com saldo (os zerados crescem sem parar e estouram o limite de 1000 linhas).
      supabase.from('saldo_por_lote').select('produto_id, validade, saldo').gt('saldo', 0),
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
// Urgência: vencido = vermelho, ≤60d = âmbar, senão texto normal.
function classeValidade(produtoId) {
  const d = diasParaVencer(produtoId)
  if (d === null) return ''
  if (d < 0) return 'vencido'
  if (d <= 60) return 'proximo'
  return ''
}
async function fazerExportMensal() {
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

onMounted(() => {
  carregar()
  // Visão geral → "Dar baixa nos vencidos" abre direto o diálogo.
  if (route.query.baixa) {
    baixaVisivel.value = true
    router.replace({ query: {} })
  }
})
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Estoque</h1>
      <p class="page-sub">Farmácia central · saldo atual e próxima validade de cada produto</p>
    </div>
    <div class="page-acoes">
      <Button
        v-if="totalVencido > 0"
        :label="`Baixa de vencidos (${totalVencido})`"
        icon="pi pi-trash"
        severity="danger"
        outlined
        @click="baixaVisivel = true"
      />
      <Button v-if="ehAdmin" label="Novo produto" icon="pi pi-plus" severity="secondary" outlined @click="novoProduto" />
      <Button label="Exportar Excel" icon="pi pi-download" severity="secondary" outlined @click="exportVisible = true" />
      <Button label="Entrada" icon="pi pi-arrow-down" severity="success" @click="abrir('entrada')" />
      <Button label="Saída" icon="pi pi-arrow-up" severity="danger" @click="abrir('saida')" />
    </div>
  </div>

  <div class="toolbar">
    <IconField class="grow">
      <InputIcon class="pi pi-search" />
      <InputText v-model="busca" placeholder="Buscar produto pelo nome" aria-label="Buscar produto" class="full" />
    </IconField>
    <Select
      v-model="categoriaFiltro"
      :options="CATEGORIAS"
      option-label="label"
      option-value="value"
      placeholder="Todas as categorias"
      aria-label="Filtrar por categoria"
      show-clear
      style="min-width: 13rem"
    />
  </div>

  <div class="card-panel tabela">
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
    <template #empty>
      {{ busca || categoriaFiltro ? 'Nenhum produto corresponde à busca.' : 'Nenhum produto cadastrado. Use "Novo produto" para começar.' }}
    </template>

    <Column field="nome" header="Produto" sortable>
      <template #body="{ data }">
        <span class="prod-nome">
          {{ data.nome }}
          <span v-if="data.controlado" class="tag-controlado">Controlado</span>
        </span>
      </template>
    </Column>
    <Column field="categoria" header="Categoria" sortable style="width: 9.5rem" header-class="col-opc" body-class="col-opc">
      <template #body="{ data }">
        <span class="cat-texto">{{ catLabel(data.categoria) }}</span>
      </template>
    </Column>
    <Column field="unidade_medida" header="Unidade" sortable style="width: 7.5rem" header-class="col-opc" body-class="col-opc">
      <template #body="{ data }">
        <span class="cat-texto">{{ data.unidade_medida }}</span>
      </template>
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
      <template #body="{ data }">
        <span class="num muted">{{ data.estoque_minimo }}</span>
      </template>
    </Column>
    <Column header="Próx. validade" style="width: 10.5rem">
      <template #body="{ data }">
        <span
          v-if="proxValidadeFmt(data.produto_id)"
          class="validade"
          :class="classeValidade(data.produto_id)"
        >
          {{ proxValidadeFmt(data.produto_id) }}<small v-if="diasParaVencer(data.produto_id) < 0">vencido</small><small v-else-if="diasParaVencer(data.produto_id) <= 60">{{ diasParaVencer(data.produto_id) }}d</small>
        </span>
        <span v-else class="muted" title="Sem lote com validade">—</span>
      </template>
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
  <BaixaVencidosDialog v-model:visible="baixaVisivel" @saved="carregar" />
  <ProdutoDialog v-model:visible="produtoDialogVisible" :produto="produtoEdit" @saved="carregar" />

  <!-- Export Excel: relatório mensal no formato da planilha base -->
  <Dialog v-model:visible="exportVisible" modal header="Exportar relatório mensal" :style="{ width: '26rem' }" :breakpoints="{ '640px': '95vw' }">
    <p class="muted" style="font-size: 0.875rem; margin-top: 0; line-height: 1.5">
      Gera um <strong>.xlsx</strong> no formato da planilha base — uma aba por categoria, com estoque inicial, entradas, consumo diário PSM/SAMU, validade e estoque final — para o mês escolhido.
    </p>
    <div class="field">
      <label for="mes-export">Mês de referência</label>
      <DatePicker v-model="mesExport" input-id="mes-export" view="month" date-format="mm/yy" show-icon class="full" />
    </div>
    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="exportando" @click="exportVisible = false" />
      <Button label="Gerar Excel" icon="pi pi-download" :loading="exportando" @click="fazerExportMensal" />
    </template>
  </Dialog>
</template>
