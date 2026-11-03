<script setup>
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import RelConsumoPeriodo from '../components/RelConsumoPeriodo.vue'
import RelConsumoFuncionario from '../components/RelConsumoFuncionario.vue'
import RelEstoqueCritico from '../components/RelEstoqueCritico.vue'
import RelValidade from '../components/RelValidade.vue'

const aba = ref('consumo')
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Relatórios</h1>
      <p class="page-sub">Consumo, funcionários, estoque crítico e validade</p>
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
</template>
