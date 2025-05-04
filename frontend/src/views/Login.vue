<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-4">
        <div class="card shadow-sm text-center">
          <div class="card-body">
            <img src="@/assets/logo.png" alt="Logo" class="mb-3" style="max-width: 120px;" />
            <h4 class="card-title mb-4">Fitness Centre</h4>
            <div class="mb-3">
              <input v-model="email" type="email" class="form-control" placeholder="Email" />
            </div>
            <div class="mb-3">
              <input v-model="password" type="password" class="form-control" placeholder="Password" />
            </div>
            <div class="d-grid">
              <button @click="handleLogin" class="btn btn-primary">Login</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  try {
    await auth.login(email.value, password.value)
    toast.success('Login successful!')
    setTimeout(() => {
      router.push('/members')
    }, 1000)
  } catch (err) {
    toast.error('Login failed. Check credentials.')
  }
}
</script>
