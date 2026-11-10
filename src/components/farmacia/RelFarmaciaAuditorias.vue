<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import { catLabel } from '../../lib/categorias'
import { fmtDataLocal, dataISOLocal, ehValidadeProvisoria } from '../../lib/format'
import {
  farmaciaSelectView,
  mensagemErroFarmacia,
  fmtDataHoraFarmacia,
  fmtCompetencia,
} from '../../lib/farmaciaRelatorios'

const toast = useToast()
const auditorias = ref([])
const itensAuditoria = ref([])
const produtos = ref([])
const carregando = ref(false)
const migracaoPendente = ref(false)

// Filtros (contrato B-REL #8: competência/auditoria, status, produto, período)
const auditoriaFiltro = ref(null)
const statusFiltro = ref(null)
const situacaoItemFiltro = ref(null)
const produtoId = ref(null)
const periodo = ref(null)

const statusOpcoes = [
  { label: 'Em andamento', value: 'em_andamento' },
  { label: 'Finalizada', value: 'finalizada' },
]

const situacaoItemOpcoes = [
  { label: 'Com divergência', value: 'divergente' },
  { label: 'Divergência ajustada', value: 'ajustado' },
  { label: 'Sem divergência (OK)', value: 'ok' },
  { label: 'Não contado', value: 'nao_contado' },
]

const opcoesAuditoria = computed(() =>
  auditorias.value.map((a) => ({
    label: `Competência ${fmtCompetencia(a.competencia)} (#${a.auditoria_id} · ${
      a.status === 'finalizada' ? 'Finalizada' : 'Em andamento'
    })`,
    value: a.auditoria_id,
  }))
)

const temFiltro = computed(
  () =>
    !!(
      auditoriaFiltro.value !== null ||
      statusFiltro.value ||
      situacaoItemFiltro.value ||
      produtoId.value ||
      periodo.value?.[0]
    )
)

function limparFiltros() {
  auditoriaFiltro.value = null
  statusFiltro.value = null
  situacaoItemFiltro.value = null
  produtoId.value = null
  periodo.value = null
}

function classificarSituacaoItem(ii) {
  if (ii.estoque_contado === null || ii.estoque_contado === undefined) return 'nao_contado'
  if (ii.movimentacao_ajuste_id) return 'ajustado'
  if (Number(ii.divergencia ?? 0) !== 0) return 'divergente'
  return 'ok'
}

function rotuloSituacaoItem(ii) {
  const cod = classificarSituacaoItem(ii)
  if (cod === 'nao_contado') return 'Não contado'
  if (cod === 'ajustado') return 'Divergência ajustada'
  if (cod === 'divergente') return 'Divergência pendente'
  return 'Sem divergência (OK)'
}

const linhasUnificadas = computed(() => {
  const ini = periodo.value?.[0] ? dataISOLocal(new Date(periodo.value[0])) : null
  const fim = periodo.value?.[1] ? dataISOLocal(new Date(periodo.value[1])) : ini

  return itensAuditoria.value
    .map((ii) => {
      const aud = auditorias.value.find((a) => Number(a.auditoria_id) === Number(ii.auditoria_id))
      const dataRef = ii.ajustado_em || ii.contado_em || aud?.finalizada_em || aud?.aberta_em || null
      const diaRef = dataRef ? dataISOLocal(new Date(dataRef)) : ii.competencia || null
      const codSituacao = classificarSituacaoItem(ii)
      return {
        ...ii,
        uid: `aud-${ii.item_id}`,
        competencia_fmt: fmtCompetencia(ii.competencia),
        data_ref: dataRef,
        dia_ref: diaRef,
        cod_situacao: codSituacao,
        situacao_rotulo: rotuloSituacaoItem(ii),
        responsavel:
          ii.ajustado_por_nome ||
          ii.contado_por_nome ||
          aud?.finalizada_por_nome ||
          aud?.aberta_por_nome ||
          '—',
      }
    })
    .filter((r) => {
      if (auditoriaFiltro.value && Number(r.auditoria_id) !== Number(auditoriaFiltro.value)) {
        return false
      }
      if (statusFiltro.value && r.auditoria_status !== statusFiltro.value) return false
      if (situacaoItemFiltro.value && r.cod_situacao !== situacaoItemFiltro.value) return false
      if (produtoId.value && Number(r.produto_id) !== Number(produtoId.value)) return false
      if (ini && r.dia_ref && r.dia_ref < ini) return false
      if (fim && r.dia_ref && r.dia_ref > fim) return false
      return true
    })
})

const resumoAuditorias = computed(() => {
  const lista = auditorias.value.filter((a) => {
    if (auditoriaFiltro.value && Number(a.auditoria_id) !== Number(auditoriaFiltro.value)) return false
    if (statusFiltro.value && a.status !== statusFiltro.value) return false
    return true
  })
  return {
    total: lista.length,
    divergentes: lista.reduce((s, a) => s + Number(a.divergentes ?? 0), 0),
    ajustados: lista.reduce((s, a) => s + Number(a.ajustados ?? 0), 0),
  }
})

const header = [
  'Competência',
  'Auditoria #',
  'Status',
  'Produto',
  'Categoria',
  'Unidade',
  'Lote',
  'Validade',
  'Estoque Sistema',
  'Estoque Contado',
  'Divergência',
  'Estoque Corrigido',
  'Situação',
  'Observação',
  'Responsável',
]

