import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import MemberList from '../views/MemberList.vue'
import MemberEdit from '../views/MemberEdit.vue'
import NotFound from '../views/NotFound.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/members', component: MemberList },
  { path: '/members/edit/:id', component: MemberEdit },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
