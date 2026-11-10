<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import { catLabel } from '../../lib/categorias'
import { dataISOLocal } from '../../lib/format'
import {
  FARMACIA_MODALIDADES_DISTRIBUICAO,
  modalidadeDistribuicaoLabel,
  farmaciaRelRpc,
  mensagemErroFarmacia,
} from '../../lib/farmaciaRelatorios'

const toast = useToast()

const grupoSetorOpcoes = [
  { label: 'Todos', value: null },
  { label: 'PSM', value: 'PSM' },
  { label: 'SAMU', value: 'SAMU' },
]

function ultimos30Dias() {
  const fim = new Date()
  const ini = new Date()
  ini.setDate(fim.getDate() - 29)
  return [ini, fim]
}

const periodo = ref(ultimos30Dias())
const modalidadeFiltro = ref(null)
const grupoSetor = ref(null)
const linhasBrutas = ref([])
const carregando = ref(false)
const migracaoPendente = ref(false)

const linhas = computed(() =>
  linhasBrutas.value.filter((r) => {
    if (modalidadeFiltro.value === 'consumo' && !r.consumo) return false
    if (
      modalidadeFiltro.value &&
      modalidadeFiltro.value !== 'consumo' &&
      r.modalidade !== modalidadeFiltro.value
    ) {
      return false
    }
    if (grupoSetor.value && r.grupo !== grupoSetor.value) return false
    return true
  })
)

// Contrato B-REL #10: Consumo institucional = apenas motivo liberacao para setores PSM/SAMU (consumo=true).
// Funcionários, baixas (avariado/vencido) e outros NÃO compõem o consumo institucional.
const totalConsumoInstitucional = computed(() =>
  linhas.value.filter((r) => r.consumo).reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const totalFuncionarios = computed(() =>
  linhas.value
    .filter((r) => r.modalidade === 'funcionario')
    .reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const totalBaixas = computed(() =>
  linhas.value
    .filter((r) => r.modalidade === 'baixa')
    .reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const totalOutros = computed(() =>
  linhas.value
    .filter((r) => !r.consumo && !['funcionario', 'baixa'].includes(r.modalidade))
    .reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const header = [
  'Produto',
  'Categoria',
  'Unidade',
  'Modalidade',
  'Consumo Institucional',
  'Grupo Setor',
  'Destino',
  'Quantidade Líquida',
]

const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto,
    catLabel(r.categoria),
    r.unidade,
    modalidadeDistribuicaoLabel(r),
    r.consumo ? 'Sim (PSM/SAMU)' : 'Não',
    r.grupo || '',
    r.destino || '',
    Number(r.quantidade),
  ])
)

function atalho30Dias() {
  periodo.value = ultimos30Dias()
  carregar()
}

async function carregar() {
  const [ini, fim] = periodo.value ?? []
  if (!ini || !fim) return
  carregando.value = true
  const { data, error, migracaoPendente: pendente } = await farmaciaRelRpc(
    'farmacia_rel_distribuicao_periodo',
    {
      p_inicio: dataISOLocal(new Date(ini)),
      p_fim: dataISOLocal(new Date(fim)),
    }
  )
  carregando.value = false
  migracaoPendente.value = pendente
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar distribuição por período',
      detail: mensagemErroFarmacia(error),
      life: 6000,
    })
    return
  }
  linhasBrutas.value = data ?? []
}

onMounted(carregar)
</script>

<template>
  <div class="toolbar">
    <DatePicker
      v-model="periodo"
      selection-mode="range"
      date-format="dd/mm/yy"
      show-icon
      :manual-input="true"
      :show-on-focus="false"
      data-date-mode="range"
      placeholder="Período"
      aria-label="Período"
      @update:model-value="periodo?.[1] && carregar()"
    />
    <Button
      label="Últimos 30 dias"
      icon="pi pi-calendar"
      severity="secondary"
      outlined
      @click="atalho30Dias"
    />
    <Select
      v-model="modalidadeFiltro"
      :options="FARMACIA_MODALIDADES_DISTRIBUICAO"
      option-label="label"
      option-value="value"
      placeholder="Todas as modalidades"
      aria-label="Filtrar por modalidade"
      style="min-width: 15.5rem"
    />
    <SelectButton
      v-model="grupoSetor"
      :options="grupoSetorOpcoes"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Filtrar por grupo de setor"
    />
    <span class="grow" />
    <BotoesExportar
      arquivo="Farmacia_Distribuicao"
      aba="Distribuição"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 10, 24, 18, 10, 28, 14]"
    />
  </div>

  <p class="page-sub">
    Fluxo líquido por destino no período (estornos descontados na data do estorno) ·
    Consumo institucional líquido PSM/SAMU: <strong>{{ totalConsumoInstitucional }}</strong> un. ·
    Funcionários (fora do consumo): <strong>{{ totalFuncionarios }}</strong> un. ·
    Baixas avaria/vencido (fora do consumo): <strong>{{ totalBaixas }}</strong> un. ·
    Outros (fora do consumo): <strong>{{ totalOutros }}</strong> un.
  </p>

  <div class="card-panel tabela">
    <DataTable
      :value="linhas"
      :loading="carregando"
      paginator
      :rows="20"
      size="small"
      removable-sort
      class="tabela-moderna"
    >
      <template #empty>
        {{
          migracaoPendente
            ? 'Relatório aguardando publicação da RPC farmacia_rel_distribuicao_periodo (migração 10) no banco.'
            : 'Nenhuma distribuição registrada no período.'
        }}
      </template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
        </template>
      </Column>
      <Column field="modalidade" header="Modalidade" sortable style="width: 14rem">
        <template #body="{ data }">
          <span class="cat-badge">{{ modalidadeDistribuicaoLabel(data) }}</span>
        </template>
      </Column>
      <Column field="destino" header="Destino" sortable>
        <template #body="{ data }">
          <span>{{ data.destino || '—' }}</span>
          <small v-if="data.grupo" class="muted"> ({{ data.grupo }})</small>
        </template>
      </Column>
      <Column
        field="quantidade"
        header="Qtd Líquida"
        sortable
        style="width: 8rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num" :class="{ 'saldo baixo': Number(data.quantidade) < 0 }">
            {{ data.quantidade }}
          </span>
          <small class="muted"> {{ data.unidade }}</small>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