const linhasExport = computed(() =>
  linhasUnificadas.value.map((r) => [
    r.competencia_fmt,
    r.auditoria_id,
    r.auditoria_status === 'finalizada' ? 'Finalizada' : 'Em andamento',
    r.produto,
    catLabel(r.categoria),
    r.unidade_medida,
    r.numero_lote || 'sem lote',
    r.validade ? fmtDataLocal(r.validade) : '',
    r.estoque_sistema ?? '',
    r.estoque_contado ?? 'não contado',
    r.divergencia ?? 0,
    r.estoque_corrigido ?? '',
    r.situacao_rotulo,
    r.observacao || '',
    r.responsavel,
  ])
)

async function carregar() {
  carregando.value = true
  try {
    const [resAud, resItens, resProds] = await Promise.all([
      farmaciaSelectView('farmacia_rel_auditorias_resumo', {
        order: [
          { column: 'competencia', ascending: false },
          { column: 'auditoria_id', ascending: false },
        ],
      }),
      farmaciaSelectView('farmacia_rel_auditoria_itens_detalhe', {
        order: [
          { column: 'competencia', ascending: false },
          { column: 'produto', ascending: true },
        ],
      }),
      farmaciaSelectView('farmacia_rel_saldo_produto', {
        order: { column: 'nome', ascending: true },
      }),
    ])
    migracaoPendente.value = !!(
      resAud.migracaoPendente ||
      resItens.migracaoPendente ||
      resProds.migracaoPendente
    )
    if (resAud.error) throw resAud.error
    if (resItens.error) throw resItens.error
    auditorias.value = resAud.data ?? []
    itensAuditoria.value = resItens.data ?? []
    produtos.value = resProds.data ?? []
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar auditorias e ajustes',
      detail: mensagemErroFarmacia(err),
      life: 6000,
    })
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div class="toolbar">
    <Select
      v-model="auditoriaFiltro"
      :options="opcoesAuditoria"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todas as competências"
      aria-label="Filtrar por competência de auditoria"
      style="min-width: 17rem"
    />
    <Select
      v-model="statusFiltro"
      :options="statusOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Status da auditoria"
      aria-label="Filtrar por status da auditoria"
    />
    <Select
      v-model="situacaoItemFiltro"
      :options="situacaoItemOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Situação do item"
      aria-label="Filtrar por situação do item"
    />
    <Select
      v-model="produtoId"
      :options="produtos"
      option-label="nome"
      option-value="produto_id"
      filter
      show-clear
      placeholder="Todos os produtos"
      aria-label="Filtrar por produto"
      style="min-width: 14rem"
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
      arquivo="Farmacia_Auditorias"
      aba="Auditorias e Ajustes"
      :header="header"
      :linhas="linhasExport"
      :larguras="[14, 12, 14, 30, 14, 10, 14, 12, 14, 14, 12, 14, 22, 26, 20]"
    />
  </div>

  <p class="page-sub">
    Conferências mensais de auditoria da Farmácia ({{ resumoAuditorias.total }} auditoria(s) ·
    <strong>{{ resumoAuditorias.divergentes }}</strong> item(ns) divergente(s) ·
    <strong>{{ resumoAuditorias.ajustados }}</strong> ajuste(s) aplicado(s)).
  </p>

  <div class="card-panel tabela">
    <DataTable
      :value="linhasUnificadas"
      :loading="carregando"
      data-key="uid"
      paginator
      :rows="20"
      size="small"
      removable-sort
      class="tabela-moderna"
    >
      <template #empty>
        {{
          migracaoPendente
            ? 'Relatório aguardando publicação das views farmacia_rel_auditorias_* (migração 10) no banco.'
            : 'Nenhum item de auditoria encontrado com esses filtros.'
        }}
      </template>
      <Column field="competencia" header="Competência" sortable style="width: 10.5rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="prod-nome">{{ data.competencia_fmt }}</span>
          <div class="muted" style="font-size: 0.75rem">
            #{{ data.auditoria_id }} · {{ data.auditoria_status === 'finalizada' ? 'Finalizada' : 'Aberta' }}
          </div>
        </template>
      </Column>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted">
            · {{ catLabel(data.categoria) }}
            · lote <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
            <template v-if="data.validade">
              ·
              <span v-if="ehValidadeProvisoria(data.validade)" class="tag-provisoria">provisória</span>
              <span v-else>{{ fmtDataLocal(data.validade) }}</span>
            </template>
          </small>
        </template>
      </Column>
      <Column
        field="estoque_sistema"
        header="Sistema"
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }"><span class="num">{{ data.estoque_sistema ?? '—' }}</span></template>
      </Column>
      <Column
        field="estoque_contado"
        header="Contado"
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.estoque_contado ?? 'não contado' }}</span>
        </template>
      </Column>
      <Column
        field="divergencia"
        header="Div."
        style="width: 6rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span
            v-if="data.divergencia"
            class="saldo baixo"
            :class="data.divergencia > 0 ? 'sobra' : 'falta'"
          >
            {{ data.divergencia > 0 ? `+${data.divergencia}` : data.divergencia }}
          </span>
          <span v-else-if="data.estoque_contado !== null" class="muted">0</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column field="situacao_rotulo" header="Situação" style="width: 11.5rem">
        <template #body="{ data }">
          <div>{{ data.situacao_rotulo }}</div>
          <small v-if="data.observacao" class="muted">{{ data.observacao }}</small>
          <small v-else-if="data.data_ref" class="muted">{{ fmtDataHoraFarmacia(data.data_ref) }}</small>
        </template>
      </Column>
      <Column
        field="responsavel"
        header="Responsável"
        style="width: 10rem"
        header-class="col-opc"
        body-class="col-opc"
      />
    </DataTable>
  </div>
</template>
