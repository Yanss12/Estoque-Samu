<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { motivoLabel } from '../lib/movimentacoes'
import { mensagemErro } from '../lib/format'
import { codigoErroAlmox, mensagemErroAlmox } from '../lib/almox'

// Estorno = movimentação inversa ligada à original (movimentações não se editam
// nem se apagam). O banco copia produto/lote/quantidade/setor da original.
const props = defineProps({
  visible: { type: Boolean, default: false },
  mov: { type: Object, default: null },
  acao: { type: Function, default: null }, // async (mov, justificativa) => ({ error })
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const justificativa = ref('')
const salvando = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (v) justificativa.value = ''
  }
)

const ehEntrada = computed(() => props.mov?.tipo === 'entrada')
const valida = computed(() => justificativa.value.trim().length >= 5)
const nomeProd = computed(() => props.mov?.produto?.nome ?? props.mov?.produto ?? '')
const numLote = computed(() => props.mov?.lote?.numero_lote ?? props.mov?.numero_lote ?? null)
const efeito = computed(() => {
  const m = props.mov
  if (!m) return ''
  const lote = numLote.value ? ` do lote ${numLote.value}` : ''
  return ehEntrada.value
    ? `Sai ${m.quantidade} do estoque${lote}, desfazendo a entrada.`
    : `Volta ${m.quantidade} para o estoque${lote}, desfazendo a saída.`
})

async function confirmar() {
  if (!valida.value) return
  const m = props.mov
  salvando.value = true
  try {
    let error = null
    if (typeof props.acao === 'function') {
      const res = await props.acao(m, justificativa.value.trim())
      error = res?.error ?? null
    } else {
      const res = await supabase.from('movimentacoes').insert({
        estorno_de: m.id,
        observacao: justificativa.value.trim(),
        // O banco sobrescreve estes campos a partir da original; vão por clareza.
        produto_id: m.produto_id,
        lote_id: m.lote_id ?? null,
        setor_id: m.setor_id ?? null,
        quantidade: m.quantidade,
        motivo: m.motivo,
        tipo: ehEntrada.value ? 'saida' : 'entrada',
      })
      error = res.error
    }
    if (error) throw error
    toast.add({ severity: 'success', summary: 'Lançamento estornado', detail: nomeProd.value, life: 4000 })
    emit('saved')
    emit('update:visible', false)
  } catch (err) {
    const cod = codigoErroAlmox(err)
    const jaEstornada = cod === 'ALMOX_JA_ESTORNADO' || err.message?.includes('movimentacoes_estorno_de_uk')
    toast.add({
      severity: 'error',
      summary: jaEstornada ? 'Já estornada' : 'Não foi possível estornar',
      detail: jaEstornada ? 'Este lançamento já tem um estorno.' : cod ? mensagemErroAlmox(err) : mensagemErro(err),
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
    header="Estornar lançamento"
    :style="{ width: '30rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <template v-if="mov">
      <div class="estorno-resumo">
        <div class="feed-title">{{ nomeProd }}</div>
        <div class="feed-sub">
          {{ ehEntrada ? 'Entrada' : 'Saída' }} de <strong>{{ mov.quantidade }}</strong> · {{ motivoLabel(mov.motivo) }}
          <template v-if="mov.setor?.nome"> → {{ mov.setor.nome }}</template>
          <template v-else-if="mov.destino"> → {{ mov.destino }}</template>
          <template v-if="numLote"> · lote <span class="mono">{{ numLote }}</span></template>
        </div>
      </div>
      <p class="estorno-efeito">{{ efeito }} O lançamento original continua no histórico, marcado como estornado.</p>

      <div class="field" style="margin-bottom: 0">
        <label for="estorno-just">Por que estornar?</label>
        <Textarea
          id="estorno-just"
          v-model="justificativa"
          rows="2"
          auto-resize
          class="full"
          placeholder="Ex.: lançado no produto errado"
          autofocus
        />
        <small>Fica registrado na auditoria junto com seu nome (mín. 5 caracteres).</small>
      </div>
    </template>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="emit('update:visible', false)" />
      <Button label="Estornar" severity="danger" :loading="salvando" :disabled="!valida" @click="confirmar" />
    </template>
  </Dialog>
</template>
