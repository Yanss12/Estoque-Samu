<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Paginador from '../../components/Paginador.vue'
import ListaMovimentacoes from '../../components/ListaMovimentacoes.vue'
import EstornoDialog from '../../components/EstornoDialog.vue'
import AlmoxEntradaDialog from '../../components/almox/AlmoxEntradaDialog.vue'
import AlmoxSaidaDialog from '../../components/almox/AlmoxSaidaDialog.vue'
import AlmoxReajusteDialog from '../../components/almox/AlmoxReajusteDialog.vue'
import { almoxGerir } from '../../lib/auth'
import { catLabel } from '../../lib/categorias'
import { baixarPlanilhaSimples } from '../../lib/relatorioExcel'
import { dataISOLocal } from '../../lib/format'
import {
  ALMOX_MOTIVOS_ENTRADA,
  ALMOX_MOTIVOS_SAIDA,
  ALMOX_MOTIVOS_SISTEMA,
  ALMOX_GRUPOS_ITEM,
  almoxMotivoLabel,
  adaptarMov,
  almoxSelectView,
  almoxRpc,
  mensagemErroAlmox,
} from '../../lib/almox'

const toast = useToast()

const movsRaw = ref([])
const produtos = ref([])
const carregando = ref(false)
const exportando = ref(false)

// Diálogos
const estornoVisivel = ref(false)
const estornoMov = ref(null)
const entradaVisivel = ref(false)
const saidaVisivel = ref(false)
const reajusteVisivel = ref(false)

// Filtros
const tipoFiltro = ref(null)
const motivoFiltro = ref(null)
const grupoFiltro = ref(null)
const produtoFiltro = ref(null)
const periodo = ref(null) // [inicio, fim]

const tipoOpcoes = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Saída', value: 'saida' },
]

const motivoOpcoes = computed(() => {
  const todos = [
    ...ALMOX_MOTIVOS_ENTRADA,
    ...ALMOX_MOTIVOS_SAIDA,
    ...ALMOX_MOTIVOS_SISTEMA,
  ]
  const vistos = new Set()
  return todos.filter((m) => {
    if (vistos.has(m.value)) return false
    vistos.add(m.value)
    return true
  })
})

// Paginação (server-side)
const first = ref(0)
const rows = ref(25)
const total = ref(0)

const temFiltro = computed(
  () =>
    !!(
      tipoFiltro.value ||
      motivoFiltro.value ||
      grupoFiltro.value ||
      produtoFiltro.value ||
      periodo.value?.[0]
    )
)

const movsAdaptadas = computed(() => movsRaw.value.map((r) => adaptarMov(r)))

const estornadasSet = computed(
  () => new Set(movsRaw.value.filter((r) => r.estornada).map((r) => r.id))
)

function filtrosQuery() {
  const eq = {}
  const gte = {}
  const lte = {}
  if (tipoFiltro.value) eq.tipo = tipoFiltro.value
  if (motivoFiltro.value) eq.motivo = motivoFiltro.value
  if (grupoFiltro.value) eq.grupo_item = grupoFiltro.value
  if (produtoFiltro.value) eq.produto_id = produtoFiltro.value
  if (periodo.value?.[0]) gte.dia = dataISOLocal(new Date(periodo.value[0]))
  if (periodo.value?.[1]) lte.dia = dataISOLocal(new Date(periodo.value[1]))
  else if (periodo.value?.[0]) lte.dia = dataISOLocal(new Date(periodo.value[0]))
  return { eq, gte, lte }
}

async function carregar() {
  carregando.value = true
  try {
    const { eq, gte, lte } = filtrosQuery()
    const { data, count, error } = await almoxSelectView('almox_movimentacoes_detalhe', {
      eq,
      gte,
      lte,
      order: { column: 'data', ascending: false },
      range: { from: first.value, to: first.value + rows.value - 1 },
    })
    if (error) throw error
    movsRaw.value = data ?? []
    total.value = count ?? 0
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar movimentações',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    carregando.value = false
  }
}

async function carregarProdutos() {
  const { data } = await almoxSelectView('almox_saldo_produto', {
    order: { column: 'nome', ascending: true },
  })
  produtos.value = data ?? []
}

async function recarregarTudo() {
  await Promise.all([carregar(), carregarProdutos()])
}

function limparFiltros() {
  tipoFiltro.value = null
  motivoFiltro.value = null
  grupoFiltro.value = null
  produtoFiltro.value = null
  periodo.value = null
}

watch([tipoFiltro, motivoFiltro, grupoFiltro, produtoFiltro, periodo, rows], () => {
  first.value = 0
  carregar()
})
watch(first, carregar)

function abrirEstorno(m) {
  estornoMov.value = m
  estornoVisivel.value = true
}

