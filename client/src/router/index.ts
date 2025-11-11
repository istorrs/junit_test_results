import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'Dashboard' },
  },
  {
    path: '/runs',
    name: 'test-runs',
    component: () => import('../views/TestRuns.vue'),
    meta: { title: 'Test Runs' },
  },
  {
    path: '/cases',
    name: 'test-cases',
    component: () => import('../views/TestCases.vue'),
    meta: { title: 'Test Cases' },
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('../views/Upload.vue'),
    meta: { title: 'Upload Results' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Update document title on route change
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - JUnit Test Results`
  }
  next()
})

export default router
