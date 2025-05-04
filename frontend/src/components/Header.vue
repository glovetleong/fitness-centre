<template>
  <header class="header bg-dark  text-white d-flex justify-content-between align-items-center p-2">
    <div class="logo">
      <img src="@/assets/logo.png" alt="Logo" class="logo-img" />
    </div>
    <div class="logout">
      <button @click="logout" class="btn btn-danger">Logout</button>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const logout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.header {
  background-color: #007bff;
}

.logo-img {
  width: 50px;
  height: 50px;
}

.logout button {
  color: white;
  background-color: red;
}
</style>
