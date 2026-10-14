<script setup>
import { ref, watch, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { user, perfil, ehAdmin } from '../lib/auth'
import { MOTIVOS_ENTRADA, MOTIVOS_SAIDA } from '../lib/movimentacoes'
import { fmtDataLocal, diasAte } from '../lib/format'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produtos: { type: Array, default: () => [] },
  setores: { type: Array, default: () => [] },
  preselect: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const confirm = useConfirm()
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
// Lote vencido só pode sair como avariado/perda (o banco também bloqueia).
const ehAvariado = computed(() => form.value.motivo === 'avariado')
function loteBloqueado(l) {
  return l.vencido && !ehAvariado.value
}
// Avariado: vencidos no topo (é o que se descarta). Demais: válidos em FEFO, vencidos no fim.
const lotesOrdenados = computed(() => {
  const validos = lotesDisponiveis.value.filter((l) => !l.vencido)
  const vencidos = lotesDisponiveis.value.filter((l) => l.vencido)
  return ehAvariado.value ? [...vencidos, ...validos] : [...validos, ...vencidos]
})
const saldoTotalDoProduto = computed(() =>
  lotesDisponiveis.value.filter((l) => !loteBloqueado(l)).reduce((s, l) => s + (l.saldo || 0), 0)
)
// FEFO automático: o operador informa o total e o sistema preenche os lotes
// na ordem da lista (pulando os bloqueados). Os campos por lote continuam editáveis.
const qtdTotal = ref(null)
let somaAuto = null // soma que a última distribuição automática gerou
function distribuir(total) {
  const dist = {}
  let resta = Math.max(0, Number(total) || 0)
  for (const l of lotesOrdenados.value) {
    if (resta <= 0) break
    if (loteBloqueado(l)) continue
    const q = Math.min(resta, l.saldo)
    dist[l.lote_id] = q
    resta -= q
  }
  form.value.distribuicao = dist
  somaAuto = Math.max(0, Number(total) || 0) - resta
}
function onQtdTotal(v) {
  qtdTotal.value = v
  distribuir(v)
}
// Ajuste manual num lote: o total acompanha, sem redistribuir.
watch(
  () => Object.values(form.value.distribuicao).reduce((s, q) => s + (Number(q) || 0), 0),
  (t) => {
    if (t !== somaAuto) qtdTotal.value = t || null
  }
)
const faltaParaTotal = computed(() =>
  qtdTotal.value && qtdTotal.value > saldoTotalDoProduto.value ? qtdTotal.value - saldoTotalDoProduto.value : 0
)

const saldoVencido = computed(() =>
  lotesDisponiveis.value.filter((l) => l.vencido).reduce((s, l) => s + (l.saldo || 0), 0)
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
// Saiu de "avariado": zera o que tinha sido posto em lote vencido.
watch(
  () => form.value.motivo,
  () => {
    for (const l of lotesDisponiveis.value) {
      if (loteBloqueado(l)) delete form.value.distribuicao[l.lote_id]
    }
    if (qtdTotal.value) distribuir(qtdTotal.value)
  }
)
watch(() => form.value.produto_id, carregarLotes)

async function carregarLotes() {
  form.value.lote_id = null
  form.value.distribuicao = {}
  qtdTotal.value = null
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
  lotesDisponiveis.value = (data ?? []).map((l) => {
    const dias = diasAte(l.validade)
    return {
      ...l,
      vencido: dias !== null && dias < 0,
      dias,
      validadeFmt: fmtDataLocal(l.validade),
      rotulo: `${l.numero_lote || 'sem nº'} · venc. ${fmtDataLocal(l.validade)} · saldo ${l.saldo}`,
    }
  })
}

function fechar() {
  emit('update:visible', false)
}
// Pergunta sim/não. Resolve true (trocar), false (manter) ou null (cancelar o registro).
function perguntar(mensagem, acceptLabel = 'Trocar validade', rejectLabel = 'Manter a atual') {
  return new Promise((resolve) => {
    confirm.require({
      header: 'Validade diferente',
      message: mensagem,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel,
      rejectLabel,
      accept: () => resolve(true),
      reject: () => resolve(false),
      onHide: () => resolve(null),
    })
  })
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
      if (q > 0 && loteBloqueado(l)) {
        toast.add({
          severity: 'warn',
          summary: 'Lote vencido',
          detail: `${l.numero_lote || 'sem nº'} venceu em ${l.validadeFmt}. Só pode sair como "Avariado / perda".`,
          life: 6000,
        })
        return
      }
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
      // Mesmo lote ignorando maiúsculas/espaços ("ab12" = "AB12 "), igual ao índice único do banco.
      const chave = num.toUpperCase()
      const { data: lotesProd, error: eBusca } = await supabase
        .from('lotes')
        .select('id, numero_lote, validade')
        .eq('produto_id', f.produto_id)
      if (eBusca) throw eBusca
      const existente = (lotesProd ?? []).find((l) => (l.numero_lote ?? '').trim().toUpperCase() === chave)
      if (existente) {
        lote_id = existente.id
        const novaValidade = dataISO(f.validade)
        if (novaValidade && novaValidade !== existente.validade) {
          if (!ehAdmin.value) {
            const registrar = await perguntar(
              `Lote ${existente.numero_lote} já cadastrado com validade ${fmtDataLocal(existente.validade)}. ` +
                'Só o admin corrige a validade. Registrar com a validade atual?',
              'Registrar com a validade atual',
              'Cancelar'
            )
            if (registrar !== true) return
          } else {
            const trocar = await perguntar(
              `O lote ${existente.numero_lote} já está cadastrado com validade ${fmtDataLocal(existente.validade)}. ` +
                `Trocar para ${fmtDataLocal(novaValidade)}? Isso vale para todo o saldo desse lote.`
            )
            if (trocar === null) return
            if (trocar) {
              const { error: eVal } = await supabase.from('lotes').update({ validade: novaValidade }).eq('id', existente.id)
              if (eVal) throw eVal
            }
          }
        }
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
      <i class="pi pi-shield" aria-hidden="true" />
      <span>
        <strong>Controlado (Portaria 344/98).</strong>
        Fica registrado em nome de <strong>{{ perfil?.nome || user?.email }}</strong>. Confira o lote.
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

      <div class="linha-campos">
        <div class="field">
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
          Quantidade
          <span class="opc">· {{ ehAvariado ? 'vencidos no topo' : 'primeiro a vencer no topo' }}</span>
        </label>
        <div v-if="lotesDisponiveis.length" class="qtd-fefo">
          <InputNumber
            :model-value="qtdTotal"
            input-id="mov-qtd"
            :min="0"
            placeholder="Quantidade"
            aria-label="Quantidade total da saída"
            show-buttons
            @update:model-value="onQtdTotal"
            @input="onQtdTotal($event.value)"
          />
          <span class="muted">
            {{ ehAvariado ? 'Distribui a partir dos vencidos.' : 'Distribui do lote que vence primeiro.' }}
            Ajuste por lote se precisar.
          </span>
        </div>
        <div v-if="faltaParaTotal" class="empty" style="color: var(--danger-fg); margin-bottom: 0.5rem">
          Faltam {{ faltaParaTotal }}: só há {{ saldoTotalDoProduto }} disponíveis.
        </div>
        <div v-if="!lotesDisponiveis.length" class="empty" style="padding: 0.4rem 0">
          Este produto não tem lote com saldo. Registre uma entrada primeiro.
        </div>
        <div v-else class="lotes-lista">
          <div
            v-for="l in lotesOrdenados"
            :key="l.lote_id"
            class="lote-row"
            :class="{ 'lote-vencido': l.vencido, 'lote-bloqueado': loteBloqueado(l) }"
          >
            <div class="lote-info">
              <div class="lote-num">
                <span class="mono">{{ l.numero_lote || 'sem nº' }}</span>
                <span v-if="l.vencido" class="tag-vencido">Vencido</span>
              </div>
              <div class="lote-meta">
                <template v-if="l.vencido">venceu em {{ l.validadeFmt }}</template>
                <template v-else>vence {{ l.validadeFmt }}<template v-if="l.dias !== null && l.dias <= 60"> · em {{ l.dias }} {{ l.dias === 1 ? 'dia' : 'dias' }}</template></template>
                · saldo <strong>{{ l.saldo }}</strong>
              </div>
              <div v-if="loteBloqueado(l)" class="lote-meta">Só sai como "Avariado / perda".</div>
            </div>
            <InputNumber
              v-model="form.distribuicao[l.lote_id]"
              :disabled="loteBloqueado(l)"
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
            <span>Total da saída</span>
            <span><strong>{{ totalDistribuido }}</strong> de {{ saldoTotalDoProduto }} disponíveis</span>
          </div>
          <div v-if="saldoVencido && !ehAvariado" class="lote-total">
            <span>Em lotes vencidos</span>
            <span>{{ saldoVencido }} · registrar baixa como "Avariado / perda"</span>
          </div>
        </div>
      </div>

      <!-- Saída sem lote (permanente): mantém Select simples -->
      <div v-else-if="form.tipo === 'saida'" class="field">
        <label>Lote <span class="opc">(opcional)</span></label>
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
      <div v-else class="linha-campos">
        <div class="field">
          <label>Lote <span v-if="!loteObrigatorio" class="opc">(opcional)</span></label>
          <InputText v-model="form.numero_lote" placeholder="Como está na embalagem" class="full" />
        </div>
        <div class="field">
          <label>Validade <span v-if="!loteObrigatorio" class="opc">(opcional)</span></label>
          <DatePicker v-model="form.validade" date-format="dd/mm/yy" show-icon class="full" />
        </div>
      </div>

      <div class="field">
        <label>Observação <span class="opc">(opcional)</span></label>
        <Textarea v-model="form.observacao" rows="2" auto-resize class="full" />
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="fechar" :disabled="salvando" />
      <Button
        type="submit"
        form="movform"
        :label="form.tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída'"
        :severity="form.tipo === 'entrada' ? 'success' : 'danger'"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
