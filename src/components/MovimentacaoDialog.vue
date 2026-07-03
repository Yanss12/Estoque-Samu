<script setup>
import { ref, watch, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { user, perfil } from '../lib/auth'
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from '../lib/movimentacoes'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produtos: { type: Array, default: () => [] },
  setores: { type: Array, default: () => [] },
  preselect: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)
const lotesDisponiveis = ref([])

const tipoOpcoes = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Saída', value: 'saida' },
]

const form = ref(novoForm())
function novoForm() {
  return {
    produto_id: null,
    tipo: 'saida',
    quantidade: 1,
    motivo: null,
    setor_id: null,
    observacao: '',
    numero_lote: '',
    validade: null,
    lote_id: null,
    // Saída multi-lote: { [lote_id]: quantidade }
    distribuicao: {},
  }
}

const motivoOpcoes = computed(() =>
  form.value.tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA
)
const ehLiberacao = computed(() => form.value.tipo === 'saida' && form.value.motivo === 'liberacao')
const produtoSel = computed(() => props.produtos.find((p) => p.id === form.value.produto_id) ?? null)
const ehControlado = computed(() => !!produtoSel.value?.controlado)
// Lote obrigatório p/ consumíveis; permanente (equipamento) é isento.
const loteObrigatorio = computed(() => !!produtoSel.value && produtoSel.value.categoria !== 'permanente')
// Saída multi-lote: usado quando o produto tem lotes e é saída.
const usaDistribuicao = computed(() => form.value.tipo === 'saida' && loteObrigatorio.value)
const totalDistribuido = computed(() =>
  Object.values(form.value.distribuicao).reduce((s, q) => s + (Number(q) || 0), 0)
)
const saldoTotalDoProduto = computed(() =>
  lotesDisponiveis.value.reduce((s, l) => s + (l.saldo || 0), 0)
)

watch(
  () => props.visible,
  (aberto) => {
    if (!aberto) return
    form.value = novoForm()
    lotesDisponiveis.value = []
    if (props.preselect) {
      form.value.produto_id = props.preselect.produto_id ?? null
      if (props.preselect.tipo) form.value.tipo = props.preselect.tipo
    }
    // motivo padrão do tipo
    form.value.motivo = form.value.tipo === 'entrada' ? 'almoxarifado' : 'liberacao'
    carregarLotes()
  }
)

// Ao trocar o tipo, reseta o motivo para o padrão daquele tipo.
watch(
  () => form.value.tipo,
  (t) => {
    form.value.motivo = t === 'entrada' ? 'almoxarifado' : 'liberacao'
    if (t === 'entrada') form.value.setor_id = null
    carregarLotes()
  }
)
watch(() => form.value.produto_id, carregarLotes)

async function carregarLotes() {
  form.value.lote_id = null
  form.value.distribuicao = {}
  if (form.value.tipo !== 'saida' || !form.value.produto_id) {
    lotesDisponiveis.value = []
    return
  }
  const { data } = await supabase
    .from('saldo_por_lote')
    .select('lote_id, numero_lote, validade, saldo')
    .eq('produto_id', form.value.produto_id)
    .gt('saldo', 0)
    .order('validade', { ascending: true, nullsFirst: false })
  lotesDisponiveis.value = (data ?? []).map((l) => ({
    ...l,
    rotulo: `${l.numero_lote || 'sem nº'} · venc. ${
      l.validade ? new Date(l.validade).toLocaleDateString('pt-BR') : '—'
    } · saldo ${l.saldo}`,
  }))
}

function fechar() {
  emit('update:visible', false)
}
function dataISO(d) {
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}
function onShow() {
  requestAnimationFrame(() => {
    document.getElementById(form.value.produto_id ? 'mov-qtd' : 'mov-produto')?.focus()
  })
}

