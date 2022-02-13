<template>
  <div>
    <h1>Home</h1>
    <button @click="state.count++">count is: {{ state.count }}</button>
    <p class="inter">this will be styled with a font-face</p>
    <p class="import-meta-url">{{ state.url }}</p>
    <div>
      encrypted message:
      <p class="encrypted-msg"></p>
    </div>
  </div>
</template>

<script setup>
import { reactive, defineAsyncComponent } from 'vue'
const state = reactive({
  count: 0,
  url: 'home',
})
</script>

<style scoped>
h1,
a {
  color: green;
}
</style>
