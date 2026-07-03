<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import LogoSamu from '../components/LogoSamu.vue'
import { signIn } from '../lib/auth'

const email = ref('')
const senha = ref('')
const loading = ref(false)
const router = useRouter()
const toast = useToast()

async function entrar() {
  if (!email.value || !senha.value) {
    toast.add({ severity: 'warn', summary: 'Preencha e-mail e senha', life: 3000 })
    return
  }
  loading.value = true
  const { error } = await signIn(email.value.trim(), senha.value)
  loading.value = false
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Não foi possível entrar',
      detail: error.message,
      life: 5000,
    })
    return
  }
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="brand">
        <span style="color: #a1a1aa"><LogoSamu :size="48" /></span>
        <h1>Estoque SAMU</h1>
        <span style="color: var(--text-muted); font-size: 0.9rem">
          Controle de estoque · SAMU / PSM
        </span>
      </div>

      <form @submit.prevent="entrar">
        <div class="field">
          <label for="email">E-mail</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="voce@exemplo.com"
            class="full"
            autofocus
          />
        </div>
        <div class="field">
          <label for="senha">Senha</label>
          <Password
            id="senha"
            v-model="senha"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            input-class="full"
            class="full"
          />
        </div>
        <Button
          type="submit"
          label="Entrar"
          icon="pi pi-sign-in"
          class="full"
          :loading="loading"
        />
      </form>
    </div>
  </div>
</template>
