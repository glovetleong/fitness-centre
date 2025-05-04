<template>
  <div v-if="member" class="container mt-4">
    <h2 class="mb-4">Edit {{ member.name }}</h2>
    <form @submit.prevent="save">
      <div class="mb-3">
        <label for="name" class="form-label">Name</label>
        <input v-model="member.name" id="name" class="form-control" required />
      </div>

      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input v-model="member.email" id="email" type="email" class="form-control" required />
      </div>

      <div class="mb-3">
        <label for="phone" class="form-label">Phone</label>
        <input v-model="member.phone" id="phone" class="form-control" required maxlength="11" />
      </div>

      <div class="mb-3">
        <label for="membership_status" class="form-label">Membership Status</label>
        <select v-model="member.membership_status" id="membership_status" class="form-select" required>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      <div class="mb-3">
        <button type="submit" class="btn btn-success">Save Changes</button>
        <router-link to="/members" class="btn btn-secondary ms-3">Cancel</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { useMemberStore } from '../stores/members'
import { useRouter, useRoute } from 'vue-router'
import { reactive, onMounted } from 'vue'
import { toast } from 'vue3-toastify'

const store = useMemberStore()
const router = useRouter()
const route = useRoute()

const member = reactive({
  id: null,
  name: '',
  email: '',
  phone: '',
  membership_status: ''
})

onMounted(async () => {
  const id = route.params.id
  if (!id) return
  await store.fetchMemberById(id)
  Object.assign(member, store.currentMember)
})

const save = async () => {
  try {
    await store.updateMember(member)
    toast.success('Member updated successfully!')
    setTimeout(() => {
      router.push('/members')
    }, 1000)
  } catch (err) {
    toast.error('Failed to update member')
  }
}
</script>
