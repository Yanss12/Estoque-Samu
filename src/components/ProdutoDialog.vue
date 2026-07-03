<script setup>
import { ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import { supabase } from '../lib/supabase'
import { CATEGORIAS } from '../lib/categorias'

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
    if (props.produto) {
      ehEdicao.value = true
      const id = props.produto.id ?? props.produto.produto_id
      const { data } = await supabase.from('produtos').select('*').eq('id', id).single()
      form.value = data ? { ...data } : novoForm()
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
    toast.add({ severity: 'error', summary: 'Erro ao salvar', detail: err.message, life: 6000 })
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

      <div style="display: flex; gap: 0.75rem">
        <div class="field" style="flex: 1">
          <label>Categoria</label>
          <Select v-model="form.categoria" :options="CATEGORIAS" option-label="label" option-value="value" class="full" />
        </div>
        <div class="field" style="flex: 1">
          <label>Unidade</label>
          <Select v-model="form.unidade_medida" :options="unidadeOpcoes" editable class="full" />
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; align-items: flex-start">
        <div class="field" style="flex: 1">
          <label>Estoque mínimo</label>
          <InputNumber v-model="form.estoque_minimo" :min="0" show-buttons class="full" />
        </div>
        <div class="field" style="flex: 1">
          <label>Controlado (psicotrópico)</label>
          <ToggleSwitch v-model="form.controlado" />
        </div>
      </div>

      <div v-if="ehEdicao" class="field">
        <label>Produto ativo</label>
        <ToggleSwitch v-model="form.ativo" />
        <small style="color: var(--text-muted)">Desative para tirar do estoque sem apagar o histórico.</small>
      </div>
    </form>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="fechar" :disabled="salvando" />
      <Button type="submit" form="prodform" :label="ehEdicao ? 'Salvar' : 'Cadastrar'" icon="pi pi-check" :loading="salvando" />
    </template>
  </Dialog>
</template>
