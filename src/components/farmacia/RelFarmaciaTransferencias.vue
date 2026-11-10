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
} from '../../lib/farmaciaRelatorios'

const toast = useToast()
const linhasBrutas = ref([])
const produtos = ref([])
const carregando = ref(false)
const migracaoPendente = ref(false)

// Filtros (contrato B-REL #4: período, produto, situação efetivada/estornada)
const periodo = ref(null)
const produtoId = ref(null)
const situacao = ref(null)

const situacaoOpcoes = [
  { label: 'Efetivada', value: 'efetivada' },
  { label: 'Estornada', value: 'estornada' },
]

const temFiltro = computed(() => !!(periodo.value?.[0] || produtoId.value || situacao.value))

function limparFiltros() {
  periodo.value = null
  produtoId.value = null
  situacao.value = null
}

const linhas = computed(() => {
  const ini = periodo.value?.[0] ? dataISOLocal(new Date(periodo.value[0])) : null
  const fim = periodo.value?.[1] ? dataISOLocal(new Date(periodo.value[1])) : ini
  return linhasBrutas.value.filter((r) => {
    if (produtoId.value && Number(r.produto_id) !== Number(produtoId.value)) return false
    if (situacao.value === 'efetivada' && r.estornada) return false
    if (situacao.value === 'estornada' && !r.estornada) return false
    if (ini && r.dia < ini) return false
    if (fim && r.dia > fim) return false
    return true
  })
})

const totalEfetivo = computed(() =>
  linhas.value.filter((r) => !r.estornada).reduce((s, r) => s + Number(r.quantidade || 0), 0)
)

const header = [
  'Guia #',
  'Data/Hora',
  'Dia',
  'Produto',
  'Grupo',
  'Categoria',
  'Lote',
  'Validade',
  'Quantidade',
  'Unidade',
  'Documento',
  'Situação',
  'Responsável',
  'Observação',
]

const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.transferencia_id,
    fmtDataHoraFarmacia(r.data),
    r.dia,
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.numero_lote || 'sem lote',
    r.validade ? fmtDataLocal(r.validade) : '',
    Number(r.quantidade),
    r.unidade_medida,
    r.documento || '',
    r.estornada ? 'Estornada' : 'Efetivada',
    r.usuario_nome || '',
    r.observacao || '',
  ])
)

async function carregar() {
  carregando.value = true
  try {
    const [resTransf, resProds] = await Promise.all([
      farmaciaSelectView('farmacia_rel_transferencias_detalhe', {
        order: { column: 'data', ascending: false },
      }),
      farmaciaSelectView('farmacia_rel_saldo_produto', {
        order: { column: 'nome', ascending: true },
      }),
    ])
    migracaoPendente.value = !!(resTransf.migracaoPendente || resProds.migracaoPendente)
    if (resTransf.error) throw resTransf.error
    linhasBrutas.value = resTransf.data ?? []
    produtos.value = resProds.data ?? []
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar transferências recebidas',
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
      v-model="produtoId"
      :options="produtos"
      option-label="nome"
      option-value="produto_id"
      filter
      show-clear
      placeholder="Todos os produtos"
      aria-label="Filtrar por produto"
      style="min-width: 15rem"
    />
    <Select
      v-model="situacao"
      :options="situacaoOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Situação"
      aria-label="Filtrar por situação"
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
      arquivo="Farmacia_Transferencias_Recebidas"
      aba="Transferências"
      :header="header"
      :linhas="linhasExport"
      :larguras="[9, 16, 12, 32, 14, 14, 14, 12, 12, 10, 14, 12, 20, 26]"
    />
  </div>

  <p class="page-sub">
    Guias vinculadas recebidas do Almoxarifado Central na Farmácia (recebimento não é somado ao consumo). Total efetivo filtrado:
    <strong>{{ totalEfetivo }}</strong> un.
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
            ? 'Relatório aguardando publicação da view farmacia_rel_transferencias_detalhe (migração 10) no banco.'
            : 'Nenhuma guia de transferência recebida encontrada.'
        }}
      </template>
      <Column field="transferencia_id" header="Guia" sortable style="width: 5.5rem">
        <template #body="{ data }"><span class="mono">#{{ data.transferencia_id }}</span></template>
      </Column>
      <Column field="data" header="Data/Hora" sortable style="width: 9rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">{{ fmtDataHoraFarmacia(data.data) }}</template>
      </Column>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
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
      <Column
        field="quantidade"
        header="Qtd"
        sortable
        style="width: 7rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.quantidade }}</span>
          <small class="muted"> {{ data.unidade_medida }}</small>
        </template>
      </Column>
      <Column field="estornada" header="Situação" style="width: 7.5rem">
        <template #body="{ data }">
          <span :class="data.estornada ? 'saldo baixo' : 'muted'">
            {{ data.estornada ? 'Estornada' : 'Efetivada' }}
          </span>
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
  </div>
</template>
