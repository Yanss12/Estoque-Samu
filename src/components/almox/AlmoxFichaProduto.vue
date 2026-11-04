<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { catLabel } from '../../lib/categorias'
import { fmtDataLocal } from '../../lib/format'
import { almoxGerir } from '../../lib/auth'
import { almoxSelectView, almoxMotivoLabel } from '../../lib/almox'
import AlmoxCorrigirValidadeDialog from './AlmoxCorrigirValidadeDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produto: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const lotes = ref([])
const movs = ref([])
const carregando = ref(false)
const corrigirValidadeVisivel = ref(false)
const loteParaCorrigir = ref(null)

async function carregarFicha() {
  if (!props.produto) return
  carregando.value = true
  const pid = props.produto.produto_id
  try {
    const [lo, mo] = await Promise.all([
      almoxSelectView('almox_saldo_lote', {
        eq: { produto_id: pid },
        order: { column: 'validade', ascending: true },
      }),
      almoxSelectView('almox_movimentacoes_detalhe', {
        eq: { produto_id: pid },
        order: { column: 'data', ascending: false },
        range: { from: 0, to: 9 },
      }),
    ])
    lotes.value = (lo.data ?? []).filter((l) => Number(l.saldo) > 0)
    movs.value = mo.data ?? []
  } finally {
    carregando.value = false
  }
}

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto || !props.produto) return
    await carregarFicha()
  }
)

function abrirCorrigirValidade(lote) {
  loteParaCorrigir.value = lote
  corrigirValidadeVisivel.value = true
}

async function aoCorrigirValidade() {
  await carregarFicha()
  emit('saved')
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

function classeValidadeLote(l) {
  if (l.vencido) return 'vencido'
  if (l.dias_restantes !== null && l.dias_restantes <= 60) return 'proximo'
  return ''
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    :header="produto?.nome || 'Ficha do produto (Almoxarifado)'"
    :style="{ width: '46rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <div v-if="produto" class="estorno-resumo" style="margin-bottom: 1.1rem">
      <div class="feed-title">
        <span>{{ catLabel(produto.categoria) }} · {{ produto.unidade_medida }}</span>
        <span v-if="produto.codigo_interno" class="tag-estorno mono">{{ produto.codigo_interno }}</span>
        <span v-if="produto.controlado" class="tag-controlado">Controlado</span>
      </div>
      <div class="feed-sub" style="margin-top: 0.3rem">
        Disponível: <strong>{{ produto.saldo_disponivel ?? 0 }}</strong>
        <template v-if="produto.saldo_vencido > 0">
          · <span style="color: var(--danger-fg); font-weight: 600">+{{ produto.saldo_vencido }} vencido</span>
        </template>
        <span class="sep">/</span>Mínimo: <strong>{{ produto.estoque_minimo ?? 0 }}</strong>
        <span class="sep">/</span>Localização: <strong>{{ produto.localizacao || 'Não informada' }}</strong>
      </div>
      <div v-if="produto.observacao" class="feed-obs">{{ produto.observacao }}</div>
    </div>

    <h3 class="ficha-sec">
      Lotes com saldo <span class="muted" style="font-weight: 400">primeiro a vencer no topo (FEFO)</span>
    </h3>
    <DataTable :value="lotes" :loading="carregando" size="small" class="tabela-moderna">
      <template #empty>
        {{ produto?.categoria === 'permanente' ? 'Item permanente (isento de controle por lote).' : 'Nenhum lote com saldo.' }}
      </template>
      <Column header="Lote">
        <template #body="{ data }">
          <span class="mono">{{ data.numero_lote || 'sem nº' }}</span>
        </template>
      </Column>
      <Column header="Validade">
        <template #body="{ data }">
          <span class="validade" :class="classeValidadeLote(data)">
            {{ fmtDataLocal(data.validade) }}
            <small v-if="data.vencido">vencido</small>
            <small v-else-if="data.dias_restantes !== null && data.dias_restantes <= 60">{{ data.dias_restantes }}d</small>
          </span>
        </template>
      </Column>
      <Column header="Saldo" header-class="col-num" body-class="col-num">
        <template #body="{ data }">
          <span class="saldo">{{ data.saldo }}</span>
        </template>
      </Column>
      <Column v-if="almoxGerir" style="width: 1%; white-space: nowrap" header-class="col-num" body-class="col-num">
        <template #header><span class="sr-only">Ações</span></template>
        <template #body="{ data }">
          <Button
            label="Corrigir validade"
            icon="pi pi-calendar"
            size="small"
            text
            severity="secondary"
            :aria-label="`Corrigir validade do lote ${data.numero_lote}`"
            @click="abrirCorrigirValidade(data)"
          />
        </template>
      </Column>
    </DataTable>

    <h3 class="ficha-sec">
      Últimas movimentações <span class="muted" style="font-weight: 400">10 mais recentes no Almoxarifado</span>
    </h3>
    <DataTable :value="movs" :loading="carregando" size="small" class="tabela-moderna">
      <template #empty>Nenhuma movimentação registrada para este produto no Almoxarifado.</template>
      <Column header="Data">
        <template #body="{ data }">
          <span class="num">{{ fmtDataHora(data.data) }}</span>
        </template>
      </Column>
      <Column header="Qtd" header-class="col-num" body-class="col-num">
        <template #body="{ data }">
          <span
            class="saldo"
            :style="{
              color: data.estorno_de ? 'var(--text-muted)' : data.tipo === 'entrada' ? 'var(--ok-fg)' : 'var(--danger-fg)',
              textDecoration: data.estornada ? 'line-through' : 'none',
            }"
          >
            {{ data.tipo === 'entrada' ? '+' : '−' }}{{ data.quantidade }}
          </span>
        </template>
      </Column>
      <Column header="Motivo / Detalhe">
        <template #body="{ data }">
          <div>
            <span v-if="data.estorno_de" class="tag-estorno" style="margin-right: 0.35rem">Estorno</span>
            <span v-else-if="data.estornada" class="tag-estorno" style="margin-right: 0.35rem">Estornada</span>
            <span>{{ almoxMotivoLabel(data.motivo) }}</span>
            <span v-if="data.origem && data.tipo === 'entrada'" class="muted"> · {{ data.origem }}</span>
            <span v-if="data.destino && data.tipo === 'saida'" class="muted"> → {{ data.destino }}</span>
            <span v-if="data.numero_lote" class="muted"> · lote <span class="mono">{{ data.numero_lote }}</span></span>
          </div>
          <div v-if="data.documento || data.justificativa || data.observacao" class="muted" style="font-size: 0.78rem">
            <template v-if="data.documento">Doc: {{ data.documento }} </template>
            <template v-if="data.justificativa">· {{ data.justificativa }} </template>
            <template v-if="data.observacao">· {{ data.observacao }}</template>
          </div>
        </template>
      </Column>
      <Column header="Saldo após" header-class="col-num col-opc" body-class="col-num col-opc">
        <template #body="{ data }">
          <span class="num muted">{{ data.saldo_produto_apos ?? '—' }}</span>
        </template>
      </Column>
      <Column header="Por" header-class="col-opc" body-class="col-opc">
        <template #body="{ data }">
          <span style="font-size: 0.82rem">{{ data.usuario_nome || '—' }}</span>
        </template>
      </Column>
    </DataTable>

    <AlmoxCorrigirValidadeDialog
      v-model:visible="corrigirValidadeVisivel"
      :produto="produto"
      :lote="loteParaCorrigir"
      @saved="aoCorrigirValidade"
    />
  </Dialog>
</template>
