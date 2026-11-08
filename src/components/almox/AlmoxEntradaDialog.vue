<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { user, perfil } from '../../lib/auth'
import { dataISOLocal, ehValidadeProvisoria } from '../../lib/format'
import {
  ALMOX_MOTIVOS_ENTRADA,
  almoxSelectView,
  almoxRpc,
  mensagemErroAlmox,
} from '../../lib/almox'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produtos: { type: Array, default: () => [] }, // linhas de almox_saldo_produto (ou produtos ativos)
  produtoPreselecionado: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)

const cabecalho = ref(novoCabecalho())
const itens = ref([novaLinha()])
const lotesPorProduto = ref({})

async function carregarLotesProduto(produtoId) {
  if (!produtoId || lotesPorProduto.value[produtoId]) return
  const { data } = await almoxSelectView('almox_saldo_lote', {
    eq: { produto_id: produtoId },
  })
  lotesPorProduto.value = {
    ...lotesPorProduto.value,
    [produtoId]: data ?? [],
  }
}

function loteExistenteLinha(it) {
  if (!it?.produto_id || !it?.numero_lote) return null
  const ch = it.numero_lote.trim().toUpperCase()
  if (!ch) return null
  const lista = lotesPorProduto.value[it.produto_id] || []
  return lista.find((l) => (l.numero_lote || '').trim().toUpperCase() === ch) ?? null
}

function loteLinhaEhProvisorio(it) {
  return ehValidadeProvisoria(loteExistenteLinha(it)?.validade)
}

function novoCabecalho() {
  return {
    motivo: 'recebimento',
    origem: '',
    documento: '',
    data_documento: null,
    justificativa: '',
    observacao: '',
  }
}

function novaLinha(produtoId = null) {
  return {
    _uid: Math.random().toString(36).slice(2),
    produto_id: produtoId,
    numero_lote: '',
    validade: null,
    quantidade: 1,
    observacao: '',
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
    }))
)

function prodPorId(id) {
  return produtosAtivos.value.find((p) => Number(p.id) === Number(id)) ?? null
}

function unidadeLinha(produtoId) {
  return (prodPorId(produtoId)?.unidade_medida || '').trim() || null
}

function ehPermanente(produtoId) {
  return prodPorId(produtoId)?.categoria === 'permanente'
}

const temControlado = computed(() =>
  itens.value.some((it) => prodPorId(it.produto_id)?.controlado)
)

const exigeJustificativa = computed(() => cabecalho.value.motivo === 'outros')

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto) return
    cabecalho.value = novoCabecalho()
    lotesPorProduto.value = {}
    const preId = props.produtoPreselecionado?.produto_id ?? props.produtoPreselecionado?.id ?? null
    itens.value = [novaLinha(preId)]
    if (preId) {
      await carregarLotesProduto(preId)
    }
  }
)

function adicionarLinha() {
  if (itens.value.length >= 100) return
  itens.value.push(novaLinha())
}

function removerLinha(idx) {
  if (itens.value.length <= 1) return
  itens.value.splice(idx, 1)
}

async function aoTrocarProdutoLinha(it) {
  if (ehPermanente(it.produto_id)) {
    it.numero_lote = ''
    it.validade = null
  } else if (it.produto_id) {
    await carregarLotesProduto(it.produto_id)
  }
}

function fmtDataParam(d) {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0, 10)
  return dataISOLocal(d)
}

function fechar() {
  emit('update:visible', false)
}

