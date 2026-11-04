<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { almoxGerir } from '../../lib/auth'
import { catLabel } from '../../lib/categorias'
import { fmtDataLocal } from '../../lib/format'
import { almoxSelectView, almoxRpc, mensagemErroAlmox, fmtDataHora } from '../../lib/almox'

const props = defineProps({
  inventario: { type: Object, required: true }, // linha de almox_inventarios_resumo
})
const emit = defineEmits(['voltar', 'changed'])

const toast = useToast()
const itens = ref([])
const carregando = ref(false)
const salvandoId = ref(null)

// Filtros
const busca = ref('')
const grupoFiltro = ref(null)
const situacaoFiltro = ref(null)

const gruposOpcoes = [
  { label: 'Medicamentos', value: 'medicamento' },
  { label: 'Materiais', value: 'material' },
]

const situacaoOpcoes = [
  { label: 'Pendentes de contagem', value: 'pendente' },
  { label: 'Divergentes sem ajuste', value: 'divergente_pendente' },
  { label: 'Com divergência (todos)', value: 'divergente' },
  { label: 'Reajustados', value: 'ajustado' },
]

// Diálogo de reajuste de item
const reajusteVisivel = ref(false)
const itemReajuste = ref(null)
const justificativaReajuste = ref('')
const reajustando = ref(false)

// Diálogo de finalizar inventário
const finalizarVisivel = ref(false)
const obsFinalizar = ref('')
const permitirDivergencias = ref(false)
const finalizando = ref(false)

// Diálogo de incluir item avulso (ex.: lote com saldo 0 encontrado fisicamente)
const incluirVisivel = ref(false)
const produtosAlmox = ref([])
const lotesProdutoIncluir = ref([])
const formIncluir = ref({
  produto_id: null,
  lote_id: null,
  contado: null,
  observacao: '',
})
const incluindo = ref(false)

const aberto = computed(() => props.inventario.status === 'aberto')
const podeEditar = computed(() => aberto.value && almoxGerir.value)

const pendentes = computed(() => itens.value.filter((i) => i.estoque_contado === null).length)
const contadosCount = computed(() => itens.value.length - pendentes.value)
const divergentesSemAjuste = computed(
  () => itens.value.filter((i) => i.divergencia && !i.movimentacao_ajuste_id).length
)
const ajustadosCount = computed(
  () => itens.value.filter((i) => i.movimentacao_ajuste_id != null).length
)

const filtrados = computed(() => {
  const t = busca.value.trim().toLowerCase()
  return itens.value.filter((i) => {
    if (
      t &&
      !i.produto.toLowerCase().includes(t) &&
      !(i.numero_lote ?? '').toLowerCase().includes(t)
    ) {
      return false
    }
    if (grupoFiltro.value && i.grupo_item !== grupoFiltro.value) return false
    if (situacaoFiltro.value === 'pendente' && i.estoque_contado !== null) return false
    if (
      situacaoFiltro.value === 'divergente_pendente' &&
      (!i.divergencia || i.movimentacao_ajuste_id)
    ) {
      return false
    }
    if (situacaoFiltro.value === 'divergente' && !i.divergencia) return false
    if (situacaoFiltro.value === 'ajustado' && !i.movimentacao_ajuste_id) return false
    return true
  })
})

const temFiltro = computed(() => !!(busca.value.trim() || grupoFiltro.value || situacaoFiltro.value))

function limparFiltros() {
  busca.value = ''
  grupoFiltro.value = null
  situacaoFiltro.value = null
}

async function carregar() {
  carregando.value = true
  const { data, error } = await almoxSelectView('almox_inventario_itens_detalhe', {
    eq: { inventario_id: props.inventario.inventario_id },
    order: { column: 'produto', ascending: true },
  })
  carregando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar itens do inventário',
      detail: mensagemErroAlmox(error),
      life: 6000,
    })
    return
  }
  const lista = [...(data ?? [])].sort((a, b) => {
    const cmp = (a.produto || '').localeCompare(b.produto || '', 'pt-BR')
    if (cmp !== 0) return cmp
    return (a.validade || '9999-12-31').localeCompare(b.validade || '9999-12-31')
  })
  itens.value = lista.map((i) => ({
    ...i,
    rascunho: i.estoque_contado,
    obs: i.observacao ?? '',
  }))
}

