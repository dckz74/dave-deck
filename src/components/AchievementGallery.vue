<template>
  <div class="achievement-gallery">
    <header class="achievement-gallery__header">
      <div class="achievement-gallery__stats">
        <div class="achievement-stat">
          <div class="achievement-stat__value">{{ unlockedCount }}</div>
          <div class="achievement-stat__label">Unlocked</div>
        </div>
        <div class="achievement-stat">
          <div class="achievement-stat__value">{{ totalAchievements }}</div>
          <div class="achievement-stat__label">Total</div>
        </div>
        <div class="achievement-stat">
          <div class="achievement-stat__value">{{ Math.round(completionPercentage) }}%</div>
          <div class="achievement-stat__label">Complete</div>
        </div>
      </div>
      
      <div class="achievement-gallery__progress">
        <div class="progress-bar">
          <div 
            class="progress-bar__fill" 
            :style="{ width: `${completionPercentage}%` }"
          ></div>
        </div>
      </div>
    </header>

    <div class="achievement-gallery__filters">
      <button
        v-for="category in categories"
        :key="category"
        :class="[
          'filter-button',
          { 'filter-button--active': selectedCategory === category }
        ]"
        @click="selectedCategory = category"
      >
        {{ getCategoryIcon(category) }} {{ formatCategory(category) }}
      </button>
      
      <button
        :class="[
          'filter-button',
          { 'filter-button--active': showOnlyUnlocked }
        ]"
        @click="showOnlyUnlocked = !showOnlyUnlocked"
      >
        🏆 Unlocked Only
      </button>
    </div>

    <div class="achievement-gallery__grid">
      <div
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        :class="[
          'achievement-card',
          `achievement-card--${achievement.tier}`,
          `achievement-card--${achievement.category}`,
          { 'achievement-card--unlocked': achievement.unlockedAt }
        ]"
        @click="selectAchievement(achievement)"
      >
        <div class="achievement-card__header">
          <div class="achievement-card__icon">
            {{ achievement.icon }}
          </div>
          <div class="achievement-card__tier">
            {{ achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1) }}
          </div>
        </div>
        
        <div class="achievement-card__content">
          <h3 class="achievement-card__name">
            {{ achievement.name }}
          </h3>
          <p class="achievement-card__description">
            {{ achievement.description }}
          </p>
          
          <div class="achievement-card__progress">
            <div class="progress-info">
              <span class="progress-text">
                {{ achievement.progress }} / {{ achievement.maxProgress }}
              </span>
              <span v-if="achievement.unlockedAt" class="unlock-date">
                Unlocked {{ formatDate(achievement.unlockedAt) }}
              </span>
            </div>
            <div class="progress-bar progress-bar--small">
              <div 
                class="progress-bar__fill" 
                :style="{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
        
        <div v-if="achievement.unlockedAt" class="achievement-card__unlock-badge">
          ✓
        </div>
      </div>
    </div>

    <!-- Achievement Detail Modal -->
    <div 
      v-if="selectedAchievementDetails"
      class="achievement-modal"
      @click.self="selectedAchievementDetails = null"
    >
      <div class="achievement-modal__content">
        <header class="achievement-modal__header">
          <div class="achievement-modal__icon">
            {{ selectedAchievementDetails.icon }}
          </div>
          <div class="achievement-modal__title">
            <h2>{{ selectedAchievementDetails.name }}</h2>
            <div class="achievement-modal__tier">
              {{ selectedAchievementDetails.tier.toUpperCase() }} 
              • {{ formatCategory(selectedAchievementDetails.category) }}
            </div>
          </div>
          <button 
            class="achievement-modal__close"
            @click="selectedAchievementDetails = null"
          >
            ×
          </button>
        </header>
        
        <div class="achievement-modal__body">
          <p class="achievement-modal__description">
            {{ selectedAchievementDetails.description }}
          </p>
          
          <div class="achievement-modal__progress">
            <div class="progress-info progress-info--large">
              <span class="progress-text">
                Progress: {{ selectedAchievementDetails.progress }} / {{ selectedAchievementDetails.maxProgress }}
              </span>
              <span class="progress-percentage">
                {{ Math.round((selectedAchievementDetails.progress / selectedAchievementDetails.maxProgress) * 100) }}%
              </span>
            </div>
            <div class="progress-bar progress-bar--large">
              <div 
                class="progress-bar__fill" 
                :style="{ width: `${(selectedAchievementDetails.progress / selectedAchievementDetails.maxProgress) * 100}%` }"
              ></div>
            </div>
          </div>
          
          <div v-if="selectedAchievementDetails.unlockedAt" class="achievement-modal__unlock-info">
            <div class="unlock-badge">🏆 UNLOCKED</div>
            <div class="unlock-date">
              {{ formatDetailedDate(selectedAchievementDetails.unlockedAt) }}
            </div>
          </div>
          
          <div v-else class="achievement-modal__tips">
            <h4>💡 Tips to unlock:</h4>
            <p>{{ getAchievementTip(selectedAchievementDetails) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAchievementStore } from '@/stores/achievements'
import type { Achievement } from '@/stores/achievements'

const achievementStore = useAchievementStore()

const selectedCategory = ref<string>('all')
const showOnlyUnlocked = ref(false)
const selectedAchievementDetails = ref<Achievement | null>(null)

// Computed properties
const { 
  achievements,
  unlockedCount,
  totalAchievements,
  completionPercentage,
  achievementsByCategory 
} = achievementStore

const categories = computed(() => ['all', ...Object.keys(achievementsByCategory)])

const filteredAchievements = computed(() => {
  let filtered = Object.values(achievements)
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(achievement => achievement.category === selectedCategory.value)
  }
  
  // Filter by unlocked status
  if (showOnlyUnlocked.value) {
    filtered = filtered.filter(achievement => achievement.unlockedAt)
  }
  
  // Sort by tier and progress
  return filtered.sort((a, b) => {
    // First by tier (bronze, silver, gold, platinum)
    const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
    const aTierValue = tierOrder[a.tier as keyof typeof tierOrder]
    const bTierValue = tierOrder[b.tier as keyof typeof tierOrder]
    
    if (aTierValue !== bTierValue) {
      return aTierValue - bTierValue
    }
    
    // Then by unlock status (unlocked first)
    if (a.unlockedAt && !b.unlockedAt) return -1
    if (!a.unlockedAt && b.unlockedAt) return 1
    
    // Finally by progress percentage
    const aProgress = a.progress / a.maxProgress
    const bProgress = b.progress / b.maxProgress
    return bProgress - aProgress
  })
})

