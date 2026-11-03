<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import EstornoDialog from '../../components/EstornoDialog.vue'
import AlmoxTransferenciaDialog from '../../components/almox/AlmoxTransferenciaDialog.vue'
import { almoxGerir } from '../../lib/auth'
import { catLabel } from '../../lib/categorias'
import { fmtDataLocal, dataISOLocal } from '../../lib/format'
import { baixarPlanilhaSimples } from '../../lib/relatorioExcel'
import { almoxSelectView, almoxRpc, mensagemErroAlmox } from '../../lib/almox'

const toast = useToast()

const itensRaw = ref([])
const produtos = ref([])
const carregando = ref(false)
const exportando = ref(false)

// Diálogos
const novaTransfVisivel = ref(false)
const estornoVisivel = ref(false)
const itemParaEstornar = ref(null)

// Filtros
const produtoFiltro = ref(null)
const situacaoFiltro = ref(null) // null | 'efetivada' | 'estornada'
const periodo = ref(null)

const situacaoOpcoes = [
  { label: 'Efetivada', value: 'efetivada' },
  { label: 'Estornada', value: 'estornada' },
]

const temFiltro = computed(
  () => !!(produtoFiltro.value || situacaoFiltro.value || periodo.value?.[0])
)

const itensFiltrados = computed(() => {
  const ini = periodo.value?.[0] ? dataISOLocal(new Date(periodo.value[0])) : null
  const fim = periodo.value?.[1]
    ? dataISOLocal(new Date(periodo.value[1]))
    : ini
  return itensRaw.value.filter((r) => {
    if (produtoFiltro.value && Number(r.produto_id) !== Number(produtoFiltro.value)) return false
    if (situacaoFiltro.value === 'efetivada' && r.estornada) return false
    if (situacaoFiltro.value === 'estornada' && !r.estornada) return false
    if (ini && r.dia < ini) return false
    if (fim && r.dia > fim) return false
    return true
  })
})

// Agrupa por transferencia_id mantendo ordem da mais recente para a mais antiga
const guiasAgrupadas = computed(() => {
  const mapa = new Map()
  for (const it of itensFiltrados.value) {
    let guia = mapa.get(it.transferencia_id)
    if (!guia) {
      guia = {
        transferencia_id: it.transferencia_id,
        data: it.data,
        dia: it.dia,
        documento: it.documento,
        observacao: it.observacao,
        usuario_nome: it.usuario_nome,
        itens: [],
      }
      mapa.set(it.transferencia_id, guia)
    }
    guia.itens.push(it)
  }
  return [...mapa.values()].sort((a, b) => b.transferencia_id - a.transferencia_id)
})

async function carregar() {
  carregando.value = true
  try {
    const [resTransf, resProds] = await Promise.all([
      almoxSelectView('almox_transferencias_detalhe', {
        order: { column: 'data', ascending: false },
      }),
      almoxSelectView('almox_saldo_produto', {
        order: { column: 'nome', ascending: true },
      }),
    ])
    if (resTransf.error) throw resTransf.error
    itensRaw.value = resTransf.data ?? []
    produtos.value = resProds.data ?? []
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar transferências',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    carregando.value = false
  }
}

function limparFiltros() {
  produtoFiltro.value = null
  situacaoFiltro.value = null
  periodo.value = null
}