async function salvar() {
  const f = form.value
  if (!f.produto_id || !f.tipo || !f.motivo) {
    toast.add({ severity: 'warn', summary: 'Faltam dados', detail: 'Produto, tipo e motivo são obrigatórios.', life: 4000 })
    return
  }
  if (ehLiberacao.value && !f.setor_id) {
    toast.add({ severity: 'warn', summary: 'Falta o setor', detail: 'Liberação precisa do setor de destino.', life: 4000 })
    return
  }
  // Entrada: lote+validade obrigatórios p/ consumíveis
  if (loteObrigatorio.value && f.tipo === 'entrada' && (!f.numero_lote?.trim() || !f.validade)) {
    toast.add({ severity: 'warn', summary: 'Lote obrigatório', detail: 'Informe o número do lote e a validade.', life: 4000 })
    return
  }
  if (f.tipo === 'entrada' && (!f.quantidade || f.quantidade <= 0)) {
    toast.add({ severity: 'warn', summary: 'Faltam dados', detail: 'Informe a quantidade.', life: 4000 })
    return
  }
  // Saída multi-lote: valida a distribuição
  if (usaDistribuicao.value) {
    if (!lotesDisponiveis.value.length) {
      toast.add({ severity: 'warn', summary: 'Sem estoque', detail: 'Este produto não tem lote com saldo.', life: 4500 })
      return
    }
    if (totalDistribuido.value <= 0) {
      toast.add({ severity: 'warn', summary: 'Quantidade vazia', detail: 'Distribua a quantidade entre os lotes.', life: 4000 })
      return
    }
    for (const l of lotesDisponiveis.value) {
      const q = Number(f.distribuicao[l.lote_id] || 0)
      if (q < 0) {
        toast.add({ severity: 'warn', summary: 'Quantidade inválida', detail: 'Não pode ser negativo.', life: 4000 })
        return
      }
      if (q > l.saldo) {
        toast.add({
          severity: 'warn',
          summary: 'Saldo do lote insuficiente',
          detail: `${l.numero_lote || 'sem nº'}: disponível ${l.saldo}, tentou ${q}.`,
          life: 5000,
        })
        return
      }
    }
  }
  // Saída sem lote (permanente): valida quantidade simples
  if (f.tipo === 'saida' && !usaDistribuicao.value && (!f.quantidade || f.quantidade <= 0)) {
    toast.add({ severity: 'warn', summary: 'Faltam dados', detail: 'Informe a quantidade.', life: 4000 })
    return
  }

  salvando.value = true
  try {
    // Saída multi-lote: 1 movimentação por lote com quantidade > 0.
    if (usaDistribuicao.value) {
      const linhas = lotesDisponiveis.value
        .map((l) => ({ lote_id: l.lote_id, qty: Number(f.distribuicao[l.lote_id] || 0) }))
        .filter((x) => x.qty > 0)
        .map((x) => ({
          produto_id: f.produto_id,
          setor_id: ehLiberacao.value ? f.setor_id : null,
          lote_id: x.lote_id,
          tipo: 'saida',
          quantidade: x.qty,
          motivo: f.motivo,
          observacao: f.observacao?.trim() || null,
        }))
      const { error } = await supabase.from('movimentacoes').insert(linhas)
      if (error) throw error

      toast.add({
        severity: 'success',
        summary: 'Saída registrada',
        detail: `${totalDistribuido.value} · ${produtoSel.value?.nome ?? ''} (${linhas.length} ${linhas.length === 1 ? 'lote' : 'lotes'})`,
        life: 4000,
      })
      emit('saved')
      fechar()
      return
    }

    // Entrada com nº de lote: reaproveita o lote existente (não duplica) ou cria.
    let lote_id = f.lote_id
    if (f.tipo === 'entrada' && f.numero_lote?.trim()) {
      const num = f.numero_lote.trim()
      const { data: existente } = await supabase
        .from('lotes')
        .select('id')
        .eq('produto_id', f.produto_id)
        .eq('numero_lote', num)
        .maybeSingle()
      if (existente) {
        lote_id = existente.id
        if (f.validade) await supabase.from('lotes').update({ validade: dataISO(f.validade) }).eq('id', existente.id)
      } else {
        const { data: novo, error: eLote } = await supabase
          .from('lotes')
          .insert({ produto_id: f.produto_id, numero_lote: num, validade: dataISO(f.validade) })
          .select('id')
          .single()
        if (eLote) throw eLote
        lote_id = novo.id
      }
    }

    const { error } = await supabase.from('movimentacoes').insert({
      produto_id: f.produto_id,
      setor_id: ehLiberacao.value ? f.setor_id : null,
      lote_id: lote_id || null,
      tipo: f.tipo,
      quantidade: f.quantidade,
      motivo: f.motivo,
      observacao: f.observacao?.trim() || null,
    })
    if (error) throw error

    toast.add({
      severity: 'success',
      summary: `${f.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada`,
      detail: `${f.quantidade} · ${produtoSel.value?.nome ?? ''}`,
      life: 4000,
    })
    emit('saved')
    fechar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro ao registrar', detail: err.message, life: 6000 })
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    @show="onShow"
    modal
    header="Registrar movimentação"
    :style="{ width: '34rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <div v-if="ehControlado" class="aviso-controlado">
      <i class="pi pi-shield" />
      <span>
        <strong>Medicamento controlado (Portaria 344/98).</strong>
        Registrado sob auditoria de <strong>{{ perfil?.nome || user?.email }}</strong>. Informe o lote.
      </span>
    </div>

    <form id="movform" @submit.prevent="salvar">
      <div class="field">
        <label>Tipo</label>
        <SelectButton v-model="form.tipo" :options="tipoOpcoes" option-label="label" option-value="value" :allow-empty="false" />
      </div>

      <div class="field">
        <label>Produto</label>
        <Select
          v-model="form.produto_id"
          input-id="mov-produto"
          :options="produtos"
          option-label="nome"
          option-value="id"
          filter
          placeholder="Selecione o produto"
          class="full"
        />
      </div>

      <div style="display: flex; gap: 0.75rem">
        <div class="field" style="flex: 1">
          <label>{{ form.tipo === 'entrada' ? 'Origem' : 'Tipo de saída' }}</label>
          <Select v-model="form.motivo" :options="motivoOpcoes" option-label="label" option-value="value" class="full" />
        </div>
        <!-- Quantidade só aparece quando NÃO é saída multi-lote (entrada ou saída de permanente) -->
        <div v-if="!usaDistribuicao" class="field" style="width: 9rem">
          <label>Quantidade</label>
          <InputNumber v-model="form.quantidade" input-id="mov-qtd" :min="1" show-buttons class="full" />
        </div>
      </div>

      <!-- Setor só aparece quando é liberação -->
      <div v-if="ehLiberacao" class="field">
        <label>Setor de destino</label>
        <Select
          v-model="form.setor_id"
          :options="setores"
          option-label="nome"
          option-value="id"
          placeholder="Para qual setor foi liberado?"
          class="full"
        />
      </div>

      <!-- Saída multi-lote: informa quanto sai de cada lote (FEFO sugerido na ordem) -->
      <div v-if="usaDistribuicao" class="field">
        <label>
          Quanto sai de cada lote * <span style="color: var(--text-muted); font-weight: 400">(primeiro a vencer no topo)</span>
        </label>
        <div v-if="!lotesDisponiveis.length" style="color: var(--text-muted); padding: 0.4rem 0">
          Este produto não tem lote com saldo.
        </div>
        <div v-else class="lotes-lista">
          <div v-for="l in lotesDisponiveis" :key="l.lote_id" class="lote-row">
            <div class="lote-info">
              <div class="lote-num"><span class="mono">{{ l.numero_lote || 'sem nº' }}</span></div>
              <div class="lote-meta">
                vence {{ l.validade ? new Date(l.validade).toLocaleDateString('pt-BR') : '—' }}
                · saldo <strong>{{ l.saldo }}</strong>
              </div>
            </div>
            <InputNumber
              v-model="form.distribuicao[l.lote_id]"
              :min="0"
              :max="l.saldo"
              :show-buttons="true"
              button-layout="horizontal"
              decrement-button-class="p-button-secondary"
              increment-button-class="p-button-secondary"
              :input-style="{ width: '4.5rem', textAlign: 'center' }"
            />
          </div>
          <div class="lote-total">
            Total: <strong>{{ totalDistribuido }}</strong> / disponível {{ saldoTotalDoProduto }}
          </div>
        </div>
      </div>

      <!-- Saída sem lote (permanente): mantém Select simples -->
      <div v-else-if="form.tipo === 'saida'" class="field">
        <label>Lote (opcional)</label>
        <Select
          v-model="form.lote_id"
          :options="lotesDisponiveis"
          option-label="rotulo"
          option-value="lote_id"
          show-clear
          :placeholder="lotesDisponiveis.length ? 'Selecione o lote' : 'Sem lote com saldo'"
          class="full"
        />
      </div>

      <!-- Entrada: reaproveita/cria lote -->
      <div v-else style="display: flex; gap: 0.75rem">
        <div class="field" style="flex: 1">
          <label>Lote{{ loteObrigatorio ? ' *' : ' (opcional)' }}</label>
          <InputText v-model="form.numero_lote" placeholder="Nº do lote" class="full" />
        </div>
        <div class="field" style="flex: 1">
          <label>Validade{{ loteObrigatorio ? ' *' : ' (opcional)' }}</label>
          <DatePicker v-model="form.validade" date-format="dd/mm/yy" show-icon class="full" />
        </div>
      </div>

      <div class="field">
        <label>Observação (opcional)</label>
        <Textarea v-model="form.observacao" rows="2" auto-resize class="full" />
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="fechar" :disabled="salvando" />
      <Button type="submit" form="movform" label="Registrar" icon="pi pi-check" :loading="salvando" />
    </template>
  </Dialog>
</template>
