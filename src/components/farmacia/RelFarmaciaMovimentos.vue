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
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA, motivoLabel } from '../../lib/movimentacoes'
import { fmtDataLocal, dataISOLocal, ehValidadeProvisoria } from '../../lib/format'
import {
  FARMACIA_GRUPOS_ITEM,
  farmaciaSelectView,
  mensagemErroFarmacia,
  fmtDataHoraFarmacia,
} from '../../lib/farmaciaRelatorios'

const props = defineProps({
  // 'entradas' (#2) | 'saidas' (#3) | 'produto' (#5) | 'historico' (#9)
  modo: { type: String, required: true },
  tipo: { type: String, default: null },
  arquivo: { type: String, default: 'Farmacia_Movimentacoes' },
})

const toast = useToast()

const produtos = ref([])
const linhasPagina = ref([])
const todasFiltradas = ref([])
const totalCount = ref(0)
const carregando = ref(false)
const migracaoPendente = ref(false)

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

const tiposOpcoes = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Saída', value: 'saida' },
]

const motivosOpcoes = computed(() => {
  const t = props.tipo || tipoFiltro.value
  if (t === 'entrada') {
    return [
      ...MOTIVOS_ENTRADA,
      { label: 'Ajuste de auditoria (+)', value: 'ajuste_auditoria' },
      { label: 'Saldo inicial', value: 'saldo_inicial' },
    ]
  }
  if (t === 'saida') {
    return [
      ...MOTIVOS_SAIDA,
      { label: 'Ajuste de auditoria (−)', value: 'ajuste_auditoria' },
    ]
  }
  return [
    ...MOTIVOS_ENTRADA,
    ...MOTIVOS_SAIDA.filter((m) => !MOTIVOS_ENTRADA.some((e) => e.value === m.value)),
    { label: 'Ajuste de auditoria', value: 'ajuste_auditoria' },
    { label: 'Saldo inicial', value: 'saldo_inicial' },
  ]
})

const produtoSelecionado = computed(
  () => produtos.value.find((p) => Number(p.produto_id) === Number(produtoId.value)) ?? null
)

// Contrato #5: saldo inicial do extrato = primeira linha retornada (saldo_produto_apos - quantidade_assinada)
const saldoInicialExtrato = computed(() => {
  if (!todasFiltradas.value.length) return Number(produtoSelecionado.value?.saldo ?? 0)
  const primeira = todasFiltradas.value[0]
  return Number(primeira.saldo_produto_apos ?? 0) - Number(primeira.quantidade_assinada ?? 0)
})

const saldoFinalExtrato = computed(() => {
  if (!todasFiltradas.value.length) return Number(produtoSelecionado.value?.saldo ?? 0)
  const ultima = todasFiltradas.value[todasFiltradas.value.length - 1]
  return Number(ultima.saldo_produto_apos ?? 0)
})

