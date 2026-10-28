<script setup>
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import RelConsumoPeriodo from '../components/RelConsumoPeriodo.vue'
import RelConsumoFuncionario from '../components/RelConsumoFuncionario.vue'
import RelEstoqueCritico from '../components/RelEstoqueCritico.vue'
import RelValidade from '../components/RelValidade.vue'
import FuncionariosDialog from '../components/FuncionariosDialog.vue'
import { gereFuncionarios } from '../lib/auth'

const aba = ref('consumo')
const funcionariosVisivel = ref(false)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Relatórios</h1>
      <p class="page-sub">Consumo, funcionários, estoque crítico e validade</p>
    </div>
    <div class="page-acoes">
      <Button v-if="gereFuncionarios" label="Funcionários" icon="pi pi-users" severity="secondary" outlined @click="funcionariosVisivel = true" />
    </div>
  </div>

  <Tabs v-model:value="aba" lazy>
    <TabList>
      <Tab value="consumo">Consumo</Tab>
      <Tab value="funcionarios">Por funcionário</Tab>
      <Tab value="critico">Estoque crítico</Tab>
      <Tab value="validade">Validade</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="consumo"><RelConsumoPeriodo /></TabPanel>
      <TabPanel value="funcionarios"><RelConsumoFuncionario /></TabPanel>
      <TabPanel value="critico"><RelEstoqueCritico /></TabPanel>
      <TabPanel value="validade"><RelValidade /></TabPanel>
    </TabPanels>
  </Tabs>

  <FuncionariosDialog v-model:visible="funcionariosVisivel" />
</template>
