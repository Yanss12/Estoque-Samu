<script setup>
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import RelAlmoxEstoqueAtual from '../../components/almox/RelAlmoxEstoqueAtual.vue'
import RelAlmoxMovimentos from '../../components/almox/RelAlmoxMovimentos.vue'
import RelAlmoxTransferencias from '../../components/almox/RelAlmoxTransferencias.vue'
import RelAlmoxCritico from '../../components/almox/RelAlmoxCritico.vue'
import RelAlmoxValidade from '../../components/almox/RelAlmoxValidade.vue'
import RelAlmoxInventarios from '../../components/almox/RelAlmoxInventarios.vue'
import RelAlmoxDistribuicao from '../../components/almox/RelAlmoxDistribuicao.vue'

const aba = ref('estoque')
</script>

<template>
  <div class="page-head">
    <div>
      <span class="almox-chip">
        <i class="pi pi-building" aria-hidden="true" />
        Almoxarifado da Saúde · retaguarda
      </span>
      <h1>Relatórios do Almoxarifado</h1>
      <p class="page-sub">
        Posição de estoque, entradas, saídas, transferências, ficha por produto, crítico, validade, inventários, histórico e distribuição
      </p>
    </div>
  </div>

  <Tabs v-model:value="aba" scrollable lazy>
    <TabList>
      <Tab value="estoque">1. Estoque atual</Tab>
      <Tab value="entradas">2. Entradas</Tab>
      <Tab value="saidas">3. Saídas</Tab>
      <Tab value="transferencias">4. Transferências</Tab>
      <Tab value="produto">5. Por produto</Tab>
      <Tab value="critico">6. Estoque crítico</Tab>
      <Tab value="validade">7. Validade</Tab>
      <Tab value="inventarios">8. Inventários e ajustes</Tab>
      <Tab value="historico">9. Histórico</Tab>
      <Tab value="distribuicao">10. Distribuição</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="estoque">
        <RelAlmoxEstoqueAtual />
      </TabPanel>
      <TabPanel value="entradas">
        <RelAlmoxMovimentos modo="entradas" tipo="entrada" arquivo="Almox_Entradas" />
      </TabPanel>
      <TabPanel value="saidas">
        <RelAlmoxMovimentos modo="saidas" tipo="saida" arquivo="Almox_Saidas" />
      </TabPanel>
      <TabPanel value="transferencias">
        <RelAlmoxTransferencias />
      </TabPanel>
      <TabPanel value="produto">
        <RelAlmoxMovimentos modo="produto" arquivo="Almox_Mov" />
      </TabPanel>
      <TabPanel value="critico">
        <RelAlmoxCritico />
      </TabPanel>
      <TabPanel value="validade">
        <RelAlmoxValidade />
      </TabPanel>
      <TabPanel value="inventarios">
        <RelAlmoxInventarios />
      </TabPanel>
      <TabPanel value="historico">
        <RelAlmoxMovimentos modo="historico" arquivo="Almox_Historico" />
      </TabPanel>
      <TabPanel value="distribuicao">
        <RelAlmoxDistribuicao />
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>
