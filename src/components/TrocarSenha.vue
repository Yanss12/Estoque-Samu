<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Password from 'primevue/password'
import Button from 'primevue/button'
import { alterarSenha, signOut } from '../lib/auth'

const props = defineProps({
  // Quando true, é o fluxo de 1º acesso (não dá pra cancelar, só trocar ou sair).
  obrigatorio: { type: Boolean, default: false },
})
const emit = defineEmits(['done', 'cancel'])

const toast = useToast()
const nova = ref('')
const conf = ref('')
const salvando = ref(false)

const podeSalvar = computed(() => nova.value.length >= 6 && nova.value === conf.value)

async function salvar() {
  if (nova.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'Senha curta', detail: 'Use no mínimo 6 caracteres.', life: 4000 })
    return
  }
  if (nova.value !== conf.value) {
    toast.add({ severity: 'warn', summary: 'As senhas não conferem', detail: 'Repita a mesma senha nos dois campos.', life: 4000 })
    return
  }
  salvando.value = true
  try {
    await alterarSenha(nova.value)
    toast.add({ severity: 'success', summary: 'Senha alterada', detail: 'Sua nova senha já está ativa.', life: 4000 })
    emit('done')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro ao alterar', detail: e.message, life: 6000 })
  } finally {
    salvando.value = false
  }
}

async function sair() {
  await signOut()
  emit('cancel')
}
</script>

<template>
  <div class="troca-card">
    <div class="troca-head">
      <div class="troca-ico"><i class="pi pi-key" /></div>
      <div>
        <h2>{{ obrigatorio ? 'Defina sua senha' : 'Alterar senha' }}</h2>
        <p v-if="obrigatorio">
          Este é seu primeiro acesso. Por segurança, troque a senha padrão antes de continuar.
        </p>
        <p v-else>Escolha uma nova senha para sua conta.</p>
      </div>
    </div>

    <form @submit.prevent="salvar" class="troca-form">
      <div class="field">
        <label>Nova senha</label>
        <Password
          v-model="nova"
          :feedback="true"
          toggle-mask
          placeholder="Mínimo 6 caracteres"
          input-class="full"
          fluid
          promptLabel="Digite uma senha"
          weakLabel="Fraca"
          mediumLabel="Média"
          strongLabel="Forte"
        />
      </div>
      <div class="field">
        <label>Confirme a nova senha</label>
        <Password
          v-model="conf"
          :feedback="false"
          toggle-mask
          placeholder="Repita a senha"
          input-class="full"
          fluid
          @keyup.enter="salvar"
        />
      </div>

      <div class="troca-acoes">
        <Button
          v-if="obrigatorio"
          label="Sair"
          text
          severity="secondary"
          icon="pi pi-sign-out"
          :disabled="salvando"
          @click="sair"
        />
        <Button
          v-else
          label="Cancelar"
          text
          severity="secondary"
          :disabled="salvando"
          @click="emit('cancel')"
        />
        <Button
          type="submit"
          label="Salvar senha"
          icon="pi pi-check"
          :loading="salvando"
          :disabled="!podeSalvar"
        />
      </div>
    </form>
  </div>
</template>

<style scoped>
.troca-card {
  width: 100%;
  max-width: 26rem;
}
.troca-head {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}
.troca-ico {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.7rem;
  display: grid;
  place-items: center;
  background: var(--samu-blue, #27272a);
  color: #fff;
  font-size: 1.1rem;
}
.troca-head h2 {
  margin: 0 0 0.2rem;
  font-size: 1.15rem;
}
.troca-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}
.troca-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}
.troca-form :deep(.p-password) {
  width: 100%;
}
.troca-form :deep(.p-password-input) {
  width: 100%;
}
.troca-acoes {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
