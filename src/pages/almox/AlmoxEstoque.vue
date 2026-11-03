<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import Paginador from '../../components/Paginador.vue'
import AlmoxProdutoDialog from '../../components/almox/AlmoxProdutoDialog.vue'
import AlmoxFichaProduto from '../../components/almox/AlmoxFichaProduto.vue'
import AlmoxEntradaDialog from '../../components/almox/AlmoxEntradaDialog.vue'
import AlmoxSaidaDialog from '../../components/almox/AlmoxSaidaDialog.vue'
import AlmoxReajusteDialog from '../../components/almox/AlmoxReajusteDialog.vue'
import AlmoxTransferenciaDialog from '../../components/almox/AlmoxTransferenciaDialog.vue'
import { almoxGerir } from '../../lib/auth'
import { CATEGORIAS, catLabel } from '../../lib/categorias'
import { fmtDataLocal, diasAte } from '../../lib/format'
import {
  ALMOX_GRUPOS_ITEM,
  ALMOX_SITUACOES,
  almoxSelectView,
  almoxRpc,
  mensagemErroAlmox,
} from '../../lib/almox'

const toast = useToast()

const linhas = ref([])
const indicadores = ref({
  total_produtos: 0,
  com_saldo: 0,
  criticos: 0,
  zerados: 0,
  lotes_vencidos: 0,
  lotes_vencendo_30: 0,
  lotes_vencendo_60: 0,
  transferencias_30d: 0,
  ultima_movimentacao: null,
})
const carregando = ref(false)

// Filtros
const busca = ref('')
const grupoFiltro = ref(null)
const categoriaFiltro = ref(null)
const situacaoFiltro = ref(null)

// Paginação
const first = ref(0)
const rows = ref(15)

// Diálogos de F2 e F3
const produtoDialogVisivel = ref(false)
const produtoEdit = ref(null)
const fichaVisivel = ref(false)
const fichaProduto = ref(null)
const entradaVisivel = ref(false)
const saidaVisivel = ref(false)
const reajusteVisivel = ref(false)
const transferenciaVisivel = ref(false)
const produtoOperacao = ref(null)

const temFiltro = computed(
  () => !!(busca.value.trim() || grupoFiltro.value || categoriaFiltro.value || situacaoFiltro.value)
)

const idsJaVinculados = computed(() => linhas.value.map((r) => r.produto_id))

const linhasFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return linhas.value.filter((r) => {
    if (grupoFiltro.value && r.grupo_item !== grupoFiltro.value) return false
    if (categoriaFiltro.value && r.categoria !== categoriaFiltro.value) return false
    if (situacaoFiltro.value && r.situacao !== situacaoFiltro.value) return false
    if (termo) {
      const nomeOk = (r.nome || '').toLowerCase().includes(termo)
      const codOk = (r.codigo_interno || '').toLowerCase().includes(termo)
      const locOk = (r.localizacao || '').toLowerCase().includes(termo)
      if (!nomeOk && !codOk && !locOk) return false
    }
    return true
  })
})

watch([busca, grupoFiltro, categoriaFiltro, situacaoFiltro], () => {
  first.value = 0
})

