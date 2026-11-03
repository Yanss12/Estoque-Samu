<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { fmtDataLocal } from '../../lib/format'
import { almoxSelectView, almoxRpc, mensagemErroAlmox } from '../../lib/almox'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produtos: { type: Array, default: () => [] },
  produtoPreselecionado: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)
const lotesProduto = ref([])

const form = ref({
  produto_id: null,
  lote_id: null,
  quantidade_encontrada: null,
  justificativa: '',
})

const produtosAtivos = computed(() =>
  props.produtos
    .filter((p) => p.ativo !== false)
    .map((p) => ({
      ...p,
      id: p.produto_id ?? p.id,
      nome: p.nome,
      categoria: p.categoria,
      saldo: p.saldo ?? 0,
    }))
)

const produtoSel = computed(() =>
  produtosAtivos.value.find((p) => Number(p.id) === Number(form.value.produto_id)) ?? null
)

const ehPermanente = computed(() => produtoSel.value?.categoria === 'permanente')

const loteSel = computed(() =>
  lotesProduto.value.find((l) => Number(l.lote_id) === Number(form.value.lote_id)) ?? null
)

const quantidadeAnterior = computed(() => {
  if (!produtoSel.value) return 0
  if (ehPermanente.value) return Number(produtoSel.value.saldo ?? 0)
  return Number(loteSel.value?.saldo ?? 0)
})

const diferenca = computed(() => {
  if (form.value.quantidade_encontrada === null || form.value.quantidade_encontrada === undefined) return 0
  return Number(form.value.quantidade_encontrada) - quantidadeAnterior.value
})

const justificativaValida = computed(() => (form.value.justificativa || '').trim().length >= 10)

const podeConfirmar = computed(() => {
  if (!form.value.produto_id) return false
  if (!ehPermanente.value && !form.value.lote_id) return false
  if (form.value.quantidade_encontrada === null || form.value.quantidade_encontrada < 0) return false
  if (diferenca.value === 0) return false
  return justificativaValida.value
})

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto) return
    const preId = props.produtoPreselecionado?.produto_id ?? props.produtoPreselecionado?.id ?? null
    form.value = {
      produto_id: preId,
      lote_id: null,
      quantidade_encontrada: null,
      justificativa: '',
    }
    await carregarLotes()
  }
)

watch(
  () => form.value.produto_id,
  async () => {
    form.value.lote_id = null
    form.value.quantidade_encontrada = null
    await carregarLotes()
  }
)

watch(
  () => form.value.lote_id,
  () => {
    if (loteSel.value) {
      form.value.quantidade_encontrada = Number(loteSel.value.saldo ?? 0)
    }
  }
)

async function carregarLotes() {
  lotesProduto.value = []
  if (!form.value.produto_id) return
  if (ehPermanente.value) {
    form.value.quantidade_encontrada = Number(produtoSel.value?.saldo ?? 0)
    return
  }
  const { data } = await almoxSelectView('almox_saldo_lote', {
    eq: { produto_id: form.value.produto_id },
    order: { column: 'validade', ascending: true },
  })
  lotesProduto.value = (data ?? []).map((l) => ({
    ...l,
    rotulo: `${l.numero_lote} · venc. ${fmtDataLocal(l.validade)} · saldo atual: ${l.saldo}`,
  }))
  if (lotesProduto.value.length === 1) {
    form.value.lote_id = lotesProduto.value[0].lote_id
    form.value.quantidade_encontrada = Number(lotesProduto.value[0].saldo ?? 0)
  }
}

function fechar() {
  emit('update:visible', false)
}