function editavel(i) {
  return podeEditar.value && !i.movimentacao_ajuste_id
}

async function salvarContagem(i) {
  if (!editavel(i)) return
  if (i.rascunho === null || i.rascunho === undefined) return
  salvandoId.value = i.item_id
  const { error } = await almoxRpc('almox_registrar_contagem_inventario', {
    p_inventario_id: i.inventario_id,
    p_produto_id: i.produto_id,
    p_lote_id: i.lote_id,
    p_contado: Number(i.rascunho),
    p_observacao: i.obs?.trim() || null,
  })
  salvandoId.value = null
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao registrar contagem',
      detail: mensagemErroAlmox(error),
      life: 6000,
    })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'Contagem registrada',
    detail: `${i.produto}: ${i.rascunho} un.`,
    life: 2500,
  })
  await carregar()
  emit('changed')
}

function abrirDialogReajuste(i) {
  if (!editavel(i) || !i.divergencia) return
  itemReajuste.value = i
  justificativaReajuste.value = ''
  reajusteVisivel.value = true
}

const justificativaReajusteValida = computed(
  () => (justificativaReajuste.value || '').trim().length >= 10
)

async function confirmarReajusteItem() {
  if (!itemReajuste.value || !justificativaReajusteValida.value) return
  reajustando.value = true
  const item = itemReajuste.value
  const { data, error } = await almoxRpc('almox_reajustar_item_inventario', {
    p_item_id: item.item_id,
    p_justificativa: justificativaReajuste.value.trim(),
  })
  reajustando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Não foi possível reajustar o item',
      detail: mensagemErroAlmox(error),
      life: 6500,
    })
    return
  }
  const dif = data?.diferenca ?? item.divergencia
  const sinal = dif > 0 ? `+${dif}` : `${dif}`
  toast.add({
    severity: 'success',
    summary: 'Estoque reajustado',
    detail: `${item.produto}: ${item.estoque_sistema} → ${item.estoque_contado} (${sinal})`,
    life: 4500,
  })
  reajusteVisivel.value = false
  itemReajuste.value = null
  await carregar()
  emit('changed')
}

function abrirDialogFinalizar() {
  if (!podeEditar.value) return
  obsFinalizar.value = props.inventario.observacao ?? ''
  permitirDivergencias.value = false
  finalizarVisivel.value = true
}

const podeConfirmarFinalizar = computed(() => {
  if (divergentesSemAjuste.value > 0 && !permitirDivergencias.value) return false
  return true
})

async function confirmarFinalizar() {
  if (!podeConfirmarFinalizar.value) return
  finalizando.value = true
  const { error } = await almoxRpc('almox_finalizar_inventario', {
    p_inventario_id: props.inventario.inventario_id,
    p_observacao: obsFinalizar.value?.trim() || null,
    p_permitir_divergencias_pendentes: divergentesSemAjuste.value > 0 && permitirDivergencias.value,
  })
  finalizando.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Não foi possível finalizar o inventário',
      detail: mensagemErroAlmox(error),
      life: 6500,
    })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'Inventário finalizado',
    life: 4000,
  })
  finalizarVisivel.value = false
  emit('changed')
  emit('voltar')
}

// Inclusão de item com saldo 0 na contagem
const produtoIncluirSel = computed(
  () =>
    produtosAlmox.value.find((p) => Number(p.produto_id) === Number(formIncluir.value.produto_id)) ??
    null
)
const ehPermanenteIncluir = computed(() => produtoIncluirSel.value?.categoria === 'permanente')

const podeSalvarIncluir = computed(() => {
  if (!formIncluir.value.produto_id) return false
  if (!ehPermanenteIncluir.value && !formIncluir.value.lote_id) return false
  if (formIncluir.value.contado === null || formIncluir.value.contado === undefined || formIncluir.value.contado < 0) {
    return false
  }
  return true
})