async function carregar() {
  carregando.value = true
  try {
    const [resEstoque, resInd] = await Promise.all([
      almoxSelectView('almox_saldo_produto', { order: { column: 'nome', ascending: true } }),
      almoxRpc('almox_indicadores'),
    ])
    if (resEstoque.error) throw resEstoque.error
    if (resInd.error) throw resInd.error

    linhas.value = resEstoque.data ?? []
    if (resInd.data) {
      indicadores.value = { ...indicadores.value, ...resInd.data }
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar o estoque do Almoxarifado',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    carregando.value = false
  }
}

function limparFiltros() {
  busca.value = ''
  grupoFiltro.value = null
  categoriaFiltro.value = null
  situacaoFiltro.value = null
}

function filtrarCriticos() {
  situacaoFiltro.value = situacaoFiltro.value === 'critico' ? null : 'critico'
}

function novoProduto() {
  produtoEdit.value = null
  produtoDialogVisivel.value = true
}

function editarProduto(row) {
  produtoEdit.value = row
  produtoDialogVisivel.value = true
}

function abrirFicha(row) {
  fichaProduto.value = row
  fichaVisivel.value = true
}

function abrirOperacao(tipo, row = null) {
  produtoOperacao.value = row
  if (tipo === 'entrada') {
    entradaVisivel.value = true
    return
  }
  if (tipo === 'saida') {
    saidaVisivel.value = true
    return
  }
  if (tipo === 'reajustar') {
    reajusteVisivel.value = true
    return
  }
  if (tipo === 'transferir') {
    transferenciaVisivel.value = true
  }
}

function diasValidade(dataISO) {
  return diasAte(dataISO)
}

function classeValidade(dataISO) {
  const d = diasValidade(dataISO)
  if (d === null) return ''
  if (d < 0) return 'vencido'
  if (d <= 60) return 'proximo'
  return ''
}

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <div>
      <span class="almox-chip">
        <i class="pi pi-building" aria-hidden="true" />
        Almoxarifado da Saúde · retaguarda
      </span>
      <h1>Estoque</h1>
      <p class="page-sub">Saldo de retaguarda, localização, lotes e validades do Almoxarifado</p>
    </div>
    <div v-if="almoxGerir" class="page-acoes">
      <Button
        label="Novo produto"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        @click="novoProduto"
      />
      <Button
        label="Transferir p/ Farmácia"
        icon="pi pi-send"
        severity="secondary"
        outlined
        @click="abrirOperacao('transferir')"
      />
      <Button
        label="Entrada"
        icon="pi pi-arrow-down"
        severity="success"
        @click="abrirOperacao('entrada')"
      />
      <Button
        label="Saída"
        icon="pi pi-arrow-up"
        severity="danger"
        @click="abrirOperacao('saida')"
      />
    </div>
  </div>

  <!-- Indicadores (almox_indicadores): críticos, vencendo 30d, vencidos, transferências 30d -->
  <div class="resumo">
    <a
      href="#"
      class="resumo-item metric-chip"
      :class="{ danger: indicadores.criticos > 0 }"
      @click.prevent="filtrarCriticos"
    >
      <span class="n">{{ carregando ? '–' : indicadores.criticos }}</span>
      <span class="t">{{ indicadores.criticos === 1 ? 'item crítico (≤ mín.)' : 'itens críticos (≤ mín.)' }}</span>
    </a>
    <RouterLink
      :to="{ name: 'almox-relatorios' }"
      class="resumo-item metric-chip"
      :class="{ warn: indicadores.lotes_vencendo_30 > 0 }"
    >
      <span class="n">{{ carregando ? '–' : indicadores.lotes_vencendo_30 }}</span>
      <span class="t">{{ indicadores.lotes_vencendo_30 === 1 ? 'lote vencendo em 30 d' : 'lotes vencendo em 30 d' }}</span>
    </RouterLink>
    <RouterLink
      :to="{ name: 'almox-relatorios' }"
      class="resumo-item metric-chip"
      :class="{ danger: indicadores.lotes_vencidos > 0 }"
    >
      <span class="n">{{ carregando ? '–' : indicadores.lotes_vencidos }}</span>
      <span class="t">{{ indicadores.lotes_vencidos === 1 ? 'lote vencido com saldo' : 'lotes vencidos com saldo' }}</span>
    </RouterLink>
    <RouterLink
      :to="{ name: 'almox-transferencias' }"
      class="resumo-item metric-chip"
    >
      <span class="n">{{ carregando ? '–' : indicadores.transferencias_30d }}</span>
      <span class="t">{{ indicadores.transferencias_30d === 1 ? 'transferência (30 d)' : 'transferências (30 d)' }}</span>
    </RouterLink>
  </div>

  <!-- Filtros -->
  <div class="toolbar">
    <IconField class="grow">
      <InputIcon class="pi pi-search" />
      <InputText
        v-model="busca"
        placeholder="Buscar por nome, código interno ou localização"
        aria-label="Buscar item no Almoxarifado"
        class="full"
      />
    </IconField>
    <Select
      v-model="grupoFiltro"
      :options="ALMOX_GRUPOS_ITEM"
      option-label="label"
      option-value="value"
      placeholder="Todos os grupos"
      aria-label="Filtrar por grupo"
      show-clear
      style="min-width: 11.5rem"
    />
    <Select
      v-model="categoriaFiltro"
      :options="CATEGORIAS"
      option-label="label"
      option-value="value"
      placeholder="Todas as categorias"
      aria-label="Filtrar por categoria"
      show-clear
      style="min-width: 12.5rem"
    />
    <Select
      v-model="situacaoFiltro"
      :options="ALMOX_SITUACOES"
      option-label="label"
      option-value="value"
      placeholder="Qualquer situação"
      aria-label="Filtrar por situação"
      show-clear
      style="min-width: 11rem"
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

  <!-- Tabela de almox_saldo_produto -->
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
        <template v-if="temFiltro">
          Nenhum item encontrado com esses filtros.
          <a href="#" class="ver-todas" style="display: inline; margin-left: 0.35rem" @click.prevent="limparFiltros">
            Limpar filtros
          </a>
        </template>
        <template v-else-if="almoxGerir">
          Nenhum item cadastrado no Almoxarifado. Use <strong>Novo produto</strong>.
        </template>
        <template v-else>
          Nenhum item cadastrado ainda.
        </template>
      </template>

      <Column field="nome" header="Produto" sortable header-class="col-produto" body-class="col-produto">
        <template #body="{ data }">
          <div class="prod-nome">
            {{ data.nome }}
            <span v-if="data.controlado" class="tag-controlado">Controlado</span>
            <span v-if="!data.ativo" class="tag-estorno">Inativo</span>
          </div>
          <div class="muted" style="font-size: 0.78rem; margin-top: 1px">
            <span v-if="data.codigo_interno" class="mono">{{ data.codigo_interno }} · </span>
            <span>{{ data.unidade_medida }}</span>
            <span v-if="data.estoque_minimo > 0"> · mín. {{ data.estoque_minimo }}</span>
            <span v-if="data.localizacao"> · {{ data.localizacao }}</span>
            <span v-if="data.proxima_validade" class="mobile-only-inline">
              · <span class="validade" :class="classeValidade(data.proxima_validade)">
                val. {{ fmtDataLocal(data.proxima_validade) }}
              </span>
            </span>
          </div>
        </template>
      </Column>

      <Column field="categoria" header="Categoria" sortable style="width: 1%; white-space: nowrap" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="cat-texto">{{ catLabel(data.categoria) }}</span>
        </template>
      </Column>

      <Column field="unidade_medida" header="Unid." sortable style="width: 1%; white-space: nowrap" header-class="col-opc col-opc-md" body-class="col-opc col-opc-md">
        <template #body="{ data }">
          <span class="cat-texto">{{ data.unidade_medida }}</span>
        </template>
      </Column>

      <Column field="saldo_disponivel" header="Disponível" sortable style="width: 1%; white-space: nowrap" header-class="col-num" body-class="col-num">
        <template #body="{ data }">
          <span
            class="saldo"
            :class="{ baixo: data.critico || data.saldo_disponivel <= 0 }"
            :title="data.saldo_disponivel <= 0 ? 'Sem estoque utilizável' : data.critico ? 'Abaixo ou igual ao mínimo' : null"
          >
            <i v-if="data.critico" class="pi pi-exclamation-triangle" aria-hidden="true" />{{ data.saldo_disponivel }}
          </span>
          <span
            v-if="data.saldo_vencido > 0"
            class="saldo-vencido"
            :title="`${data.saldo_vencido} em lote vencido — bloqueado para saída normal`"
          >
            +{{ data.saldo_vencido }} vencido
          </span>
        </template>
      </Column>

      <Column field="estoque_minimo" header="Mín." sortable style="width: 1%; white-space: nowrap" header-class="col-num col-opc col-opc-md" body-class="col-num col-opc col-opc-md">
        <template #body="{ data }">
          <span class="num muted">{{ data.estoque_minimo }}</span>
        </template>
      </Column>

      <Column field="proxima_validade" header="Validade" sortable style="width: 1%; white-space: nowrap" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span
            v-if="data.proxima_validade"
            class="validade"
            :class="classeValidade(data.proxima_validade)"
          >
            {{ fmtDataLocal(data.proxima_validade) }}<small v-if="diasValidade(data.proxima_validade) < 0">vencido</small><small v-else-if="diasValidade(data.proxima_validade) <= 60">{{ diasValidade(data.proxima_validade) }}d</small>
          </span>
          <span v-else class="muted" title="Sem lote com validade">—</span>
        </template>
      </Column>

      <Column style="width: 1%; white-space: nowrap" header-class="col-num" body-class="col-acoes">
        <template #header><span class="sr-only">Ações</span></template>
        <template #body="{ data }">
          <div class="acoes">
            <Button
              v-if="almoxGerir"
              icon="pi pi-arrow-down"
              text
              rounded
              severity="secondary"
              class="acao-entrada"
              v-tooltip.top="'Entrada'"
              :aria-label="`Entrada de ${data.nome}`"
              @click="abrirOperacao('entrada', data)"
            />
            <Button
              v-if="almoxGerir"
              icon="pi pi-arrow-up"
              text
              rounded
              severity="secondary"
              class="acao-saida"
              v-tooltip.top="'Saída'"
              :aria-label="`Saída de ${data.nome}`"
              @click="abrirOperacao('saida', data)"
            />
            <Button
              v-if="almoxGerir && !data.controlado"
              icon="pi pi-send"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Transferir para a Farmácia'"
              :aria-label="`Transferir ${data.nome} para a Farmácia`"
              @click="abrirOperacao('transferir', data)"
            />
            <Button
              v-if="almoxGerir"
              icon="pi pi-sliders-h"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Reajustar estoque'"
              :aria-label="`Reajustar estoque de ${data.nome}`"
              @click="abrirOperacao('reajustar', data)"
            />
            <Button
              v-if="almoxGerir"
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Configurar produto'"
              :aria-label="`Configurar ${data.nome}`"
              @click="editarProduto(data)"
            />
            <Button
              icon="pi pi-eye"
              text
              rounded
              severity="secondary"
              v-tooltip.top="'Ficha do produto'"
              :aria-label="`Ficha de ${data.nome}`"
              @click="abrirFicha(data)"
            />
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

  <AlmoxProdutoDialog
    v-model:visible="produtoDialogVisivel"
    :produto="produtoEdit"
    :ids-ja-vinculados="idsJaVinculados"
    @saved="carregar"
  />
  <AlmoxFichaProduto
    v-model:visible="fichaVisivel"
    :produto="fichaProduto"
  />
  <AlmoxEntradaDialog
    v-model:visible="entradaVisivel"
    :produtos="linhas"
    :produto-preselecionado="produtoOperacao"
    @saved="carregar"
  />
  <AlmoxSaidaDialog
    v-model:visible="saidaVisivel"
    :produtos="linhas"
    :produto-preselecionado="produtoOperacao"
    @saved="carregar"
  />
  <AlmoxReajusteDialog
    v-model:visible="reajusteVisivel"
    :produtos="linhas"
    :produto-preselecionado="produtoOperacao"
    @saved="carregar"
  />
  <AlmoxTransferenciaDialog
    v-model:visible="transferenciaVisivel"
    :produtos="linhas"
    :produto-preselecionado="produtoOperacao"
    @saved="carregar"
  />
</template>
