/**
 * Pinia-Store für Dave Deck: Spielzustand, Aktionen (Hit, Skip, Chip, nächste Runde).
 */

import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { createInitialState, hit, skip, useChip, startNewRound } from '@/game/engine'
import { getOpponentAction } from '@/game/ai'
import { CHIP_DEFS } from '@/game/chips'
import { useStatisticsStore } from '@/stores/statistics'
import { useMultiplayerStore } from '@/stores/multiplayer'
import type { GameState, Chip } from '@/game/types'

export type GameMode = 'single-player' | 'multiplayer'

const CHIP_FEEDBACK_DURATION_MS = 3500

export const useGameStore = defineStore('game', () => {
  const router = useRouter()
  const state = ref<GameState>(createInitialState())
  const gameMode = ref<GameMode>('single-player')
  const lastChipFeedback = ref<string | null>(null)
  const currentChipAnimation = ref<{ type: string; data?: any } | null>(null)
  const currentRoundAnimation = ref<{
    type: 'heart_attack' | 'phew_draw' | 'card_draw' | 'shield_block'
    target?: 'player' | 'opponent'
    amount?: number
    data?: any
  } | null>(null)
  const isAnimating = ref(false)
  const chipAnimationQueue = ref<Array<{ chip: Chip; prevState: GameState; newState: GameState }>>(
    []
  )
  let chipFeedbackTimer: ReturnType<typeof setTimeout> | null = null
  let animationTimer: ReturnType<typeof setTimeout> | null = null

  // Statistics store for tracking game metrics
  const statistics = useStatisticsStore()

  // Multiplayer store for WebSocket communication
  const multiplayer = useMultiplayerStore()

  const phase = computed(() => state.value.phase)
  const player = computed(() => state.value.player)
  const opponent = computed(() => state.value.opponent)
  const round = computed(() => state.value.round)
  const lastRoundWinner = computed(() => state.value.lastRoundWinner)
  const gameWinner = computed(() => state.value.gameWinner)
  const isPlayerTurn = computed(() => state.value.round.currentTurn === 'player')
  const isMultiplayer = computed(() => gameMode.value === 'multiplayer')
  const canTakeAction = computed(() => {
    if (isMultiplayer.value) {
      return (
        isPlayerTurn.value &&
        !isAnimating.value &&
        multiplayer.sessionStatus === 'playing' &&
        state.value.phase === 'playing'
      )
    }
    return !isAnimating.value && state.value.phase === 'playing'
  })

  function resetGame() {
    state.value = createInitialState()
    lastChipFeedback.value = null
    if (chipFeedbackTimer) clearTimeout(chipFeedbackTimer)

    // Start tracking game time
    statistics.startGame()
  }

  function setGameMode(mode: GameMode) {
    gameMode.value = mode
  }

  function startMultiplayerGame(initialState?: GameState) {
    if (initialState) {
      state.value = initialState
    } else {
      state.value = createInitialState()
    }
    gameMode.value = 'multiplayer'

    // Start tracking game time
    statistics.startGame()

    // Send initial state to server if host
    if (multiplayer.currentSession?.isHost) {
      multiplayer.startGame(state.value)
    }
  }

  function syncGameState(newState: GameState) {
    // Used when receiving game state updates from multiplayer opponent
    if (gameMode.value === 'multiplayer') {
      state.value = newState
    }
  }

  function doHit() {
    if (!canTakeAction.value) return // Block Hit during chip animations or if not player's turn

    // Check if deck is empty before hitting
    if (state.value.round.deck.length === 0) {
      // Force round evaluation when deck is empty
      const { state: next, roundResult } = skip(state.value, 'player')
      state.value = next

      if (roundResult) {
        const playerSum = state.value.player.hand.reduce((s, c) => s + c.value, 0)
        const wasAtLimit = playerSum === state.value.round.limit
        const wasBust = playerSum > state.value.round.limit

        statistics.recordRoundResult(
          roundResult.winner,
          playerSum,
          wasAtLimit,
          wasBust,
          state.value.round.limit,
          state.value.opponent.hand.reduce((s, c) => s + c.value, 0)
        )

        // Check if game ended
        if (state.value.phase === 'game_over') {
          statistics.endGame(state.value.gameWinner!, state.value.player.lives, gameMode.value)
          return
        }

        // Trigger round result animation
        setTimeout(() => {
          triggerRoundResultAnimation(roundResult)
        }, 100)
      }
      return
    }

    const prevChipCount = state.value.player.chips.length
    const next = hit(state.value, 'player')
    if (next) {
      // Check if a chip was received
      const chipReceived = next.player.chips.length > prevChipCount

      // Get the newly drawn card value
      const newCard = next.player.hand[next.player.hand.length - 1]

      // Trigger card draw animation
      currentRoundAnimation.value = {
        type: 'card_draw',
        target: 'player',
        data: { value: newCard.value },
      }

      // Clear animation after it completes
      setTimeout(() => {
        currentRoundAnimation.value = null
      }, 1200) // Match animation duration

      state.value = next
      // Track card drawn with chip information
      statistics.recordCardDrawn(chipReceived)

      // Send state update to multiplayer opponent
      if (isMultiplayer.value) {
        multiplayer.sendGameAction({
          type: 'hit',
          gameState: next,
        })
      }
    }
  }

  function doSkip() {
    if (!canTakeAction.value) return // Block Skip during chip animations or if not player's turn
    const { state: next, roundResult } = skip(state.value, 'player')
    state.value = next

    // Track round result if round ended
    if (roundResult) {
      const playerSum = state.value.player.hand.reduce((s, c) => s + c.value, 0)
      const wasAtLimit = playerSum === state.value.round.limit
      const wasBust = playerSum > state.value.round.limit

      statistics.recordRoundResult(roundResult.winner, playerSum, wasAtLimit, wasBust)

      // Check if game ended
      if (state.value.phase === 'game_over') {
        statistics.endGame(state.value.gameWinner!, state.value.player.lives)

        // Send game over to multiplayer opponent
        if (isMultiplayer.value) {
          multiplayer.endGame({
            gameWinner: state.value.gameWinner,
            finalLives: {
              player: state.value.player.lives,
              opponent: state.value.opponent.lives,
            },
            gameState: state.value,
          })
        }

        return roundResult
      }

      // Trigger round result animation immediately
      setTimeout(() => {
        triggerRoundResultAnimation(roundResult)
      }, 100) // Small delay to ensure state is updated
    }

    // Send state update to multiplayer opponent
    if (isMultiplayer.value) {
      multiplayer.sendGameAction({
        type: 'skip',
        gameState: next,
      })
    }

    return roundResult
  }

  function applyChip(chip: Chip) {
    if (!canTakeAction.value) return // Block chip usage if not player's turn or animating

    const prevState = state.value
    const next = useChip(state.value, 'player', chip)
    if (next) {
      // Apply chip effect immediately (no turn change)
      state.value = next

      // Track chip usage
      statistics.recordChipUsed(chip.kind)

      // Show feedback with player name
      const chipName = CHIP_DEFS[chip.kind].name
      const playerName = isMultiplayer.value
        ? multiplayer.currentSession?.myPlayer?.name || 'Du'
        : 'Du'

      lastChipFeedback.value = `${playerName} verwendet: ${chipName}!`
      if (chipFeedbackTimer) clearTimeout(chipFeedbackTimer)
      chipFeedbackTimer = setTimeout(() => {
        lastChipFeedback.value = null
        chipFeedbackTimer = null
      }, CHIP_FEEDBACK_DURATION_MS)

      // Queue animation (non-blocking)
      if (!isAnimating.value) {
        startChipAnimation(chip, prevState, next)
      } else {
        chipAnimationQueue.value.push({ chip, prevState, newState: next })
      }

      // Send state update to multiplayer opponent
      if (isMultiplayer.value) {
        multiplayer.sendGameAction({
          type: 'chip',
          data: { chip },
          gameState: next,
        })
      }
    }
  }

  function startChipAnimation(chip: Chip, prevState: GameState, newState: GameState) {
    isAnimating.value = true
    triggerChipAnimation(chip, prevState, newState)
  }

  function processAnimationQueue() {
    if (chipAnimationQueue.value.length > 0) {
      const next = chipAnimationQueue.value.shift()!
      startChipAnimation(next.chip, next.prevState, next.newState)
    } else {
      isAnimating.value = false
    }
  }

  function triggerChipAnimation(chip: Chip, prevState: GameState, newState: GameState) {
    const animationType = getAnimationType(chip, prevState, newState)
    currentChipAnimation.value = animationType

    // Animation duration based on type
    const duration = getAnimationDuration(animationType.type)

    if (animationTimer) clearTimeout(animationTimer)
    animationTimer = setTimeout(() => {
      currentChipAnimation.value = null
      animationTimer = null
      processAnimationQueue()
    }, duration)
  }

  function getAnimationType(chip: Chip, prevState: GameState, newState: GameState) {
    const { kind } = chip

    switch (kind) {
      case 'draw_2':
      case 'draw_3':
      case 'draw_4':
      case 'draw_5':
      case 'draw_6':
      case 'draw_7':
        return {
          type: 'card_draw',
          data: {
            value: CHIP_DEFS[kind].value,
            newCard: newState.player.hand[newState.player.hand.length - 1],
          },
        }

      case 'limit_17':
      case 'limit_24':
      case 'limit_27':
        return {
          type: 'limit_change',
          data: {
            oldLimit: prevState.round.limit,
            newLimit: newState.round.limit,
          },
        }

      case 'stake_plus_1':
      case 'stake_plus_2':
        return {
          type: 'stake_increase',
          data: {
            oldStake: prevState.round.stakeModifier,
            newStake: newState.round.stakeModifier,
            increase: CHIP_DEFS[kind].value,
          },
        }

      case 'shield':
      case 'shield_plus':
        return {
          type: 'shield_activate',
          data: {
            oldShield: prevState.round.shieldPlayer,
            newShield: newState.round.shieldPlayer,
            increase: CHIP_DEFS[kind].value,
          },
        }

      case 'swap_cards':
        return {
          type: 'cards_swap',
          data: {
            playerCard: newState.player.hand[newState.player.hand.length - 1],
            opponentCard: newState.opponent.hand[newState.opponent.hand.length - 1],
          },
        }

      case 'return_my_card':
        return {
          type: 'card_return',
          data: { player: 'player' },
        }

      case 'return_opponent_card':
        return {
          type: 'card_return',
          data: { player: 'opponent' },
        }

      case 'perfect_draw':
        return {
          type: 'perfect_draw',
          data: {
            newCard: newState.player.hand[newState.player.hand.length - 1],
          },
        }

      default:
        return { type: 'generic', data: {} }
    }
  }

  function getAnimationDuration(type: string): number {
    switch (type) {
      case 'card_draw':
      case 'perfect_draw':
        return 1200
      case 'cards_swap':
        return 2500
      case 'card_return':
        return 1000
      case 'limit_change':
        return 800
      case 'stake_increase':
      case 'shield_activate':
        return 1000
      default:
        return 800
    }
  }

  function triggerRoundResultAnimation(roundResult: {
    winner: string
    lifeLost: string | null
    lifeAmount: number
  }) {
    if (roundResult.winner === 'draw') {
      // Show "phew" animation for draws
      currentRoundAnimation.value = { type: 'phew_draw' }
      setTimeout(() => {
        currentRoundAnimation.value = null
        nextRound() // Auto-advance to next round after animation
      }, 2000)
    } else if (roundResult.lifeLost && roundResult.lifeAmount === 0) {
      // Show shield blocking animation when attack is completely blocked
      const originalAttack = 1 + state.value.round.stakeModifier
      currentRoundAnimation.value = {
        type: 'shield_block',
        target: roundResult.lifeLost as 'player' | 'opponent',
        amount: originalAttack,
        data: { blocked: true },
      }
      setTimeout(() => {
        currentRoundAnimation.value = null
        nextRound() // Auto-advance to next round after animation
      }, 2500)
    } else if (roundResult.lifeLost && roundResult.lifeAmount > 0) {
      // Show heart attack animation for actual life loss
      const originalAttack = 1 + state.value.round.stakeModifier
      currentRoundAnimation.value = {
        type: 'heart_attack',
        target: roundResult.lifeLost as 'player' | 'opponent',
        amount: roundResult.lifeAmount,
        data: { originalAttack },
      }
      setTimeout(() => {
        currentRoundAnimation.value = null
        nextRound() // Auto-advance to next round after animation
      }, 2500)
    } else {
      // No life lost, just advance to next round
      setTimeout(() => {
        nextRound()
      }, 1000)
    }
  }

  function nextRound() {
    // Only transition if we're in round_result phase or playing phase
    if (state.value.phase !== 'round_result' && state.value.phase !== 'playing') {
      return
    }

    const playerChips = state.value.player.chips.map(c => ({ kind: c.kind, id: c.id }))
    const opponentChips = state.value.opponent.chips.map(c => ({ kind: c.kind, id: c.id }))

    if (isMultiplayer.value) {
      // In multiplayer, let the server handle round transitions for synchronization
      // Only trigger transition if we haven't already (prevent double triggers)
      if (state.value.phase === 'round_result') {
        const newGameState = startNewRound(state.value, { playerChips, opponentChips })

        // Capture round result before transitioning
        const roundResult = {
          winner: state.value.lastRoundWinner,
          playerLives: state.value.player.lives,
          opponentLives: state.value.opponent.lives,
        }

        // Only let the host trigger round transitions to prevent duplicates
        if (multiplayer.currentSession?.isHost) {
          multiplayer.triggerRoundTransition(newGameState, roundResult)
        }

        // In multiplayer, wait for server round-started event
        // Don't set local state to playing - let server handle it
      }
    } else {
      // Single-player: handle locally
      state.value = startNewRound(state.value, { playerChips, opponentChips })
    }
  }

  /** KI-Zug: ggf. mehrere Chips nutzen, dann Hit/Skip für Zug-Ende. */
  function runOpponentTurn() {
    // Skip AI turns in multiplayer mode
    if (isMultiplayer.value) return

    if (state.value.phase !== 'playing' || state.value.round.currentTurn !== 'opponent') return

    // Use recursive approach to handle chips with proper delays
    runOpponentChipTurn(0, 3)
  }

  function runOpponentChipTurn(chipsUsed: number, maxChips: number) {
    // Stop if we've used max chips or it's no longer opponent's turn
    if (
      chipsUsed >= maxChips ||
      state.value.phase !== 'playing' ||
      state.value.round.currentTurn !== 'opponent'
    ) {
      // After chip phase, do final hit or skip
      runOpponentFinalAction()
      return
    }

    const action = getOpponentAction(state.value)

    if (action.type === 'chip') {
      const prevState = state.value
      const next = useChip(state.value, 'opponent', action.chip)
      if (next) {
        state.value = next
        statistics.recordChipUsed(action.chip.kind)

        // Show AI chip feedback with clear AI identifier
        const chipName = CHIP_DEFS[action.chip.kind].name
        lastChipFeedback.value = `KI verwendet: ${chipName}!`
        if (chipFeedbackTimer) clearTimeout(chipFeedbackTimer)
        chipFeedbackTimer = setTimeout(() => {
          lastChipFeedback.value = null
          chipFeedbackTimer = null
        }, CHIP_FEEDBACK_DURATION_MS)

        // Always start chip animation for AI
        startChipAnimation(action.chip, prevState, next)

        // Continue with next chip after animation delay
        setTimeout(() => {
          runOpponentChipTurn(chipsUsed + 1, maxChips)
        }, 1200) // Wait for animation to complete
        return
      }
    }

    // If no chip can be used, proceed to final action
    runOpponentFinalAction()
  }

  function runOpponentFinalAction() {
    // Get final action when no more chips can be used
    const action = getOpponentAction(state.value)

    // Kein Chip mehr möglich/sinnvoll -> Hit oder Skip
    if (action.type === 'hit') {
      // Check if deck is empty before hitting
      if (state.value.round.deck.length === 0) {
        // Force round evaluation when deck is empty
        const { state: next, roundResult } = skip(state.value, 'opponent')
        state.value = next

        if (roundResult) {
          const opponentSum = state.value.opponent.hand.reduce((s, c) => s + c.value, 0)
          const wasAtLimit = opponentSum === state.value.round.limit
          const wasBust = opponentSum > state.value.round.limit

          statistics.recordRoundResult(
            roundResult.winner,
            opponentSum,
            wasAtLimit,
            wasBust,
            state.value.round.limit,
            state.value.player.hand.reduce((s, c) => s + c.value, 0)
          )

          if (state.value.phase === 'game_over') {
            statistics.endGame(state.value.gameWinner!, state.value.player.lives, gameMode.value)
            return
          }

          setTimeout(() => {
            triggerRoundResultAnimation(roundResult)
          }, 100)
        }
        return
      }

      const prevChipCount = state.value.opponent.chips.length
      const next = hit(state.value, 'opponent')
      if (next) {
        const chipReceived = next.opponent.chips.length > prevChipCount
        state.value = next
        statistics.recordCardDrawn(chipReceived)
      }
      return
    }

    // Skip
    const { state: next, roundResult } = skip(state.value, 'opponent')
    state.value = next

    // Track round result if round ended
    if (roundResult) {
      const opponentSum = state.value.opponent.hand.reduce((s, c) => s + c.value, 0)
      const wasAtLimit = opponentSum === state.value.round.limit
      const wasBust = opponentSum > state.value.round.limit

      statistics.recordRoundResult(
        roundResult.winner,
        opponentSum,
        wasAtLimit,
        wasBust,
        state.value.round.limit,
        state.value.player.hand.reduce((s, c) => s + c.value, 0)
      )

      // Check if game ended
      if (state.value.phase === 'game_over') {
        statistics.endGame(state.value.gameWinner!, state.value.player.lives, gameMode.value)
        return
      }

      // Trigger round result animation immediately
      setTimeout(() => {
        triggerRoundResultAnimation(roundResult)
      }, 100) // Small delay to ensure state is updated
    }
    return
  }

  // Setup multiplayer event listeners
  function setupMultiplayerListeners() {
    multiplayer.onGameStateUpdate(data => {
      // Receive game state updates from opponent
      if (gameMode.value === 'multiplayer') {
        syncGameState(data.gameState)

        // Show opponent feedback for chip usage with actual player name
        if (data.action === 'chip' && data.data?.chip) {
          const chipName = CHIP_DEFS[data.data.chip.kind as keyof typeof CHIP_DEFS].name
          const opponentName = data.playerName || 'Gegner'
          lastChipFeedback.value = `${opponentName} verwendet: ${chipName}!`
          if (chipFeedbackTimer) clearTimeout(chipFeedbackTimer)
          chipFeedbackTimer = setTimeout(() => {
            lastChipFeedback.value = null
            chipFeedbackTimer = null
          }, CHIP_FEEDBACK_DURATION_MS)
        }
      }
    })

    // Listen for server-initiated round transitions
    multiplayer.onRoundStarted(data => {
      if (gameMode.value === 'multiplayer') {
        console.log('🎲 Server initiated round transition:', data)

        // Handle round result animations for both players
        if (data.roundResult) {
          if (data.roundResult.winner === 'draw') {
            // Show "phew" animation for draws
            currentRoundAnimation.value = { type: 'phew_draw' }
            setTimeout(() => {
              currentRoundAnimation.value = null
            }, 1500)
          } else if (data.roundResult.lifeLost && data.roundResult.lifeAmount > 0) {
            // Show heart attack animation for life loss
            const target = data.roundResult.lifeLost === 'player' ? 'player' : 'opponent'
            currentRoundAnimation.value = {
              type: 'heart_attack',
              target: target,
              amount: data.roundResult.lifeAmount,
            }
            setTimeout(() => {
              currentRoundAnimation.value = null
            }, 1500)
          }
        }

        // Apply the new game state from server (already has correct turn order)
        syncGameState(data.gameState)

        // Show round transition feedback with player names
        if (data.roundNumber > 1) {
          // Use the actual starter name provided by server, or fallback to generic terms
          const displayName = data.starterName || 'Unbekannt'

          lastChipFeedback.value = `Runde ${data.roundNumber} - ${displayName} beginnt!`
          if (chipFeedbackTimer) clearTimeout(chipFeedbackTimer)
          chipFeedbackTimer = setTimeout(() => {
            lastChipFeedback.value = null
            chipFeedbackTimer = null
          }, 3000)
        }
      }
    })

    // Listen for server-initiated game starts (with corrected turn order)
    multiplayer.onGameStarted(data => {
      if (gameMode.value === 'multiplayer') {
        console.log('🎮 Server initiated game start with corrected state:', data)

        // Apply the server's corrected game state (with proper turn order)
        if (data.gameState) {
          syncGameState(data.gameState)
        }
      }
    })

    // Listen for multiplayer game over events
    multiplayer.onGameEnded(data => {
      if (gameMode.value === 'multiplayer') {
        console.log('🏁 Game ended from server:', data)

        // Apply the server's game over state (already flipped for correct perspective)
        if (data.gameState) {
          syncGameState(data.gameState)

          // Make sure statistics are updated
          statistics.endGame(
            data.gameState.gameWinner!,
            data.gameState.player.lives,
            gameMode.value
          )
        }
      }
    })

    // Listen for player disconnection events
    multiplayer.onPlayerDisconnected((data: any) => {
      if (gameMode.value === 'multiplayer') {
        console.log('👋 Player disconnected during game:', data)

        // Always redirect to home when opponent leaves - the multiplayer session will be ended
        // This handles all cases: game over, mid-game, finished games, etc.
        console.log('🏠 Opponent left - returning to home')
        void router.push('/')
      }
    })

    // Listen for rematch declined - both players should go home
    multiplayer.onRematchDeclined(() => {
      if (gameMode.value === 'multiplayer') {
        console.log('❌ Rematch declined - returning to home')
        resetGame()
        router.push('/')
      }
    })
  }

  // Cleanup function for when store is destroyed
  onUnmounted(() => {
    if (chipFeedbackTimer) clearTimeout(chipFeedbackTimer)
    if (animationTimer) clearTimeout(animationTimer)
  })

  return {
    // State
    state,
    gameMode,
    phase,
    player,
    opponent,
    round,
    lastRoundWinner,
    gameWinner,
    isPlayerTurn,
    isMultiplayer,
    canTakeAction,
    lastChipFeedback,
    currentChipAnimation,
    currentRoundAnimation,
    isAnimating,
    chipAnimationQueue,

    // Actions
    resetGame,
    setGameMode,
    startMultiplayerGame,
    syncGameState,
    setupMultiplayerListeners,
    doHit,
    doSkip,
    applyChip,
    nextRound,
    runOpponentTurn,
  }
})