async function abrirDialogIncluir() {
  if (!podeEditar.value) return
  formIncluir.value = {
    produto_id: null,
    lote_id: null,
    contado: 0,
    observacao: '',
  }
  lotesProdutoIncluir.value = []
  incluirVisivel.value = true
  const { data } = await almoxSelectView('almox_saldo_produto', {
    order: { column: 'nome', ascending: true },
  })
  produtosAlmox.value = (data ?? []).filter((p) => p.ativo !== false)
}

watch(
  () => formIncluir.value.produto_id,
  async (prodId) => {
    formIncluir.value.lote_id = null
    lotesProdutoIncluir.value = []
    if (!prodId || ehPermanenteIncluir.value) return
    const { data } = await almoxSelectView('almox_saldo_lote', {
      eq: { produto_id: prodId },
      order: { column: 'validade', ascending: true },
    })
    lotesProdutoIncluir.value = (data ?? []).map((l) => ({
      ...l,
      rotulo: `${l.numero_lote} · venc. ${fmtDataLocal(l.validade)} · saldo sistema: ${l.saldo}`,
    }))
    if (lotesProdutoIncluir.value.length === 1) {
      formIncluir.value.lote_id = lotesProdutoIncluir.value[0].lote_id
    }
  }
)

async function salvarIncluirItem() {
  if (!podeSalvarIncluir.value) return
  incluindo.value = true
  const { error } = await almoxRpc('almox_registrar_contagem_inventario', {
    p_inventario_id: props.inventario.inventario_id,
    p_produto_id: formIncluir.value.produto_id,
    p_lote_id: ehPermanenteIncluir.value ? null : formIncluir.value.lote_id,
    p_contado: Number(formIncluir.value.contado),
    p_observacao: formIncluir.value.observacao?.trim() || null,
  })
  incluindo.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Não foi possível registrar item',
      detail: mensagemErroAlmox(error),
      life: 6000,
    })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'Contagem registrada no inventário',
    life: 3500,
  })
  incluirVisivel.value = false
  await carregar()
  emit('changed')
}

function classeDivergencia(i) {
  return i.divergencia > 0 ? 'sobra' : 'falta'
}

watch(() => props.inventario.inventario_id, carregar, { immediate: true })
</script>

