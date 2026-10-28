<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'
import BotoesExportar from './BotoesExportar.vue'
import { supabase } from '../lib/supabase'
import { catLabel } from '../lib/categorias'
import { mensagemErro, dataISOLocal } from '../lib/format'

const toast = useToast()
const grupoOpcoes = [
  { label: 'Consolidado', value: null },
  { label: 'PSM', value: 'PSM' },
  { label: 'SAMU', value: 'SAMU' },
]

function ultimaSemana() {
  const fim = new Date()
  const ini = new Date()
  ini.setDate(fim.getDate() - 6)
  return [ini, fim]
}

const periodo = ref(ultimaSemana())
const grupo = ref(null)
const linhasBrutas = ref([])
const carregando = ref(false)

// Consolidado: soma PSM + SAMU por produto. Grupo específico: já vem filtrado do banco.
const linhas = computed(() => {
  if (grupo.value) return linhasBrutas.value
  const mapa = new Map()
  for (const r of linhasBrutas.value) {
    const atual = mapa.get(r.produto_id)
    if (atual) atual.quantidade += Number(r.quantidade)
    else mapa.set(r.produto_id, { ...r, grupo: 'PSM + SAMU', quantidade: Number(r.quantidade) })
  }
  return [...mapa.values()].sort((a, b) => a.produto.localeCompare(b.produto))
})
const total = computed(() => linhas.value.reduce((s, r) => s + Number(r.quantidade), 0))

const header = ['Produto', 'Categoria', 'Unidade', 'Grupo', 'Quantidade']
const linhasExport = computed(() =>
  linhas.value.map((r) => [r.produto, catLabel(r.categoria), r.unidade, r.grupo, Number(r.quantidade)])
)

function atalhoSemana() {
  periodo.value = ultimaSemana()
  carregar()
}

async function carregar() {
  const [ini, fim] = periodo.value ?? []
  if (!ini || !fim) return
  carregando.value = true
  const { data, error } = await supabase.rpc('consumo_periodo', {
    p_inicio: dataISOLocal(ini),
    p_fim: dataISOLocal(fim),
    p_grupo: grupo.value,
  })
  carregando.value = false
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao carregar consumo', detail: mensagemErro(error), life: 6000 })
  linhasBrutas.value = data ?? []
}

onMounted(carregar)
</script>

<template>
  <div class="toolbar">
    <DatePicker v-model="periodo" selection-mode="range" date-format="dd/mm/yy" show-icon :manual-input="false" placeholder="Período" aria-label="Período" @update:model-value="periodo?.[1] && carregar()" />
    <Button label="Última semana" icon="pi pi-calendar" severity="secondary" outlined @click="atalhoSemana" />
    <SelectButton v-model="grupo" :options="grupoOpcoes" option-label="label" option-value="value" :allow-empty="false" aria-label="Grupo" @update:model-value="carregar" />
    <span class="grow" />
    <BotoesExportar arquivo="Consumo_periodo" aba="Consumo" :header="header" :linhas="linhasExport" :larguras="[34, 14, 10, 12, 11]" />
  </div>
  <p class="page-sub">Só liberações para setores PSM/SAMU (estornos descontados). Total no período: <strong>{{ total }}</strong></p>
  <div class="card-panel tabela">
    <DataTable :value="linhas" :loading="carregando" paginator :rows="20" size="small" removable-sort class="tabela-moderna">
      <template #empty>Nenhum consumo no período.</template>
      <Column field="produto" header="Produto" sortable><template #body="{ data }"><span class="prod-nome">{{ data.produto }}</span></template></Column>
      <Column field="categoria" header="Categoria" header-class="col-opc" body-class="col-opc"><template #body="{ data }"><span class="cat-texto">{{ catLabel(data.categoria) }}</span></template></Column>
      <Column field="grupo" header="Grupo" sortable style="width: 8rem" />
      <Column field="quantidade" header="Qtd" sortable style="width: 6rem" header-class="col-num" body-class="col-num"><template #body="{ data }"><span class="num">{{ data.quantidade }}</span> <span class="muted">{{ data.unidade }}</span></template></Column>
    </DataTable>
  </div>
</template>
