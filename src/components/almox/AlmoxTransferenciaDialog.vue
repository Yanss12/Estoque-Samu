<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { fmtDataLocal } from '../../lib/format'
import {
  almoxSelectView,
  almoxRpc,
  almoxConsultarLotesFarmacia,
  mensagemErroAlmox,
} from '../../lib/almox'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produtos: { type: Array, default: () => [] },
  produtoPreselecionado: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const confirm = useConfirm()
const salvando = ref(false)

const documento = ref('')
const observacao = ref('')
const itens = ref([novaLinha()])

// Cache de lotes do Almoxarifado e da Farmácia por produto_id
const lotesAlmoxMap = ref({})
const lotesFarmaciaMap = ref({})

function novaLinha(produtoId = null) {
  return {
    _uid: Math.random().toString(36).slice(2),
    produto_id: produtoId,
    lote_id: null,
    quantidade: 1,
  }
}

const opcoesProdutos = computed(() =>
  props.produtos
    .filter((p) => p.ativo !== false)
    .map((p) => {
      const bloqueado = Boolean(p.controlado) || p.categoria === 'psicotropico'
      return {
        ...p,
        id: p.produto_id ?? p.id,
        nome: bloqueado ? `${p.nome} (controlado — bloqueado na v1)` : p.nome,
        nomeLimpo: p.nome,
        categoria: p.categoria,
        controlado: Boolean(p.controlado),
        bloqueadoTransferencia: bloqueado,
        saldo: p.saldo ?? 0,
      }
    })
)

function prodPorId(id) {
  return opcoesProdutos.value.find((p) => Number(p.id) === Number(id)) ?? null
}

function unidadeLinha(produtoId) {
  return (prodPorId(produtoId)?.unidade_medida || '').trim() || null
}

function ehPermanente(produtoId) {
  return prodPorId(produtoId)?.categoria === 'permanente'
}

function lotesValidosDoProduto(produtoId) {
  return lotesAlmoxMap.value[produtoId] || []
}

function loteSelDaLinha(it) {
  if (!it.produto_id || !it.lote_id) return null
  return (lotesAlmoxMap.value[it.produto_id] || []).find((l) => Number(l.lote_id) === Number(it.lote_id)) ?? null
}

function saldoMaxLinha(it) {
  const p = prodPorId(it.produto_id)
  if (!p) return 1
  if (p.categoria === 'permanente') return Math.max(1, Number(p.saldo ?? 1))
  const l = loteSelDaLinha(it)
  return Math.max(1, Number(l?.saldo ?? 1))
}

function infoDestinoFarmacia(it) {
  const p = prodPorId(it.produto_id)
  if (!p) return null
  if (p.categoria === 'permanente') {
    return {
      resumo: 'Entra na Farmácia (item permanente, isento de lote) · entrada automática, sem aceite.',
      divergente: false,
    }
  }
  const l = loteSelDaLinha(it)
  if (!l) return null
  const lotesFarm = lotesFarmaciaMap.value[it.produto_id] || []
  const chave = (l.numero_lote || '').trim().toUpperCase()
  const homonimo = lotesFarm.find((lf) => (lf.numero_lote || '').trim().toUpperCase() === chave)
  if (homonimo && homonimo.validade && homonimo.validade !== l.validade) {
    return {
      resumo: `Atenção: o lote ${l.numero_lote} já existe na Farmácia com validade ${fmtDataLocal(homonimo.validade)} (Almoxarifado: ${fmtDataLocal(l.validade)}). A transferência será bloqueada por divergência de validade.`,
      divergente: true,
    }
  }
  const saldoFarm = Number(homonimo?.saldo ?? 0)
  return {
    resumo: `Entra na Farmácia com lote ${l.numero_lote}, validade ${fmtDataLocal(l.validade)}; saldo atual da Farmácia: ${saldoFarm}`,
    divergente: false,
  }
}

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto) return
    documento.value = ''
    observacao.value = ''
    const pre = props.produtoPreselecionado
    const preId =
      pre && !pre.controlado && pre.categoria !== 'psicotropico'
        ? pre.produto_id ?? pre.id ?? null
        : null
    itens.value = [novaLinha(preId)]
    if (preId) {
      await carregarDadosProduto(preId, itens.value[0])
    }
  }
)

