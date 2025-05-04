import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
  }),
  actions: {
    async login(email, password) {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      })
      this.token = res.data.token
      localStorage.setItem('token', this.token)
    },
    logout() {
      this.token = null
      localStorage.removeItem('token')
    }
  }
})
