<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import { CATEGORIAS, catLabel } from '../../lib/categorias'
import {
  FARMACIA_GRUPOS_ITEM,
  farmaciaSelectView,
  mensagemErroFarmacia,
} from '../../lib/farmaciaRelatorios'

const toast = useToast()
const linhasBrutas = ref([])
const carregando = ref(false)
const migracaoPendente = ref(false)

// Filtros (contrato B-REL #6: grupo, categoria, situação)
const grupo = ref(null)
const categoria = ref(null)
const situacao = ref(null)

const situacaoOpcoes = [
  { label: 'Crítico', value: 'critico' },
  { label: 'Zerado', value: 'zerado' },
]

const temFiltro = computed(() => !!(grupo.value || categoria.value || situacao.value))

function limparFiltros() {
  grupo.value = null
  categoria.value = null
  situacao.value = null
}

const linhas = computed(() =>
  linhasBrutas.value.filter((r) => {
    if (grupo.value && r.grupo_item !== grupo.value) return false
    if (categoria.value && r.categoria !== categoria.value) return false
    if (situacao.value && r.situacao !== situacao.value) return false
    return true
  })
)

const header = [
  'Produto',
  'Grupo',
  'Categoria',
  'Unidade',
  'Controlado',
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
    r.controlado ? 'Sim' : 'Não',
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
  const { data, error, migracaoPendente: pendente } = await farmaciaSelectView(
    'farmacia_rel_estoque_critico',
    {
      order: { column: 'produto', ascending: true },
    }
  )
  carregando.value = false
  migracaoPendente.value = pendente
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar estoque crítico',
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
    <Select
      v-model="grupo"
      :options="FARMACIA_GRUPOS_ITEM"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todos os grupos"
      aria-label="Filtrar por grupo"
    />
    <Select
      v-model="categoria"
      :options="CATEGORIAS"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todas as categorias"
      aria-label="Filtrar por categoria"
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
      arquivo="Farmacia_Critico"
      aba="Crítico"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 14, 10, 10, 9, 11, 9, 11, 9, 10]"
    />
  </div>

  <p class="page-sub">
    Produtos ativos com saldo disponível (descontados lotes vencidos) igual ou abaixo do mínimo configurado (mínimo &gt; 0).
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
            ? 'Relatório aguardando publicação da view farmacia_rel_estoque_critico (migração 10) no banco.'
            : 'Nenhum item abaixo do mínimo. Defina o estoque mínimo para ativar o alerta.'
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
      <Column
        field="saldo_disponivel"
        header="Disponível"
        sortable
        style="width: 8rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="saldo baixo">{{ data.saldo_disponivel }}</span>
          <small class="muted"> {{ data.unidade_medida }}</small>
        </template>
      </Column>
      <Column
        field="saldo_vencido"
        header="Vencido"
        sortable
        style="width: 6.5rem"
        header-class="col-num col-opc"
        body-class="col-num col-opc"
      >
        <template #body="{ data }">
          <span :class="Number(data.saldo_vencido) > 0 ? 'saldo-vencido' : 'num muted'">
            {{ data.saldo_vencido }}
          </span>
        </template>
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
