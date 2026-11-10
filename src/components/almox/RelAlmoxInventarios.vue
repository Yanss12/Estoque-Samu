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
import { fmtDataLocal, dataISOLocal } from '../../lib/format'
import { almoxSelectView, mensagemErroAlmox, fmtDataHora } from '../../lib/almox'

const toast = useToast()
const inventarios = ref([])
const itensInventario = ref([])
const reajustesAvulsos = ref([])
const produtos = ref([])
const carregando = ref(false)

// Filtros (seção 5 #8: período, inventário, produto)
const periodo = ref(null)
const inventarioFiltro = ref(null) // null = todos | 'avulso' = só avulsos | number = inventario_id
const produtoId = ref(null)

const opcoesInventario = computed(() => [
  { label: 'Apenas reajustes avulsos (fora de inventário)', value: 'avulso' },
  ...inventarios.value.map((i) => ({
    label: `${i.descricao || `Inventário #${i.inventario_id}`} (${i.status === 'aberto' ? 'Aberto' : 'Finalizado'})`,
    value: i.inventario_id,
  })),
])

const temFiltro = computed(
  () => !!(periodo.value?.[0] || inventarioFiltro.value !== null || produtoId.value)
)

function limparFiltros() {
  periodo.value = null
  inventarioFiltro.value = null
  produtoId.value = null
}

// Consolida itens de inventário e reajustes avulsos (motivo='reajuste' sem inventario_item_id)
const linhasUnificadas = computed(() => {
  const resultado = []

  if (inventarioFiltro.value !== 'avulso') {
    for (const ii of itensInventario.value) {
      if (inventarioFiltro.value && Number(ii.inventario_id) !== Number(inventarioFiltro.value)) {
        continue
      }
      const inv = inventarios.value.find((iv) => iv.inventario_id === ii.inventario_id)
      const dataRef = ii.ajustado_em || ii.contado_em || inv?.aberto_em || null
      const diaRef = dataRef ? dataISOLocal(new Date(dataRef)) : null
      let situacao = 'Sem divergência (OK)'
      if (ii.estoque_contado === null) situacao = 'Não contado'
      else if (ii.movimentacao_ajuste_id) situacao = 'Divergência reajustada'
      else if (ii.divergencia) situacao = 'Divergência pendente'

      resultado.push({
        uid: `inv-${ii.item_id}`,
        origem: inv?.descricao || `Inventário #${ii.inventario_id}`,
        data: dataRef,
        dia: diaRef,
        produto_id: ii.produto_id,
        produto: ii.produto,
        categoria: ii.categoria,
        grupo_item: ii.grupo_item,
        numero_lote: ii.numero_lote,
        validade: ii.validade,
        anterior: ii.estoque_sistema,
        encontrada: ii.estoque_contado,
        diferenca: ii.divergencia,
        situacao,
        justificativa: ii.justificativa || ii.observacao || '',
        responsavel: ii.ajustado_por_nome || ii.contado_por_nome || inv?.aberto_por_nome || '',
      })
    }
  }

  if (!inventarioFiltro.value || inventarioFiltro.value === 'avulso') {
    for (const m of reajustesAvulsos.value) {
      if (m.inventario_item_id) continue // já representado pelo item de inventário
      resultado.push({
        uid: `reaj-${m.id}`,
        origem: 'Reajuste avulso',
        data: m.data,
        dia: m.dia,
        produto_id: m.produto_id,
        produto: m.produto,
        categoria: m.categoria,
        grupo_item: m.grupo_item,
        numero_lote: m.numero_lote,
        validade: m.validade,
        anterior: m.quantidade_anterior,
        encontrada: m.quantidade_encontrada,
        diferenca: m.diferenca,
        situacao: 'Reajuste avulso aplicado',
        justificativa: m.justificativa || m.observacao || '',
        responsavel: m.usuario_nome || '',
      })
    }
  }

  const ini = periodo.value?.[0] ? dataISOLocal(new Date(periodo.value[0])) : null
  const fim = periodo.value?.[1] ? dataISOLocal(new Date(periodo.value[1])) : ini

  return resultado.filter((r) => {
    if (produtoId.value && Number(r.produto_id) !== Number(produtoId.value)) return false
    if (ini && r.dia && r.dia < ini) return false
    if (fim && r.dia && r.dia > fim) return false
    return true
  })
})

