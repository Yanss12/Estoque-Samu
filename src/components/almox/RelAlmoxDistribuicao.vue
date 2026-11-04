<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import { catLabel } from '../../lib/categorias'
import { dataISOLocal } from '../../lib/format'
import { almoxRpc, almoxMotivoLabel, mensagemErroAlmox } from '../../lib/almox'

const toast = useToast()

const grupoOpcoes = [
  { label: 'Todos', value: null },
  { label: 'Medicamentos', value: 'medicamento' },
  { label: 'Materiais', value: 'material' },
]

function ultimos30Dias() {
  const fim = new Date()
  const ini = new Date()
  ini.setDate(fim.getDate() - 29)
  return [ini, fim]
}

const periodo = ref(ultimos30Dias())
const grupo = ref(null)
const linhasBrutas = ref([])
const carregando = ref(false)

function grupoPorCat(cat) {
  return ['psicotropico', 'medicamento'].includes(cat) ? 'medicamento' : 'material'
}

const linhas = computed(() =>
  linhasBrutas.value
    .map((r) => ({
      ...r,
      grupo_item: r.grupo_item || grupoPorCat(r.categoria),
    }))
    .filter((r) => {
      if (grupo.value && r.grupo_item !== grupo.value) return false
      return true
    })
)

const totalOutrasUnidades = computed(() =>
  linhas.value
    .filter((r) => r.motivo === 'outra_unidade')
    .reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const totalDistribuicaoInterna = computed(() =>
  linhas.value
    .filter((r) => r.motivo === 'transferencia_farmacia')
    .reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const totalPerdasVencidosOutros = computed(() =>
  linhas.value
    .filter((r) => !['outra_unidade', 'transferencia_farmacia'].includes(r.motivo))
    .reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const header = ['Produto', 'Grupo', 'Categoria', 'Unidade', 'Tipo de Saída', 'Destino', 'Quantidade']
const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.unidade,
    r.motivo === 'transferencia_farmacia'
      ? 'Distribuição interna (Transferência p/ Farmácia)'
      : almoxMotivoLabel(r.motivo),
    r.destino || almoxMotivoLabel(r.motivo),
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
  const { data, error } = await almoxRpc('almox_distribuicao_periodo', {
    p_inicio: dataISOLocal(new Date(ini)),
    p_fim: dataISOLocal(new Date(fim)),
  })
  carregando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar distribuição por período',
      detail: mensagemErroAlmox(error),
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
      :manual-input="false"
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
    <SelectButton
      v-model="grupo"
      :options="grupoOpcoes"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Filtrar por grupo"
    />
    <span class="grow" />
    <BotoesExportar
      arquivo="Almox_Distribuicao"
      aba="Distribuição"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 14, 10, 32, 28, 12]"
    />
  </div>

  <p class="page-sub">
    Saídas efetivas por destino (estornos descontados) · Outras unidades:
    <strong>{{ totalOutrasUnidades }}</strong> un. · Distribuição interna p/ Farmácia COMUE (não é somada ao consumo):
    <strong>{{ totalDistribuicaoInterna }}</strong> un. · Perdas, vencidos e outros (não somados ao consumo):
    <strong>{{ totalPerdasVencidosOutros }}</strong> un.
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
      <template #empty>Nenhuma distribuição registrada no período.</template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
        </template>
      </Column>
      <Column field="motivo" header="Modalidade" sortable style="width: 14rem">
        <template #body="{ data }">
          <span class="cat-badge">
            {{
              data.motivo === 'transferencia_farmacia'
                ? 'Distribuição interna'
                : almoxMotivoLabel(data.motivo)
            }}
          </span>
        </template>
      </Column>
      <Column field="destino" header="Destino" sortable>
        <template #body="{ data }">
          <span v-if="data.destino">{{ data.destino }}</span>
          <span v-else class="muted">{{ almoxMotivoLabel(data.motivo) }}</span>
        </template>
      </Column>
      <Column
        field="quantidade"
        header="Qtd"
        sortable
        style="width: 7.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.quantidade }}</span>
          <small class="muted"> {{ data.unidade }}</small>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
