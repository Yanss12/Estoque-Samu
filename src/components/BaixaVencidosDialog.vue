<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { user, perfil } from '../lib/auth'
import { fmtDataLocal, diasAte, mensagemErro } from '../lib/format'

// Baixa dos lotes vencidos que ainda têm saldo: uma saída "avariado" por lote.
const props = defineProps({
  visible: { type: Boolean, default: false },
  somenteControlados: { type: Boolean, default: false }, // tela de Psicotrópicos
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const carregando = ref(false)
const salvando = ref(false)
const lotes = ref([])
const marcados = ref([])
const observacao = ref('')

watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    observacao.value = 'Baixa de lote vencido'
    carregando.value = true
    const hoje = new Date()
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    const [lo, prods] = await Promise.all([
      supabase
        .from('saldo_por_lote')
        .select('lote_id, numero_lote, validade, saldo, produto_id, produto')
        .gt('saldo', 0)
        .lt('validade', iso)
        .order('validade', { ascending: true }),
      supabase.from('produtos').select('id, controlado, unidade_medida').eq('ativo', true),
    ])
    const info = Object.fromEntries((prods.data ?? []).map((p) => [p.id, p]))
    lotes.value = (lo.data ?? [])
      .filter((l) => info[l.produto_id] && (!props.somenteControlados || info[l.produto_id].controlado))
      .map((l) => ({ ...l, controlado: info[l.produto_id].controlado, unidade: info[l.produto_id].unidade_medida }))
    marcados.value = lotes.value.map((l) => l.lote_id)
    carregando.value = false
  }
)

const selecionados = computed(() => lotes.value.filter((l) => marcados.value.includes(l.lote_id)))
const totalUnidades = computed(() => selecionados.value.reduce((s, l) => s + l.saldo, 0))
const temControlado = computed(() => selecionados.value.some((l) => l.controlado))
const todosMarcados = computed({
  get: () => lotes.value.length > 0 && marcados.value.length === lotes.value.length,
  set: (v) => (marcados.value = v ? lotes.value.map((l) => l.lote_id) : []),
})

async function confirmar() {
  if (!selecionados.value.length || observacao.value.trim().length < 3) return
  salvando.value = true
  try {
    const linhas = selecionados.value.map((l) => ({
      produto_id: l.produto_id,
      lote_id: l.lote_id,
      tipo: 'saida',
      quantidade: l.saldo,
      motivo: 'avariado',
      observacao: observacao.value.trim(),
    }))
    const { error } = await supabase.from('movimentacoes').insert(linhas)
    if (error) throw error
    toast.add({
      severity: 'success',
      summary: 'Baixa registrada',
      detail: `${linhas.length} ${linhas.length === 1 ? 'lote' : 'lotes'} · ${totalUnidades.value} unidades`,
      life: 5000,
    })
    emit('saved')
    emit('update:visible', false)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro ao dar baixa', detail: mensagemErro(err), life: 6000 })
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
    :header="somenteControlados ? 'Baixa de controlados vencidos' : 'Baixa de lotes vencidos'"
    :style="{ width: '40rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <p class="muted" style="margin: 0 0 1rem; font-size: 0.875rem; line-height: 1.5">
      Registra a saída de todo o saldo de cada lote marcado como <strong>Avariado / perda</strong>.
      Faça isso depois de separar fisicamente os itens para descarte.
    </p>

    <div v-if="temControlado" class="aviso-controlado" role="note">
      <i class="pi pi-shield" aria-hidden="true" />
      <span>
        Inclui <strong>controlados</strong>. A baixa fica registrada em nome de
        <strong>{{ perfil?.nome || user?.email }}</strong>; siga o procedimento de descarte da Portaria 344/98.
      </span>
    </div>

    <ul v-if="carregando" class="lista" aria-hidden="true">
      <li v-for="n in 4" :key="n"><span class="skel" style="width: 60%" /><span class="skel" style="width: 4rem" /></li>
    </ul>
    <p v-else-if="!lotes.length" class="empty">Nenhum lote vencido com saldo. Nada para baixar.</p>
    <div v-else class="lotes-lista baixa-lista">
      <label class="lote-row baixa-todos">
        <Checkbox v-model="todosMarcados" binary />
        <span>Marcar todos ({{ lotes.length }})</span>
      </label>
      <label v-for="l in lotes" :key="l.lote_id" class="lote-row">
        <Checkbox v-model="marcados" :value="l.lote_id" />
        <span class="lote-info" style="flex: 1">
          <span class="lote-num">
            {{ l.produto }}
            <span v-if="l.controlado" class="tag-controlado">Controlado</span>
          </span>
          <span class="lote-meta" style="display: block">
            lote <span class="mono">{{ l.numero_lote || 'sem nº' }}</span> · venceu em {{ fmtDataLocal(l.validade) }}
            ({{ -diasAte(l.validade) }} {{ -diasAte(l.validade) === 1 ? 'dia' : 'dias' }})
          </span>
        </span>
        <span class="saldo num">{{ l.saldo }} <small class="muted" style="font-weight: 400">{{ l.unidade?.toLowerCase() }}</small></span>
      </label>
      <div class="lote-total">
        <span>Total da baixa</span>
        <span><strong>{{ totalUnidades }}</strong> unidades em {{ selecionados.length }} {{ selecionados.length === 1 ? 'lote' : 'lotes' }}</span>
      </div>
    </div>

    <div v-if="lotes.length" class="field" style="margin: 1rem 0 0">
      <label for="baixa-obs">Observação</label>
      <Textarea id="baixa-obs" v-model="observacao" rows="2" auto-resize class="full" />
    </div>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" :disabled="salvando" @click="emit('update:visible', false)" />
      <Button
        :label="selecionados.length ? `Dar baixa em ${selecionados.length} ${selecionados.length === 1 ? 'lote' : 'lotes'}` : 'Dar baixa'"
        severity="danger"
        :loading="salvando"
        :disabled="!selecionados.length || observacao.trim().length < 3"
        @click="confirmar"
      />
    </template>
  </Dialog>
</template>
