/**
 * Achievement System - Tiered achievements with creative challenges
 * Features bronze/silver/gold tiers and unique gameplay-based achievements
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ChipKind } from '@/game/types'

/* eslint-disable no-unused-vars */
export enum AchievementTier {
  Bronze = 'bronze',
  Silver = 'silver',
  Gold = 'gold',
  Platinum = 'platinum',
}

export interface Achievement {
  id: string
  name: string
  description: string
  tier: AchievementTier
  icon: string
  unlockedAt?: number // timestamp
  progress: number
  maxProgress: number
  category: 'combat' | 'strategy' | 'mastery' | 'luck' | 'endurance' | 'special' | 'multiplayer'
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: 'combat' | 'strategy' | 'mastery' | 'luck' | 'endurance' | 'special' | 'multiplayer'
  tiers: {
    bronze: { threshold: number; title: string }
    silver: { threshold: number; title: string }
    gold: { threshold: number; title: string }
    platinum?: { threshold: number; title: string }
  }
}

// Creative Achievement Definitions
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // === COMBAT ACHIEVEMENTS ===
  {
    id: 'victories',
    name: 'Victor',
    description: 'Win games against the AI',
    icon: '👑',
    category: 'combat',
    tiers: {
      bronze: { threshold: 5, title: 'First Blood' },
      silver: { threshold: 25, title: 'Seasoned Fighter' },
      gold: { threshold: 100, title: 'Champion' },
      platinum: { threshold: 500, title: 'Legend' },
    },
  },
  {
    id: 'perfect_games',
    name: 'Flawless Victory',
    description: 'Win games without losing any lives',
    icon: '💯',
    category: 'combat',
    tiers: {
      bronze: { threshold: 1, title: 'Perfect Start' },
      silver: { threshold: 10, title: 'Untouchable' },
      gold: { threshold: 25, title: 'Flawless Master' },
    },
  },
  {
    id: 'comeback_wins',
    name: 'Phoenix Rising',
    description: 'Win games after losing lives',
    icon: '🔥',
    category: 'combat',
    tiers: {
      bronze: { threshold: 3, title: 'Never Give Up' },
      silver: { threshold: 15, title: 'Comeback Kid' },
      gold: { threshold: 50, title: 'Phoenix Master' },
    },
  },
  {
    id: 'win_streak',
    name: 'Unstoppable',
    description: 'Achieve consecutive victories',
    icon: '⚡',
    category: 'combat',
    tiers: {
      bronze: { threshold: 3, title: 'Hot Streak' },
      silver: { threshold: 10, title: 'Domination' },
      gold: { threshold: 20, title: 'Unstoppable Force' },
      platinum: { threshold: 50, title: 'Legendary Streak' },
    },
  },

  // === STRATEGY ACHIEVEMENTS ===
  {
    id: 'chip_master',
    name: 'Chip Connoisseur',
    description: 'Use different types of chips',
    icon: '🎯',
    category: 'strategy',
    tiers: {
      bronze: { threshold: 8, title: 'Experimenter' },
      silver: { threshold: 13, title: 'Strategist' },
      gold: { threshold: 17, title: 'Chip Master' }, // All chip types
    },
  },
  {
    id: 'perfect_draws',
    name: 'Perfect Timing',
    description: 'Use Perfect Draw chips successfully',
    icon: '🎯',
    category: 'strategy',
    tiers: {
      bronze: { threshold: 5, title: 'Lucky Shot' },
      silver: { threshold: 25, title: 'Sharp Shooter' },
      gold: { threshold: 100, title: 'Perfect Marksman' },
    },
  },
  {
    id: 'limit_manipulator',
    name: 'Rule Bender',
    description: 'Change round limits with chips',
    icon: '🔧',
    category: 'strategy',
    tiers: {
      bronze: { threshold: 10, title: 'Rookie Bender' },
      silver: { threshold: 50, title: 'Rule Breaker' },
      gold: { threshold: 200, title: 'Reality Warper' },
    },
  },
  {
    id: 'shield_user',
    name: 'Guardian',
    description: 'Use shield chips to protect yourself',
    icon: '🛡️',
    category: 'strategy',
    tiers: {
      bronze: { threshold: 10, title: 'Defender' },
      silver: { threshold: 50, title: 'Protector' },
      gold: { threshold: 150, title: 'Guardian Angel' },
    },
  },
  {
    id: 'aggressive_player',
    name: 'Berserker',
    description: 'Use Stake+ chips to increase damage',
    icon: '⚔️',
    category: 'strategy',
    tiers: {
      bronze: { threshold: 10, title: 'Aggressive' },
      silver: { threshold: 50, title: 'Ruthless' },
      gold: { threshold: 150, title: 'Berserker Lord' },
    },
  },

  // === MASTERY ACHIEVEMENTS ===
  {
    id: 'card_swapper',
    name: 'Magician',
    description: 'Successfully swap cards with opponents',
    icon: '🎩',
    category: 'mastery',
    tiers: {
      bronze: { threshold: 5, title: 'Novice Magician' },
      silver: { threshold: 25, title: 'Card Trickster' },
      gold: { threshold: 100, title: 'Master Illusionist' },
    },
  },
  {
    id: 'perfect_hands',
    name: 'Precision Player',
    description: 'Hit exactly the round limit',
    icon: '🎲',
    category: 'mastery',
    tiers: {
      bronze: { threshold: 10, title: 'Precise' },
      silver: { threshold: 50, title: 'Calculating' },
      gold: { threshold: 200, title: 'Precision Master' },
    },
  },
  {
    id: 'low_limit_wins',
    name: 'Minimalist',
    description: 'Win rounds with limit 17',
    icon: '📐',
    category: 'mastery',
    tiers: {
      bronze: { threshold: 5, title: 'Conservative' },
      silver: { threshold: 25, title: 'Minimalist' },
      gold: { threshold: 100, title: 'Constraint Master' },
    },
  },
  {
    id: 'high_limit_wins',
    name: 'High Roller',
    description: 'Win rounds with limit 27',
    icon: '🎰',
    category: 'mastery',
    tiers: {
      bronze: { threshold: 5, title: 'Risk Taker' },
      silver: { threshold: 25, title: 'High Roller' },
      gold: { threshold: 100, title: 'Maximum Risk' },
    },
  },

  // === LUCK ACHIEVEMENTS ===
  {
    id: 'chip_collector',
    name: 'Lucky Charm',
    description: 'Collect chips from card draws',
    icon: '🍀',
    category: 'luck',
    tiers: {
      bronze: { threshold: 50, title: 'Lucky' },
      silver: { threshold: 250, title: 'Blessed' },
      gold: { threshold: 1000, title: "Fortune's Favorite" },
    },
  },
  {
    id: 'epic_hands',
    name: 'Epic Draws',
    description: 'Achieve very high hand values (23+)',
    icon: '💎',
    category: 'luck',
    tiers: {
      bronze: { threshold: 10, title: 'High Roller' },
      silver: { threshold: 50, title: 'Epic Player' },
      gold: { threshold: 200, title: 'Legendary Hands' },
    },
  },
  {
    id: 'close_calls',
    name: 'Edge Walker',
    description: 'Win rounds by exactly 1 point',
    icon: '⚡',
    category: 'luck',
    tiers: {
      bronze: { threshold: 5, title: 'Close Call' },
      silver: { threshold: 25, title: 'Edge Walker' },
      gold: { threshold: 100, title: "Knife's Edge" },
    },
  },

  // === ENDURANCE ACHIEVEMENTS ===
  {
    id: 'marathon_player',
    name: 'Marathon Runner',
    description: 'Play for extended periods',
    icon: '⌚',
    category: 'endurance',
    tiers: {
      bronze: { threshold: 60 * 60 * 1000, title: 'Hour Player' }, // 1 hour
      silver: { threshold: 10 * 60 * 60 * 1000, title: 'Marathon Runner' }, // 10 hours
      gold: { threshold: 50 * 60 * 60 * 1000, title: 'Endurance Champion' }, // 50 hours
    },
  },
  {
    id: 'game_count',
    name: 'Veteran',
    description: 'Play many games',
    icon: '🎮',
    category: 'endurance',
    tiers: {
      bronze: { threshold: 50, title: 'Regular' },
      silver: { threshold: 250, title: 'Veteran' },
      gold: { threshold: 1000, title: 'Master Veteran' },
      platinum: { threshold: 5000, title: 'Dave Deck Legend' },
    },
  },
  {
    id: 'round_warrior',
    name: 'Round Warrior',
    description: 'Play numerous rounds',
    icon: '🥊',
    category: 'endurance',
    tiers: {
      bronze: { threshold: 200, title: 'Fighter' },
      silver: { threshold: 1000, title: 'Warrior' },
      gold: { threshold: 5000, title: 'Battle Master' },
    },
  },

  // === SPECIAL ACHIEVEMENTS ===
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Win games very quickly',
    icon: '💨',
    category: 'special',
    tiers: {
      bronze: { threshold: 5, title: 'Quick Win' }, // 5 fast games
      silver: { threshold: 25, title: 'Speed Demon' },
      gold: { threshold: 100, title: 'Lightning Fast' },
    },
  },
  {
    id: 'turtle_master',
    name: 'Methodical Mind',
    description: 'Win long, strategic games',
    icon: '🐢',
    category: 'special',
    tiers: {
      bronze: { threshold: 5, title: 'Patient' },
      silver: { threshold: 25, title: 'Methodical' },
      gold: { threshold: 100, title: 'Zen Master' },
    },
  },
  {
    id: 'ai_nemesis',
    name: 'AI Nemesis',
    description: 'Consistently defeat the enhanced AI',
    icon: '🤖',
    category: 'special',
    tiers: {
      bronze: { threshold: 10, title: 'AI Hunter' },
      silver: { threshold: 50, title: 'AI Nemesis' },
      gold: { threshold: 200, title: 'Machine Destroyer' },
    },
  },
  {
    id: 'comeback_specialist',
    name: 'Last Stand',
    description: 'Win when down to 1 life',
    icon: '💪',
    category: 'special',
    tiers: {
      bronze: { threshold: 1, title: 'Survivor' },
      silver: { threshold: 10, title: 'Last Stand' },
      gold: { threshold: 25, title: 'Miracle Worker' },
    },
  },
  {
    id: 'chip_hoarder',
    name: 'Collector',
    description: 'End rounds with many unused chips',
    icon: '💰',
    category: 'special',
    tiers: {
      bronze: { threshold: 10, title: 'Saver' },
      silver: { threshold: 50, title: 'Collector' },
      gold: { threshold: 200, title: 'Hoarder Supreme' },
    },
  },
  {
    id: 'all_chip_game',
    name: 'Arsenal Master',
    description: 'Use all different chip types in a single game',
    icon: '🎯',
    category: 'special',
    tiers: {
      bronze: { threshold: 1, title: 'Arsenal User' },
      silver: { threshold: 5, title: 'Arsenal Expert' },
      gold: { threshold: 20, title: 'Arsenal Master' },
    },
  },
  {
    id: 'multiplayer_victor',
    name: 'Multiplayer Victor',
    description: 'Defeat human opponents in multiplayer matches',
    icon: '👥',
    category: 'multiplayer',
    tiers: {
      bronze: { threshold: 1, title: 'First Win' },
      silver: { threshold: 10, title: 'Rising Competitor' },
      gold: { threshold: 50, title: 'Multiplayer Champion' },
    },
  },
  {
    id: 'multiplayer_streak',
    name: 'Unstoppable Force',
    description: 'Win consecutive multiplayer games',
    icon: '🔥',
    category: 'multiplayer',
    tiers: {
      bronze: { threshold: 3, title: 'Hot Streak' },
      silver: { threshold: 5, title: 'Dominant' },
      gold: { threshold: 10, title: 'Unstoppable' },
    },
  },
  {
    id: 'social_gamer',
    name: 'Social Gamer',
    description: 'Play multiplayer games with different opponents',
    icon: '🎮',
    category: 'multiplayer',
    tiers: {
      bronze: { threshold: 5, title: 'Social' },
      silver: { threshold: 15, title: 'Networker' },
      gold: { threshold: 50, title: 'Community Champion' },
    },
  },
]

