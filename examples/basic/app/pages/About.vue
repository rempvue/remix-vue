<template>
  <h1>{{ msg }}</h1>
  <p class="import-meta-url">{{ url }}</p>
</template>

<script>
export default {
  async setup() {
    return {
      msg: 'About',
      url: 'about',
    }
  },
  components: {},
}
</script>

<style scoped>
h1 {
  color: red;
}
</style>
