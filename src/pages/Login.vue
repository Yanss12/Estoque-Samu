<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import LogoSamu from '../components/LogoSamu.vue'
import { signIn } from '../lib/auth'
import { mensagemErro } from '../lib/format'

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
      detail: mensagemErro(error),
      life: 5000,
    })
    return
  }
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-box">
      <div class="login-brand">
        <LogoSamu :size="36" />
        <div>
          <h1>Estoque SAMU</h1>
          <p>Farmácia Central · SAMU / PSM</p>
        </div>
      </div>

      <div class="login-card">
        <h2>Entrar</h2>
        <form @submit.prevent="entrar">
          <div class="field">
            <label for="email">E-mail</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="seu e-mail"
              class="full"
              autofocus
            />
          </div>
          <div class="field">
            <label for="senha">Senha</label>
            <Password
              v-model="senha"
              input-id="senha"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              input-class="full"
              class="full"
            />
          </div>
          <Button type="submit" label="Entrar" class="full" :loading="loading" style="margin-top: 0.25rem" />
        </form>
      </div>

      <p class="login-rodape">Esqueceu a senha? Peça ao administrador para redefinir.</p>
    </div>
  </div>
</template>