const arquivoNome = computed(() => {
  if (props.modo === 'produto') {
    const slug = (produtoSelecionado.value?.nome || 'Produto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 28)
    return `Farmacia_Mov_${slug}`
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
      'Categoria',
      'Lote',
      'Validade',
      'Motivo',
      'Quantidade',
      'Unidade',
      'Origem',
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
      'Categoria',
      'Lote',
      'Validade',
      'Motivo',
      'Quantidade',
      'Unidade',
      'Destino / Setor / Funcionário',
      'Grupo Setor',
      'Observação',
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
      'Observação',
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
    'Setor',
    'Funcionário',
    'Observação',
    'Situação',
    'Responsável',
  ]
})

const largurasExcel = computed(() => {
  if (props.modo === 'entradas') return [16, 12, 32, 14, 14, 14, 12, 18, 12, 10, 22, 26, 20]
  if (props.modo === 'saidas') return [16, 12, 32, 14, 14, 14, 12, 20, 12, 10, 24, 10, 26, 20]
  if (props.modo === 'produto') return [16, 12, 30, 10, 20, 14, 12, 13, 12, 22, 24, 14, 20]
  return [8, 16, 12, 30, 14, 14, 14, 12, 10, 20, 13, 14, 20, 20, 16, 20, 24, 14, 20]
})

function situacaoMov(r) {
  if (r.estorno_de) return `Estorno de #${r.estorno_de}`
  if (r.estornada) return 'Estornada'
  return 'Efetiva'
}

function fmtOrigemDestino(r) {
  if (r.tipo === 'entrada') return r.origem || motivoLabel(r.motivo)
  return r.destino || r.setor || r.funcionario || motivoLabel(r.motivo)
}

const linhasExport = computed(() => {
  const fonte = todasFiltradas.value
  if (props.modo === 'entradas') {
    return fonte.map((r) => [
      fmtDataHoraFarmacia(r.data),
      r.dia,
      r.produto,
      r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
      catLabel(r.categoria),
      r.numero_lote || 'sem lote',
      r.validade ? fmtDataLocal(r.validade) : '',
      motivoLabel(r.motivo),
      Number(r.quantidade),
      r.unidade_medida,
      r.origem || '',
      r.observacao || '',
      r.usuario_nome || '',
    ])
  }
  if (props.modo === 'saidas') {
    return fonte.map((r) => [
      fmtDataHoraFarmacia(r.data),
      r.dia,
      r.produto,
      r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
      catLabel(r.categoria),
      r.numero_lote || 'sem lote',
      r.validade ? fmtDataLocal(r.validade) : '',
      motivoLabel(r.motivo),
      Number(r.quantidade),
      r.unidade_medida,
      r.destino || r.setor || r.funcionario || '',
      r.grupo || '',
      r.observacao || '',
      r.usuario_nome || '',
    ])
  }
  if (props.modo === 'produto') {
    return fonte.map((r) => [
      fmtDataHoraFarmacia(r.data),
      r.dia,
      r.produto,
      r.tipo === 'entrada' ? 'Entrada' : 'Saída',
      motivoLabel(r.motivo),
      r.numero_lote || 'sem lote',
      r.validade ? fmtDataLocal(r.validade) : '',
      Number(r.quantidade_assinada),
      Number(r.saldo_produto_apos),
      fmtOrigemDestino(r),
      r.observacao || '',
      situacaoMov(r),
      r.usuario_nome || '',
    ])
  }
  return fonte.map((r) => [
    r.id,
    fmtDataHoraFarmacia(r.data),
    r.dia,
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.numero_lote || 'sem lote',
    r.validade ? fmtDataLocal(r.validade) : '',
    r.tipo === 'entrada' ? 'Entrada' : 'Saída',
    motivoLabel(r.motivo),
    Number(r.quantidade_assinada),
    Number(r.saldo_produto_apos),
    r.origem || '',
    r.destino || '',
    r.setor || '',
    r.funcionario || '',
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
    const alvoDest = `${r.destino || ''} ${r.setor || ''} ${r.funcionario || ''}`.toLowerCase()
    if (dest && !alvoDest.includes(dest)) return false
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
    // Contrato #5: Por produto usa ordem data, id crescente; demais modos usam data, id decrescente
    const order =
      props.modo === 'produto'
        ? [
            { column: 'data', ascending: true },
            { column: 'id', ascending: true },
          ]
        : [
            { column: 'data', ascending: false },
            { column: 'id', ascending: false },
          ]

    if (props.modo === 'historico') {
      const from = (pagina.value - 1) * porPagina
      const to = from + porPagina - 1
      const [resPag, resAll] = await Promise.all([
        farmaciaSelectView('farmacia_rel_movimentacoes_detalhe', {
          eq,
          gte,
          lte,
          order,
          range: { from, to },
        }),
        farmaciaSelectView('farmacia_rel_movimentacoes_detalhe', {
          eq,
          gte,
          lte,
          order,
        }),
      ])
      migracaoPendente.value = !!(resPag.migracaoPendente || resAll.migracaoPendente)
      if (resPag.error) throw resPag.error
      linhasPagina.value = resPag.data ?? []
      todasFiltradas.value = resAll.data ?? []
      totalCount.value = resPag.count ?? todasFiltradas.value.length
    } else {
      const { data, error, migracaoPendente: pendente } = await farmaciaSelectView(
        'farmacia_rel_movimentacoes_detalhe',
        {
          eq,
          gte,
          lte,
          order,
        }
      )
      migracaoPendente.value = pendente
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
      detail: mensagemErroFarmacia(err),
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
  const { data, migracaoPendente: pendente } = await farmaciaSelectView(
    'farmacia_rel_saldo_produto',
    {
      order: { column: 'nome', ascending: true },
    }
  )
  migracaoPendente.value = pendente
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
      :manual-input="true"
      :show-on-focus="false"
      data-date-mode="range"
      placeholder="Período (dia BRT)"
      aria-label="Filtrar por período"
    />

    <Select
      v-if="modo === 'historico'"
      v-model="grupo"
      :options="FARMACIA_GRUPOS_ITEM"
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
    Somente movimentações efetivas da Farmácia (estornos e lançamentos estornados descontados). Total de unidades:
    <strong>{{ totalQuantidade }}</strong>
  </p>
  <p v-else-if="modo === 'produto' && produtoSelecionado" class="page-sub">
    Extrato de movimentações de <strong>{{ produtoSelecionado.nome }}</strong> (ordem cronológica crescente) ·
    Saldo inicial: <strong>{{ saldoInicialExtrato }}</strong> · Saldo após último lançamento:
    <strong>{{ saldoFinalExtrato }}</strong>
  </p>
  <p v-else-if="modo === 'historico'" class="page-sub">
    Trilha completa de movimentações da Farmácia incluindo originais estornadas e estornos (paginada no servidor · {{ totalCount }} registro(s)).
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
      <template #empty>
        {{
          migracaoPendente
            ? 'Relatório aguardando publicação da view farmacia_rel_movimentacoes_detalhe (migração 10) no banco.'
            : modo === 'produto' && !produtoId
              ? 'Selecione um produto acima para visualizar o extrato.'
              : 'Nenhum lançamento encontrado com esses filtros.'
        }}
      </template>

      <Column field="data" header="Data/Hora" style="width: 9rem">
        <template #body="{ data }">
          <span>{{ fmtDataHoraFarmacia(data.data) }}</span>
        </template>
      </Column>

      <Column v-if="modo !== 'produto'" field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">
            {{ data.produto }}
            <span v-if="data.controlado" class="tag-controlado">Controlado</span>
          </span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
        </template>
      </Column>

      <Column field="numero_lote" header="Lote / Val." style="width: 11rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
          <template v-if="data.validade">
            ·
            <span v-if="ehValidadeProvisoria(data.validade)" class="tag-provisoria">provisória</span>
            <small v-else class="muted">{{ fmtDataLocal(data.validade) }}</small>
          </template>
        </template>
      </Column>

      <Column field="motivo" header="Tipo / Motivo" style="width: 11.5rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span :style="{ color: data.tipo === 'entrada' ? 'var(--ok-fg)' : 'var(--danger-fg)', fontWeight: 600 }">
            {{ data.tipo === 'entrada' ? 'Entrada' : 'Saída' }}
          </span>
          <small class="muted"> · {{ motivoLabel(data.motivo) }}</small>
        </template>
      </Column>

      <Column
        v-if="modo === 'entradas'"
        field="origem"
        header="Origem"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span>{{ data.origem || '—' }}</span>
          <small v-if="data.observacao" class="muted"> · {{ data.observacao }}</small>
        </template>
      </Column>

      <Column
        v-else-if="modo === 'saidas'"
        field="destino"
        header="Destino"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span>{{ data.destino || data.setor || data.funcionario || '—' }}</span>
          <small v-if="data.grupo" class="muted"> ({{ data.grupo }})</small>
        </template>
      </Column>

      <Column
        v-else
        header="Origem / Destino"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span>{{ fmtOrigemDestino(data) }}</span>
          <small v-if="data.observacao" class="muted"> · {{ data.observacao }}</small>
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
        style="width: 8rem"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }">
          <span :class="!data.efetiva ? 'tag-estorno' : 'muted'">{{ situacaoMov(data) }}</span>
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
        :first="(pagina - 1) * porPagina"
        :rows="porPagina"
        :total="totalCount"
        :rows-options="[25]"
        :disabled="carregando"
        @update:first="(novoFirst) => mudarPagina(Math.floor(novoFirst / porPagina) + 1)"
      />
    </div>
  </div>
</template>
