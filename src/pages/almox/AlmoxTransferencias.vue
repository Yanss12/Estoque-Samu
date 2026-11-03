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
      <h1>Transferências para a Farmácia</h1>
      <p class="page-sub">Guias de transferência Almoxarifado → Farmácia COMUE · acesso: <strong>{{ almoxNivel }}</strong></p>
    </div>
  </div>

  <div class="card-panel">
    <p class="empty" style="margin: 0">
      Estrutura base de rotas e contexto carregada (Marco F1). Guias de transferência e estorno entram no Marco F4.
    </p>
  </div>
</template>
