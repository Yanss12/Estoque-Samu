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
import { fmtDataLocal, ehValidadeProvisoria } from '../../lib/format'
import {
  FARMACIA_GRUPOS_ITEM,
  farmaciaSelectView,
  mensagemErroFarmacia,
} from '../../lib/farmaciaRelatorios'

const toast = useToast()
const linhasBrutas = ref([])
const carregando = ref(false)
const migracaoPendente = ref(false)

// Filtros (contrato B-REL #1: ativo=true usual, grupo, categoria, busca, só com saldo, situação)
const busca = ref('')
const grupo = ref(null)
const categoria = ref(null)
const situacao = ref(null)
const soComSaldo = ref(false)
const incluirInativos = ref(false)

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
      situacao.value ||
      soComSaldo.value ||
      incluirInativos.value
    )
)

function limparFiltros() {
  busca.value = ''
  grupo.value = null
  categoria.value = null
  situacao.value = null
  soComSaldo.value = false
  incluirInativos.value = false
}

const linhas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  return linhasBrutas.value.filter((r) => {
    if (!incluirInativos.value && r.ativo === false) return false
    if (grupo.value && r.grupo_item !== grupo.value) return false
    if (categoria.value && r.categoria !== categoria.value) return false
    if (situacao.value && r.situacao !== situacao.value) return false
    if (soComSaldo.value && Number(r.saldo_lote ?? 0) <= 0) return false
    if (
      termo &&
      !(r.produto || '').toLowerCase().includes(termo) &&
      !(r.numero_lote || '').toLowerCase().includes(termo)
    ) {
      return false
    }
    return true
  })
})

// Contrato: não somar saldo_produto repetido por lote; deduplicar por produto_id.
const resumoProdutos = computed(() => {
  const porProduto = new Map()
  for (const r of linhas.value) {
    if (!porProduto.has(r.produto_id)) {
      porProduto.set(r.produto_id, {
        saldo_produto: Number(r.saldo_produto ?? 0),
        saldo_disponivel: Number(r.saldo_disponivel ?? 0),
        saldo_vencido: Number(r.saldo_vencido ?? 0),
      })
    }
  }
  let disponivel = 0
  let vencido = 0
  for (const v of porProduto.values()) {
    disponivel += v.saldo_disponivel
    vencido += v.saldo_vencido
  }
  return {
    produtosDistintos: porProduto.size,
    disponivel,
    vencido,
  }
})

function situacaoRotulo(s) {
  if (s === 'zerado') return 'Zerado'
  if (s === 'critico') return 'Crítico'
  return 'OK'
}

const header = [
  'Produto',
  'Grupo',
  'Categoria',
  'Unidade',
  'Controlado',
  'Ativo',
  'Lote',
  'Validade',
  'Saldo Lote',
  'Saldo Produto',
  'Disponível',
  'Vencido',
  'Mínimo',
  'Situação',
]

const linhasExport = computed(() =>
  linhas.value.map((r) => [
    r.produto,
    r.grupo_item === 'medicamento' ? 'Medicamento' : 'Material',
    catLabel(r.categoria),
    r.unidade_medida,
    r.controlado ? 'Sim' : 'Não',
    r.ativo === false ? 'Não' : 'Sim',
    r.numero_lote || 'sem lote',
    r.validade_provisoria || ehValidadeProvisoria(r.validade)
      ? 'provisória'
      : r.validade
        ? fmtDataLocal(r.validade)
        : '',
    Number(r.saldo_lote ?? 0),
    Number(r.saldo_produto ?? 0),
    Number(r.saldo_disponivel ?? 0),
    Number(r.saldo_vencido ?? 0),
    Number(r.estoque_minimo ?? 0),
    situacaoRotulo(r.situacao),
  ])
)

async function carregar() {
  carregando.value = true
  const { data, error, migracaoPendente: pendente } = await farmaciaSelectView(
    'farmacia_rel_estoque_atual',
    {
      order: [
        { column: 'produto', ascending: true },
        { column: 'validade', ascending: true },
      ],
    }
  )
  carregando.value = false
  migracaoPendente.value = pendente
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar estoque atual',
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
    <InputText
      v-model="busca"
      class="grow"
      placeholder="Buscar produto ou lote..."
      aria-label="Buscar produto ou lote"
    />
    <Select
      v-model="grupo"
      :options="FARMACIA_GRUPOS_ITEM"
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
      <Checkbox v-model="soComSaldo" input-id="rel-farm-est-saldo" :binary="true" />
      <label for="rel-farm-est-saldo" style="font-size: 0.82rem; cursor: pointer">Só com saldo</label>
    </div>
    <div style="display: flex; align-items: center; gap: 0.4rem">
      <Checkbox v-model="incluirInativos" input-id="rel-farm-est-inat" :binary="true" />
      <label for="rel-farm-est-inat" style="font-size: 0.82rem; cursor: pointer">Incluir inativos</label>
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
      arquivo="Farmacia_Estoque_Atual"
      aba="Estoque Atual"
      :header="header"
      :linhas="linhasExport"
      :larguras="[34, 14, 14, 10, 10, 8, 14, 12, 11, 13, 12, 10, 9, 10]"
    />
  </div>

  <p class="page-sub">
    Posição por lote com saldo (inclui itens zerados e permanentes sem lote) · Produtos distintos:
    <strong>{{ resumoProdutos.produtosDistintos }}</strong> · Saldo disponível consolidado (sem duplicar lotes):
    <strong>{{ resumoProdutos.disponivel }}</strong> un.<template v-if="resumoProdutos.vencido > 0">
      · Em lotes vencidos: <strong>{{ resumoProdutos.vencido }}</strong> un.
    </template>
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
            ? 'Relatório aguardando publicação das views de relatório da Farmácia (migração 10) no banco.'
            : 'Nenhum item encontrado com esses filtros.'
        }}
      </template>
      <Column field="produto" header="Produto" sortable>
        <template #body="{ data }">
          <span class="prod-nome">
            {{ data.produto }}
            <span v-if="data.controlado" class="tag-controlado">Controlado</span>
            <span v-if="data.ativo === false" class="tag-estorno" style="margin-left: 0.35rem">Inativo</span>
          </span>
          <small class="muted"> · {{ catLabel(data.categoria) }}</small>
        </template>
      </Column>
      <Column field="numero_lote" header="Lote" style="width: 9rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
        </template>
      </Column>
      <Column field="validade" header="Validade" sortable style="width: 8.5rem" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span
            v-if="data.validade_provisoria || ehValidadeProvisoria(data.validade)"
            class="tag-provisoria"
          >
            provisória
          </span>
          <span v-else>{{ data.validade ? fmtDataLocal(data.validade) : '—' }}</span>
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
        field="saldo_disponivel"
        header="Disponível Prod."
        sortable
        style="width: 8.5rem"
        header-class="col-num col-opc"
        body-class="col-num col-opc"
      >
        <template #body="{ data }">
          <span class="num">{{ data.saldo_disponivel }}</span>
          <small v-if="Number(data.saldo_vencido) > 0" class="saldo-vencido">
            (+{{ data.saldo_vencido }} venc.)
          </small>
        </template>
      </Column>
      <Column
        field="estoque_minimo"
        header="Mínimo"
        sortable
        style="width: 6.5rem"
        header-class="col-num col-opc"
        body-class="col-num col-opc"
      >
        <template #body="{ data }">
          <span class="num muted">{{ data.estoque_minimo }}</span>
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
