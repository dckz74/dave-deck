/**
 * Statistics Store - Local storage of game statistics
 * Tracks comprehensive game metrics as specified in rules.md
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ChipKind } from '@/game/types'
import type { PlayerId } from '@/game/types'
import { useAchievementStore } from './achievements'

export interface GameStatistics {
  // Core game performance (as per rules.md)
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  
  // Round performance  
  roundsPlayed: number
  roundsWon: number
  roundsLost: number
  roundsDrawn: number
  
  // Card statistics (as per rules.md)
  cardsDrawn: number
  totalHandValue: number // for calculating average
  perfectHands: number // exactly at limit
  bustCount: number // over limit
  
  // Chip usage statistics (as per rules.md)
  chipsUsed: number
  chipUsageByType: Record<ChipKind, number>
  
  // Advanced performance metrics
  comebackWins: number // won after being behind in lives
  currentWinStreak: number
  longestWinStreak: number
  currentLossStreak: number
  longestLossStreak: number
  
  // Specific achievement counters
  comebackSpecialistWins: number // wins with 1 life remaining
  lowLimitWins: number // wins with limit 17
  highLimitWins: number // wins with limit 27
  closeCalls: number // wins by exactly 1 point
  epicHands: number // hands with 23+ value
  chipCollectionCount: number // times chips were received from card draws
  
  // Chip usage achievement counters
  perfectDrawsUsed: number
  limitManipulatorUsed: number 
  shieldUsed: number
  aggressiveChipsUsed: number
  cardSwapUsed: number
  
  // Time tracking
  totalPlaytimeMs: number
  gameStartTime: number | null
  shortestGameMs: number | null
  longestGameMs: number | null
  
  // Achievements
  firstWin: boolean
  perfectGame: boolean // won without losing any lives
  perfectGamesCount: number // count of perfect games
  chipMaster: boolean // used every type of chip
}

const STORAGE_KEY = 'dave-deck-statistics'

function createDefaultStatistics(): GameStatistics {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    roundsDrawn: 0,
    
    cardsDrawn: 0,
    totalHandValue: 0,
    perfectHands: 0,
    bustCount: 0,
    
    chipsUsed: 0,
    chipUsageByType: {
      [ChipKind.Draw2]: 0,
      [ChipKind.Draw3]: 0,
      [ChipKind.Draw4]: 0,
      [ChipKind.Draw5]: 0,
      [ChipKind.Draw6]: 0,
      [ChipKind.Draw7]: 0,
      [ChipKind.Limit17]: 0,
      [ChipKind.Limit24]: 0,
      [ChipKind.Limit27]: 0,
      [ChipKind.SwapCards]: 0,
      [ChipKind.StakePlus1]: 0,
      [ChipKind.StakePlus2]: 0,
      [ChipKind.ReturnMyCard]: 0,
      [ChipKind.ReturnOpponentCard]: 0,
      [ChipKind.PerfectDraw]: 0,
      [ChipKind.Shield]: 0,
      [ChipKind.ShieldPlus]: 0,
    },
    
    comebackWins: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    currentLossStreak: 0,
    longestLossStreak: 0,
    
    // Achievement counters
    comebackSpecialistWins: 0,
    lowLimitWins: 0,
    highLimitWins: 0,
    closeCalls: 0,
    epicHands: 0,
    chipCollectionCount: 0,
    
    // Chip usage counters
    perfectDrawsUsed: 0,
    limitManipulatorUsed: 0,
    shieldUsed: 0,
    aggressiveChipsUsed: 0,
    cardSwapUsed: 0,
    
    totalPlaytimeMs: 0,
    gameStartTime: null,
    shortestGameMs: null,
    longestGameMs: null,
    
    firstWin: false,
    perfectGame: false,
    perfectGamesCount: 0,
    chipMaster: false,
  }
}

function loadStatistics(): GameStatistics {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle new statistics added in updates
      return { ...createDefaultStatistics(), ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load statistics:', error)
  }
  return createDefaultStatistics()
}

function saveStatistics(stats: GameStatistics): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch (error) {
    console.warn('Failed to save statistics:', error)
  }
}

export const useStatisticsStore = defineStore('statistics', () => {
  const stats = ref<GameStatistics>(loadStatistics())
  const achievementStore = useAchievementStore()
  
  // Computed metrics
  const winRate = computed(() => 
    stats.value.gamesPlayed > 0 ? (stats.value.gamesWon / stats.value.gamesPlayed) * 100 : 0
  )
  
  const roundWinRate = computed(() => 
    stats.value.roundsPlayed > 0 ? (stats.value.roundsWon / stats.value.roundsPlayed) * 100 : 0
  )
  
  const averageHandValue = computed(() =>
    stats.value.cardsDrawn > 0 ? stats.value.totalHandValue / stats.value.cardsDrawn : 0
  )
  
  const bustRate = computed(() =>
    stats.value.roundsPlayed > 0 ? (stats.value.bustCount / stats.value.roundsPlayed) * 100 : 0
  )
  
  const averageGameDuration = computed(() =>
    stats.value.gamesPlayed > 0 ? stats.value.totalPlaytimeMs / stats.value.gamesPlayed : 0
  )
  
  const favoriteChip = computed(() => {
    let maxUsage = 0
    let favorite: ChipKind | null = null
    for (const [chipKind, usage] of Object.entries(stats.value.chipUsageByType)) {
      if (usage > maxUsage) {
        maxUsage = usage
        favorite = chipKind as ChipKind
      }
    }
    return favorite
  })
  
  // Game lifecycle tracking
  function startGame(): void {
    stats.value.gameStartTime = Date.now()
  }
  
  function endGame(winner: PlayerId, playerLivesRemaining: number, gameMode: 'single-player' | 'multiplayer' = 'single-player'): void {
    const now = Date.now()
    const gameStartTime = stats.value.gameStartTime
    let gameDuration = 0
    
    if (gameStartTime) {
      gameDuration = now - gameStartTime
      stats.value.totalPlaytimeMs += gameDuration
      
      // Track shortest/longest games
      if (stats.value.shortestGameMs === null || gameDuration < stats.value.shortestGameMs) {
        stats.value.shortestGameMs = gameDuration
      }
      if (stats.value.longestGameMs === null || gameDuration > stats.value.longestGameMs) {
        stats.value.longestGameMs = gameDuration
      }
      
      stats.value.gameStartTime = null
    }
    
    stats.value.gamesPlayed++
    
    const playerWon = winner === 'player'
    
    if (playerWon) {
      stats.value.gamesWon++
      stats.value.currentWinStreak++
      stats.value.currentLossStreak = 0
      
      if (stats.value.currentWinStreak > stats.value.longestWinStreak) {
        stats.value.longestWinStreak = stats.value.currentWinStreak
      }
      
      // Achievement: First win
      if (!stats.value.firstWin) {
        stats.value.firstWin = true
      }
      
      // Achievement: Perfect game (won without losing lives)
      const perfectGame = playerLivesRemaining === 5
      if (perfectGame) {
        stats.value.perfectGame = true
        stats.value.perfectGamesCount++
      }
      
      // Check for comeback win (won with fewer lives than started)
      const comebackWin = playerLivesRemaining < 5
      if (comebackWin) {
        stats.value.comebackWins++
      }
      
      // Track victory achievements
      achievementStore.trackVictory(
        stats.value.gamesWon, 
        perfectGame, 
        comebackWin, 
        stats.value.currentWinStreak,
        stats.value.perfectGamesCount,
        stats.value.comebackWins
      )
      
      // Track special achievements for critical wins
      if (playerLivesRemaining === 1) {
        // Last stand achievement (won with 1 life remaining)
        stats.value.comebackSpecialistWins++
        achievementStore.updateProgress('comeback_specialist', stats.value.comebackSpecialistWins)
      }
      
      // Track AI victories specifically (only for single-player games)
      if (gameMode === 'single-player') {
        achievementStore.updateProgress('ai_nemesis', stats.value.gamesWon)
      } else if (gameMode === 'multiplayer') {
        // Track multiplayer victories
        achievementStore.updateProgress('multiplayer_victor', stats.value.gamesWon)
        achievementStore.updateProgress('multiplayer_streak', stats.value.currentWinStreak)
        // TODO: Track social_gamer (requires tracking unique opponents)
      }
      
      // Track game statistics achievements
      achievementStore.trackGameStats({
        gamesPlayed: stats.value.gamesPlayed,
        totalPlaytime: stats.value.totalPlaytimeMs,
        perfectHands: stats.value.perfectHands,
        gameDuration,
        handValue: Math.round(stats.value.totalHandValue / Math.max(stats.value.cardsDrawn, 1)), // Average hand value
        roundsWon: stats.value.roundsWon,
        limit: 21 // Default limit, could be tracked per game if needed
      })
    } else {
      stats.value.gamesLost++
      stats.value.currentLossStreak++
      stats.value.currentWinStreak = 0
      
      if (stats.value.currentLossStreak > stats.value.longestLossStreak) {
        stats.value.longestLossStreak = stats.value.currentLossStreak
      }
    }
    
    saveStatistics(stats.value)
  }
  
  function recordRoundResult(winner: PlayerId | 'draw', handValue: number, wasAtLimit: boolean, wasBust: boolean, roundLimit?: number, opponentSum?: number): void {
    stats.value.roundsPlayed++
    
    if (winner === 'player') {
      stats.value.roundsWon++
    } else if (winner === 'opponent') {
      stats.value.roundsLost++
    } else {
      stats.value.roundsDrawn++
    }
    
    // Track hand statistics
    stats.value.totalHandValue += handValue
    if (wasAtLimit) {
      stats.value.perfectHands++
    }
    if (wasBust) {
      stats.value.bustCount++
    }
    
    // Track round-specific achievements
    if (winner === 'player' && roundLimit) {
      // Track limit-specific wins
      if (roundLimit === 17) {
        stats.value.lowLimitWins++
        achievementStore.updateProgress('low_limit_wins', stats.value.lowLimitWins)
      } else if (roundLimit === 27) {
        stats.value.highLimitWins++
        achievementStore.updateProgress('high_limit_wins', stats.value.highLimitWins)
      }
      
      // Track close calls (won by exactly 1 point)
      if (opponentSum && handValue <= roundLimit && opponentSum <= roundLimit) {
        const margin = handValue - opponentSum
        if (margin === 1) {
          stats.value.closeCalls++
          achievementStore.updateProgress('close_calls', stats.value.closeCalls)
        }
      }
      
      // Track epic hands (23+)
      if (handValue >= 23) {
        stats.value.epicHands++
        achievementStore.updateProgress('epic_hands', stats.value.epicHands)
      }
      
      // Track perfect hands achievement
      if (wasAtLimit) {
        achievementStore.updateProgress('perfect_hands', stats.value.perfectHands)
      }
    }
    
    // Track round count achievement
    achievementStore.updateProgress('round_warrior', stats.value.roundsPlayed)
    
    saveStatistics(stats.value)
  }
  
  function recordCardDrawn(chipReceived?: boolean): void {
    stats.value.cardsDrawn++
    
    // Track chip collection when chips are received from card draws
    if (chipReceived) {
      stats.value.chipCollectionCount++
      achievementStore.updateProgress('chip_collector', stats.value.chipCollectionCount)
    }
    
    saveStatistics(stats.value)
  }
  
  function recordChipUsed(chipKind: ChipKind): void {
    stats.value.chipsUsed++
    stats.value.chipUsageByType[chipKind]++
    
    // Increment specific chip usage counters for achievements
    if (chipKind === ChipKind.PerfectDraw) {
      stats.value.perfectDrawsUsed++
    }
    if ([ChipKind.Limit17, ChipKind.Limit24, ChipKind.Limit27].includes(chipKind)) {
      stats.value.limitManipulatorUsed++
    }
    if ([ChipKind.Shield, ChipKind.ShieldPlus].includes(chipKind)) {
      stats.value.shieldUsed++
    }
    if ([ChipKind.StakePlus1, ChipKind.StakePlus2].includes(chipKind)) {
      stats.value.aggressiveChipsUsed++
    }
    if (chipKind === ChipKind.SwapCards) {
      stats.value.cardSwapUsed++
    }
    
    // Check if player has used all chip types (achievement)
    const hasUsedAllChips = Object.values(stats.value.chipUsageByType).every(usage => usage > 0)
    if (hasUsedAllChips) {
      stats.value.chipMaster = true
    }
    
    // Track chip usage achievements
    achievementStore.trackChipUsage(
      chipKind, 
      stats.value.perfectDrawsUsed, 
      stats.value.limitManipulatorUsed, 
      stats.value.shieldUsed, 
      stats.value.aggressiveChipsUsed, 
      stats.value.cardSwapUsed
    )
    
    // Track chip master achievement (using different chip types)
    const uniqueChipsUsed = Object.values(stats.value.chipUsageByType).filter(count => count > 0).length
    achievementStore.updateProgress('chip_master', uniqueChipsUsed)
    
    saveStatistics(stats.value)
  }
  
  
  return {
    // State
    stats,
    
    // Computed metrics
    winRate,
    roundWinRate,
    averageHandValue,
    bustRate,
    averageGameDuration,
    favoriteChip,
    
    // Actions
    startGame,
    endGame,
    recordRoundResult,
    recordCardDrawn,
    recordChipUsed,
  }
})