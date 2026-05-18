<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import DefaultLayout from './layouts/DefaultLayout.vue'

const route = useRoute()

const layout = computed(() => {
  const noLayoutRoutes = ['/login']
  return noLayoutRoutes.includes(route.path) ? 'div' : DefaultLayout
})
</script>

<style>
body {
  background-color: #e3f2fd;
}
</style>