async function salvar() {
  const cab = cabecalho.value
  const orig = (cab.origem || '').trim()
  if (orig.length < 2 || orig.length > 120) {
    toast.add({
      severity: 'warn',
      summary: 'Origem obrigatória',
      detail: 'Informe a origem da entrada (entre 2 e 120 caracteres).',
      life: 4000,
    })
    return
  }
  if (exigeJustificativa.value && (cab.justificativa || '').trim().length < 5) {
    toast.add({
      severity: 'warn',
      summary: 'Justificativa obrigatória',
      detail: 'Para o motivo "Outros", informe a justificativa (mín. 5 caracteres).',
      life: 4500,
    })
    return
  }

  const chaves = new Set()
  const payloadItens = []

  for (let i = 0; i < itens.value.length; i++) {
    const it = itens.value[i]
    const p = prodPorId(it.produto_id)
    if (!p) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: selecione o produto`,
        detail: 'Todos os itens da entrada precisam de um produto selecionado.',
        life: 4000,
      })
      return
    }
    const qtd = Number(it.quantidade)
    if (!Number.isInteger(qtd) || qtd <= 0) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: quantidade inválida`,
        detail: `Informe uma quantidade inteira maior que zero para ${p.nome}.`,
        life: 4000,
      })
      return
    }

    const perm = p.categoria === 'permanente'
    const loteTxt = perm ? null : (it.numero_lote || '').trim()
    const valISO = perm ? null : fmtDataParam(it.validade)

    if (!perm && (!loteTxt || !valISO)) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: lote e validade obrigatórios`,
        detail: `Informe número do lote e data de validade para ${p.nome}.`,
        life: 4500,
      })
      return
    }
    if (!perm && ehValidadeProvisoria(valISO)) {
      toast.add({
        severity: 'warn',
        summary: 'Validade provisória',
        detail: 'Validade provisória: informe a validade real do lote.',
        life: 5000,
      })
      return
    }

    const chave = `${p.id}:${(loteTxt || '').toUpperCase()}`
    if (chaves.has(chave)) {
      toast.add({
        severity: 'warn',
        summary: 'Item repetido na mesma entrada',
        detail: `${p.nome} (${loteTxt || 'sem lote'}) aparece mais de uma vez. Some as quantidades em uma única linha.`,
        life: 5000,
      })
      return
    }
    chaves.add(chave)

    payloadItens.push({
      produto_id: p.id,
      numero_lote: loteTxt,
      validade: valISO,
      quantidade: qtd,
      observacao: it.observacao?.trim() || null,
    })
  }

  salvando.value = true
  try {
    const p_cabecalho = {
      motivo: cab.motivo,
      origem: orig,
      documento: cab.documento?.trim() || null,
      data_documento: fmtDataParam(cab.data_documento),
      observacao: cab.observacao?.trim() || null,
      justificativa: exigeJustificativa.value ? cab.justificativa.trim() : null,
    }

    const { error } = await almoxRpc('almox_registrar_entrada', {
      p_cabecalho,
      p_itens: payloadItens,
    })
    if (error) throw error

    toast.add({
      severity: 'success',
      summary: 'Entrada registrada',
      detail: `${payloadItens.length} ${payloadItens.length === 1 ? 'item registrado' : 'itens registrados'} no Almoxarifado.`,
      life: 4000,
    })
    emit('saved')
    fechar()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro ao registrar entrada',
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
    header="Registrar entrada no Almoxarifado"
    :style="{ width: '48rem' }"
    :breakpoints="{ '768px': '96vw' }"
  >
    <div v-if="temControlado" class="aviso-controlado">
      <i class="pi pi-shield" aria-hidden="true" />
      <span>
        <strong>Controlado (Portaria 344/98).</strong>
        Entrada registrada sob responsabilidade de <strong>{{ perfil?.nome || user?.email }}</strong>. Confira lote e validade.
      </span>
    </div>

    <form id="almox-entrada-form" @submit.prevent="salvar">
      <div class="linha-campos">
        <div class="field">
          <label for="almox-ent-motivo">Motivo da entrada</label>
          <Select
            v-model="cabecalho.motivo"
            input-id="almox-ent-motivo"
            :options="ALMOX_MOTIVOS_ENTRADA"
            option-label="label"
            option-value="value"
            aria-label="Motivo da entrada"
            class="full"
          />
        </div>
        <div class="field" style="flex: 1.6">
          <label for="almox-ent-origem">Origem (fornecedor / unidade / ata)</label>
          <InputText
            id="almox-ent-origem"
            v-model="cabecalho.origem"
            maxlength="120"
            placeholder="Ex.: Almoxarifado Central da Saúde / CAF"
            class="full"
            autofocus
          />
        </div>
      </div>

      <div class="linha-campos">
        <div class="field">
          <label for="almox-ent-doc">Documento / NF <span class="opc">(opcional)</span></label>
          <InputText
            id="almox-ent-doc"
            v-model="cabecalho.documento"
            placeholder="Ex.: NF 1234 / Guia 55"
            class="full"
          />
        </div>
        <div class="field">
          <label for="almox-ent-datadoc">Data do documento <span class="opc">(opcional)</span></label>
          <DatePicker
            v-model="cabecalho.data_documento"
            input-id="almox-ent-datadoc"
            date-format="dd/mm/yy"
            show-icon
            class="full"
          />
        </div>
      </div>

      <div v-if="exigeJustificativa" class="field">
        <label for="almox-ent-just">Justificativa <span class="opc">(obrigatória, mín. 5 caracteres)</span></label>
        <Textarea
          id="almox-ent-just"
          v-model="cabecalho.justificativa"
          rows="2"
          auto-resize
          placeholder="Descreva o motivo desta entrada"
          class="full"
        />
      </div>

      <h3 class="ficha-sec" style="margin-top: 0.25rem; justify-content: space-between">
        <span>Itens da entrada ({{ itens.length }})</span>
        <Button
          type="button"
          label="Adicionar item"
          icon="pi pi-plus"
          size="small"
          text
          severity="secondary"
          @click="adicionarLinha"
        />
      </h3>

      <div class="lotes-lista" style="margin-bottom: 0.85rem">
        <div
          v-for="(it, idx) in itens"
          :key="it._uid"
          class="lote-row"
          style="flex-direction: column; align-items: stretch; gap: 0.5rem; padding: 0.75rem"
        >
          <div class="linha-campos" style="margin-bottom: 0; align-items: flex-end">
            <div class="field" style="flex: 2; margin-bottom: 0">
              <label :for="`ent-prod-${idx}`">Produto</label>
              <Select
                v-model="it.produto_id"
                :input-id="`ent-prod-${idx}`"
                :options="produtosAtivos"
                option-label="nome"
                option-value="id"
                filter
                placeholder="Selecione o produto"
                aria-label="Produto da linha"
                class="full"
                @change="aoTrocarProdutoLinha(it)"
              />
            </div>

            <div class="field" style="flex: 1.1; margin-bottom: 0">
              <label :for="`ent-lote-${idx}`">
                Lote
                <span v-if="ehPermanente(it.produto_id)" class="opc">(isento)</span>
              </label>
              <InputText
                :id="`ent-lote-${idx}`"
                v-model="it.numero_lote"
                :disabled="ehPermanente(it.produto_id)"
                :placeholder="ehPermanente(it.produto_id) ? 'Permanente' : 'Nº do lote'"
                class="full mono"
              />
            </div>

            <div class="field" style="flex: 1.1; margin-bottom: 0">
              <label :for="`ent-val-${idx}`">
                Validade
                <span v-if="ehPermanente(it.produto_id)" class="opc">(isento)</span>
              </label>
              <DatePicker
                v-model="it.validade"
                :input-id="`ent-val-${idx}`"
                :disabled="ehPermanente(it.produto_id)"
                date-format="dd/mm/yy"
                show-icon
                class="full"
              />
            </div>

            <div class="field" style="flex: 0.95; margin-bottom: 0">
              <label :for="`ent-qtd-${idx}`">
                Qtd<span v-if="unidadeLinha(it.produto_id)" class="opc"> (em {{ unidadeLinha(it.produto_id).toLowerCase() }})</span>
              </label>
              <InputNumber
                v-model="it.quantidade"
                :input-id="`ent-qtd-${idx}`"
                :min="1"
                show-buttons
                class="full"
              />
              <span v-if="unidadeLinha(it.produto_id)" class="chip-unidade">
                Medido em: <strong>{{ unidadeLinha(it.produto_id) }}</strong>
              </span>
            </div>

            <Button
              v-if="itens.length > 1"
              type="button"
              icon="pi pi-trash"
              text
              rounded
              severity="danger"
              :aria-label="`Remover item ${idx + 1}`"
              @click="removerLinha(idx)"
            />
          </div>
          <div
            v-if="loteLinhaEhProvisorio(it) || (it.validade && ehValidadeProvisoria(fmtDataParam(it.validade)))"
            class="aviso-controlado"
            style="margin-bottom: 0; padding: 0.45rem 0.7rem; font-size: 0.8rem"
          >
            <i class="pi pi-exclamation-triangle" aria-hidden="true" />
            <span>
              <strong>Validade provisória:</strong>
              <template v-if="loteLinhaEhProvisorio(it)">
                o lote <strong class="mono">{{ loteExistenteLinha(it)?.numero_lote }}</strong> está cadastrado com validade provisória. Informe a validade real do lote para atualizá-la.
              </template>
              <template v-else>
                informe a validade real do lote (não use 31/12/2099).
              </template>
            </span>
          </div>
        </div>
      </div>

      <small class="muted" style="display: block; margin-bottom: 0.85rem">
        Lotes existentes no Almoxarifado mantêm sua validade original (erro de validade pode ser corrigido na ficha do produto).
      </small>

      <div class="field" style="margin-bottom: 0">
        <label for="almox-ent-obs">Observação geral <span class="opc">(opcional)</span></label>
        <Textarea
          id="almox-ent-obs"
          v-model="cabecalho.observacao"
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
        form="almox-entrada-form"
        label="Registrar entrada"
        severity="success"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
