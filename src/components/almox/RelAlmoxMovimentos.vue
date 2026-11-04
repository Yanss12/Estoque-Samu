<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import Paginador from '../Paginador.vue'
import { catLabel } from '../../lib/categorias'
import { fmtDataLocal, dataISOLocal } from '../../lib/format'
import {
  ALMOX_MOTIVOS_ENTRADA,
  ALMOX_MOTIVOS_SAIDA,
  almoxMotivoLabel,
  almoxSelectView,
  mensagemErroAlmox,
  fmtDataHora,
} from '../../lib/almox'

const props = defineProps({
  // 'entradas' (#2) | 'saidas' (#3) | 'produto' (#5) | 'historico' (#9)
  modo: { type: String, required: true },
  tipo: { type: String, default: null },
  colunas: { type: Array, default: () => [] },
  arquivo: { type: String, default: 'Almox_Movimentacoes' },
})

const toast = useToast()

const produtos = ref([])
const linhasPagina = ref([])
const todasFiltradas = ref([])
const totalCount = ref(0)
const carregando = ref(false)

// Paginação no servidor para o modo 'historico' (#9)
const pagina = ref(1)
const porPagina = 25

// Filtros
const periodo = ref(null)
const produtoId = ref(null)
const grupo = ref(null)
const tipoFiltro = ref(props.tipo || null)
const motivoFiltro = ref(null)
const origemFiltro = ref('')
const destinoFiltro = ref('')

const gruposOpcoes = [
  { label: 'Medicamentos', value: 'medicamento' },
  { label: 'Materiais', value: 'material' },
]

const tiposOpcoes = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Saída', value: 'saida' },
]

const motivosOpcoes = computed(() => {
  const t = props.tipo || tipoFiltro.value
  if (t === 'entrada') {
    return [
      ...ALMOX_MOTIVOS_ENTRADA,
      { label: 'Reajuste (+)', value: 'reajuste' },
    ]
  }
  if (t === 'saida') {
    return [
      { label: 'Transferência p/ Farmácia', value: 'transferencia_farmacia' },
      ...ALMOX_MOTIVOS_SAIDA,
      { label: 'Reajuste (−)', value: 'reajuste' },
    ]
  }
  return [
    ...ALMOX_MOTIVOS_ENTRADA,
    { label: 'Transferência p/ Farmácia', value: 'transferencia_farmacia' },
    ...ALMOX_MOTIVOS_SAIDA.filter((m) => m.value !== 'outros'),
    { label: 'Reajuste de saldo', value: 'reajuste' },
  ]
})

const produtoSelecionado = computed(
  () => produtos.value.find((p) => Number(p.produto_id) === Number(produtoId.value)) ?? null
)

