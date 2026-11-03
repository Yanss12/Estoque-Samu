<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { user, perfil } from '../../lib/auth'
import { fmtDataLocal } from '../../lib/format'
import {
  ALMOX_MOTIVOS_SAIDA,
  ALMOX_MOTIVOS_LOTE_VENCIDO,
  almoxSelectView,
  almoxRpc,
  mensagemErroAlmox,
} from '../../lib/almox'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produtos: { type: Array, default: () => [] },
  produtoPreselecionado: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)
const lotesDisponiveis = ref([])

const form = ref(novoForm())
function novoForm() {
  return {
    produto_id: null,
    motivo: 'outra_unidade',
    destino: '',
    documento: '',
    justificativa: '',
    observacao: '',
    quantidade: 1, // usado para itens permanentes (sem lote)
    distribuicao: {},
  }
}

const produtosAtivos = computed(() =>
  props.produtos
    .filter((p) => p.ativo !== false)
    .map((p) => ({
      ...p,
      id: p.produto_id ?? p.id,
      nome: p.nome,
      categoria: p.categoria,
      controlado: Boolean(p.controlado),
      saldo: p.saldo ?? 0,
    }))
)

const produtoSel = computed(() =>
  produtosAtivos.value.find((p) => Number(p.id) === Number(form.value.produto_id)) ?? null
)

const ehControlado = computed(() => !!produtoSel.value?.controlado)
const loteObrigatorio = computed(() => !!produtoSel.value && produtoSel.value.categoria !== 'permanente')
const ehOutraUnidade = computed(() => form.value.motivo === 'outra_unidade')
const exigeJustificativa = computed(() => ['outros', 'perda_avaria'].includes(form.value.motivo))
const aceitaVencido = computed(() => ALMOX_MOTIVOS_LOTE_VENCIDO.includes(form.value.motivo))
const somenteVencido = computed(() => form.value.motivo === 'vencido')

function loteBloqueado(l) {
  if (somenteVencido.value) return !l.vencido
  return l.vencido && !aceitaVencido.value
}

// Vencidos no topo quando motivo 'vencido' ou 'perda_avaria'; válidos em FEFO nos demais.
const lotesOrdenados = computed(() => {
  const validos = lotesDisponiveis.value.filter((l) => !l.vencido)
  const vencidos = lotesDisponiveis.value.filter((l) => l.vencido)
  return aceitaVencido.value ? [...vencidos, ...validos] : [...validos, ...vencidos]
})

const saldoTotalUtilizavel = computed(() =>
  lotesDisponiveis.value
    .filter((l) => !loteBloqueado(l))
    .reduce((s, l) => s + (Number(l.saldo) || 0), 0)
)

const saldoVencido = computed(() =>
  lotesDisponiveis.value
    .filter((l) => l.vencido)
    .reduce((s, l) => s + (Number(l.saldo) || 0), 0)
)

const totalDistribuido = computed(() =>
  Object.values(form.value.distribuicao).reduce((s, q) => s + (Number(q) || 0), 0)
)

const qtdTotal = ref(null)
let somaAuto = null

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

watch(
  () => Object.values(form.value.distribuicao).reduce((s, q) => s + (Number(q) || 0), 0),
  (t) => {
    if (t !== somaAuto) qtdTotal.value = t || null
  }
)

const faltaParaTotal = computed(() =>
  qtdTotal.value && qtdTotal.value > saldoTotalUtilizavel.value
    ? qtdTotal.value - saldoTotalUtilizavel.value
    : 0
)

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto) return
    form.value = novoForm()
    lotesDisponiveis.value = []
    if (props.produtoPreselecionado) {
      form.value.produto_id = props.produtoPreselecionado.produto_id ?? props.produtoPreselecionado.id ?? null
    }
    await carregarLotes()
  }
)

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
  form.value.distribuicao = {}
  qtdTotal.value = null
  if (!form.value.produto_id) {
    lotesDisponiveis.value = []
    return
  }
  const { data } = await almoxSelectView('almox_saldo_lote', {
    eq: { produto_id: form.value.produto_id },
    order: { column: 'validade', ascending: true },
  })
  lotesDisponiveis.value = (data ?? [])
    .filter((l) => Number(l.saldo) > 0)
    .map((l) => ({
      ...l,
      validadeFmt: fmtDataLocal(l.validade),
    }))
}

function fechar() {
  emit('update:visible', false)
}