// Helper functions
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    all: '🏆',
    combat: '⚔️',
    strategy: '🧠',
    mastery: '🎯',
    luck: '🍀',
    endurance: '⏰',
    special: '⭐'
  }
  return icons[category] || '🎮'
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function formatDetailedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function selectAchievement(achievement: Achievement): void {
  selectedAchievementDetails.value = achievement
}

function getAchievementTip(achievement: Achievement): string {
  const tips: Record<string, string> = {
    victories: 'Keep playing and winning games to unlock higher tiers!',
    perfect_games: 'Win games without losing any lives - play conservatively and use defensive chips.',
    comeback_wins: 'Turn the tide when you\'re behind - use strategic chips and take calculated risks.',
    win_streak: 'Build up consecutive victories - consistency is key!',
    chip_master: 'Experiment with all different chip types to discover their unique benefits.',
    perfect_draws: 'Use Perfect Draw chips when you can hit exactly the limit.',
    limit_manipulator: 'Use Limit 17/24/27 chips strategically to gain advantages.',
    shield_user: 'Use Shield and Shield+ chips to reduce damage from losses.',
    aggressive_player: 'Use Stake+ chips when you\'re confident of winning to maximize damage.',
    card_swapper: 'Use Card Swap strategically when the opponent has a better last card.',
    perfect_hands: 'Aim to hit exactly the round limit - practice makes perfect!',
    low_limit_wins: 'Win rounds using Limit 17 chips - requires precise play.',
    high_limit_wins: 'Win rounds using Limit 27 chips - take more risks.',
    chip_collector: 'Keep drawing cards to collect more chips naturally.',
    epic_hands: 'Go for high-value hands (23+) when using Limit 27 chips.',
    close_calls: 'Win by exactly 1 point - this requires both skill and luck!',
    marathon_player: 'Keep playing - time spent enjoying the game counts!',
    game_count: 'Play more games to unlock higher tiers.',
    round_warrior: 'Each round you play counts toward this achievement.',
    speed_demon: 'Win games quickly by making fast, decisive moves.',
    turtle_master: 'Take your time and think strategically for longer games.',
    ai_nemesis: 'Master the game mechanics to consistently beat the enhanced AI.',
    comeback_specialist: 'Pull off miraculous victories when down to your last life!',
    chip_hoarder: 'Sometimes saving chips for the right moment pays off.',
    all_chip_game: 'Try to use every different chip type in a single game.'
  }
  
  const baseId = achievement.id.split('_')[0]
  return tips[baseId] || 'Keep playing and experimenting to unlock this achievement!'
}
</script>

