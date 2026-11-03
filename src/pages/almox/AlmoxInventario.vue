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
      <h1>Inventário do Almoxarifado</h1>
      <p class="page-sub">Conferência física de estoque e ajustes auditados · acesso: <strong>{{ almoxNivel }}</strong></p>
    </div>
  </div>

  <div class="card-panel">
    <p class="empty" style="margin: 0">
      Estrutura base de rotas e contexto carregada (Marco F1). Lista de inventários e contagem entram no Marco F5.
    </p>
  </div>
</template>
