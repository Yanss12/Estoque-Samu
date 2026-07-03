<script setup>
defineProps({ size: { type: Number, default: 28 } })
</script>

<template>
  <!-- Estrela da Vida (símbolo do serviço de emergência) -->
  <svg :width="size" :height="size" viewBox="0 0 100 100" aria-hidden="true">
    <g fill="currentColor">
      <rect x="42" y="6" width="16" height="88" rx="8" />
      <rect x="42" y="6" width="16" height="88" rx="8" transform="rotate(60 50 50)" />
      <rect x="42" y="6" width="16" height="88" rx="8" transform="rotate(120 50 50)" />
    </g>
  </svg>
</template>
