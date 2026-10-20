<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { CATEGORIAS } from '../lib/categorias'
import { mensagemErro } from '../lib/format'

const props = defineProps({
  visible: { type: Boolean, default: false },
  produto: { type: Object, default: null }, // se vier, é edição
  categoriaInicial: { type: String, default: 'medicamento' },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const salvando = ref(false)
const ehEdicao = ref(false)
const form = ref(novoForm())
// Estado do produto no banco (só na edição) — o banco aplica as mesmas regras.
const original = ref(null) // { categoria, ativo }
const saldoAtual = ref(0)
const temHistorico = ref(false)

const ehPsico = computed(() => form.value.categoria === 'psicotropico')
// Regras de categoria (espelham o trigger checa_produto)
function categoriaBloqueada(c) {
  if (!ehEdicao.value || !original.value) return null
  const de = original.value.categoria
  if (c === de) return null
  if (saldoAtual.value !== 0 && (de === 'permanente' || c === 'permanente'))
    return 'Zere o saldo antes de mudar de/para Permanente.'
  if (de === 'psicotropico' && temHistorico.value) return 'Psicotrópico com histórico não muda de categoria.'
  return null
}
const opcoesCategoria = computed(() =>
  CATEGORIAS.map((c) => ({ ...c, disabled: !!categoriaBloqueada(c.value) }))
)
const avisoCategoria = computed(() => {
  if (!ehEdicao.value || !original.value) return null
  return CATEGORIAS.map((c) => categoriaBloqueada(c.value)).find(Boolean) ?? null
})
const naoPodeDesativar = computed(() => ehEdicao.value && original.value?.ativo && saldoAtual.value !== 0)

const unidadeOpcoes = [
  'Unidade', 'Ampola', 'Frasco', 'Cartela', 'Par', 'Bisnaga',
  'Pacote', 'Rolo', 'Caixa', 'Pote', 'Dúzia', 'Galão', 'Kit',
]

function novoForm() {
  return {
    id: null,
    nome: '',
    categoria: props.categoriaInicial,
    unidade_medida: 'Unidade',
    estoque_minimo: 0,
    controlado: props.categoriaInicial === 'psicotropico',
    ativo: true,
  }
}

watch(
  () => props.visible,
  async (aberto) => {
    if (!aberto) return
    original.value = null
    saldoAtual.value = 0
    temHistorico.value = false
    if (props.produto) {
      ehEdicao.value = true
      const id = props.produto.id ?? props.produto.produto_id
      const [{ data }, { data: movs }] = await Promise.all([
        supabase.from('produtos').select('*').eq('id', id).single(),
        supabase.from('movimentacoes').select('tipo, quantidade').eq('produto_id', id),
      ])
      form.value = data ? { ...data } : novoForm()
      original.value = data ? { categoria: data.categoria, ativo: data.ativo } : null
      temHistorico.value = (movs ?? []).length > 0
      saldoAtual.value = (movs ?? []).reduce((t, m) => t + (m.tipo === 'entrada' ? m.quantidade : -m.quantidade), 0)
    } else {
      ehEdicao.value = false
      form.value = novoForm()
    }
  }
)

// Psicotrópico já entra marcado como controlado.
watch(
  () => form.value.categoria,
  (c) => {
    if (c === 'psicotropico') form.value.controlado = true
  }
)

function fechar() {
  emit('update:visible', false)
}

async function salvar() {
  const f = form.value
  if (!f.nome?.trim() || !f.categoria || !f.unidade_medida?.trim()) {
    toast.add({ severity: 'warn', summary: 'Faltam dados', detail: 'Nome, categoria e unidade são obrigatórios.', life: 4000 })
    return
  }
  salvando.value = true
  try {
    const payload = {
      nome: f.nome.trim(),
      categoria: f.categoria,
      unidade_medida: f.unidade_medida.trim(),
      estoque_minimo: f.estoque_minimo ?? 0,
      controlado: !!f.controlado,
      ativo: !!f.ativo,
    }
    let error
    if (ehEdicao.value) {
      ;({ error } = await supabase.from('produtos').update(payload).eq('id', f.id))
    } else {
      ;({ error } = await supabase.from('produtos').insert(payload))
    }
    if (error) throw error
    toast.add({
      severity: 'success',
      summary: ehEdicao.value ? 'Produto atualizado' : 'Produto cadastrado',
      detail: payload.nome,
      life: 4000,
    })
    emit('saved')
    fechar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erro ao salvar', detail: mensagemErro(err), life: 6000 })
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
    :header="ehEdicao ? 'Editar produto' : 'Novo produto'"
    :style="{ width: '34rem' }"
    :breakpoints="{ '640px': '95vw' }"
  >
    <form id="prodform" @submit.prevent="salvar">
      <div class="field">
        <label>Nome</label>
        <InputText v-model="form.nome" class="full" placeholder="Ex.: Dipirona 500mg/ml" autofocus />
      </div>

      <div class="linha-campos">
        <div class="field">
          <label>Categoria</label>
          <Select
            v-model="form.categoria"
            :options="opcoesCategoria"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            class="full"
          />
          <small v-if="avisoCategoria">{{ avisoCategoria }}</small>
        </div>
        <div class="field">
          <label>Unidade</label>
          <Select v-model="form.unidade_medida" :options="unidadeOpcoes" editable class="full" />
        </div>
      </div>

      <div class="linha-campos">
        <div class="field">
          <label>Estoque mínimo</label>
          <InputNumber v-model="form.estoque_minimo" :min="0" show-buttons class="full" />
          <small>Abaixo disso o produto aparece como crítico.</small>
        </div>
        <div class="field">
          <label>Controlado (psicotrópico)</label>
          <ToggleSwitch v-model="form.controlado" :disabled="ehPsico" />
          <small v-if="ehPsico">Psicotrópico é sempre controlado.</small>
        </div>
      </div>

      <div v-if="ehEdicao" class="field">
        <label>Produto ativo</label>
        <ToggleSwitch v-model="form.ativo" :disabled="naoPodeDesativar" />
        <small v-if="naoPodeDesativar">
          Tem {{ saldoAtual }} em estoque. Dê baixa no saldo antes de desativar.
        </small>
        <small v-else>Desative para tirar do estoque sem apagar o histórico.</small>
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="fechar" :disabled="salvando" />
      <Button type="submit" form="prodform" :label="ehEdicao ? 'Salvar alterações' : 'Cadastrar produto'" :loading="salvando" />
    </template>
  </Dialog>
</template>
