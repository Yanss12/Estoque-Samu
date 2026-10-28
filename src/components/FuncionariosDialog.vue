<script setup>
import { ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import { supabase } from '../lib/supabase'
import { mensagemErro } from '../lib/format'

const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'changed'])

const toast = useToast()
const lista = ref([])
const novoNome = ref('')
const salvando = ref(false)

async function carregar() {
  const { data, error } = await supabase.from('funcionarios').select('id, nome, ativo').order('nome')
  if (error) return toast.add({ severity: 'error', summary: 'Erro ao carregar', detail: mensagemErro(error), life: 5000 })
  lista.value = data ?? []
}

async function adicionar() {
  const nome = novoNome.value.trim()
  if (nome.length < 2) return
  salvando.value = true
  const { error } = await supabase.from('funcionarios').insert({ nome })
  salvando.value = false
  if (error) {
    const dup = error.code === '23505'
    return toast.add({ severity: 'error', summary: 'Não foi possível adicionar', detail: dup ? 'Já existe um funcionário com esse nome.' : mensagemErro(error), life: 5000 })
  }
  novoNome.value = ''
  await carregar()
  emit('changed')
}

async function alternarAtivo(f) {
  const { error } = await supabase.from('funcionarios').update({ ativo: f.ativo }).eq('id', f.id)
  if (error) {
    f.ativo = !f.ativo
    return toast.add({ severity: 'error', summary: 'Erro ao atualizar', detail: mensagemErro(error), life: 5000 })
  }
  emit('changed')
}

watch(() => props.visible, (v) => v && carregar())
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Funcionários"
    :style="{ width: '28rem' }"
    :breakpoints="{ '640px': '95vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <form class="toolbar" @submit.prevent="adicionar">
      <InputText v-model="novoNome" class="grow" placeholder="Nome do funcionário" aria-label="Nome do funcionário" />
      <Button type="submit" label="Adicionar" icon="pi pi-plus" :loading="salvando" :disabled="novoNome.trim().length < 2" />
    </form>
    <p v-if="!lista.length" class="empty">Nenhum funcionário cadastrado.</p>
    <ul v-else class="lista">
      <li v-for="f in lista" :key="f.id">
        <span class="nome" :class="{ muted: !f.ativo }">{{ f.nome }}</span>
        <label class="val">
          <ToggleSwitch v-model="f.ativo" :aria-label="`${f.nome} ativo`" @update:model-value="alternarAtivo(f)" />
        </label>
      </li>
    </ul>
  </Dialog>
</template>