const arquivoNome = computed(() => {
  if (props.modo === 'produto') {
    const slug = (produtoSelecionado.value?.nome || 'Produto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 28)
    return `Almox_Mov_${slug}`
  }
  return props.arquivo
})

const abaExcel = computed(() => {
  if (props.modo === 'entradas') return 'Entradas'
  if (props.modo === 'saidas') return 'Saídas'
  if (props.modo === 'produto') return 'Mov. Produto'
  return 'Histórico'
})

const headerExcel = computed(() => {
  if (props.modo === 'entradas') {
    return [
      'Data/Hora',
      'Dia',
      'Produto',
      'Grupo',
      'Lote',
      'Validade',
      'Motivo',
      'Quantidade',
      'Unidade',
      'Origem',
      'Documento',
      'Data Doc.',
      'Observação',
      'Responsável',
    ]
  }
  if (props.modo === 'saidas') {
    return [
      'Data/Hora',
      'Dia',
      'Produto',
      'Grupo',
      'Lote',
      'Validade',
      'Motivo',
      'Quantidade',
      'Unidade',
      'Destino',
      'Documento',
      'Justificativa/Obs.',
      'Responsável',
    ]
  }
  if (props.modo === 'produto') {
    return [
      'Data/Hora',
      'Dia',
      'Produto',
      'Tipo',
      'Motivo',
      'Lote',
      'Validade',
      'Qtd Assinada',
      'Saldo Após',
      'Origem/Destino',
      'Documento',
      'Situação',
      'Responsável',
    ]
  }
  return [
    'ID',
    'Data/Hora',
    'Dia',
    'Produto',
    'Grupo',
    'Categoria',
    'Lote',
    'Validade',
    'Tipo',
    'Motivo',
    'Qtd Assinada',
    'Saldo Produto Após',
    'Origem',
    'Destino',
    'Documento',
    'Justificativa',
    'Observação',
    'Situação',
    'Responsável',
  ]
})

const largurasExcel = computed(() => {
  if (props.modo === 'entradas') return [16, 12, 32, 14, 14, 12, 18, 12, 10, 22, 14, 12, 26, 20]
  if (props.modo === 'saidas') return [16, 12, 32, 14, 14, 12, 22, 12, 10, 22, 14, 26, 20]
  if (props.modo === 'produto') return [16, 12, 30, 10, 20, 14, 12, 13, 12, 22, 14, 12, 20]
  return [8, 16, 12, 30, 14, 14, 14, 12, 10, 20, 13, 14, 20, 20, 14, 24, 24, 12, 20]
})

function situacaoMov(r) {
  if (r.estorno_de) return `Estorno de #${r.estorno_de}`
  if (r.estornada) return 'Estornada'
  return 'Efetiva'
}

const linhasExport = computed(() => {
  const fonte = todasFiltradas.value
  if (props.modo === 'entradas') {
    return fonte.map((r) => [
      fmtDataHora(r.data),
      r.dia,
      r.produto,
      r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
      r.numero_lote || 'sem lote',
      r.validade ? fmtDataLocal(r.validade) : '',
      almoxMotivoLabel(r.motivo),
      Number(r.quantidade),
      r.unidade_medida,
      r.origem || '',
      r.documento || '',
      r.data_documento ? fmtDataLocal(r.data_documento) : '',
      r.observacao || r.justificativa || '',
      r.usuario_nome || '',
    ])
  }
  if (props.modo === 'saidas') {
    return fonte.map((r) => [
      fmtDataHora(r.data),
      r.dia,
      r.produto,
      r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
      r.numero_lote || 'sem lote',
      r.validade ? fmtDataLocal(r.validade) : '',
      almoxMotivoLabel(r.motivo),
      Number(r.quantidade),
      r.unidade_medida,
      r.destino || '',
      r.documento || '',
      r.justificativa || r.observacao || '',
      r.usuario_nome || '',
    ])
  }
  if (props.modo === 'produto') {
    return fonte.map((r) => [
      fmtDataHora(r.data),
      r.dia,
      r.produto,
      r.tipo === 'entrada' ? 'Entrada' : 'Saída',
      almoxMotivoLabel(r.motivo),
      r.numero_lote || 'sem lote',
      r.validade ? fmtDataLocal(r.validade) : '',
      Number(r.quantidade_assinada),
      Number(r.saldo_produto_apos),
      r.origem || r.destino || '',
      r.documento || '',
      situacaoMov(r),
      r.usuario_nome || '',
    ])
  }
  return fonte.map((r) => [
    r.id,
    fmtDataHora(r.data),
    r.dia,
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.numero_lote || 'sem lote',
    r.validade ? fmtDataLocal(r.validade) : '',
    r.tipo === 'entrada' ? 'Entrada' : 'Saída',
    almoxMotivoLabel(r.motivo),
    Number(r.quantidade_assinada),
    Number(r.saldo_produto_apos),
    r.origem || '',
    r.destino || '',
    r.documento || '',
    r.justificativa || '',
    r.observacao || '',
    situacaoMov(r),
    r.usuario_nome || '',
  ])
})

const totalQuantidade = computed(() =>
  todasFiltradas.value.reduce((acc, r) => acc + Number(r.quantidade || 0), 0)
)

const temFiltro = computed(() => {
  if (props.modo === 'produto') {
    return !!(periodo.value?.[0] || tipoFiltro.value)
  }
  return !!(
    periodo.value?.[0] ||
    produtoId.value ||
    grupo.value ||
    (!props.tipo && tipoFiltro.value) ||
    motivoFiltro.value ||
    origemFiltro.value.trim() ||
    destinoFiltro.value.trim()
  )
})

function limparFiltros() {
  periodo.value = null
  if (props.modo !== 'produto') produtoId.value = null
  grupo.value = null
  if (!props.tipo) tipoFiltro.value = null
  motivoFiltro.value = null
  origemFiltro.value = ''
  destinoFiltro.value = ''
  pagina.value = 1
  carregar()
}

function construirFiltrosQuery() {
  const eq = {}
  const gte = {}
  const lte = {}

  if (props.modo === 'entradas') {
    eq.tipo = 'entrada'
    eq.efetiva = true
  } else if (props.modo === 'saidas') {
    eq.tipo = 'saida'
    eq.efetiva = true
  } else if (tipoFiltro.value) {
    eq.tipo = tipoFiltro.value
  }

  if (produtoId.value) eq.produto_id = Number(produtoId.value)
  if (grupo.value) eq.grupo_item = grupo.value
  if (motivoFiltro.value) eq.motivo = motivoFiltro.value

  if (periodo.value?.[0]) {
    const ini = dataISOLocal(new Date(periodo.value[0]))
    const fim = periodo.value?.[1] ? dataISOLocal(new Date(periodo.value[1])) : ini
    gte.dia = ini
    lte.dia = fim
  }

  return { eq, gte, lte }
}

function aplicarFiltroTextoLocal(rows) {
  const orig = origemFiltro.value.trim().toLowerCase()
  const dest = destinoFiltro.value.trim().toLowerCase()
  if (!orig && !dest) return rows
  return rows.filter((r) => {
    if (orig && !(r.origem || '').toLowerCase().includes(orig)) return false
    if (dest && !(r.destino || '').toLowerCase().includes(dest)) return false
    return true
  })
}

async function carregar() {
  if (props.modo === 'produto' && !produtoId.value) {
    linhasPagina.value = []
    todasFiltradas.value = []
    totalCount.value = 0
    return
  }

  carregando.value = true
  try {
    const { eq, gte, lte } = construirFiltrosQuery()

    if (props.modo === 'historico') {
      const from = (pagina.value - 1) * porPagina
      const to = from + porPagina - 1
      const [resPag, resAll] = await Promise.all([
        almoxSelectView('almox_movimentacoes_detalhe', {
          eq,
          gte,
          lte,
          order: { column: 'data', ascending: false },
          range: { from, to },
        }),
        almoxSelectView('almox_movimentacoes_detalhe', {
          eq,
          gte,
          lte,
          order: { column: 'data', ascending: false },
        }),
      ])
      if (resPag.error) throw resPag.error
      linhasPagina.value = resPag.data ?? []
      todasFiltradas.value = resAll.data ?? []
      totalCount.value = resPag.count ?? todasFiltradas.value.length
    } else {
      const { data, error } = await almoxSelectView('almox_movimentacoes_detalhe', {
        eq,
        gte,
        lte,
        order: { column: 'data', ascending: false },
      })
      if (error) throw error
      const filtradas = aplicarFiltroTextoLocal(data ?? [])
      todasFiltradas.value = filtradas
      linhasPagina.value = filtradas
      totalCount.value = filtradas.length
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar relatório',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    carregando.value = false
  }
}

watch([produtoId, grupo, tipoFiltro, motivoFiltro, origemFiltro, destinoFiltro], () => {
  pagina.value = 1
  carregar()
})

watch(periodo, (val) => {
  if (!val || (val[0] && val[1])) {
    pagina.value = 1
    carregar()
  }
})

function mudarPagina(novaPagina) {
  pagina.value = novaPagina
  carregar()
}

onMounted(async () => {
  const { data } = await almoxSelectView('almox_saldo_produto', {
    order: { column: 'nome', ascending: true },
  })
  produtos.value = data ?? []
  if (props.modo === 'produto' && produtos.value.length > 0 && !produtoId.value) {
    produtoId.value = produtos.value[0].produto_id
  } else {
    await carregar()
  }
})
</script>

<template>
  <div class="toolbar">
    <Select
      v-model="produtoId"
      :options="produtos"
      option-label="nome"
      option-value="produto_id"
      filter
      :show-clear="modo !== 'produto'"
      :placeholder="modo === 'produto' ? 'Selecione o produto (obrigatório)' : 'Todos os produtos'"
      aria-label="Filtrar por produto"
      style="min-width: 15rem"
    />

    <DatePicker
      v-model="periodo"
      selection-mode="range"
      date-format="dd/mm/yy"
      show-icon
      :manual-input="false"
      placeholder="Período (dia BRT)"
      aria-label="Filtrar por período"
    />

    <Select
      v-if="modo === 'historico'"
      v-model="grupo"
      :options="gruposOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Grupo"
      aria-label="Filtrar por grupo"
    />

    <Select
      v-if="modo === 'produto' || modo === 'historico'"
      v-model="tipoFiltro"
      :options="tiposOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Tipo"
      aria-label="Filtrar por tipo"
    />

    <Select
      v-if="modo !== 'produto'"
      v-model="motivoFiltro"
      :options="motivosOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Motivo"
      aria-label="Filtrar por motivo"
    />

    <InputText
      v-if="modo === 'entradas'"
      v-model="origemFiltro"
      placeholder="Filtrar origem..."
      aria-label="Filtrar por origem"
      style="width: 11rem"
    />

    <InputText
      v-if="modo === 'saidas'"
      v-model="destinoFiltro"
      placeholder="Filtrar destino..."
      aria-label="Filtrar por destino"
      style="width: 11rem"
    />

    <Button
      v-if="temFiltro"
      label="Limpar"
      icon="pi pi-filter-slash"
      text
      severity="secondary"
      size="small"
      @click="limparFiltros"
    />

    <span class="grow" />

    <BotoesExportar
      :arquivo="arquivoNome"
      :aba="abaExcel"
      :header="headerExcel"
      :linhas="linhasExport"
      :larguras="largurasExcel"
    />
  </div>

  <p v-if="modo === 'entradas' || modo === 'saidas'" class="page-sub">
    Somente movimentações efetivas (estornos e lançamentos estornados descontados). Total de unidades:
    <strong>{{ totalQuantidade }}</strong>
  </p>
  <p v-else-if="modo === 'produto' && produtoSelecionado" class="page-sub">
    Extrato de movimentações de <strong>{{ produtoSelecionado.nome }}</strong> com saldo acumulado após cada lançamento.
  </p>
  <p v-else-if="modo === 'historico'" class="page-sub">
    Trilha completa de movimentações do Almoxarifado (paginada no servidor · {{ totalCount }} registro(s)).
  </p>

  <div class="card-panel tabela">
    <DataTable
      :value="linhasPagina"
      :loading="carregando"
      :paginator="modo !== 'historico'"
      :rows="20"
      size="small"
      removable-sort
      class="tabela-moderna"
    >
      <template #empty>Nenhum lançamento encontrado com esses filtros.</template>

      <Column field="data" header="Data/Hora" style="width: 9rem">
        <template #body="{ data }">
          <span>{{ fmtDataHora(data.data) }}</span>
        </template>
      </Column>

      <Column v-if="modo !== 'produto'" field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
        </template>
      </Column>

      <Column field="numero_lote" header="Lote / Val." style="width: 10.5rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
          <small v-if="data.validade" class="muted"> · {{ fmtDataLocal(data.validade) }}</small>
        </template>
      </Column>

      <Column field="motivo" header="Tipo / Motivo" style="width: 11rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span :style="{ color: data.tipo === 'entrada' ? 'var(--ok-fg)' : 'var(--danger-fg)', fontWeight: 600 }">
            {{ data.tipo === 'entrada' ? 'Entrada' : 'Saída' }}
          </span>
          <small class="muted"> · {{ almoxMotivoLabel(data.motivo) }}</small>
        </template>
      </Column>

      <Column
        v-if="modo === 'entradas'"
        field="origem"
        header="Origem / Doc."
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span>{{ data.origem || '—' }}</span>
          <small v-if="data.documento" class="muted"> · Doc. {{ data.documento }}</small>
        </template>
      </Column>

      <Column
        v-else-if="modo === 'saidas'"
        field="destino"
        header="Destino / Doc."
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span>{{ data.destino || '—' }}</span>
          <small v-if="data.documento" class="muted"> · Doc. {{ data.documento }}</small>
        </template>
      </Column>

      <Column
        v-else
        header="Origem / Destino"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span>{{ data.origem || data.destino || '—' }}</span>
          <small v-if="data.documento" class="muted"> · Doc. {{ data.documento }}</small>
        </template>
      </Column>

      <Column
        field="quantidade"
        header="Qtd"
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span
            class="num"
            :style="{ color: data.tipo === 'entrada' ? 'var(--ok-fg)' : 'var(--danger-fg)', fontWeight: 600 }"
          >
            {{ data.quantidade_assinada > 0 ? `+${data.quantidade_assinada}` : data.quantidade_assinada }}
          </span>
        </template>
      </Column>

      <Column
        v-if="modo === 'produto' || modo === 'historico'"
        field="saldo_produto_apos"
        header="Saldo Após"
        style="width: 7rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.saldo_produto_apos }}</span>
        </template>
      </Column>

      <Column
        v-if="modo === 'produto' || modo === 'historico'"
        header="Situação"
        style="width: 7.5rem"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span :class="!data.efetiva ? 'muted' : ''">{{ situacaoMov(data) }}</span>
        </template>
      </Column>

      <Column
        field="usuario_nome"
        header="Responsável"
        style="width: 10rem"
        header-class="col-opc"
        body-class="col-opc"
      />
    </DataTable>

    <div v-if="modo === 'historico' && totalCount > porPagina" style="padding: 0.75rem 1rem">
      <Paginador
        :page="pagina"
        :per-page="porPagina"
        :total="totalCount"
        @update:page="mudarPagina"
      />
    </div>
  </div>
</template>