<template>
  <div class="page-head">
    <div>
      <h1>{{ inventario.descricao || `Inventário #${inventario.inventario_id}` }}</h1>
      <p class="page-sub">
        <span class="cat-badge" style="margin-right: 0.35rem">
          {{ aberto ? 'Aberto' : 'Finalizado' }}
        </span>
        · Aberto em {{ fmtDataHora(inventario.aberto_em) }} por {{ inventario.aberto_por_nome || '—' }}
        <template v-if="inventario.finalizado_em">
          · Finalizado em {{ fmtDataHora(inventario.finalizado_em) }} por {{ inventario.finalizado_por_nome || '—' }}
        </template>
        · <strong>{{ contadosCount }}</strong> de <strong>{{ itens.length }}</strong> contados
        · <strong>{{ divergentesSemAjuste }}</strong> divergência(s) sem ajuste
        <template v-if="ajustadosCount > 0">
          · <strong>{{ ajustadosCount }}</strong> reajustado(s)
        </template>
      </p>
    </div>
    <div class="page-acoes">
      <Button
        label="Inventários"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        @click="emit('voltar')"
      />
      <Button
        v-if="podeEditar"
        label="Incluir item"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        title="Registrar contagem de lote com saldo zero ou não listado"
        @click="abrirDialogIncluir"
      />
      <Button
        v-if="podeEditar"
        label="Finalizar inventário"
        icon="pi pi-check"
        severity="success"
        @click="abrirDialogFinalizar"
      />
    </div>
  </div>

  <div class="toolbar">
    <InputText
      v-model="busca"
      class="grow"
      placeholder="Buscar por produto ou número de lote..."
      aria-label="Buscar por produto ou número de lote"
    />
    <Select
      v-model="grupoFiltro"
      :options="gruposOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todos os grupos"
      aria-label="Filtrar por grupo"
    />
    <Select
      v-model="situacaoFiltro"
      :options="situacaoOpcoes"
      option-label="label"
      option-value="value"
      show-clear
      placeholder="Todas as situações"
      aria-label="Filtrar por situação da contagem"
    />
    <Button
      v-if="temFiltro"
      label="Limpar filtros"
      icon="pi pi-filter-slash"
      text
      severity="secondary"
      size="small"
      @click="limparFiltros"
    />
  </div>

  <div class="card-panel tabela">
    <DataTable
      :value="filtrados"
      :loading="carregando"
      data-key="item_id"
      paginator
      :rows="20"
      size="small"
      class="tabela-moderna"
    >
      <template #empty>
        <div v-if="temFiltro" class="empty">
          <p style="margin: 0 0 0.5rem">Nenhum item encontrado com esses filtros.</p>
          <Button label="Limpar filtros" icon="pi pi-filter-slash" size="small" outlined @click="limparFiltros" />
        </div>
        <div v-else class="empty">Nenhum item neste inventário.</div>
      </template>

      <Column field="produto" header="Produto">
        <template #body="{ data }">
          <div>
            <span class="prod-nome">{{ data.produto }}</span>
            <small class="muted">
              · {{ catLabel(data.categoria) }}
              · lote <span class="mono">{{ data.numero_lote || 'sem lote' }}</span>
              <template v-if="data.validade"> · val. {{ fmtDataLocal(data.validade) }}</template>
            </small>
          </div>
          <div v-if="data.observacao && !editavel(data)" class="muted" style="font-size: 0.76rem">
            Obs.: {{ data.observacao }}
          </div>
        </template>
      </Column>

      <Column
        field="estoque_sistema"
        header="Sistema"
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span class="num">{{ data.estoque_sistema }}</span>
        </template>
      </Column>

      <Column
        header="Contado"
        style="width: 11rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <InputNumber
            v-if="editavel(data)"
            v-model="data.rascunho"
            :min="0"
            :input-id="`almox-cont-${data.item_id}`"
            :aria-label="`Contagem de ${data.produto}`"
            :input-style="{ width: '5.5rem', textAlign: 'right' }"
            @input="(e) => (data.rascunho = e.value)"
            @keydown.enter.prevent="salvarContagem(data)"
          />
          <div v-else>
            <span class="num">{{ data.estoque_contado ?? 'não contado' }}</span>
            <div v-if="data.contado_por_nome" class="muted" style="font-size: 0.7rem">
              por {{ data.contado_por_nome }}
            </div>
          </div>
        </template>
      </Column>

      <Column
        header="Diverg."
        style="width: 6.5rem"
        header-class="col-num"
        body-class="col-num"
      >
        <template #body="{ data }">
          <span
            v-if="data.divergencia"
            class="saldo baixo"
            :class="classeDivergencia(data)"
          >
            {{ data.divergencia > 0 ? '+' : '' }}{{ data.divergencia }}
          </span>
          <span v-else-if="data.estoque_contado !== null" class="muted">ok</span>
          <span v-else class="muted">—</span>
        </template>
      </Column>

      <Column style="width: 14rem" header-class="col-num" body-class="col-num">
        <template #header><span class="sr-only">Ações</span></template>
        <template #body="{ data }">
          <div class="acoes" style="justify-content: flex-end">
            <Button
              v-if="editavel(data)"
              label="Salvar"
              size="small"
              text
              :disabled="data.rascunho === data.estoque_contado || data.rascunho === null || data.rascunho === undefined"
              :loading="salvandoId === data.item_id"
              @click="salvarContagem(data)"
            />
            <Button
              v-if="editavel(data) && data.divergencia && !data.movimentacao_ajuste_id"
              label="Reajustar"
              size="small"
              severity="warn"
              outlined
              @click="abrirDialogReajuste(data)"
            />
            <span
              v-if="data.movimentacao_ajuste_id"
              class="muted"
              style="font-size: 0.78rem"
              :title="`Reajustado por ${data.ajustado_por_nome ?? '—'}${data.justificativa ? ` · Justificativa: ${data.justificativa}` : ''}`"
            >
              ajustado ({{ data.quantidade_anterior }} → {{ data.quantidade_ajustada }})
            </span>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <!-- Diálogo de reajuste de item com divergência (exige justificativa >= 10 chars conforme seção 4.5) -->
  <Dialog
    v-model:visible="reajusteVisivel"
    modal
    header="Reajustar item do inventário"
    :style="{ width: '30rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form v-if="itemReajuste" id="almox-inv-reajuste-form" @submit.prevent="confirmarReajusteItem">
      <div class="estorno-resumo" style="margin-bottom: 1rem">
        <div class="prod-nome">{{ itemReajuste.produto }}</div>
        <div class="muted" style="font-size: 0.82rem; margin-bottom: 0.65rem">
          Lote: <span class="mono">{{ itemReajuste.numero_lote || 'sem lote' }}</span>
          <template v-if="itemReajuste.validade"> · val. {{ fmtDataLocal(itemReajuste.validade) }}</template>
        </div>
        <div class="linha-campos" style="margin-bottom: 0; text-align: center">
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Sistema (anterior)</div>
            <div class="num" style="font-size: 1.1rem; font-weight: 650">{{ itemReajuste.estoque_sistema }}</div>
          </div>
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Contado (físico)</div>
            <div class="num" style="font-size: 1.1rem; font-weight: 650">{{ itemReajuste.estoque_contado }}</div>
          </div>
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Diferença</div>
            <div
              class="num"
              style="font-size: 1.1rem; font-weight: 650"
              :style="{ color: itemReajuste.divergencia > 0 ? 'var(--ok-fg)' : 'var(--danger-fg)' }"
            >
              {{ itemReajuste.divergencia > 0 ? `+${itemReajuste.divergencia}` : itemReajuste.divergencia }}
            </div>
          </div>
        </div>
      </div>

      <div class="field">
        <label for="almox-inv-reaj-just">
          Justificativa obrigatória <span class="opc">(mín. 10 caracteres)</span>
        </label>
        <Textarea
          id="almox-inv-reaj-just"
          v-model="justificativaReajuste"
          rows="2"
          auto-resize
          placeholder="Descreva o motivo do reajuste apurado na conferência física"
          class="full"
        />
        <small>
          Gera uma movimentação de reajuste vinculada a este item de inventário e não pode ser desfeita nem estornada.
        </small>
      </div>
    </form>

    <template #footer>
      <Button
        label="Cancelar"
        text
        severity="secondary"
        :disabled="reajustando"
        @click="reajusteVisivel = false"
      />
      <Button
        type="submit"
        form="almox-inv-reajuste-form"
        label="Aplicar reajuste"
        icon="pi pi-check"
        :disabled="!justificativaReajusteValida"
        :loading="reajustando"
      />
    </template>
  </Dialog>

  <!-- Diálogo para incluir item/lote adicional na contagem (ex.: lote com saldo 0 encontrado fisicamente) -->
  <Dialog
    v-model:visible="incluirVisivel"
    modal
    header="Incluir item na contagem"
    :style="{ width: '30rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form id="almox-inv-incluir-form" @submit.prevent="salvarIncluirItem">
      <div class="field">
        <label for="almox-inv-inc-prod">Produto do Almoxarifado</label>
        <Select
          v-model="formIncluir.produto_id"
          input-id="almox-inv-inc-prod"
          :options="produtosAlmox"
          option-label="nome"
          option-value="produto_id"
          filter
          placeholder="Selecione o produto"
          aria-label="Produto do Almoxarifado"
          class="full"
        />
      </div>

      <div v-if="produtoIncluirSel && !ehPermanenteIncluir" class="field">
        <label for="almox-inv-inc-lote">Lote</label>
        <Select
          v-model="formIncluir.lote_id"
          input-id="almox-inv-inc-lote"
          :options="lotesProdutoIncluir"
          option-label="rotulo"
          option-value="lote_id"
          :placeholder="lotesProdutoIncluir.length ? 'Selecione o lote' : 'Nenhum lote cadastrado para este produto'"
          aria-label="Lote"
          class="full"
        />
      </div>

      <div class="field">
        <label for="almox-inv-inc-qtd">Quantidade física contada</label>
        <InputNumber
          v-model="formIncluir.contado"
          input-id="almox-inv-inc-qtd"
          :min="0"
          show-buttons
          class="full"
          @input="(e) => (formIncluir.contado = e.value)"
        />
      </div>

      <div class="field">
        <label for="almox-inv-inc-obs">Observação <span class="opc">(opcional)</span></label>
        <InputText
          id="almox-inv-inc-obs"
          v-model="formIncluir.observacao"
          placeholder="Ex.: Lote localizado na prateleira auxiliar"
          class="full"
        />
      </div>
    </form>

    <template #footer>
      <Button
        label="Cancelar"
        text
        severity="secondary"
        :disabled="incluindo"
        @click="incluirVisivel = false"
      />
      <Button
        type="submit"
        form="almox-inv-incluir-form"
        label="Registrar contagem"
        icon="pi pi-check"
        :disabled="!podeSalvarIncluir"
        :loading="incluindo"
      />
    </template>
  </Dialog>

  <!-- Diálogo de finalizar inventário -->
  <Dialog
    v-model:visible="finalizarVisivel"
    modal
    header="Finalizar inventário"
    :style="{ width: '31rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form id="almox-inv-finalizar-form" @submit.prevent="confirmarFinalizar">
      <div class="estorno-resumo" style="margin-bottom: 1rem">
        <div class="linha-campos" style="margin-bottom: 0; text-align: center">
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Contados</div>
            <div class="num" style="font-size: 1.1rem; font-weight: 650">
              {{ contadosCount }} / {{ itens.length }}
            </div>
          </div>
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Sem contagem</div>
            <div class="num" style="font-size: 1.1rem; font-weight: 650">{{ pendentes }}</div>
          </div>
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Diverg. pendentes</div>
            <div
              class="num"
              style="font-size: 1.1rem; font-weight: 650"
              :style="{ color: divergentesSemAjuste > 0 ? 'var(--warn-fg)' : 'var(--text-muted)' }"
            >
              {{ divergentesSemAjuste }}
            </div>
          </div>
        </div>
      </div>

      <p v-if="pendentes > 0" class="muted" style="margin: 0 0 0.75rem; font-size: 0.85rem">
        Nota: <strong>{{ pendentes }}</strong> item(ns) sem contagem não impedem o encerramento e permanecerão registrados como "não contados" no relatório.
      </p>

      <div
        v-if="divergentesSemAjuste > 0"
        class="estorno-resumo"
        style="margin-bottom: 1rem; border-color: var(--warn-fg)"
      >
        <div style="font-weight: 600; color: var(--warn-fg); margin-bottom: 0.35rem">
          Atenção: {{ divergentesSemAjuste }} divergência(s) ainda sem reajuste
        </div>
        <div class="muted" style="font-size: 0.82rem; margin-bottom: 0.6rem">
          O recomendável é aplicar o reajuste de cada item divergente antes de encerrar. Caso deseje encerrar sem reajustá-los agora, marque a confirmação abaixo.
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem">
          <Checkbox
            v-model="permitirDivergencias"
            input-id="almox-inv-perm-div"
            :binary="true"
          />
          <label for="almox-inv-perm-div" style="font-size: 0.84rem; cursor: pointer">
            Permitir finalizar com divergências pendentes sem ajuste
          </label>
        </div>
      </div>

      <div class="field">
        <label for="almox-inv-obs-fin">Observação de encerramento <span class="opc">(opcional)</span></label>
        <Textarea
          id="almox-inv-obs-fin"
          v-model="obsFinalizar"
          rows="2"
          auto-resize
          placeholder="Observações finais sobre a conferência física"
          class="full"
        />
        <small>Depois de finalizado, o inventário fica travado (imutável) e não pode mais ser alterado.</small>
      </div>
    </form>

    <template #footer>
      <Button
        label="Cancelar"
        text
        severity="secondary"
        :disabled="finalizando"
        @click="finalizarVisivel = false"
      />
      <Button
        type="submit"
        form="almox-inv-finalizar-form"
        label="Finalizar inventário"
        icon="pi pi-check"
        severity="success"
        :disabled="!podeConfirmarFinalizar"
        :loading="finalizando"
      />
    </template>
  </Dialog>
</template>
