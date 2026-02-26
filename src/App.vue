<script setup lang="ts">
import AchievementNotification from '@/components/AchievementNotification.vue'
</script>

<template>
  <div class="app">
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>

    <!-- Global Achievement Notifications -->
    <AchievementNotification />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  min-height: 100dvh;
}
</style>