const STORAGE_KEY = 'dave-deck-achievements'

function createDefaultAchievements(): Record<string, Achievement> {
  const achievements: Record<string, Achievement> = {}

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    // Create achievement entry for each tier
    for (const [tierName, tierInfo] of Object.entries(def.tiers)) {
      const tier = tierName as keyof typeof def.tiers
      const achievementId = `${def.id}_${tier}`

      achievements[achievementId] = {
        id: achievementId,
        name: `${def.name}: ${tierInfo.title}`,
        description: def.description,
        tier: tier as AchievementTier,
        icon: def.icon,
        progress: 0,
        maxProgress: tierInfo.threshold,
        category: def.category,
      }
    }
  }

  return achievements
}

function loadAchievements(): Record<string, Achievement> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const defaults = createDefaultAchievements()
      // Merge stored progress with current definitions
      return { ...defaults, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load achievements:', error)
  }
  return createDefaultAchievements()
}

function saveAchievements(achievements: Record<string, Achievement>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements))
  } catch (error) {
    console.warn('Failed to save achievements:', error)
  }
}

export const useAchievementStore = defineStore('achievements', () => {
  const achievements = ref<Record<string, Achievement>>(loadAchievements())
  const recentUnlocks = ref<Achievement[]>([])

  // Computed values
  const unlockedAchievements = computed(() =>
    Object.values(achievements.value).filter(a => a.unlockedAt)
  )

  const totalAchievements = computed(() => Object.keys(achievements.value).length)

  const unlockedCount = computed(() => unlockedAchievements.value.length)

  const completionPercentage = computed(() =>
    totalAchievements.value > 0 ? (unlockedCount.value / totalAchievements.value) * 100 : 0
  )

  const achievementsByCategory = computed(() => {
    const categories: Record<string, Achievement[]> = {}
    for (const achievement of Object.values(achievements.value)) {
      if (!categories[achievement.category]) {
        categories[achievement.category] = []
      }
      categories[achievement.category].push(achievement)
    }
    return categories
  })

  // Helper function to unlock achievement
  function unlockAchievement(achievementId: string): boolean {
    const achievement = achievements.value[achievementId]
    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = Date.now()
      achievement.progress = achievement.maxProgress
      recentUnlocks.value.push({ ...achievement })
      saveAchievements(achievements.value)
      return true // Newly unlocked
    }
    return false // Already unlocked or doesn't exist
  }

  // Helper function to update progress
  function updateProgress(baseId: string, newValue: number): Achievement[] {
    const newlyUnlocked: Achievement[] = []

    // Find the appropriate tier based on progress
    const definition = ACHIEVEMENT_DEFINITIONS.find(def => def.id === baseId)
    if (!definition) return newlyUnlocked

    // Check each tier in order (bronze -> silver -> gold -> platinum)
    const tiers: (keyof typeof definition.tiers)[] = ['bronze', 'silver', 'gold']
    if (definition.tiers.platinum) tiers.push('platinum')

    for (const tier of tiers) {
      const tierInfo = definition.tiers[tier]
      if (tierInfo) {
        const achievementId = `${baseId}_${tier}`
        const achievement = achievements.value[achievementId]

        if (achievement) {
          // Always update progress, regardless of whether threshold is met
          achievement.progress = Math.min(newValue, achievement.maxProgress)

          // Check if we should unlock this achievement
          if (achievement.progress >= achievement.maxProgress && !achievement.unlockedAt) {
            if (unlockAchievement(achievementId)) {
              newlyUnlocked.push(achievement)
            }
          }
        }
      }
    }

    // Save achievements after updating progress
    saveAchievements(achievements.value)
    return newlyUnlocked
  }

  // Specific tracking functions
  function trackVictory(
    totalWins: number,
    perfectGame: boolean,
    comebackWin: boolean,
    currentStreak: number,
    totalPerfectGames: number,
    totalComebackWins: number
  ): Achievement[] {
    const newUnlocks: Achievement[] = []

    // Update various victory-related achievements
    newUnlocks.push(...updateProgress('victories', totalWins))

    if (perfectGame) {
      newUnlocks.push(...updateProgress('perfect_games', totalPerfectGames))
    }

    if (comebackWin) {
      newUnlocks.push(...updateProgress('comeback_wins', totalComebackWins))
    }

    newUnlocks.push(...updateProgress('win_streak', currentStreak))

    saveAchievements(achievements.value)
    return newUnlocks
  }

  function trackChipUsage(
    chipKind: ChipKind,
    perfectDrawsUsed: number,
    limitManipulatorUsed: number,
    shieldUsed: number,
    aggressiveChipsUsed: number,
    cardSwapUsed: number
  ): Achievement[] {
    const newUnlocks: Achievement[] = []

    // Track specific chip type usage
    if (chipKind === ChipKind.PerfectDraw) {
      newUnlocks.push(...updateProgress('perfect_draws', perfectDrawsUsed))
    }

    if ([ChipKind.Limit17, ChipKind.Limit24, ChipKind.Limit27].includes(chipKind)) {
      newUnlocks.push(...updateProgress('limit_manipulator', limitManipulatorUsed))
    }

    if ([ChipKind.Shield, ChipKind.ShieldPlus].includes(chipKind)) {
      newUnlocks.push(...updateProgress('shield_user', shieldUsed))
    }

    if ([ChipKind.StakePlus1, ChipKind.StakePlus2].includes(chipKind)) {
      newUnlocks.push(...updateProgress('aggressive_player', aggressiveChipsUsed))
    }

    if (chipKind === ChipKind.SwapCards) {
      newUnlocks.push(...updateProgress('card_swapper', cardSwapUsed))
    }

    saveAchievements(achievements.value)
    return newUnlocks
  }

  function trackGameStats(stats: {
    gamesPlayed: number
    totalPlaytime: number
    perfectHands: number
    gameDuration: number
    handValue: number
    roundsWon: number
    limit: number
  }): Achievement[] {
    const newUnlocks: Achievement[] = []

    // Track endurance achievements
    newUnlocks.push(...updateProgress('game_count', stats.gamesPlayed))
    newUnlocks.push(...updateProgress('marathon_player', stats.totalPlaytime))
    newUnlocks.push(...updateProgress('perfect_hands', stats.perfectHands))

    // Track special achievements based on game duration
    if (stats.gameDuration < 2 * 60 * 1000) {
      // Less than 2 minutes = speed win
      newUnlocks.push(
        ...updateProgress('speed_demon', (achievements.value.speed_demon_bronze?.progress || 0) + 1)
      )
    }

    if (stats.gameDuration > 15 * 60 * 1000) {
      // More than 15 minutes = strategic win
      newUnlocks.push(
        ...updateProgress(
          'turtle_master',
          (achievements.value.turtle_master_bronze?.progress || 0) + 1
        )
      )
    }

    // Track epic hands (23+)
    if (stats.handValue >= 23) {
      newUnlocks.push(
        ...updateProgress('epic_hands', (achievements.value.epic_hands_bronze?.progress || 0) + 1)
      )
    }

    // Track limit-specific wins
    if (stats.roundsWon > 0) {
      if (stats.limit === 17) {
        newUnlocks.push(
          ...updateProgress(
            'low_limit_wins',
            (achievements.value.low_limit_wins_bronze?.progress || 0) + 1
          )
        )
      } else if (stats.limit === 27) {
        newUnlocks.push(
          ...updateProgress(
            'high_limit_wins',
            (achievements.value.high_limit_wins_bronze?.progress || 0) + 1
          )
        )
      }
    }

    saveAchievements(achievements.value)
    return newUnlocks
  }

  function clearRecentUnlocks(): void {
    recentUnlocks.value = []
  }

  return {
    // State
    achievements,
    recentUnlocks,

    // Computed
    unlockedAchievements,
    totalAchievements,
    unlockedCount,
    completionPercentage,
    achievementsByCategory,

    // Actions
    trackVictory,
    trackChipUsage,
    trackGameStats,
    updateProgress,
    clearRecentUnlocks,
  }
})
