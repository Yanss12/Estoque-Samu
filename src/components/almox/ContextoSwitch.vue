<script setup>
import SelectButton from 'primevue/selectbutton'
import { contexto, trocarContexto } from '../../lib/contexto'

const opcoes = [
  { label: 'Farmácia', value: 'farmacia', icon: 'pi pi-box' },
  { label: 'Almoxarifado', value: 'almoxarifado', icon: 'pi pi-building' },
]

function aoTrocar(novo) {
  if (novo) trocarContexto(novo)
}
</script>

<template>
  <SelectButton
    :model-value="contexto"
    :options="opcoes"
    :allow-empty="false"
    option-label="label"
    option-value="value"
    aria-label="Contexto do sistema"
    size="small"
    class="contexto-switch"
    @update:model-value="aoTrocar"
  >
    <template #option="{ option }">
      <span class="ctx-opt" :title="option.label">
        <i :class="option.icon" aria-hidden="true" />
        <span class="ctx-opt-label">{{ option.label }}</span>
      </span>
    </template>
  </SelectButton>
</template>