async function salvar() {
  const f = form.value
  if (!f.produto_id || !f.motivo) {
    toast.add({
      severity: 'warn',
      summary: 'Faltam dados',
      detail: 'Selecione o produto e o motivo da saída.',
      life: 4000,
    })
    return
  }
  if (ehOutraUnidade.value && (f.destino || '').trim().length < 2) {
    toast.add({
      severity: 'warn',
      summary: 'Destino obrigatório',
      detail: 'Informe a unidade de destino (mín. 2 caracteres).',
      life: 4000,
    })
    return
  }
  if (exigeJustificativa.value && (f.justificativa || '').trim().length < 5) {
    toast.add({
      severity: 'warn',
      summary: 'Justificativa obrigatória',
      detail: 'Informe a justificativa para este motivo (mín. 5 caracteres).',
      life: 4500,
    })
    return
  }

  let p_itens = []
  if (loteObrigatorio.value) {
    if (!lotesDisponiveis.value.length) {
      toast.add({
        severity: 'warn',
        summary: 'Sem estoque',
        detail: 'Este produto não possui lote com saldo no Almoxarifado.',
        life: 4500,
      })
      return
    }
    if (totalDistribuido.value <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Quantidade vazia',
        detail: 'Informe ou distribua a quantidade entre os lotes disponíveis.',
        life: 4000,
      })
      return
    }
    for (const l of lotesDisponiveis.value) {
      const q = Number(f.distribuicao[l.lote_id] || 0)
      if (q <= 0) continue
      if (loteBloqueado(l)) {
        toast.add({
          severity: 'warn',
          summary: 'Lote bloqueado para este motivo',
          detail: l.vencido
            ? `O lote ${l.numero_lote} está vencido e só sai por "Vencido (descarte)" ou "Perda / avaria".`
            : `O lote ${l.numero_lote} ainda está válido e não pode sair pelo motivo "Vencido".`,
          life: 6000,
        })
        return
      }
      if (q > l.saldo) {
        toast.add({
          severity: 'warn',
          summary: 'Saldo insuficiente no lote',
          detail: `Lote ${l.numero_lote}: disponível ${l.saldo}, solicitado ${q}.`,
          life: 5000,
        })
        return
      }
      p_itens.push({
        produto_id: f.produto_id,
        lote_id: l.lote_id,
        quantidade: q,
      })
    }
  } else {
    const q = Number(f.quantidade)
    if (!Number.isInteger(q) || q <= 0) {
      toast.add({
        severity: 'warn',
        summary: 'Quantidade inválida',
        detail: 'Informe uma quantidade inteira positiva.',
        life: 4000,
      })
      return
    }
    p_itens = [{ produto_id: f.produto_id, lote_id: null, quantidade: q }]
  }

  salvando.value = true
  try {
    const p_cabecalho = {
      motivo: f.motivo,
      destino: ehOutraUnidade.value ? f.destino.trim() : null,
      justificativa: f.justificativa?.trim() || null,
      documento: f.documento?.trim() || null,
      observacao: f.observacao?.trim() || null,
    }
    const { error } = await almoxRpc('almox_registrar_saida', {
      p_cabecalho,
      p_itens,
    })
    if (error) throw error

    toast.add({
      severity: 'success',
      summary: 'Saída registrada',
      detail: `${loteObrigatorio.value ? totalDistribuido.value : f.quantidade} · ${produtoSel.value?.nome ?? ''}`,
      life: 4000,
    })
    emit('saved')
    fechar()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao registrar saída',
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
    header="Registrar saída do Almoxarifado"
    :style="{ width: '36rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <div v-if="ehControlado" class="aviso-controlado">
      <i class="pi pi-shield" aria-hidden="true" />
      <span>
        <strong>Controlado (Portaria 344/98).</strong>
        Saída registrada em nome de <strong>{{ perfil?.nome || user?.email }}</strong>. Confira o lote.
      </span>
    </div>

    <form id="almox-saida-form" @submit.prevent="salvar">
      <div class="field">
        <label for="almox-sai-prod">Produto</label>
        <Select
          v-model="form.produto_id"
          input-id="almox-sai-prod"
          :options="produtosAtivos"
          option-label="nome"
          option-value="id"
          filter
          placeholder="Selecione o produto"
          aria-label="Produto"
          class="full"
        />
      </div>

      <div class="linha-campos">
        <div class="field">
          <label for="almox-sai-motivo">Motivo da saída</label>
          <Select
            v-model="form.motivo"
            input-id="almox-sai-motivo"
            :options="ALMOX_MOTIVOS_SAIDA"
            option-label="label"
            option-value="value"
            aria-label="Motivo da saída"
            class="full"
          />
        </div>
        <div class="field">
          <label for="almox-sai-doc">Documento / Guia <span class="opc">(opcional)</span></label>
          <InputText
            id="almox-sai-doc"
            v-model="form.documento"
            placeholder="Ex.: Pedido 55/2026"
            class="full"
          />
        </div>
      </div>

      <!-- Outras unidades: texto livre conforme decisão aceita pelo Yan -->
      <div v-if="ehOutraUnidade" class="field">
        <label for="almox-sai-dest">Unidade de destino</label>
        <InputText
          id="almox-sai-dest"
          v-model="form.destino"
          maxlength="120"
          placeholder="Ex.: UPA Parnaíba / UBS Parque Imperial"
          class="full"
        />
      </div>

      <!-- Distribuição por lote em FEFO para itens consumíveis -->
      <div v-if="loteObrigatorio" class="field">
        <label>
          Quantidade por lote
          <span class="opc">· {{ aceitaVencido ? 'vencidos no topo' : 'primeiro a vencer no topo (FEFO)' }}</span>
        </label>
        <div v-if="lotesDisponiveis.length" class="qtd-fefo">
          <InputNumber
            :model-value="qtdTotal"
            input-id="almox-sai-qtd"
            :min="0"
            placeholder="Total"
            aria-label="Quantidade total da saída"
            show-buttons
            @update:model-value="onQtdTotal"
            @input="onQtdTotal($event.value)"
          />
          <span class="muted">
            {{ aceitaVencido ? 'Distribui a partir dos lotes vencidos.' : 'Distribui do lote que vence primeiro (FEFO).' }}
            Ajuste manualmente por lote se precisar.
          </span>
        </div>
        <div v-if="faltaParaTotal" class="empty" style="color: var(--danger-fg); margin-bottom: 0.5rem">
          Faltam {{ faltaParaTotal }}: só há {{ saldoTotalUtilizavel }} disponíveis para este motivo.
        </div>
        <div v-if="!lotesDisponiveis.length" class="empty" style="padding: 0.4rem 0">
          Este produto não possui lote com saldo no Almoxarifado.
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
                <template v-else>
                  vence {{ l.validadeFmt }}
                  <template v-if="l.dias_restantes !== null && l.dias_restantes <= 60">
                    · em {{ l.dias_restantes }}d
                  </template>
                </template>
                · saldo <strong>{{ l.saldo }}</strong>
              </div>
              <div v-if="loteBloqueado(l)" class="lote-meta">
                {{
                  l.vencido
                    ? 'Só sai como "Perda / avaria" ou "Vencido (descarte)".'
                    : 'Lote válido não pode sair pelo motivo "Vencido (descarte)".'
                }}
              </div>
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
            <span><strong>{{ totalDistribuido }}</strong> de {{ saldoTotalUtilizavel }} disponíveis</span>
          </div>
          <div v-if="saldoVencido && !aceitaVencido" class="lote-total">
            <span>Em lotes vencidos</span>
            <span>{{ saldoVencido }} · registrar baixa como "Perda / avaria" ou "Vencido"</span>
          </div>
        </div>
      </div>

      <!-- Item permanente (sem lote) -->
      <div v-else-if="produtoSel" class="field">
        <label for="almox-sai-qtd-perm">Quantidade (saldo atual: {{ produtoSel.saldo }})</label>
        <InputNumber
          v-model="form.quantidade"
          input-id="almox-sai-qtd-perm"
          :min="1"
          :max="Math.max(1, produtoSel.saldo)"
          show-buttons
          class="full"
        />
      </div>

      <div class="field">
        <label for="almox-sai-just">
          Justificativa
          <span class="opc">{{ exigeJustificativa ? '(obrigatória, mín. 5 caracteres)' : '(opcional)' }}</span>
        </label>
        <Textarea
          id="almox-sai-just"
          v-model="form.justificativa"
          rows="2"
          auto-resize
          placeholder="Ex.: Pedido emergencial / frasco quebrado no transporte"
          class="full"
        />
      </div>

      <div class="field" style="margin-bottom: 0">
        <label for="almox-sai-obs">Observação <span class="opc">(opcional)</span></label>
        <Textarea
          id="almox-sai-obs"
          v-model="form.observacao"
          rows="2"
          auto-resize
          class="full"
        />
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="fechar" />
      <Button
        type="submit"
        form="almox-saida-form"
        label="Registrar saída"
        severity="danger"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
