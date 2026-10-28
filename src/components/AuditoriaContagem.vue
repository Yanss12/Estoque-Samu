<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { fmtDataLocal, mensagemErro } from '../lib/format'

const props = defineProps({
  auditoria: { type: Object, required: true }, // linha de auditorias_resumo
})
const emit = defineEmits(['voltar', 'changed'])

const toast = useToast()
const confirm = useConfirm()
const itens = ref([])
const carregando = ref(false)
const busca = ref('')
const salvandoId = ref(null)

const aberta = computed(() => props.auditoria.status === 'aberta')
const filtrados = computed(() => {
  const t = busca.value.trim().toLowerCase()
  return t ? itens.value.filter((i) => i.produto.toLowerCase().includes(t) || (i.numero_lote ?? '').toLowerCase().includes(t)) : itens.value
})
const pendentes = computed(() => itens.value.filter((i) => i.estoque_contado === null).length)
const divergentes = computed(() => itens.value.filter((i) => i.divergencia && !i.movimentacao_ajuste_id).length)

async function carregar() {
  carregando.value = true
  const { data, error } = await supabase
    .from('auditoria_itens_detalhe')
    .select('*')
    .eq('auditoria_id', props.auditoria.auditoria_id)
    .order('produto')
    .order('validade', { nullsFirst: false })
  carregando.value = false
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao carregar itens', detail: mensagemErro(error), life: 6000 })
  // rascunho = valor digitado, ainda não salvo
  itens.value = (data ?? []).map((i) => ({ ...i, rascunho: i.estoque_contado, obs: i.observacao ?? '' }))
}

function editavel(i) {
  return aberta.value && !i.movimentacao_ajuste_id
}

async function salvarContagem(i) {
  if (i.rascunho === null || i.rascunho === undefined) return
  salvandoId.value = i.item_id
  const { error } = await supabase.rpc('registrar_contagem', {
    p_auditoria_id: i.auditoria_id,
    p_produto_id: i.produto_id,
    p_lote_id: i.lote_id,
    p_contado: i.rascunho,
    p_observacao: i.obs?.trim() || null,
  })
  salvandoId.value = null
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao registrar contagem', detail: mensagemErro(error), life: 6000 })
  await carregar()
  emit('changed')
}

async function executar(rpc, args, sucesso) {
  const { error } = await supabase.rpc(rpc, args)
  if (error) return toast.add({ severity: 'error', summary: 'Operação não concluída', detail: mensagemErro(error), life: 7000 })
  toast.add({ severity: 'success', summary: sucesso, life: 4000 })
  await carregar()
  emit('changed')
}

function aplicarAjuste(i) {
  const sinal = i.divergencia > 0 ? '+' : ''
  confirm.require({
    header: 'Aplicar ajuste',
    message: `${i.produto}${i.numero_lote ? ` (lote ${i.numero_lote})` : ''}: o estoque passa de ${i.estoque_sistema} para ${i.estoque_contado} (${sinal}${i.divergencia}). Isso gera uma movimentação e não pode ser estornada.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Aplicar ajuste',
    rejectLabel: 'Cancelar',
    accept: () => executar('aplicar_ajuste_auditoria', { p_item_id: i.item_id }, 'Ajuste aplicado'),
  })
}

function finalizar() {
  const avisos = []
  if (pendentes.value) avisos.push(`${pendentes.value} item(ns) sem contagem ficarão de fora.`)
  if (divergentes.value) avisos.push(`${divergentes.value} divergência(s) ainda sem ajuste serão ajustadas automaticamente.`)
  confirm.require({
    header: 'Finalizar auditoria',
    message: `${avisos.join(' ')} Depois de finalizada, a auditoria não pode mais ser alterada. Continuar?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Finalizar',
    rejectLabel: 'Cancelar',
    accept: () =>
      executar(
        'finalizar_auditoria',
        { p_auditoria_id: props.auditoria.auditoria_id, p_observacao: null, p_permitir_pendentes: pendentes.value > 0 },
        'Auditoria finalizada'
      ).then(() => emit('voltar')),
  })
}

function classeDivergencia(i) {
  return i.divergencia > 0 ? 'sobra' : 'falta'
}

watch(() => props.auditoria.auditoria_id, carregar, { immediate: true })
</script>

<template>
  <div class="toolbar">
    <Button label="Auditorias" icon="pi pi-arrow-left" text severity="secondary" @click="emit('voltar')" />
    <InputText v-model="busca" class="grow" placeholder="Buscar produto ou lote" aria-label="Buscar produto ou lote" />
    <Button v-if="aberta" label="Finalizar auditoria" icon="pi pi-check" severity="success" @click="finalizar" />
  </div>
  <p class="page-sub">
    Competência {{ new Date(auditoria.competencia + 'T00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }}
    · {{ itens.length - pendentes }} de {{ itens.length }} contados · {{ divergentes }} divergência(s) sem ajuste
  </p>

  <div class="card-panel tabela">
    <DataTable :value="filtrados" :loading="carregando" data-key="item_id" paginator :rows="20" size="small" class="tabela-moderna">
      <template #empty>Nenhum item.</template>
      <Column field="produto" header="Produto">
        <template #body="{ data }">
          <span class="prod-nome">{{ data.produto }}</span>
          <small class="muted"> · lote <span class="mono">{{ data.numero_lote || 'sem lote' }}</span><template v-if="data.validade"> · val. {{ fmtDataLocal(data.validade) }}</template></small>
        </template>
      </Column>
      <Column field="estoque_sistema" header="Sistema" style="width: 6rem" header-class="col-num" body-class="col-num">
        <template #body="{ data }"><span class="num">{{ data.estoque_sistema }}</span></template>
      </Column>
      <Column header="Contado" style="width: 11rem" header-class="col-num" body-class="col-num">
        <template #body="{ data }">
          <InputNumber
            v-if="editavel(data)"
            v-model="data.rascunho"
            :min="0"
            :input-id="`cont-${data.item_id}`"
            :aria-label="`Contagem de ${data.produto}`"
            :input-style="{ width: '5rem', textAlign: 'right' }"
            @keydown.enter.prevent="salvarContagem(data)"
          />
          <span v-else class="num">{{ data.estoque_contado ?? '—' }}</span>
        </template>
      </Column>
      <Column header="Diverg." style="width: 6.5rem" header-class="col-num" body-class="col-num">
        <template #body="{ data }">
          <span v-if="data.divergencia" class="saldo baixo" :class="classeDivergencia(data)">{{ data.divergencia > 0 ? '+' : '' }}{{ data.divergencia }}</span>
          <span v-else-if="data.estoque_contado !== null" class="muted">ok</span>
        </template>
      </Column>
      <Column style="width: 12rem" header-class="col-num">
        <template #header><span class="sr-only">Ações</span></template>
        <template #body="{ data }">
          <div class="acoes">
            <Button v-if="editavel(data)" label="Salvar" size="small" text :disabled="data.rascunho === data.estoque_contado || data.rascunho === null" :loading="salvandoId === data.item_id" @click="salvarContagem(data)" />
            <Button v-if="editavel(data) && data.divergencia" label="Ajustar" size="small" severity="warn" outlined @click="aplicarAjuste(data)" />
            <span v-if="data.movimentacao_ajuste_id" class="muted" :title="`Por ${data.ajustado_por_nome ?? ''}`">ajustado ({{ data.estoque_anterior }} → {{ data.estoque_corrigido }})</span>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
