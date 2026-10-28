<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import BotoesExportar from './BotoesExportar.vue'
import { supabase } from '../lib/supabase'
import { catLabel } from '../lib/categorias'
import { mensagemErro } from '../lib/format'

const toast = useToast()
const linhas = ref([])
const carregando = ref(false)

const header = ['Produto', 'Categoria', 'Unidade', 'Mínimo', 'Disponível', 'Vencido', 'Falta', 'Situação']
const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto, catLabel(r.categoria), r.unidade_medida, r.estoque_minimo,
    r.saldo_disponivel, r.saldo_vencido, r.falta, r.situacao === 'zerado' ? 'Zerado' : 'Crítico',
  ])
)

onMounted(async () => {
  carregando.value = true
  const { data, error } = await supabase.from('estoque_critico').select('*')
  carregando.value = false
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao carregar', detail: mensagemErro(error), life: 6000 })
  linhas.value = data ?? []
})
</script>

<template>
  <div class="toolbar">
    <p class="page-sub grow">Produtos com saldo disponível (sem lotes vencidos) igual ou abaixo do mínimo.</p>
    <BotoesExportar arquivo="Estoque_critico" aba="Crítico" :header="header" :linhas="linhasExport" :larguras="[34, 14, 10, 9, 11, 9, 9, 10]" />
  </div>
  <div class="card-panel tabela">
    <DataTable :value="linhas" :loading="carregando" paginator :rows="20" size="small" removable-sort class="tabela-moderna">
      <template #empty>Nenhum produto em nível crítico.</template>
      <Column field="produto" header="Produto" sortable><template #body="{ data }"><span class="prod-nome">{{ data.produto }}</span></template></Column>
      <Column field="saldo_disponivel" header="Disponível" sortable style="width: 7.5rem" header-class="col-num" body-class="col-num"><template #body="{ data }"><span class="saldo baixo">{{ data.saldo_disponivel }}</span></template></Column>
      <Column field="estoque_minimo" header="Mínimo" sortable style="width: 6.5rem" header-class="col-num" body-class="col-num"><template #body="{ data }"><span class="num muted">{{ data.estoque_minimo }}</span></template></Column>
      <Column field="falta" header="Falta" sortable style="width: 6rem" header-class="col-num" body-class="col-num"><template #body="{ data }"><span class="num">{{ data.falta }}</span></template></Column>
      <Column field="situacao" header="Situação" style="width: 7rem"><template #body="{ data }">{{ data.situacao === 'zerado' ? 'Zerado' : 'Crítico' }}</template></Column>
    </DataTable>
  </div>
</template>
