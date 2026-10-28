<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import BotoesExportar from './BotoesExportar.vue'
import { supabase } from '../lib/supabase'
import { mensagemErro, dataISOLocal } from '../lib/format'

const toast = useToast()
const hoje = new Date()
const periodo = ref([new Date(hoje.getFullYear(), hoje.getMonth(), 1), hoje])
const linhas = ref([])
const carregando = ref(false)

const header = ['Data', 'Funcionário', 'Produto', 'Unidade', 'Qtd', 'Observação', 'Entregue por', 'Estornada']
const linhasExport = computed(() =>
  linhas.value.map((r) => [
    new Date(r.data).toLocaleString('pt-BR'), r.funcionario, r.produto, r.unidade_medida,
    r.quantidade, r.observacao || '', r.entregue_por || '', r.estornada ? 'Sim' : 'Não',
  ])
)

async function carregar() {
  const [ini, fim] = periodo.value ?? []
  if (!ini || !fim) return
  carregando.value = true
  const { data, error } = await supabase
    .from('consumo_por_funcionario')
    .select('*')
    .gte('dia', dataISOLocal(ini))
    .lte('dia', dataISOLocal(fim))
    .order('data', { ascending: false })
  carregando.value = false
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao carregar', detail: mensagemErro(error), life: 6000 })
  linhas.value = data ?? []
}

onMounted(carregar)
</script>

<template>
  <div class="toolbar">
    <DatePicker v-model="periodo" selection-mode="range" date-format="dd/mm/yy" show-icon :manual-input="false" aria-label="Período" @update:model-value="periodo?.[1] && carregar()" />
    <span class="grow" />
    <BotoesExportar arquivo="Consumo_funcionarios" aba="Funcionários" :header="header" :linhas="linhasExport" :larguras="[18, 26, 34, 10, 7, 30, 18, 10]" />
  </div>
  <div class="card-panel tabela">
    <DataTable :value="linhas" :loading="carregando" paginator :rows="20" size="small" removable-sort class="tabela-moderna">
      <template #empty>Nenhuma entrega a funcionários no período.</template>
      <Column field="data" header="Data" sortable style="width: 10rem"><template #body="{ data }">{{ new Date(data.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }}</template></Column>
      <Column field="funcionario" header="Funcionário" sortable />
      <Column field="produto" header="Produto" sortable><template #body="{ data }"><span class="prod-nome">{{ data.produto }}</span></template></Column>
      <Column field="quantidade" header="Qtd" sortable style="width: 5rem" header-class="col-num" body-class="col-num"><template #body="{ data }"><span class="num">{{ data.quantidade }}</span></template></Column>
      <Column header="Situação" style="width: 8rem" header-class="col-opc" body-class="col-opc"><template #body="{ data }"><span v-if="data.estornada" class="tag-estorno">Estornada</span></template></Column>
    </DataTable>
  </div>
</template>
