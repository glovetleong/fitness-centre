<template>
  <div class="container mt-4">
    <h2 class="mb-4">Member List</h2>
    <div class="mb-3">
      <input
        v-model="searchQuery"
        type="text"
        class="form-control"
        placeholder="Search by name, email, or phone"
      />
    </div>
    <table class="table table-striped table-hover">
      <thead class="table-dark">
        <tr>
          <th>No</th>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(member, index) in store.members" :key="member.id">
          <td>{{ (store.currentPage - 1) * itemsPerPage + index + 1 }}</td>
          <td>{{ member.name }}</td>
          <td>{{ member.email }}</td>
          <td>{{ member.phone }}</td>
          <td>
            <span :class="{
              'badge': true,
              'bg-success': member.membership_status === 'Active',
              'bg-secondary': member.membership_status === 'Inactive'
            }">
              {{ member.membership_status }}
            </span>
          </td>
          <td>
            <router-link :to="`/members/edit/${member.id}`" class="btn btn-sm btn-outline-primary">
              Edit
            </router-link>
          </td>
        </tr>
        <tr v-if="store.members.length === 0">
          <td colspan="6" class="text-center text-muted">No members found.</td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <nav aria-label="Page navigation">
      <ul class="pagination">
        <li class="page-item" :class="{ disabled: store.currentPage === 1 }">
          <button class="page-link" @click="changePage(store.currentPage - 1)">Previous</button>
        </li>

        <li
          v-for="page in store.totalPages"
          :key="page"
          class="page-item"
          :class="{ active: page === store.currentPage }"
        >
          <button class="page-link" @click="changePage(page)">{{ page }}</button>
        </li>

        <li class="page-item" :class="{ disabled: store.currentPage === store.totalPages }">
          <button class="page-link" @click="changePage(store.currentPage + 1)">Next</button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useMemberStore } from '../stores/members'

const store = useMemberStore()
const searchQuery = ref('')
const itemsPerPage = 10

onMounted(() => {
  store.fetchMembers()
})

watch(searchQuery, (val) => {
  store.fetchMembers(1, val)
})

const changePage = (page) => {
  store.fetchMembers(page, searchQuery.value)
}
</script>

<style scoped>
.pagination .page-item.disabled .page-link {
  pointer-events: none;
}
</style>
