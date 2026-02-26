import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Home from '@/views/HomeView.vue'
import Game from '@/views/GameView.vue'
import Lobby from '@/views/LobbyView.vue'
import Statistics from '@/components/StatisticsView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home, meta: { title: 'Dave Deck' } },
  { path: '/lobby', name: 'lobby', component: Lobby, meta: { title: 'Lobby – Dave Deck' } },
  { path: '/game', name: 'game', component: Game, meta: { title: 'Spiel – Dave Deck' } },
  {
    path: '/statistics',
    name: 'statistics',
    component: Statistics,
    meta: { title: 'Statistiken – Dave Deck' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach(to => {
  const title = to.meta?.title as string | undefined
  if (title) document.title = title
})

export default router
