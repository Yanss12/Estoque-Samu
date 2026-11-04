<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import BotoesExportar from '../BotoesExportar.vue'
import { CATEGORIAS, catLabel } from '../../lib/categorias'
import { fmtDataLocal } from '../../lib/format'
import { almoxSelectView, mensagemErroAlmox } from '../../lib/almox'

const toast = useToast()
const linhasBrutas = ref([])
const carregando = ref(false)

// Filtros (seção 5 #1: grupo, categoria, busca, localização, só com saldo, situação)
const busca = ref('')
const grupo = ref(null)
const categoria = ref(null)
const localizacao = ref('')
const situacao = ref(null)
const soComSaldo = ref(false)

const gruposOpcoes = [
  { label: 'Medicamentos', value: 'medicamento' },
  { label: 'Materiais', value: 'material' },
]

const situacaoOpcoes = [
  { label: 'Normal (OK)', value: 'ok' },
  { label: 'Crítico', value: 'critico' },
  { label: 'Zerado', value: 'zerado' },
]

const temFiltro = computed(
  () =>
    !!(
      busca.value.trim() ||
      grupo.value ||
      categoria.value ||
      localizacao.value.trim() ||
      situacao.value ||
      soComSaldo.value
    )
)

function limparFiltros() {
  busca.value = ''
  grupo.value = null
  categoria.value = null
  localizacao.value = ''
  situacao.value = null
  soComSaldo.value = false
}

const linhas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const loc = localizacao.value.trim().toLowerCase()
  return linhasBrutas.value.filter((r) => {
    if (grupo.value && r.grupo_item !== grupo.value) return false
    if (categoria.value && r.categoria !== categoria.value) return false
    if (situacao.value && r.situacao !== situacao.value) return false
    if (soComSaldo.value && Number(r.saldo_lote ?? 0) <= 0) return false
    if (loc && !(r.localizacao || '').toLowerCase().includes(loc)) return false
    if (
      termo &&
      !(r.produto || '').toLowerCase().includes(termo) &&
      !(r.codigo_interno || '').toLowerCase().includes(termo) &&
      !(r.numero_lote || '').toLowerCase().includes(termo)
    ) {
      return false
    }
    return true
  })
})

function situacaoRotulo(s) {
  if (s === 'zerado') return 'Zerado'
  if (s === 'critico') return 'Crítico'
  return 'OK'
}

const header = [
  'Código',
  'Produto',
  'Grupo',
  'Categoria',
  'Unidade',
  'Localização',
  'Lote',
  'Validade',
  'Saldo Lote',
  'Saldo Produto',
  'Mínimo',
  'Situação',
]

const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.codigo_interno || '',
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.unidade_medida,
    r.localizacao || '',
    r.numero_lote || 'sem lote',
    r.validade ? fmtDataLocal(r.validade) : '',
    Number(r.saldo_lote ?? 0),
    Number(r.saldo_produto ?? 0),
    Number(r.estoque_minimo ?? 0),
    situacaoRotulo(r.situacao),
  ])
)

async function carregar() {
  carregando.value = true
  const { data, error } = await almoxSelectView('almox_estoque_atual', {
    order: { column: 'produto', ascending: true },
  })
  carregando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar estoque atual',
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
    <InputText
      v-model="busca"
      class="grow"
      placeholder="Buscar produto, código ou lote..."
      aria-label="Buscar produto, código ou lote"
    />
    <Select
      v-model="grupo"
      :options="gruposOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Grupo"
      aria-label="Filtrar por grupo"
    />
    <Select
      v-model="categoria"
      :options="CATEGORIAS"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Categoria"
      aria-label="Filtrar por categoria"
    />
    <InputText
      v-model="localizacao"
      placeholder="Localização..."
      aria-label="Filtrar por localização"
      style="width: 10rem"
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
    <div style="display: flex; align-items: center; gap: 0.4rem">
      <Checkbox v-model="soComSaldo" input-id="rel-almox-est-saldo" :binary="true" />
      <label for="rel-almox-est-saldo" style="font-size: 0.82rem; cursor: pointer">Só com saldo</label>
    </div>
    <Button
      v-if="temFiltro"
      label="Limpar"
      icon="pi pi-filter-slash"
      text
      severity="secondary"
      size="small"
      @click="limparFiltros"
    />
    <BotoesExportar
      arquivo="Almox_Estoque_Atual"
      aba="Estoque Atual"
      :header="header"
      :linhas="linhasExport"
      :larguras="[12, 34, 14, 14, 10, 18, 14, 12, 11, 13, 9, 10]"
    />
  </div>

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
      <template #empty>Nenhum item encontrado com esses filtros.</template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted">
            · {{ catLabel(data.categoria) }}
            <template v-if="data.codigo_interno"> · <span class="mono">{{ data.codigo_interno }}</span></template>
          </small>
        </template>
      </Column>
      <Column field="localizacao" header="Localização" sortable style="width: 11rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="muted">{{ data.localizacao || '—' }}</span>
        </template>
      </Column>
      <Column field="numero_lote" header="Lote" style="width: 8.5rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
        </template>
      </Column>
      <Column field="validade" header="Validade" sortable style="width: 8rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span>{{ data.validade ? fmtDataLocal(data.validade) : '—' }}</span>
        </template>
      </Column>
      <Column
        field="saldo_lote"
        header="Saldo Lote"
        sortable
        style="width: 7.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.saldo_lote }}</span>
          <small class="muted"> {{ data.unidade_medida }}</small>
        </template>
      </Column>
      <Column
        field="saldo_produto"
        header="Total Prod."
        sortable
        style="width: 7.5rem"
        header-class="col-num col-opc"
        body-class="col-num col-opc"
      >
        <template #body="{ data }">
          <span class="num">{{ data.saldo_produto }}</span>
        </template>
      </Column>
      <Column field="situacao" header="Situação" style="width: 6.5rem">
        <template #body="{ data }">
          <span :class="data.situacao !== 'ok' ? 'saldo baixo' : 'muted'">
            {{ situacaoRotulo(data.situacao) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
