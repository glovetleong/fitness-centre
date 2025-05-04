<template>
  <div id="layout" class="d-flex flex-column min-vh-100">
    <Header />
    <main class="container mt-4 flex-grow-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<style scoped>
#layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex-grow: 1;
}

footer {
  background-color: #f8f9fa;
  padding: 10px;
  text-align: center;
}
</style>
