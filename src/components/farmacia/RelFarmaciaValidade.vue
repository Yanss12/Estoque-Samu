<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import SelectButton from 'primevue/selectbutton'
import BotoesExportar from '../BotoesExportar.vue'
import { catLabel } from '../../lib/categorias'
import { fmtDataLocal, ehValidadeProvisoria } from '../../lib/format'
import { farmaciaRelRpc, mensagemErroFarmacia } from '../../lib/farmaciaRelatorios'

const toast = useToast()
const janelas = [
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
]
const dias = ref(60)
const linhas = ref([])
const carregando = ref(false)
const migracaoPendente = ref(false)

const header = [
  'Produto',
  'Grupo',
  'Categoria',
  'Controlado',
  'Lote',
  'Validade',
  'Dias Restantes',
  'Saldo',
  'Unidade',
  'Situação',
]

const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.controlado ? 'Sim' : 'Não',
    r.numero_lote || '',
    r.validade_provisoria || ehValidadeProvisoria(r.validade) ? 'provisória' : fmtDataLocal(r.validade),
    Number(r.dias_restantes),
    Number(r.saldo),
    r.unidade_medida,
    r.vencido ? 'Vencido' : 'A vencer',
  ])
)

async function carregar() {
  carregando.value = true
  const { data, error, migracaoPendente: pendente } = await farmaciaRelRpc(
    'farmacia_rel_alerta_validade',
    { p_dias: dias.value }
  )
  carregando.value = false
  migracaoPendente.value = pendente
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar alerta de validade',
      detail: mensagemErroFarmacia(error),
      life: 6000,
    })
    return
  }
  linhas.value = data ?? []
}

onMounted(carregar)
</script>

<template>
  <div class="toolbar">
    <SelectButton
      v-model="dias"
      :options="janelas"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Janela de validade"
      @update:model-value="carregar"
    />
    <span class="grow" />
    <BotoesExportar
      arquivo="Farmacia_Validade"
      aba="Validade"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 14, 10, 14, 12, 14, 9, 10, 11]"
    />
  </div>

  <p class="page-sub">
    Lotes com saldo positivo na Farmácia já vencidos ou que vencem nos próximos {{ dias }} dias.
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
            ? 'Relatório aguardando publicação da RPC farmacia_rel_alerta_validade (migração 10) no banco.'
            : 'Nenhum lote vence nessa janela.'
        }}
      </template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">
            {{ data.produto }}
            <span v-if="data.controlado" class="tag-controlado">Controlado</span>
          </span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
        </template>
      </Column>
      <Column field="numero_lote" header="Lote" style="width: 9rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }"><span class="mono">{{ data.numero_lote || 'sem nº' }}</span></template>
      </Column>
      <Column field="validade" header="Validade" sortable style="width: 12rem">
        <template #body="{ data }">
          <span
            v-if="data.validade_provisoria || ehValidadeProvisoria(data.validade)"
            class="tag-provisoria"
          >
            provisória
          </span>
          <template v-else>
            <span class="validade" :class="data.vencido ? 'vencido' : 'proximo'">
              {{ fmtDataLocal(data.validade) }}
            </span>
            <small class="muted">
              · {{ data.vencido ? 'vencido' : `em ${data.dias_restantes} d` }}
            </small>
          </template>
        </template>
      </Column>
      <Column
        field="saldo"
        header="Saldo"
        sortable
        style="width: 7.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.saldo }}</span>
          <small class="muted"> {{ data.unidade_medida }}</small>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
