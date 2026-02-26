<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStatisticsStore } from '@/stores/statistics'
import { useAchievementStore } from '@/stores/achievements'
import { CHIP_DEFS } from '@/game/chips'
import AchievementGallery from './AchievementGallery.vue'
import type { ChipKind } from '@/game/types'

const router = useRouter()

const stats = useStatisticsStore()
const achievementStore = useAchievementStore()

// Tab management
const activeTab = ref<'stats' | 'achievements'>('stats')

// Format duration from milliseconds to human readable
function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Format percentage with one decimal
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

// Get chip usage as sorted array for display
const chipUsageStats = computed(() => {
  return Object.entries(stats.stats.chipUsageByType)
    .map(([chipKind, usage]) => ({
      chipKind: chipKind as ChipKind,
      name: CHIP_DEFS[chipKind as ChipKind].name,
      shortName: CHIP_DEFS[chipKind as ChipKind].shortName,
      usage
    }))
    .sort((a, b) => b.usage - a.usage)
    .filter(item => item.usage > 0)
})

// Quick achievement summary for stats tab
const quickAchievementStats = computed(() => ({
  unlockedCount: achievementStore.unlockedCount,
  totalCount: achievementStore.totalAchievements,
  completionRate: achievementStore.completionPercentage
}))
</script>

