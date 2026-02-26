<template>
  <Teleport to="body">
    <TransitionGroup name="achievement" tag="div" class="achievement-notifications">
      <div
        v-for="achievement in visibleAchievements"
        :key="achievement.id"
        :class="[
          'achievement-notification',
          `achievement-notification--${achievement.tier}`,
          `achievement-notification--${achievement.category}`
        ]"
        @click="dismissAchievement(achievement)"
      >
        <div class="achievement-notification__header">
          <div class="achievement-notification__icon">
            {{ achievement.icon }}
          </div>
          <div class="achievement-notification__tier-badge">
            {{ achievement.tier.toUpperCase() }}
          </div>
        </div>
        
        <div class="achievement-notification__content">
          <h3 class="achievement-notification__title">
            Achievement Unlocked!
          </h3>
          <h4 class="achievement-notification__name">
            {{ achievement.name }}
          </h4>
          <p class="achievement-notification__description">
            {{ achievement.description }}
          </p>
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAchievementStore } from '@/stores/achievements'
import type { Achievement } from '@/stores/achievements'

const achievementStore = useAchievementStore()
const visibleAchievements = ref<Achievement[]>([])

// Auto-dismiss achievements after a delay
const DISPLAY_DURATION = 6000 // 6 seconds

function showAchievement(achievement: Achievement) {
  visibleAchievements.value.push(achievement)
  
  // Auto-dismiss after delay
  setTimeout(() => {
    dismissAchievement(achievement)
  }, DISPLAY_DURATION)
}

function dismissAchievement(achievement: Achievement) {
  const index = visibleAchievements.value.findIndex(a => a.id === achievement.id)
  if (index !== -1) {
    visibleAchievements.value.splice(index, 1)
  }
}

// Watch for new achievements
watch(
  () => achievementStore.recentUnlocks,
  (newUnlocks) => {
    for (const achievement of newUnlocks) {
      // Only show if not already visible
      if (!visibleAchievements.value.find(a => a.id === achievement.id)) {
        showAchievement(achievement)
      }
    }
    
    // Clear the recent unlocks after processing
    if (newUnlocks.length > 0) {
      achievementStore.clearRecentUnlocks()
    }
  },
  { deep: true }
)

// Play sound effect for achievements (if audio is available)
function playUnlockSound(tier: string) {
  try {
    // Create a simple audio feedback using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Different tones for different tiers
    const frequencies = {
      bronze: 440, // A4
      silver: 554, // C#5
      gold: 659,   // E5
      platinum: 880 // A5
    }
    
    oscillator.frequency.setValueAtTime(frequencies[tier as keyof typeof frequencies] || 440, audioContext.currentTime)
    oscillator.type = 'triangle'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    // Audio not available, continue silently
  }
}

// Play sound when achievements appear
watch(visibleAchievements, (newAchievements, oldAchievements) => {
  const newCount = newAchievements.length
  const oldCount = oldAchievements?.length || 0
  
  if (newCount > oldCount) {
    const newAchievement = newAchievements[newCount - 1]
    playUnlockSound(newAchievement.tier)
  }
}, { deep: true })
</script>

<style scoped>
.achievement-notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.achievement-notification {
  position: relative;
  width: 320px;
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 240, 0.95) 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 2px solid;
  cursor: pointer;
  pointer-events: all;
  overflow: hidden;
}

.achievement-notification::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  animation: achievement-glow 2s ease-in-out infinite;
}

@keyframes achievement-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* Tier-specific colors */
.achievement-notification--bronze {
  border-color: #cd7f32;
  color: #8b4513;
}

.achievement-notification--silver {
  border-color: #c0c0c0;
  color: #708090;
}

.achievement-notification--gold {
  border-color: #ffd700;
  color: #b8860b;
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.4);
}

.achievement-notification--platinum {
  border-color: #e5e4e2;
  color: #71706e;
  box-shadow: 0 8px 32px rgba(229, 228, 226, 0.4);
}

.achievement-notification__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.achievement-notification__icon {
  font-size: 24px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.achievement-notification__tier-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 12px;
  background: currentColor;
  color: white;
  letter-spacing: 0.5px;
}

.achievement-notification__content {
  margin-bottom: 8px;
}

.achievement-notification__title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 4px;
  color: currentColor;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.achievement-notification__name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
  color: #333;
  line-height: 1.2;
}

.achievement-notification__description {
  font-size: 13px;
  margin: 0;
  color: #666;
  line-height: 1.3;
}

/* Category-specific styles */
.achievement-notification--combat {
  background: linear-gradient(135deg, rgba(255, 230, 230, 0.95), rgba(255, 200, 200, 0.95));
}

.achievement-notification--strategy {
  background: linear-gradient(135deg, rgba(230, 230, 255, 0.95), rgba(200, 200, 255, 0.95));
}

.achievement-notification--mastery {
  background: linear-gradient(135deg, rgba(230, 255, 230, 0.95), rgba(200, 255, 200, 0.95));
}

.achievement-notification--luck {
  background: linear-gradient(135deg, rgba(255, 255, 230, 0.95), rgba(255, 255, 200, 0.95));
}

.achievement-notification--endurance {
  background: linear-gradient(135deg, rgba(255, 230, 255, 0.95), rgba(255, 200, 255, 0.95));
}

.achievement-notification--special {
  background: linear-gradient(135deg, rgba(230, 255, 255, 0.95), rgba(200, 255, 255, 0.95));
}

/* Animation transitions */
.achievement-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.achievement-leave-active {
  transition: all 0.3s ease-in;
}

.achievement-enter-from {
  transform: translateX(100%) scale(0.8);
  opacity: 0;
}

.achievement-leave-to {
  transform: translateX(100%) scale(0.9);
  opacity: 0;
}

.achievement-move {
  transition: transform 0.3s ease;
}

/* Responsive design */
@media (max-width: 768px) {
  .achievement-notifications {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .achievement-notification {
    width: auto;
    margin-bottom: 10px;
  }
}

/* Hover effects */
.achievement-notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.achievement-notification:active {
  transform: translateY(0);
}
</style>