async function carregarDadosProduto(produtoId, linha = null) {
  if (!produtoId) return
  const [resAlmox, lotesFarm] = await Promise.all([
    almoxSelectView('almox_saldo_lote', {
      eq: { produto_id: produtoId },
      order: { column: 'validade', ascending: true },
    }),
    almoxConsultarLotesFarmacia(produtoId),
  ])
  // Só lotes com saldo > 0 e NÃO vencidos podem ser transferidos (Seção 4.3: ALMOX_LOTE_VENCIDO)
  const validos = (resAlmox.data ?? [])
    .filter((l) => Number(l.saldo) > 0 && !l.vencido)
    .map((l) => ({
      ...l,
      rotulo: `${l.numero_lote} · venc. ${fmtDataLocal(l.validade)} · disponível: ${l.saldo}`,
    }))
  lotesAlmoxMap.value = { ...lotesAlmoxMap.value, [produtoId]: validos }
  lotesFarmaciaMap.value = { ...lotesFarmaciaMap.value, [produtoId]: lotesFarm }

  if (linha && !ehPermanente(produtoId)) {
    // Pré-seleciona o 1º lote FEFO disponível
    linha.lote_id = validos[0]?.lote_id ?? null
  }
}

async function aoTrocarProduto(it) {
  it.lote_id = null
  it.quantidade = 1
  if (it.produto_id) {
    await carregarDadosProduto(it.produto_id, it)
  }
}

function adicionarLinha() {
  if (itens.value.length >= 100) return
  itens.value.push(novaLinha())
}

function removerLinha(idx) {
  if (itens.value.length <= 1) return
  itens.value.splice(idx, 1)
}

function fechar() {
  emit('update:visible', false)
}