async function executarEstornoAlmox(mov, justificativa) {
  return await almoxRpc('almox_estornar', {
    p_movimentacao_id: mov.id,
    p_justificativa: justificativa,
  })
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

async function exportarHistorico() {
  exportando.value = true
  try {
    const { eq, gte, lte } = filtrosQuery()
    const { data, error } = await almoxSelectView('almox_movimentacoes_detalhe', {
      eq,
      gte,
      lte,
      order: { column: 'data', ascending: false },
    })
    if (error) throw error
    const todas = data ?? []
    if (!todas.length) {
      toast.add({
        severity: 'warn',
        summary: 'Nada para exportar',
        detail: 'Nenhuma movimentação encontrada para os filtros escolhidos.',
        life: 5000,
      })
      return
    }
    const linhas = todas.map((m) => [
      fmt(m.data),
      m.produto || '',
      m.categoria ? catLabel(m.categoria) : '',
      (m.tipo === 'entrada' ? 'Entrada' : 'Saída') +
        (m.estorno_de ? ' (estorno)' : m.estornada ? ' (estornada)' : ''),
      m.quantidade_assinada ?? m.quantidade,
      m.numero_lote || '',
      almoxMotivoLabel(m.motivo),
      m.tipo === 'entrada' ? m.origem || '' : m.destino || '',
      m.documento || '',
      m.justificativa || m.observacao || '',
      m.saldo_produto_apos ?? '',
      m.usuario_nome || '',
    ])
    const stamp = dataISOLocal(new Date())
    await baixarPlanilhaSimples(
      `Almox_Historico_${stamp}.xlsx`,
      'Histórico Almoxarifado',
      [
        'Data/Hora',
        'Produto',
        'Categoria',
        'Tipo',
        'Qtd',
        'Lote',
        'Motivo',
        'Origem/Destino',
        'Documento',
        'Justificativa/Obs.',
        'Saldo Após',
        'Por',
      ],
      linhas,
      [16, 32, 14, 14, 8, 14, 18, 22, 14, 28, 10, 18]
    )
    toast.add({
      severity: 'success',
      summary: 'Excel gerado',
      detail: `${linhas.length} movimentações exportadas.`,
      life: 4000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao gerar Excel',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    exportando.value = false
  }
}

onMounted(recarregarTudo)
</script>

<template>
  <div class="page-head">
    <div>
      <span class="almox-chip">
        <i class="pi pi-building" aria-hidden="true" />
        Almoxarifado da Saúde · retaguarda
      </span>
      <h1>Movimentações</h1>
      <p class="page-sub">Trilha imutável de entradas, saídas, reajustes e estornos do Almoxarifado</p>
    </div>
    <div class="page-acoes">
      <Button
        label="Exportar Excel"
        icon="pi pi-download"
        severity="secondary"
        outlined
        :loading="exportando"
        @click="exportarHistorico"
      />
      <Button
        v-if="almoxGerir"
        label="Reajustar"
        icon="pi pi-sliders-h"
        severity="secondary"
        outlined
        @click="reajusteVisivel = true"
      />
      <Button
        v-if="almoxGerir"
        label="Entrada"
        icon="pi pi-arrow-down"
        severity="success"
        @click="entradaVisivel = true"
      />
      <Button
        v-if="almoxGerir"
        label="Saída"
        icon="pi pi-arrow-up"
        severity="danger"
        @click="saidaVisivel = true"
      />
    </div>
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
      style="min-width: 10.5rem"
    />
    <Select
      v-model="motivoFiltro"
      :options="motivoOpcoes"
      option-label="label"
      option-value="value"
      placeholder="Todos os motivos"
      aria-label="Filtrar por motivo"
      show-clear
      style="min-width: 12rem"
    />
    <Select
      v-model="grupoFiltro"
      :options="ALMOX_GRUPOS_ITEM"
      option-label="label"
      option-value="value"
      placeholder="Todos os grupos"
      aria-label="Filtrar por grupo"
      show-clear
      style="min-width: 10.5rem"
    />
    <Select
      v-model="produtoFiltro"
      :options="produtos"
      option-label="nome"
      option-value="produto_id"
      filter
      placeholder="Todos os produtos"
      aria-label="Filtrar por produto"
      show-clear
      style="min-width: 14rem"
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
      style="min-width: 14rem"
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
    <ul v-if="carregando && !movsAdaptadas.length" class="lista" aria-hidden="true">
      <li v-for="n in 8" :key="n">
        <span class="skel" style="width: 45%" />
        <span class="skel" style="width: 4rem" />
      </li>
    </ul>
    <ListaMovimentacoes
      v-else-if="movsAdaptadas.length"
      :movs="movsAdaptadas"
      tempo="absoluto"
      detalhado
      :estornavel="almoxGerir"
      :estornadas="estornadasSet"
      :style="{ opacity: carregando ? 0.55 : 1, transition: 'opacity 0.15s' }"
      @estornar="abrirEstorno"
    />
    <p v-else class="empty" style="margin: 0.25rem 0">
      <template v-if="temFiltro">
        Nenhum item encontrado com esses filtros.
        <a href="#" class="ver-todas" style="display: inline" @click.prevent="limparFiltros">
          Limpar filtros
        </a>
      </template>
      <template v-else>Nenhuma movimentação registrada ainda no Almoxarifado.</template>
    </p>

    <Paginador
      v-model:first="first"
      v-model:rows="rows"
      :total="total"
      :disabled="carregando"
    />
  </div>

  <EstornoDialog
    v-model:visible="estornoVisivel"
    :mov="estornoMov"
    :acao="executarEstornoAlmox"
    @saved="recarregarTudo"
  />
  <AlmoxEntradaDialog
    v-model:visible="entradaVisivel"
    :produtos="produtos"
    @saved="recarregarTudo"
  />
  <AlmoxSaidaDialog
    v-model:visible="saidaVisivel"
    :produtos="produtos"
    @saved="recarregarTudo"
  />
  <AlmoxReajusteDialog
    v-model:visible="reajusteVisivel"
    :produtos="produtos"
    @saved="recarregarTudo"
  />
</template>
