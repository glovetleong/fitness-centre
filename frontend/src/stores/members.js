import { defineStore } from 'pinia'
import axios from 'axios'
import { useAuthStore } from './auth'

const API_URL = import.meta.env.VITE_API_URL

export const useMemberStore = defineStore('members', {
  state: () => ({
    members: [],
    totalPages: 0,
    currentPage: 1,
    totalCount: 0,
    currentMember: null
  }),

  actions: {
    // Fetch all members
    async fetchMembers(page = 1, search = '') {
      const auth = useAuthStore()
      const res = await axios.get(`${API_URL}/members`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        params: { page, search }
      })
      this.members = res.data.members
      this.totalPages = res.data.totalPages
      this.currentPage = res.data.currentPage
      this.totalCount = res.data.totalCount
    },

    // Fetch a member by ID
    async fetchMemberById(id) {
      const auth = useAuthStore()
      const res = await axios.get(`${API_URL}/members/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      this.currentMember = res.data
    },

    setCurrentMember(member) {
      this.currentMember = member
    },

    // Update a member's information
    async updateMember(updatedMember) {
      const auth = useAuthStore()
      await axios.put(`${API_URL}/members/${updatedMember.id}`, updatedMember, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
    }
  }
})
