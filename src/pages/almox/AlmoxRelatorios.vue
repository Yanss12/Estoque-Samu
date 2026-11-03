<script setup>
import { almoxNivel } from '../../lib/auth'
</script>

<template>
  <div class="page-head">
    <div>
      <span class="almox-chip">
        <i class="pi pi-building" aria-hidden="true" />
        Almoxarifado da Saúde · retaguarda
      </span>
      <h1>Relatórios do Almoxarifado</h1>
      <p class="page-sub">Consultas e exportação Excel · acesso: <strong>{{ almoxNivel }}</strong></p>
    </div>
  </div>

  <div class="card-panel">
    <p class="empty" style="margin: 0">
      Estrutura base de rotas e contexto carregada (Marco F1). Os 10 relatórios e exportação entram no Marco F6.
    </p>
  </div>
</template>
