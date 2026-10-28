<script setup>
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import { baixarCsv, baixarPlanilhaSimples } from '../lib/relatorioExcel'
import { mensagemErro } from '../lib/format'

const props = defineProps({
  arquivo: { type: String, required: true }, // nome-base, sem extensão
  aba: { type: String, default: 'Relatório' },
  header: { type: Array, required: true },
  linhas: { type: Array, default: () => [] },
  larguras: { type: Array, default: null },
})

const toast = useToast()
const exportando = ref(false)

function stamp() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}

async function exportar(formato) {
  if (!props.linhas.length) return
  exportando.value = true
  try {
    const nome = `${props.arquivo}_${stamp()}`
    if (formato === 'csv') baixarCsv(`${nome}.csv`, props.header, props.linhas)
    else await baixarPlanilhaSimples(`${nome}.xlsx`, props.aba, props.header, props.linhas, props.larguras)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro ao exportar', detail: mensagemErro(e), life: 6000 })
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <div class="page-acoes">
    <Button label="CSV" icon="pi pi-file" severity="secondary" outlined :disabled="!linhas.length" :loading="exportando" @click="exportar('csv')" />
    <Button label="Excel" icon="pi pi-file-excel" severity="secondary" outlined :disabled="!linhas.length" :loading="exportando" @click="exportar('xlsx')" />
  </div>
</template>