<template>
  <div class="statistics-view">
    <header class="stats-header">
      <button type="button" class="btn-back" @click="router.push('/')" aria-label="Zurück">
        ← Zurück
      </button>
      <h1>{{ activeTab === 'stats' ? 'Statistiken' : 'Erfolge' }}</h1>
      <p class="stats-subtitle">{{ activeTab === 'stats' ? 'Deine Dave Deck Performance' : 'Deine Errungenschaften' }}</p>
      
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          type="button"
          :class="['tab-button', { 'tab-button--active': activeTab === 'stats' }]"
          @click="activeTab = 'stats'"
        >
          📊 Statistiken
        </button>
        <button 
          type="button"
          :class="['tab-button', { 'tab-button--active': activeTab === 'achievements' }]"
          @click="activeTab = 'achievements'"
        >
          🏆 Erfolge
          <span class="achievement-count">{{ quickAchievementStats.unlockedCount }}/{{ quickAchievementStats.totalCount }}</span>
        </button>
      </div>
    </header>

    <!-- Statistics Tab Content -->
    <div v-if="activeTab === 'stats'" class="stats-grid">
      <!-- Game Performance Section -->
      <section class="stats-card stats-card--primary">
        <h2 class="stats-card-title">
          <span class="stats-icon">🎮</span>
          Spielperformance
        </h2>
        <div class="stats-metrics">
          <div class="metric">
            <div class="metric-value">{{ stats.stats.gamesPlayed }}</div>
            <div class="metric-label">Spiele gespielt</div>
          </div>
          <div class="metric metric--win">
            <div class="metric-value">{{ stats.stats.gamesWon }}</div>
            <div class="metric-label">Gewonnen</div>
          </div>
          <div class="metric metric--loss">
            <div class="metric-value">{{ stats.stats.gamesLost }}</div>
            <div class="metric-label">Verloren</div>
          </div>
          <div class="metric metric--highlight">
            <div class="metric-value">{{ formatPercentage(stats.winRate) }}</div>
            <div class="metric-label">Siegesrate</div>
          </div>
        </div>
      </section>

      <!-- Round Performance Section -->
      <section class="stats-card">
        <h2 class="stats-card-title">
          <span class="stats-icon">🔄</span>
          Rundenperformance
        </h2>
        <div class="stats-metrics">
          <div class="metric">
            <div class="metric-value">{{ stats.stats.roundsPlayed }}</div>
            <div class="metric-label">Runden gespielt</div>
          </div>
          <div class="metric metric--win">
            <div class="metric-value">{{ stats.stats.roundsWon }}</div>
            <div class="metric-label">Runden gewonnen</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ formatPercentage(stats.roundWinRate) }}</div>
            <div class="metric-label">Runden-Siegesrate</div>
          </div>
        </div>
      </section>

      <!-- Card Statistics Section -->
      <section class="stats-card">
        <h2 class="stats-card-title">
          <span class="stats-icon">🃏</span>
          Karten-Statistiken
        </h2>
        <div class="stats-metrics">
          <div class="metric">
            <div class="metric-value">{{ stats.stats.cardsDrawn }}</div>
            <div class="metric-label">Karten gezogen</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ stats.averageHandValue.toFixed(1) }}</div>
            <div class="metric-label">Ø Hand-Wert</div>
          </div>
          <div class="metric metric--perfect">
            <div class="metric-value">{{ stats.stats.perfectHands }}</div>
            <div class="metric-label">Perfekte Hände</div>
          </div>
          <div class="metric metric--bust">
            <div class="metric-value">{{ formatPercentage(stats.bustRate) }}</div>
            <div class="metric-label">Bust-Rate</div>
          </div>
        </div>
      </section>

      <!-- Chip Statistics Section -->
      <section class="stats-card">
        <h2 class="stats-card-title">
          <span class="stats-icon">🎯</span>
          Chip-Nutzung
        </h2>
        <div class="stats-metrics">
          <div class="metric">
            <div class="metric-value">{{ stats.stats.chipsUsed }}</div>
            <div class="metric-label">Chips genutzt</div>
          </div>
          <div v-if="stats.favoriteChip" class="metric metric--favorite">
            <div class="metric-value">{{ CHIP_DEFS[stats.favoriteChip].shortName }}</div>
            <div class="metric-label">Lieblings-Chip</div>
          </div>
        </div>
        
        <div v-if="chipUsageStats.length > 0" class="chip-usage-list">
          <div 
            v-for="chip in chipUsageStats.slice(0, 5)" 
            :key="chip.chipKind"
            class="chip-usage-item"
          >
            <span class="chip-usage-name">{{ chip.name }}</span>
            <span class="chip-usage-count">{{ chip.usage }}×</span>
          </div>
        </div>
      </section>

      <!-- Streaks & Advanced Section -->
      <section class="stats-card">
        <h2 class="stats-card-title">
          <span class="stats-icon">🔥</span>
          Serien & Rekorde
        </h2>
        <div class="stats-metrics">
          <div class="metric metric--streak">
            <div class="metric-value">{{ stats.stats.currentWinStreak }}</div>
            <div class="metric-label">Aktuelle Siegesserie</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ stats.stats.longestWinStreak }}</div>
            <div class="metric-label">Längste Siegesserie</div>
          </div>
          <div class="metric metric--comeback">
            <div class="metric-value">{{ stats.stats.comebackWins }}</div>
            <div class="metric-label">Comeback-Siege</div>
          </div>
        </div>
      </section>

      <!-- Time Statistics Section -->
      <section class="stats-card">
        <h2 class="stats-card-title">
          <span class="stats-icon">⏱️</span>
          Spielzeit
        </h2>
        <div class="stats-metrics">
          <div class="metric">
            <div class="metric-value">{{ formatDuration(stats.stats.totalPlaytimeMs) }}</div>
            <div class="metric-label">Gesamte Spielzeit</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ formatDuration(stats.averageGameDuration) }}</div>
            <div class="metric-label">Ø Spieldauer</div>
          </div>
          <div v-if="stats.stats.shortestGameMs" class="metric">
            <div class="metric-value">{{ formatDuration(stats.stats.shortestGameMs) }}</div>
            <div class="metric-label">Schnellstes Spiel</div>
          </div>
          <div v-if="stats.stats.longestGameMs" class="metric">
            <div class="metric-value">{{ formatDuration(stats.stats.longestGameMs) }}</div>
            <div class="metric-label">Längstes Spiel</div>
          </div>
        </div>
      </section>

      <!-- Quick Achievement Summary -->
      <section class="stats-card stats-card--achievements" @click="activeTab = 'achievements'">
        <h2 class="stats-card-title">
          <span class="stats-icon">🏅</span>
          Erfolge
          <button type="button" class="view-all-btn">
            Alle ansehen →
          </button>
        </h2>
        <div class="achievement-summary">
          <div class="achievement-summary-stat">
            <div class="achievement-summary-value">{{ quickAchievementStats.unlockedCount }}</div>
            <div class="achievement-summary-label">Freigeschaltet</div>
          </div>
          <div class="achievement-summary-stat">
            <div class="achievement-summary-value">{{ quickAchievementStats.totalCount }}</div>
            <div class="achievement-summary-label">Gesamt</div>
          </div>
          <div class="achievement-summary-stat">
            <div class="achievement-summary-value">{{ Math.round(quickAchievementStats.completionRate) }}%</div>
            <div class="achievement-summary-label">Vollständigkeit</div>
          </div>
        </div>
        <div class="achievement-progress">
          <div class="achievement-progress-bar">
            <div 
              class="achievement-progress-fill" 
              :style="{ width: `${quickAchievementStats.completionRate}%` }"
            ></div>
          </div>
        </div>
      </section>
    </div>

    <!-- Achievements Tab Content -->
    <div v-if="activeTab === 'achievements'" class="achievements-content">
      <AchievementGallery />
    </div>

  </div>