async function salvar() {
  if (!podeConfirmar.value) return
  salvando.value = true
  try {
    const { data, error } = await almoxRpc('almox_reajustar_estoque', {
      p_produto_id: form.value.produto_id,
      p_lote_id: ehPermanente.value ? null : form.value.lote_id,
      p_quantidade_encontrada: Number(form.value.quantidade_encontrada),
      p_justificativa: form.value.justificativa.trim(),
    })
    if (error) throw error

    const dif = data?.diferenca ?? diferenca.value
    const sinal = dif > 0 ? `+${dif}` : `${dif}`
    toast.add({
      severity: 'success',
      summary: 'Estoque reajustado',
      detail: `${produtoSel.value?.nome}: ${quantidadeAnterior.value} → ${form.value.quantidade_encontrada} (${sinal})`,
      life: 4500,
    })
    emit('saved')
    fechar()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Não foi possível reajustar',
      detail: mensagemErroAlmox(err),
      life: 6000,
    })
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    header="Reajustar estoque no Almoxarifado"
    :style="{ width: '32rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form id="almox-reajuste-form" @submit.prevent="salvar">
      <div class="field">
        <label for="almox-reaj-prod">Produto</label>
        <Select
          v-model="form.produto_id"
          input-id="almox-reaj-prod"
          :options="produtosAtivos"
          option-label="nome"
          option-value="id"
          filter
          placeholder="Selecione o produto"
          aria-label="Produto"
          class="full"
        />
      </div>

      <div v-if="produtoSel && !ehPermanente" class="field">
        <label for="almox-reaj-lote">Lote a reajustar</label>
        <Select
          v-model="form.lote_id"
          input-id="almox-reaj-lote"
          :options="lotesProduto"
          option-label="rotulo"
          option-value="lote_id"
          :placeholder="lotesProduto.length ? 'Selecione o lote' : 'Nenhum lote cadastrado para este produto'"
          aria-label="Lote"
          class="full"
        />
      </div>

      <div v-if="produtoSel && (ehPermanente || form.lote_id)" class="estorno-resumo" style="margin-bottom: 1rem">
        <div class="linha-campos" style="margin-bottom: 0; text-align: center">
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Saldo anterior</div>
            <div class="num" style="font-size: 1.15rem; font-weight: 650">{{ quantidadeAnterior }}</div>
          </div>
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Qtd encontrada</div>
            <div class="num" style="font-size: 1.15rem; font-weight: 650">
              {{ form.quantidade_encontrada ?? '—' }}
            </div>
          </div>
          <div style="flex: 1">
            <div class="muted" style="font-size: 0.75rem">Diferença</div>
            <div
              class="num"
              style="font-size: 1.15rem; font-weight: 650"
              :style="{
                color:
                  diferenca > 0
                    ? 'var(--ok-fg)'
                    : diferenca < 0
                      ? 'var(--danger-fg)'
                      : 'var(--text-muted)',
              }"
            >
              {{ diferenca > 0 ? `+${diferenca}` : diferenca }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="produtoSel && (ehPermanente || form.lote_id)" class="field">
        <label for="almox-reaj-qtd">Quantidade física encontrada</label>
        <InputNumber
          v-model="form.quantidade_encontrada"
          input-id="almox-reaj-qtd"
          :min="0"
          show-buttons
          class="full"
        />
        <small v-if="diferenca === 0" style="color: var(--warn-fg)">
          Informe uma quantidade diferente do saldo atual ({{ quantidadeAnterior }}) para registrar o reajuste.
        </small>
      </div>

      <div class="field">
        <label for="almox-reaj-just">
          Justificativa obrigatória <span class="opc">(mín. 10 caracteres)</span>
        </label>
        <Textarea
          id="almox-reaj-just"
          v-model="form.justificativa"
          rows="2"
          auto-resize
          placeholder="Descreva o motivo da divergência constatada na conferência física"
          class="full"
        />
        <small>
          Fica registrado e não pode ser apagado nem estornado (grava saldo anterior, encontrado, ajustado e diferença).
        </small>
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="fechar" />
      <Button
        type="submit"
        form="almox-reajuste-form"
        label="Aplicar reajuste"
        :disabled="!podeConfirmar"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
