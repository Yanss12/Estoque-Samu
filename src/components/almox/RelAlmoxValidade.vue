<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import SelectButton from 'primevue/selectbutton'
import BotoesExportar from '../BotoesExportar.vue'
import { fmtDataLocal } from '../../lib/format'
import { almoxRpc, mensagemErroAlmox } from '../../lib/almox'

const toast = useToast()
const janelas = [
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
]
const dias = ref(60)
const linhas = ref([])
const carregando = ref(false)

const header = ['Produto', 'Lote', 'Validade', 'Dias Restantes', 'Saldo', 'Localização', 'Situação']
const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto,
    r.numero_lote || '',
    fmtDataLocal(r.validade),
    Number(r.dias_restantes),
    Number(r.saldo),
    r.localizacao || '',
    r.vencido ? 'Vencido' : 'A vencer',
  ])
)

async function carregar() {
  carregando.value = true
  const { data, error } = await almoxRpc('almox_alerta_validade', { p_dias: dias.value })
  carregando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar alerta de validade',
      detail: mensagemErroAlmox(error),
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
      arquivo="Almox_Validade"
      aba="Validade"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 12, 14, 9, 18, 11]"
    />
  </div>

  <p class="page-sub">
    Lotes com saldo maior que zero no Almoxarifado já vencidos ou que vencem nos próximos {{ dias }} dias.
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
      <template #empty>Nenhum lote vence nessa janela.</template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }"><span class="prod-nome">{{ data.produto }}</span></template>
      </Column>
      <Column field="numero_lote" header="Lote" style="width: 9.5rem">
        <template #body="{ data }"><span class="mono">{{ data.numero_lote || 'sem nº' }}</span></template>
      </Column>
      <Column field="validade" header="Validade" sortable style="width: 11.5rem">
        <template #body="{ data }">
          <span class="validade" :class="data.vencido ? 'vencido' : 'proximo'">
            {{ fmtDataLocal(data.validade) }}
          </span>
          <small class="muted">
            · {{ data.vencido ? 'vencido' : `em ${data.dias_restantes} d` }}
          </small>
        </template>
      </Column>
      <Column
        field="localizacao"
        header="Localização"
        style="width: 10rem"
        header-class="col-opc"
        body-class="col-opc"
      >
        <template #body="{ data }"><span class="muted">{{ data.localizacao || '—' }}</span></template>
      </Column>
      <Column
        field="saldo"
        header="Saldo"
        sortable
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }"><span class="num">{{ data.saldo }}</span></template>
      </Column>
    </DataTable>
  </div>
</template>
