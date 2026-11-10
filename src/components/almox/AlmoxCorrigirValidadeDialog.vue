<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { fmtDataLocal, dataISOLocal, ehValidadeProvisoria } from '../../lib/format'
import { almoxRpc, mensagemErroAlmox } from '../../lib/almox'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produto: { type: Object, default: null },
  lote: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)
const novaValidadeData = ref(null)
const justificativa = ref('')
const erroMsg = ref('')

function parseISOParaDate(iso) {
  if (!iso || typeof iso !== 'string') return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const novaValidadeISO = computed(() => {
  if (!novaValidadeData.value) return ''
  return dataISOLocal(new Date(novaValidadeData.value))
})

const validadeIgual = computed(
  () => Boolean(novaValidadeISO.value && props.lote?.validade && novaValidadeISO.value === props.lote.validade)
)

const justificativaTrim = computed(() => (justificativa.value || '').trim())
const justificativaValida = computed(() => justificativaTrim.value.length >= 10)

const podeConfirmar = computed(
  () => Boolean(props.lote?.lote_id && novaValidadeISO.value && !validadeIgual.value && justificativaValida.value)
)

watch(
  () => props.visible,
  (aberto) => {
    if (!aberto) return
    novaValidadeData.value = ehValidadeProvisoria(props.lote?.validade)
      ? null
      : parseISOParaDate(props.lote?.validade)
    justificativa.value = ''
    erroMsg.value = ''
  }
)

watch([novaValidadeData, justificativa], () => {
  if (erroMsg.value) erroMsg.value = ''
})

function fechar() {
  emit('update:visible', false)
}

async function salvar() {
  erroMsg.value = ''
  if (!props.lote?.lote_id) return
  if (justificativaTrim.value.length < 10) {
    erroMsg.value = 'Informe uma justificativa com no mínimo 10 caracteres.'
    return
  }
  if (!novaValidadeISO.value) {
    erroMsg.value = 'Informe a nova data de validade.'
    return
  }
  if (validadeIgual.value) {
    erroMsg.value = 'A nova validade informada é igual à validade atual do lote.'
    return
  }

  salvando.value = true
  try {
    const { data, error } = await almoxRpc('almox_corrigir_validade_lote', {
      p_lote_id: props.lote.lote_id,
      p_nova_validade: novaValidadeISO.value,
      p_justificativa: justificativaTrim.value,
    })
    if (error) throw error

    const valAnt = data?.validade_anterior ?? props.lote.validade
    const valNova = data?.validade_nova ?? novaValidadeISO.value
    const numLote = data?.numero_lote ?? props.lote.numero_lote

    toast.add({
      severity: 'success',
      summary: 'Validade corrigida',
      detail: `Lote ${numLote}: ${fmtDataLocal(valAnt)} → ${fmtDataLocal(valNova)}`,
      life: 4500,
    })
    emit('saved', data)
    fechar()
  } catch (err) {
    const msg = mensagemErroAlmox(err)
    erroMsg.value = msg
    toast.add({
      severity: 'error',
      summary: 'Não foi possível corrigir a validade',
      detail: msg,
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
    header="Corrigir validade do lote"
    :style="{ width: '30rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form v-if="lote" id="almox-corrigir-validade-form" @submit.prevent="salvar">
      <div class="estorno-resumo" style="margin-bottom: 1rem">
        <div class="feed-title">
          <strong>{{ produto?.nome || 'Produto' }}</strong>
        </div>
        <div class="feed-sub" style="margin-top: 0.3rem">
          Lote: <strong class="mono">{{ lote.numero_lote }}</strong>
          <span class="sep">·</span>Validade atual:
          <span v-if="ehValidadeProvisoria(lote.validade)" class="tag-provisoria">provisória</span>
          <strong v-else>{{ fmtDataLocal(lote.validade) }}</strong>
          <span class="sep">·</span>Saldo: <strong>{{ lote.saldo }}</strong>
        </div>
        <div class="feed-obs" style="margin-top: 0.35rem">
          O número do lote não muda. Apenas a data de validade será atualizada (com registro na auditoria).
        </div>
      </div>

      <div
        v-if="erroMsg"
        role="alert"
        style="
          margin-bottom: 0.9rem;
          padding: 0.6rem 0.75rem;
          border-radius: 6px;
          background: var(--danger-bg);
          color: var(--danger-fg);
          font-size: 0.84rem;
          font-weight: 500;
        "
      >
        {{ erroMsg }}
      </div>

      <div class="field">
        <label for="almox-corr-val-data">Nova validade</label>
        <DatePicker
          v-model="novaValidadeData"
          input-id="almox-corr-val-data"
          date-format="dd/mm/yy"
          :manual-input="true"
          :show-on-focus="false"
          show-icon
          placeholder="dd/mm/aaaa"
          aria-label="Nova validade"
          class="full"
        />
        <small v-if="validadeIgual" style="color: var(--warn-fg)">
          A nova validade deve ser diferente da validade atual ({{ fmtDataLocal(lote.validade) }}).
        </small>
      </div>

      <div class="field" style="margin-bottom: 0">
        <label for="almox-corr-val-just">
          Justificativa obrigatória <span class="opc">(mín. 10 caracteres)</span>
        </label>
        <Textarea
          id="almox-corr-val-just"
          v-model="justificativa"
          rows="2"
          auto-resize
          placeholder="Descreva o motivo da correção (ex.: data divergente da embalagem física)"
          class="full"
        />
        <small
          v-if="justificativaTrim.length > 0 && !justificativaValida"
          style="color: var(--warn-fg)"
        >
          Informe pelo menos 10 caracteres (atual: {{ justificativaTrim.length }}).
        </small>
        <small v-else>
          Não é permitido corrigir a validade de lote já transferido para a Farmácia.
        </small>
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="fechar" />
      <Button
        type="submit"
        form="almox-corrigir-validade-form"
        label="Salvar validade"
        :disabled="!podeConfirmar"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