function validarFormulario() {
  const chaves = new Set()
  const payload = []
  let totalUnidades = 0

  for (let i = 0; i < itens.value.length; i++) {
    const it = itens.value[i]
    const p = prodPorId(it.produto_id)
    if (!p) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: selecione o produto`,
        detail: 'Escolha o produto que será transferido.',
        life: 4000,
      })
      return null
    }
    if (p.bloqueadoTransferencia) {
      toast.add({
        severity: 'warn',
        summary: 'Transferência bloqueada na v1',
        detail: 'Medicamentos controlados (Portaria 344/98) não podem ser transferidos pelo sistema na v1.',
        life: 5000,
      })
      return null
    }
    const perm = p.categoria === 'permanente'
    if (!perm && !it.lote_id) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: selecione o lote`,
        detail: `Escolha um lote válido com saldo para ${p.nomeLimpo}.`,
        life: 4500,
      })
      return null
    }
    const qtd = Number(it.quantidade)
    if (!Number.isInteger(qtd) || qtd <= 0) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: quantidade inválida`,
        detail: 'Informe uma quantidade inteira positiva.',
        life: 4000,
      })
      return null
    }
    const maxDisp = saldoMaxLinha(it)
    if (qtd > maxDisp) {
      toast.add({
        severity: 'warn',
        summary: `Item ${i + 1}: saldo insuficiente`,
        detail: `${p.nomeLimpo}: disponível ${maxDisp}, solicitado ${qtd}.`,
        life: 5000,
      })
      return null
    }
    const chave = `${p.id}:${perm ? 0 : it.lote_id}`
    if (chaves.has(chave)) {
      toast.add({
        severity: 'warn',
        summary: 'Produto e lote repetidos',
        detail: `${p.nomeLimpo} aparece repetido com o mesmo lote. Some as quantidades em uma única linha.`,
        life: 5000,
      })
      return null
    }
    chaves.add(chave)

    totalUnidades += qtd
    payload.push({
      produto_id: p.id,
      lote_id: perm ? null : it.lote_id,
      quantidade: qtd,
    })
  }

  return { payload, totalUnidades }
}

function solicitarConfirmacao() {
  const validado = validarFormulario()
  if (!validado) return

  const { payload, totalUnidades } = validado
  confirm.require({
    header: 'Confirmar transferência para a Farmácia',
    message: `Baixa ${totalUnidades} unidade(s) (${payload.length} ${payload.length === 1 ? 'item' : 'itens'}) no Almoxarifado e dá entrada ${totalUnidades} automaticamente na Farmácia. Não é consumo.`,
    icon: 'pi pi-send',
    acceptLabel: 'Confirmar transferência',
    rejectLabel: 'Revisar',
    accept: () => efetivarTransferencia(payload),
  })
}

async function efetivarTransferencia(p_itens) {
  salvando.value = true
  try {
    const { data, error } = await almoxRpc('almox_transferir_para_farmacia', {
      p_itens,
      p_documento: documento.value?.trim() || null,
      p_observacao: observacao.value?.trim() || null,
    })
    if (error) throw error

    const qtdItens = data?.itens?.length ?? p_itens.length
    toast.add({
      severity: 'success',
      summary: `Transferência concluída: ${qtdItens} item(ns) na Farmácia`,
      detail: data?.transferencia_id ? `Guia #${data.transferencia_id} registrada automaticamente.` : 'Entrada automática registrada na Farmácia.',
      life: 4500,
    })
    emit('saved')
    fechar()
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Erro na transferência',
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
    header="Transferir do Almoxarifado para a Farmácia"
    :style="{ width: '48rem' }"
    :breakpoints="{ '768px': '96vw' }"
  >
    <p class="muted" style="font-size: 0.85rem; margin-top: 0; margin-bottom: 1rem">
      Operação única e atômica: dá baixa no Almoxarifado e registra entrada automática na Farmácia COMUE preservando lote e validade (não contabiliza como consumo). Transferência de psicotrópicos é bloqueada na v1.
    </p>

    <form id="almox-transf-form" @submit.prevent="solicitarConfirmacao">
      <div class="linha-campos">
        <div class="field">
          <label for="almox-trf-doc">Documento / Requisição <span class="opc">(opcional)</span></label>
          <InputText
            id="almox-trf-doc"
            v-model="documento"
            placeholder="Ex.: Req. 88/2026"
            class="full"
            autofocus
          />
        </div>
        <div class="field" style="flex: 1.5">
          <label for="almox-trf-obs">Observação da guia <span class="opc">(opcional)</span></label>
          <InputText
            id="almox-trf-obs"
            v-model="observacao"
            placeholder="Ex.: Abastecimento semanal"
            class="full"
          />
        </div>
      </div>

      <h3 class="ficha-sec" style="margin-top: 0.25rem; justify-content: space-between">
        <span>Itens a transferir ({{ itens.length }})</span>
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

      <div class="lotes-lista" style="margin-bottom: 0.5rem">
        <div
          v-for="(it, idx) in itens"
          :key="it._uid"
          class="lote-row"
          style="flex-direction: column; align-items: stretch; gap: 0.45rem; padding: 0.75rem"
        >
          <div class="linha-campos" style="margin-bottom: 0; align-items: flex-end">
            <div class="field" style="flex: 1.8; margin-bottom: 0">
              <label :for="`trf-prod-${idx}`">Produto</label>
              <Select
                v-model="it.produto_id"
                :input-id="`trf-prod-${idx}`"
                :options="opcoesProdutos"
                option-label="nome"
                option-value="id"
                option-disabled="bloqueadoTransferencia"
                filter
                placeholder="Selecione o produto"
                aria-label="Produto a transferir"
                class="full"
                @change="aoTrocarProduto(it)"
              />
            </div>

            <div class="field" style="flex: 1.5; margin-bottom: 0">
              <label :for="`trf-lote-${idx}`">
                Lote do Almoxarifado (FEFO)
              </label>
              <Select
                v-model="it.lote_id"
                :input-id="`trf-lote-${idx}`"
                :options="lotesValidosDoProduto(it.produto_id)"
                option-label="rotulo"
                option-value="lote_id"
                :disabled="!it.produto_id || ehPermanente(it.produto_id)"
                :placeholder="
                  ehPermanente(it.produto_id)
                    ? 'Isento (permanente)'
                    : lotesValidosDoProduto(it.produto_id).length
                      ? 'Selecione o lote'
                      : 'Sem lote válido com saldo'
                "
                aria-label="Lote do Almoxarifado"
                class="full"
              />
            </div>

            <div class="field" style="flex: 0.9; margin-bottom: 0">
              <label :for="`trf-qtd-${idx}`">
                Quantidade<span v-if="unidadeLinha(it.produto_id)" class="opc"> (em {{ unidadeLinha(it.produto_id).toLowerCase() }})</span>
              </label>
              <InputNumber
                v-model="it.quantidade"
                :input-id="`trf-qtd-${idx}`"
                :min="1"
                :max="saldoMaxLinha(it)"
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
            v-if="infoDestinoFarmacia(it)"
            style="font-size: 0.8rem"
            :style="{ color: infoDestinoFarmacia(it).divergente ? 'var(--danger-fg)' : 'var(--text-muted)' }"
          >
            <i
              :class="infoDestinoFarmacia(it).divergente ? 'pi pi-exclamation-triangle' : 'pi pi-arrow-right'"
              style="font-size: 0.75rem; margin-right: 0.3rem"
              aria-hidden="true"
            />
            {{ infoDestinoFarmacia(it).resumo }}
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="fechar" />
      <Button
        type="submit"
        form="almox-transf-form"
        label="Transferir para a Farmácia"
        icon="pi pi-send"
        :loading="salvando"
      />
    </template>
  </Dialog>
</template>