function fmtDataHora(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function abrirEstornoItem(item) {
  // Adapta o item para o formato visual do EstornoDialog
  itemParaEstornar.value = {
    id: item.almox_movimentacao_id,
    item_id: item.item_id,
    produto_id: item.produto_id,
    tipo: 'saida',
    motivo: 'transferencia_farmacia',
    quantidade: item.quantidade,
    destino: 'Farmácia COMUE',
    produto: { nome: item.produto },
    lote: item.numero_lote ? { numero_lote: item.numero_lote } : null,
  }
  estornoVisivel.value = true
}

async function executarEstornoItem(mov, justificativa) {
  return await almoxRpc('almox_estornar_transferencia_item', {
    p_item_id: mov.item_id,
    p_justificativa: justificativa,
  })
}

async function exportarExcel() {
  if (!itensFiltrados.value.length) {
    toast.add({
      severity: 'warn',
      summary: 'Nada para exportar',
      detail: 'Nenhuma transferência corresponde aos filtros.',
      life: 4000,
    })
    return
  }
  exportando.value = true
  try {
    const linhas = itensFiltrados.value.map((r) => [
      `#${r.transferencia_id}`,
      fmtDataHora(r.data),
      r.documento || '',
      r.produto || '',
      catLabel(r.categoria),
      r.unidade_medida || '',
      r.numero_lote || '',
      fmtDataLocal(r.validade),
      r.quantidade,
      r.estornada ? 'Estornada' : 'Efetivada',
      r.usuario_nome || '',
      r.observacao || '',
    ])
    const stamp = dataISOLocal(new Date())
    await baixarPlanilhaSimples(
      `Almox_Transferencias_${stamp}.xlsx`,
      'Transferências',
      [
        'Guia',
        'Data/Hora',
        'Documento',
        'Produto',
        'Categoria',
        'Unidade',
        'Lote',
        'Validade',
        'Qtd',
        'Situação',
        'Por',
        'Observação',
      ],
      linhas,
      [8, 16, 14, 32, 14, 10, 14, 12, 8, 12, 18, 28]
    )
    toast.add({
      severity: 'success',
      summary: 'Excel gerado',
      detail: `${linhas.length} item(ns) de transferência exportados.`,
      life: 4000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao exportar',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    exportando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div class="page-head">
    <div>
      <span class="almox-chip">
        <i class="pi pi-building" aria-hidden="true" />
        Almoxarifado da Saúde · retaguarda
      </span>
      <h1>Transferências para a Farmácia</h1>
      <p class="page-sub">
        Guias de transferência Almoxarifado → Farmácia COMUE (entrada automática preservando lote e validade)
      </p>
    </div>
    <div class="page-acoes">
      <Button
        label="Exportar Excel"
        icon="pi pi-download"
        severity="secondary"
        outlined
        :loading="exportando"
        @click="exportarExcel"
      />
      <Button
        v-if="almoxGerir"
        label="Nova transferência"
        icon="pi pi-send"
        @click="novaTransfVisivel = true"
      />
    </div>
  </div>

  <div class="toolbar">
    <Select
      v-model="produtoFiltro"
      :options="produtos"
      option-label="nome"
      option-value="produto_id"
      filter
      placeholder="Todos os produtos"
      aria-label="Filtrar por produto"
      show-clear
      style="min-width: 15rem"
    />
    <Select
      v-model="situacaoFiltro"
      :options="situacaoOpcoes"
      option-label="label"
      option-value="value"
      placeholder="Qualquer situação"
      aria-label="Filtrar por situação"
      show-clear
      style="min-width: 12rem"
    />
    <DatePicker
      v-model="periodo"
      selection-mode="range"
      :manual-input="false"
      date-format="dd/mm/yy"
      placeholder="Qualquer data"
      aria-label="Filtrar por período"
      show-icon
      show-button-bar
      style="min-width: 15rem"
    />
    <Button
      v-if="temFiltro"
      label="Limpar filtros"
      icon="pi pi-filter-slash"
      text
      severity="secondary"
      @click="limparFiltros"
    />
  </div>

  <div v-if="carregando && !guiasAgrupadas.length" class="card-panel">
    <ul class="lista" aria-hidden="true">
      <li v-for="n in 4" :key="n">
        <span class="skel" style="width: 45%" />
        <span class="skel" style="width: 4rem" />
      </li>
    </ul>
  </div>

  <div v-else-if="!guiasAgrupadas.length" class="card-panel">
    <p class="empty" style="margin: 0">
      <template v-if="temFiltro">
        Nenhum item encontrado com esses filtros.
        <a href="#" class="ver-todas" style="display: inline" @click.prevent="limparFiltros">
          Limpar filtros
        </a>
      </template>
      <template v-else>Nenhuma transferência registrada.</template>
    </p>
  </div>

  <div v-else style="display: flex; flex-direction: column; gap: 1rem">
    <section
      v-for="guia in guiasAgrupadas"
      :key="guia.transferencia_id"
      class="card-panel tabela"
    >
      <div
        class="panel-head"
        style="padding: 0.75rem 1rem; margin-bottom: 0; border-bottom: 1px solid var(--border); background: var(--surface-2)"
      >
        <div>
          <h2 style="margin: 0">
            Transferência #{{ guia.transferencia_id }}
            <span v-if="guia.documento" class="tag-estorno" style="margin-left: 0.35rem">
              {{ guia.documento }}
            </span>
          </h2>
          <div class="muted" style="font-size: 0.8rem; margin-top: 2px">
            {{ fmtDataHora(guia.data) }} · por <strong>{{ guia.usuario_nome || '—' }}</strong>
            <template v-if="guia.observacao"> · {{ guia.observacao }}</template>
          </div>
        </div>
        <span class="conta">{{ guia.itens.length }} {{ guia.itens.length === 1 ? 'item' : 'itens' }}</span>
      </div>

      <DataTable :value="guia.itens" data-key="item_id" size="small" class="tabela-moderna">
        <Column header="Produto">
          <template #body="{ data }">
            <span class="prod-nome" :style="{ textDecoration: data.estornada ? 'line-through' : 'none' }">
              {{ data.produto }}
            </span>
          </template>
        </Column>

        <Column header="Categoria" style="width: 9rem" header-class="col-opc" body-class="col-opc">
          <template #body="{ data }">
            <span class="cat-texto">{{ catLabel(data.categoria) }}</span>
          </template>
        </Column>

        <Column header="Lote" style="width: 9rem">
          <template #body="{ data }">
            <span class="mono">{{ data.numero_lote || '—' }}</span>
          </template>
        </Column>

        <Column header="Validade" style="width: 8.5rem">
          <template #body="{ data }">
            <span class="num">{{ fmtDataLocal(data.validade) }}</span>
          </template>
        </Column>

        <Column header="Quantidade" style="width: 7.5rem" header-class="col-num" body-class="col-num">
          <template #body="{ data }">
            <span
              class="saldo"
              :style="{
                color: data.estornada ? 'var(--text-muted)' : 'var(--ok-fg)',
                textDecoration: data.estornada ? 'line-through' : 'none',
              }"
            >
              {{ data.quantidade }}
            </span>
          </template>
        </Column>

        <Column header="Situação" style="width: 8rem">
          <template #body="{ data }">
            <span v-if="data.estornada" class="tag-estorno">Estornada</span>
            <span
              v-else
              class="tag-estorno"
              style="background: var(--ok-bg); color: var(--ok-fg); border-color: transparent"
            >
              Efetivada
            </span>
          </template>
        </Column>

        <Column v-if="almoxGerir" style="width: 8.5rem" header-class="col-num" body-class="col-num">
          <template #header><span class="sr-only">Ação</span></template>
          <template #body="{ data }">
            <Button
              v-if="!data.estornada"
              label="Estornar item"
              icon="pi pi-replay"
              text
              size="small"
              severity="secondary"
              :aria-label="`Estornar item ${data.produto} da transferência #${guia.transferencia_id}`"
              @click="abrirEstornoItem(data)"
            />
          </template>
        </Column>
      </DataTable>
    </section>
  </div>

  <AlmoxTransferenciaDialog
    v-model:visible="novaTransfVisivel"
    :produtos="produtos"
    @saved="carregar"
  />

  <EstornoDialog
    v-model:visible="estornoVisivel"
    :mov="itemParaEstornar"
    :acao="executarEstornoItem"
    @saved="carregar"
  />
</template>
