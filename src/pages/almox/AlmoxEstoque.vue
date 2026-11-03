<script setup>
import { almoxNivel, almoxGerir } from '../../lib/auth'
</script>

<template>
  <div class="page-head">
    <div>
      <span class="almox-chip">
        <i class="pi pi-building" aria-hidden="true" />
        Almoxarifado da Saúde · retaguarda
      </span>
      <h1>Estoque do Almoxarifado</h1>
      <p class="page-sub">
        Saldo de retaguarda, lotes e validades · acesso: <strong>{{ almoxNivel }}</strong>
        <span v-if="!almoxGerir"> (somente consulta)</span>
      </p>
    </div>
  </div>

  <div class="card-panel">
    <p class="empty" style="margin: 0">
      Estrutura base de rotas e contexto carregada (Marco F1). Tabela de estoque, indicadores, cadastro de produto e ficha entram no Marco F2.
    </p>
  </div>
</template>