const header = [
  'Origem',
  'Data/Hora',
  'Produto',
  'Grupo',
  'Lote',
  'Validade',
  'Qtd Sistema / Anterior',
  'Qtd Contada / Encontrada',
  'Diferença',
  'Situação',
  'Justificativa / Obs.',
  'Responsável',
]

const linhasExport = computed(() =>
  linhasUnificadas.value.map((r) => [
    r.origem,
    r.data ? fmtDataHora(r.data) : '',
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    r.numero_lote || 'sem lote',
    r.validade ? fmtDataLocal(r.validade) : '',
    r.anterior ?? '',
    r.encontrada ?? 'não contado',
    r.diferenca ?? 0,
    r.situacao,
    r.justificativa,
    r.responsavel,
  ])
)

async function carregar() {
  carregando.value = true
  try {
    const [resInv, resItens, resReaj, resProds] = await Promise.all([
      almoxSelectView('almox_inventarios_resumo', {
        order: { column: 'aberto_em', ascending: false },
      }),
      almoxSelectView('almox_inventario_itens_detalhe', {
        order: { column: 'produto', ascending: true },
      }),
      almoxSelectView('almox_movimentacoes_detalhe', {
        eq: { motivo: 'reajuste' },
        order: { column: 'data', ascending: false },
      }),
      almoxSelectView('almox_saldo_produto', {
        order: { column: 'nome', ascending: true },
      }),
    ])
    if (resInv.error) throw resInv.error
    inventarios.value = resInv.data ?? []
    itensInventario.value = resItens.data ?? []
    reajustesAvulsos.value = resReaj.data ?? []
    produtos.value = resProds.data ?? []
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar inventários e ajustes',
      detail: mensagemErroAlmox(err),
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
    <Select
      v-model="inventarioFiltro"
      :options="opcoesInventario"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todos os inventários e reajustes avulsos"
      aria-label="Filtrar por inventário"
      style="min-width: 18rem"
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
      style="min-width: 14rem"
    />
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
      arquivo="Almox_Inventarios"
      aba="Inventários e Ajustes"
      :header="header"
      :linhas="linhasExport"
      :larguras="[28, 16, 30, 14, 14, 12, 14, 14, 11, 22, 28, 20]"
    />
  </div>

  <p class="page-sub">
    Conferências de inventário ({{ inventarios.length }} inventário(s) registrado(s)) e reajustes avulsos de estoque.
  </p>

  <div class="card-panel tabela">
    <DataTable
      :value="linhasUnificadas"
      :loading="carregando"
      data-key="uid"
      paginator
      :rows="20"
      size="small"
      removable-sort
      class="tabela-moderna"
    >
      <template #empty>Nenhum registro de inventário ou reajuste encontrado.</template>
      <Column field="origem" header="Origem" sortable style="width: 12rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="prod-nome">{{ data.origem }}</span>
          <div v-if="data.data" class="muted" style="font-size: 0.75rem">{{ fmtDataHora(data.data) }}</div>
        </template>
      </Column>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted">
            · {{ catLabel(data.categoria) }}
            · lote <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
          </small>
        </template>
      </Column>
      <Column
        field="anterior"
        header="Anterior"
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }"><span class="num">{{ data.anterior ?? '—' }}</span></template>
      </Column>
      <Column
        field="encontrada"
        header="Contado"
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.encontrada ?? 'não contado' }}</span>
        </template>
      </Column>
      <Column
        field="diferenca"
        header="Dif."
        style="width: 6rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span
            v-if="data.diferenca"
            class="saldo baixo"
            :class="data.diferenca > 0 ? 'sobra' : 'falta'"
          >
            {{ data.diferenca > 0 ? `+${data.diferenca}` : data.diferenca }}
          </span>
          <span v-else-if="data.encontrada !== null" class="muted">0</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>
      <Column field="situacao" header="Situação" style="width: 11rem">
        <template #body="{ data }">
          <div>{{ data.situacao }}</div>
          <small v-if="data.justificativa" class="muted">{{ data.justificativa }}</small>
        </template>
      </Column>
      <Column
        field="responsavel"
        header="Responsável"
        style="width: 10rem"
        header-class="col-opc"
        body-class="col-opc"
      />
    </DataTable>
  </div>
</template>
