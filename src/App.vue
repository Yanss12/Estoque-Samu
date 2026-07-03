<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import LogoSamu from './components/LogoSamu.vue'
import TrocarSenha from './components/TrocarSenha.vue'
import { user, perfil, precisaTrocarSenha, signOut } from './lib/auth'
import { isDark, toggleTheme } from './lib/theme'

const router = useRouter()
const logged = computed(() => !!user.value)
const collapsed = ref(false)
const trocaSenhaVisivel = ref(false)

const nav = [
  { name: 'dashboard', label: 'Dashboard', icon: 'pi pi-th-large' },
  { name: 'estoque', label: 'Estoque', icon: 'pi pi-box' },
  { name: 'movimentacoes', label: 'Movimentações', icon: 'pi pi-arrow-right-arrow-left' },
  { name: 'psicotropicos', label: 'Psicotrópicos', icon: 'pi pi-shield' },
]

async function sair() {
  await signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <Toast position="top-right" />
  <ConfirmDialog />

  <!-- Telas públicas (login) ocupam a tela inteira -->
  <router-view v-if="!logged" />

  <!-- 1º acesso: força a troca da senha padrão antes de liberar o sistema -->
  <div v-else-if="precisaTrocarSenha" class="troca-tela">
    <div class="troca-brand"><LogoSamu :size="34" /><span>Estoque SAMU</span></div>
    <div class="troca-box">
      <TrocarSenha obrigatorio @cancel="router.push({ name: 'login' })" />
    </div>
  </div>

  <!-- App autenticado: sidebar + topbar + conteúdo -->
  <div v-else class="shell">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="logo">
        <LogoSamu :size="28" />
        <span>Estoque SAMU</span>
      </div>
      <nav class="nav">
        <router-link
          v-for="item in nav"
          :key="item.name"
          :to="{ name: item.name }"
          :title="item.label"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="spacer" />
      <button class="collapse-btn" @click="collapsed = !collapsed">
        <i :class="collapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'" />
      </button>
    </aside>

    <div class="main">
      <header class="topbar">
        <strong style="font-size: 0.95rem; color: var(--text-muted)">
          Farmácia Central · Controle de Estoque
        </strong>
        <div class="right">
          <Button
            :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
            text
            rounded
            severity="secondary"
            :aria-label="isDark ? 'Tema claro' : 'Tema escuro'"
            @click="toggleTheme"
          />
          <div class="who">
            <span class="name">{{ perfil?.nome || user?.email }}</span>
            <span class="role">{{ perfil?.papel || 'operador' }}</span>
          </div>
          <Button
            icon="pi pi-key"
            label="Senha"
            text
            severity="secondary"
            @click="trocaSenhaVisivel = true"
          />
          <Button
            icon="pi pi-sign-out"
            label="Sair"
            text
            severity="secondary"
            @click="sair"
          />
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>

    <!-- Troca de senha voluntária -->
    <Dialog
      v-model:visible="trocaSenhaVisivel"
      modal
      :header="null"
      :show-header="false"
      :style="{ width: '28rem' }"
      :breakpoints="{ '640px': '95vw' }"
      :dismissable-mask="true"
      content-class="troca-dialog-content"
    >
      <TrocarSenha @done="trocaSenhaVisivel = false" @cancel="trocaSenhaVisivel = false" />
    </Dialog>
  </div>
</template>
