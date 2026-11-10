<script setup>
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { ehAdmin } from '../lib/auth'
import RelConsumoPeriodo from '../components/RelConsumoPeriodo.vue'
import RelConsumoFuncionario from '../components/RelConsumoFuncionario.vue'
import RelEstoqueCritico from '../components/RelEstoqueCritico.vue'
import RelValidade from '../components/RelValidade.vue'
import RelFarmaciaEstoqueAtual from '../components/farmacia/RelFarmaciaEstoqueAtual.vue'
import RelFarmaciaMovimentos from '../components/farmacia/RelFarmaciaMovimentos.vue'
import RelFarmaciaTransferencias from '../components/farmacia/RelFarmaciaTransferencias.vue'
import RelFarmaciaCritico from '../components/farmacia/RelFarmaciaCritico.vue'
import RelFarmaciaValidade from '../components/farmacia/RelFarmaciaValidade.vue'
import RelFarmaciaAuditorias from '../components/farmacia/RelFarmaciaAuditorias.vue'
import RelFarmaciaDistribuicao from '../components/farmacia/RelFarmaciaDistribuicao.vue'

const abaAdmin = ref('estoque')
const abaOperador = ref('consumo')
</script>

<template>
  <div class="page-head">
    <div>
      <h1>Relatórios</h1>
      <p v-if="ehAdmin" class="page-sub">
        Posição de estoque, entradas, saídas, transferências recebidas, ficha por produto, crítico, validade, auditorias, histórico e distribuição
      </p>
      <p v-else class="page-sub">Consumo, funcionários, estoque crítico e validade</p>
    </div>
  </div>

  <!-- Visão Admin: 10 abas completas da Farmácia (contrato B-REL) -->
  <Tabs v-if="ehAdmin" v-model:value="abaAdmin" scrollable lazy>
    <TabList>
      <Tab value="estoque">1. Estoque atual</Tab>
      <Tab value="entradas">2. Entradas</Tab>
      <Tab value="saidas">3. Saídas</Tab>
      <Tab value="transferencias">4. Transferências</Tab>
      <Tab value="produto">5. Por produto</Tab>
      <Tab value="critico">6. Estoque crítico</Tab>
      <Tab value="validade">7. Validade</Tab>
      <Tab value="auditorias">8. Auditorias e ajustes</Tab>
      <Tab value="historico">9. Histórico</Tab>
      <Tab value="distribuicao">10. Distribuição</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="estoque">
        <RelFarmaciaEstoqueAtual />
      </TabPanel>
      <TabPanel value="entradas">
        <RelFarmaciaMovimentos modo="entradas" tipo="entrada" arquivo="Farmacia_Entradas" />
      </TabPanel>
      <TabPanel value="saidas">
        <RelFarmaciaMovimentos modo="saidas" tipo="saida" arquivo="Farmacia_Saidas" />
      </TabPanel>
      <TabPanel value="transferencias">
        <RelFarmaciaTransferencias />
      </TabPanel>
      <TabPanel value="produto">
        <RelFarmaciaMovimentos modo="produto" arquivo="Farmacia_Mov" />
      </TabPanel>
      <TabPanel value="critico">
        <RelFarmaciaCritico />
      </TabPanel>
      <TabPanel value="validade">
        <RelFarmaciaValidade />
      </TabPanel>
      <TabPanel value="auditorias">
        <RelFarmaciaAuditorias />
      </TabPanel>
      <TabPanel value="historico">
        <RelFarmaciaMovimentos modo="historico" arquivo="Farmacia_Historico" />
      </TabPanel>
      <TabPanel value="distribuicao">
        <RelFarmaciaDistribuicao />
      </TabPanel>
    </TabPanels>
  </Tabs>

  <!-- Visão Operador: 4 abas operacionais atuais -->
  <Tabs v-else v-model:value="abaOperador" lazy>
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
