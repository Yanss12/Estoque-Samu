<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import { catLabel } from '../../lib/categorias'
import { almoxSelectView, mensagemErroAlmox } from '../../lib/almox'

const toast = useToast()
const linhasBrutas = ref([])
const carregando = ref(false)

// Filtros (seção 5 #6: grupo, situação)
const grupo = ref(null)
const situacao = ref(null)

const gruposOpcoes = [
  { label: 'Medicamentos', value: 'medicamento' },
  { label: 'Materiais', value: 'material' },
]

const situacaoOpcoes = [
  { label: 'Crítico', value: 'critico' },
  { label: 'Zerado', value: 'zerado' },
]

const temFiltro = computed(() => !!(grupo.value || situacao.value))

function limparFiltros() {
  grupo.value = null
  situacao.value = null
}

const linhas = computed(() =>
  linhasBrutas.value.filter((r) => {
    if (grupo.value && r.grupo_item !== grupo.value) return false
    if (situacao.value && r.situacao !== situacao.value) return false
    return true
  })
)

const header = [
  'Produto',
  'Grupo',
  'Categoria',
  'Unidade',
  'Localização',
  'Mínimo',
  'Disponível',
  'Vencido',
  'Saldo Total',
  'Falta',
  'Situação',
]

const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.unidade_medida,
    r.localizacao || '',
    Number(r.estoque_minimo ?? 0),
    Number(r.saldo_disponivel ?? 0),
    Number(r.saldo_vencido ?? 0),
    Number(r.saldo ?? 0),
    Number(r.falta ?? 0),
    r.situacao === 'zerado' ? 'Zerado' : 'Crítico',
  ])
)

async function carregar() {
  carregando.value = true
  const { data, error } = await almoxSelectView('almox_estoque_critico', {
    order: { column: 'produto', ascending: true },
  })
  carregando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar estoque crítico',
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
    <Select
      v-model="grupo"
      :options="gruposOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todos os grupos"
      aria-label="Filtrar por grupo"
    />
    <Select
      v-model="situacao"
      :options="situacaoOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todas as situações"
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
      arquivo="Almox_Critico"
      aba="Crítico"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 14, 10, 18, 9, 11, 9, 11, 9, 10]"
    />
  </div>

  <p class="page-sub">
    Produtos com saldo disponível (descontados lotes vencidos) igual ou abaixo do mínimo configurado (mínimo &gt; 0).
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
        Nenhum item abaixo do mínimo. Defina o estoque mínimo para ativar o alerta.
      </template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
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
        field="saldo_disponivel"
        header="Disponível"
        sortable
        style="width: 7.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }"><span class="saldo baixo">{{ data.saldo_disponivel }}</span></template>
      </Column>
      <Column
        field="estoque_minimo"
        header="Mínimo"
        sortable
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }"><span class="num muted">{{ data.estoque_minimo }}</span></template>
      </Column>
      <Column
        field="falta"
        header="Falta"
        sortable
        style="width: 6rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }"><span class="num">{{ data.falta }}</span></template>
      </Column>
      <Column field="situacao" header="Situação" style="width: 7rem">
        <template #body="{ data }">{{ data.situacao === 'zerado' ? 'Zerado' : 'Crítico' }}</template>
      </Column>
    </DataTable>
  </div>
</template>
