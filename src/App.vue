<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import LogoSamu from './components/LogoSamu.vue'
import TrocarSenha from './components/TrocarSenha.vue'
import ContextoSwitch from './components/almox/ContextoSwitch.vue'
import { user, perfil, precisaTrocarSenha, podeAuditar, almoxVer, signOut } from './lib/auth'
import { contexto } from './lib/contexto'
import { isDark, toggleTheme } from './lib/theme'

const router = useRouter()
const logged = computed(() => !!user.value)
const collapsed = ref(false)
const trocaSenhaVisivel = ref(false)

const nav = [
  { name: 'dashboard', label: 'Visão geral', icon: 'pi pi-th-large' },
  { name: 'estoque', label: 'Estoque', icon: 'pi pi-box' },
  { name: 'movimentacoes', label: 'Movimentações', icon: 'pi pi-arrow-right-arrow-left' },
  { name: 'psicotropicos', label: 'Psicotrópicos', icon: 'pi pi-shield' },
  { name: 'relatorios', label: 'Relatórios', icon: 'pi pi-chart-bar' },
  { name: 'auditoria', label: 'Auditoria', icon: 'pi pi-clipboard', visivel: () => podeAuditar.value },
]

const navAlmox = [
  { name: 'almox-estoque', label: 'Estoque', icon: 'pi pi-box' },
  { name: 'almox-movimentacoes', label: 'Movimentações', icon: 'pi pi-arrow-right-arrow-left' },
  { name: 'almox-transferencias', label: 'Transferências', icon: 'pi pi-send' },
  { name: 'almox-inventario', label: 'Inventário', icon: 'pi pi-clipboard' },
  { name: 'almox-relatorios', label: 'Relatórios', icon: 'pi pi-chart-bar' },
]

const navVisivel = computed(() =>
  contexto.value === 'almoxarifado' && almoxVer.value
    ? navAlmox
    : nav.filter((i) => !i.visivel || i.visivel())
)

// Se o nível do usuário cair para 'nenhum' com o contexto Almoxarifado ativo, volta ao dashboard.
watch(almoxVer, (pode) => {
  if (!pode && contexto.value === 'almoxarifado') {
    router.replace({ name: 'dashboard' })
  }
})

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
      <nav class="nav" aria-label="Principal">
        <router-link
          v-for="item in navVisivel"
          :key="item.name"
          :to="{ name: item.name }"
          :title="item.label"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="spacer" />
      <button
        class="collapse-btn"
        :aria-label="collapsed ? 'Expandir menu' : 'Recolher menu'"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <i :class="collapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'" />
        <span>Recolher</span>
      </button>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="right">
          <ContextoSwitch v-if="almoxVer" />
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
            size="small"
            class="rotulo-btn"
            severity="secondary"
            @click="trocaSenhaVisivel = true"
          />
          <Button
            icon="pi pi-sign-out"
            label="Sair"
            text
            size="small"
            class="rotulo-btn"
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