<style scoped>
.achievement-gallery {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.achievement-gallery__header {
  text-align: center;
  margin-bottom: 32px;
}

.achievement-gallery__stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 16px;
}

.achievement-stat {
  text-align: center;
}

.achievement-stat__value {
  font-size: 32px;
  font-weight: 800;
  color: #333;
  line-height: 1;
}

.achievement-stat__label {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.achievement-gallery__progress {
  max-width: 300px;
  margin: 0 auto;
}

.progress-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar--small {
  height: 6px;
}

.progress-bar--large {
  height: 12px;
  margin-top: 8px;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.achievement-gallery__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}

.filter-button {
  padding: 8px 16px;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}

.filter-button:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.filter-button--active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.achievement-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.achievement-card {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.achievement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.achievement-card--unlocked {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 1));
}

.achievement-card--bronze { border-color: #cd7f32; }
.achievement-card--silver { border-color: #c0c0c0; }
.achievement-card--gold { border-color: #ffd700; }
.achievement-card--platinum { border-color: #e5e4e2; }

.achievement-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
}

.achievement-card__icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.achievement-card__tier {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 12px;
  background: currentColor;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.achievement-card__content {
  padding: 16px;
}

.achievement-card__name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
  line-height: 1.3;
}

.achievement-card__description {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px;
  line-height: 1.4;
}

.achievement-card__progress {
  margin-top: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}

.progress-info--large {
  font-size: 14px;
}

.progress-text {
  font-weight: 500;
  color: #333;
}

.progress-percentage {
  font-weight: 600;
  color: #22c55e;
}

.unlock-date {
  color: #22c55e;
  font-weight: 500;
}

.achievement-card__unlock-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #22c55e;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

/* Achievement Modal */
.achievement-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.achievement-modal__content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.achievement-modal__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.achievement-modal__icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.achievement-modal__title h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
  line-height: 1.3;
}

.achievement-modal__tier {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-weight: 500;
}

.achievement-modal__close {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.achievement-modal__close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.achievement-modal__body {
  padding: 24px;
}

.achievement-modal__description {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px;
  line-height: 1.5;
}

.achievement-modal__progress {
  margin-bottom: 24px;
}

.achievement-modal__unlock-info {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1));
  border-radius: 12px;
}

.unlock-badge {
  font-size: 18px;
  font-weight: 700;
  color: #22c55e;
  margin-bottom: 8px;
}

.achievement-modal__tips {
  background: rgba(59, 130, 246, 0.1);
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.achievement-modal__tips h4 {
  margin: 0 0 8px;
  color: #333;
  font-size: 14px;
}

.achievement-modal__tips p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

/* Responsive design */
@media (max-width: 768px) {
  .achievement-gallery {
    padding: 16px;
  }
  
  .achievement-gallery__stats {
    gap: 20px;
  }
  
  .achievement-gallery__grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .achievement-modal {
    padding: 10px;
  }
  
  .achievement-modal__header {
    padding: 16px;
  }
  
  .achievement-modal__body {
    padding: 16px;
  }
}
</style>