</template>

<style scoped>
.statistics-view {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 2rem 1rem;
}

.stats-header {
  position: relative;
  text-align: center;
  margin-bottom: 2rem;
}

.btn-back {
  position: absolute;
  left: 0;
  top: 0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--color-text-muted);
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-back:hover {
  color: var(--color-text);
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.stats-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.stats-subtitle {
  color: var(--color-text-muted);
  font-size: 1.1rem;
  margin: 0;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.tab-button {
  padding: 12px 24px;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--color-text);
}

.tab-button--active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.achievement-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.tab-button--active .achievement-count {
  background: rgba(255, 255, 255, 0.3);
}

.stats-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stats-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.stats-card--primary {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-primary) 100%);
  border-color: var(--color-accent);
}

.stats-card--achievements {
  grid-column: 1 / -1;
  cursor: pointer;
  transition: all 0.2s;
}

.stats-card--achievements:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.view-all-btn {
  margin-left: auto;
  font-size: 0.9rem;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.view-all-btn:hover {
  color: var(--color-text);
}

.achievement-summary {
  display: flex;
  justify-content: space-around;
  gap: 16px;
  margin-bottom: 16px;
}

.achievement-summary-stat {
  text-align: center;
}

.achievement-summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.achievement-summary-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.achievement-progress {
  margin-top: 16px;
}

.achievement-progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.achievement-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
  transition: width 0.3s ease;
  border-radius: 4px;
}

.achievements-content {
  background: transparent;
}

.stats-card-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1.5rem;
}

.stats-icon {
  font-size: 1.5rem;
}

.stats-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.metric {
  text-align: center;
}

.metric-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

/* Metric color variations */
.metric--win .metric-value {
  color: var(--color-success);
}

.metric--loss .metric-value {
  color: #f87171;
}

.metric--highlight .metric-value {
  color: var(--color-accent);
  font-size: 2.2rem;
}

.metric--perfect .metric-value {
  color: #fbbf24;
}

.metric--bust .metric-value {
  color: #f87171;
}

.metric--favorite .metric-value {
  color: var(--color-accent);
  background: rgba(233, 69, 96, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 1.2rem;
}

.metric--streak .metric-value {
  color: #fb923c;
}

.metric--comeback .metric-value {
  color: #8b5cf6;
}

/* Chip usage list */
.chip-usage-list {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chip-usage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.chip-usage-item:last-child {
  border-bottom: none;
}

.chip-usage-name {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.chip-usage-count {
  color: var(--color-accent);
  font-weight: 600;
  font-size: 0.9rem;
}



/* Responsive adjustments */
@media (max-width: 640px) {
  .statistics-view {
    padding: 1rem 0.5rem;
  }
  
  .stats-header h1 {
    font-size: 2rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .stats-card {
    padding: 1rem;
  }
  
  .stats-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .metric-value {
    font-size: 1.5rem;
  }
  
  .metric--highlight .metric-value {
    font-size: 1.8rem;
  }
}
</style>