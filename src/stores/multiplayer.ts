/**
 * Multiplayer store for Dave Deck: WebSocket connection, session management, real-time sync
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type { GameState } from '@/game/types'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type SessionStatus = 'idle' | 'creating' | 'waiting' | 'joining' | 'playing' | 'finished'

export interface Player {
  id: string
  name: string
  isHost: boolean
}

export interface MultiplayerSession {
  id: string
  isHost: boolean
  playerCount: number
  canStart: boolean
  players: Player[]
  myPlayer?: Player
  opponentPlayer?: Player
}

export interface GameAction {
  type: 'hit' | 'skip' | 'chip'
  data?: any
  gameState: GameState
  roundResult?: { winner: string | 'draw'; lifeLost: string | null; lifeAmount: number }
  roundAnimation?: { type: string; target?: string; amount?: number; data?: any }
  roundResultAnimation?: { type: string; target?: string; amount?: number; data?: any }
  chipAnimation?: { type: string; data?: any }
}

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001'

export const useMultiplayerStore = defineStore('multiplayer', () => {
  const socket = ref<Socket | null>(null)
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const sessionStatus = ref<SessionStatus>('idle')
  const currentSession = ref<MultiplayerSession | null>(null)
  const lastError = ref<string | null>(null)
  const rematchRequested = ref(false)
  const rematchFrom = ref<string | null>(null)
  const animationCallback = ref<((animation: any) => void) | null>(null)

  // Computed properties
  const isConnected = computed(() => connectionStatus.value === 'connected')
  const isInSession = computed(() => currentSession.value !== null)
  const canStartGame = computed(
    () =>
      currentSession.value?.isHost &&
      currentSession.value?.canStart &&
      sessionStatus.value === 'waiting'
  )
  const sessionInviteUrl = computed(() => {
    if (!currentSession.value) return null
    const baseUrl = window.location.origin
    return `${baseUrl}/?join=${currentSession.value.id}`
  })

  /**
   * Initialize WebSocket connection
   */
  function connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (socket.value?.connected) {
        console.log('🔌 Already connected, skipping connection attempt')
        resolve()
        return
      }

      connectionStatus.value = 'connecting'
      lastError.value = null

      console.log(`🔌 Attempting to connect to: ${WEBSOCKET_URL}`)

      socket.value = io(WEBSOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      })

      // Setup event handlers BEFORE connection completes
      setupSessionEventHandlers()
      setupGameEventHandlers()

      // Connection successful
      socket.value.on('connect', () => {
        console.log('✅ Connected to multiplayer server')
        connectionStatus.value = 'connected'
        lastError.value = null
        resolve()
      })

      // Connection error
      socket.value.on('connect_error', error => {
        console.error('❌ Connection error:', error)
        connectionStatus.value = 'error'
        lastError.value = `Connection failed: ${error.message}`
        reject(error)
      })

      // Disconnection
      socket.value.on('disconnect', reason => {
        console.log('🔌 Disconnected from server:', reason)
        connectionStatus.value = 'disconnected'
        if (reason !== 'io client disconnect') {
          lastError.value = `Disconnected: ${reason}`
          console.warn('⚠️ Unexpected disconnection, connection might need to be re-established')
        }
        // Reset session if connection lost
        if (currentSession.value) {
          currentSession.value = null
          sessionStatus.value = 'idle'
        }
      })

      // Auto-reconnection handling
      socket.value.on('reconnect', attemptNumber => {
        console.log('✅ Reconnected to server after', attemptNumber, 'attempts')
        connectionStatus.value = 'connected'
        lastError.value = null
      })

      socket.value.on('reconnect_error', error => {
        console.error('❌ Reconnection failed:', error)
      })

      // Event handlers are now set up earlier in connect()
    })
  }

  /**
   * Disconnect from server
   */
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    connectionStatus.value = 'disconnected'
    currentSession.value = null
    sessionStatus.value = 'idle'
    rematchRequested.value = false
    rematchFrom.value = null
  }

  /**
   * Ensure connection is healthy, reconnect if needed
   */
  async function ensureConnection(): Promise<void> {
    if (socket.value?.connected) {
      return
    }

    console.log('🔄 Connection not healthy, attempting to reconnect...')
    await connect()
  }

  /**
   * Create new game session
   */
  async function createSession(playerName?: string): Promise<void> {
    await ensureConnection()

    sessionStatus.value = 'creating'

    return new Promise((resolve, reject) => {
      socket.value!.emit('create-session', { playerName })

      const timeout = setTimeout(() => {
        sessionStatus.value = 'idle'
        reject(new Error('Session creation timeout'))
      }, 5000)

      socket.value!.once('session-created', data => {
        clearTimeout(timeout)
        const players = data.players || []
        const myPlayer = players.find((p: Player) => p.id === socket.value!.id)
        const opponentPlayer = players.find((p: Player) => p.id !== socket.value!.id)

        currentSession.value = {
          id: data.sessionId,
          isHost: data.isHost,
          playerCount: players.length,
          canStart: false,
          players,
          myPlayer,
          opponentPlayer,
        }
        sessionStatus.value = 'waiting'
        resolve()
      })
    })
  }

  /**
   * Join existing session by ID
   */
  async function joinSession(sessionId: string, playerName?: string): Promise<void> {
    await ensureConnection()

    sessionStatus.value = 'joining'
    lastError.value = null

    return new Promise((resolve, reject) => {
      socket.value!.emit('join-session', { sessionId, playerName })

      const timeout = setTimeout(() => {
        sessionStatus.value = 'idle'
        reject(new Error('Join session timeout'))
      }, 5000)

      socket.value!.once('session-joined', data => {
        clearTimeout(timeout)
        const players = data.players || []
        const myPlayer = players.find((p: Player) => p.id === socket.value!.id)
        const opponentPlayer = players.find((p: Player) => p.id !== socket.value!.id)

        currentSession.value = {
          id: data.sessionId,
          isHost: data.isHost,
          playerCount: players.length,
          canStart: players.length === 2,
          players,
          myPlayer,
          opponentPlayer,
        }
        sessionStatus.value = 'waiting'
        resolve()
      })

      socket.value!.once('join-failed', data => {
        clearTimeout(timeout)
        sessionStatus.value = 'idle'
        lastError.value = data.error
        reject(new Error(data.error))
      })
    })
  }

  /**
   * Start the game (host only)
   */
  function startGame(initialGameState: GameState): void {
    if (!socket.value?.connected || !currentSession.value?.isHost) {
      throw new Error('Cannot start game')
    }

    socket.value.emit('start-game', initialGameState)
    sessionStatus.value = 'playing'
  }

  /**
   * Send game action to opponent
   */
  function sendGameAction(action: GameAction): void {
    if (!socket.value?.connected || sessionStatus.value !== 'playing') {
      throw new Error('Cannot send game action')
    }

    socket.value.emit('game-action', {
      action: action.type,
      data: action.data,
      gameState: action.gameState,
      roundResult: action.roundResult,
      roundAnimation: action.roundAnimation,
      roundResultAnimation: action.roundResultAnimation,
    })
  }

  /**
   * End the current game
   */
  function endGame(gameResult: any): void {
    if (!socket.value?.connected) return

    socket.value.emit('game-over', gameResult)
    sessionStatus.value = 'finished'
  }

  /**
   * Request rematch
   */
  function requestRematch(): void {
    if (!socket.value?.connected) return

    socket.value.emit('request-rematch')
    rematchRequested.value = true
  }

  /**
   * Respond to rematch request
   */
  function respondToRematch(accepted: boolean): void {
    if (!socket.value?.connected) return

    socket.value.emit('rematch-response', accepted)
    rematchRequested.value = false
    rematchFrom.value = null

    if (accepted) {
      sessionStatus.value = 'waiting'
    }
  }

  /**
   * Update player name in current session
   */
  function updatePlayerName(playerName: string): void {
    if (!socket.value?.connected || !currentSession.value) return

    socket.value.emit('update-player-name', { playerName })
  }

  /**
   * Leave current session
   */
  function leaveSession(): void {
    if (socket.value?.connected) {
      socket.value.disconnect()
    }
    currentSession.value = null
    sessionStatus.value = 'idle'
    rematchRequested.value = false
    rematchFrom.value = null
  }

  /**
   * Setup session-related event handlers
   */
  function setupSessionEventHandlers(): void {
    if (!socket.value) return

    // Player list updated
    socket.value.on('player-list-updated', data => {
      console.log('👥 Player list updated:', data)
      if (currentSession.value) {
        const players = data.players || []
        const myPlayer = players.find((p: Player) => p.id === socket.value!.id)
        const opponentPlayer = players.find((p: Player) => p.id !== socket.value!.id)

        console.log(
          '🎮 Updating session state - players:',
          players.length,
          'myPlayer:',
          myPlayer?.name,
          'opponent:',
          opponentPlayer?.name
        )

        // Force reactive update by replacing the entire session object
        currentSession.value = {
          ...currentSession.value,
          players,
          playerCount: players.length,
          canStart: data.canStart,
          myPlayer,
          opponentPlayer,
        }
      }
    })

    // Legacy support for old player-joined event - more robust
    socket.value.on('player-joined', data => {
      console.log('📨 Legacy player-joined event received:', data)
      if (currentSession.value) {
        // Force update to 2 players
        currentSession.value = {
          ...currentSession.value,
          playerCount: 2,
          canStart: data.canStart || true,
        }
        console.log(
          '🔄 Updated session via legacy event - playerCount:',
          currentSession.value.playerCount
        )
      }
    })

    // Player disconnected
    socket.value.on('player-disconnected', _data => {
      if (currentSession.value) {
        // If we were in a finished game state, end the session completely
        if (sessionStatus.value === 'finished') {
          currentSession.value = null
          sessionStatus.value = 'idle'
          rematchRequested.value = false
          rematchFrom.value = null
          lastError.value = 'Opponent left the game'
        } else {
          // Otherwise, go back to waiting for new opponent
          currentSession.value.playerCount = 1
          currentSession.value.canStart = false
          sessionStatus.value = 'waiting'
          lastError.value = 'Opponent disconnected'
        }
      }
    })

    // Rematch events
    socket.value.on('rematch-requested', data => {
      rematchRequested.value = true
      rematchFrom.value = data.from
    })

    socket.value.on('rematch-accepted', () => {
      rematchRequested.value = false
      rematchFrom.value = null
      sessionStatus.value = 'waiting'
    })

    socket.value.on('rematch-declined', () => {
      rematchRequested.value = false
      rematchFrom.value = null
      // When rematch is declined, end the session for both players
      currentSession.value = null
      sessionStatus.value = 'idle'
    })

    // Error handling
    socket.value.on('error', data => {
      lastError.value = data.message
    })
  }

  /**
   * Setup game-related event handlers
   */
  function setupGameEventHandlers(): void {
    if (!socket.value) return

    // Game started
    socket.value.on('game-started', data => {
      console.log('🎮 Received game-started event:', data)
      sessionStatus.value = 'playing'
      console.log('📍 Session status updated to:', sessionStatus.value)

      // IMPORTANT: Update the game state with server's corrected state
      // This ensures both clients have synchronized starting turns
      // We'll emit this as a special game state update that the game store can catch
    })

    // Game ended
    socket.value.on('game-ended', _data => {
      sessionStatus.value = 'finished'
    })

    // Animation sync for multiplayer
    socket.value.on('animation', animation => {
      console.log('🎭 Received animation from opponent:', animation)
      // This will be handled by the game store via the animation callback
      if (animationCallback.value) {
        animationCallback.value(animation)
      }
    })

    // Enhanced error handling for game actions
    socket.value.on('error', error => {
      console.warn('🚫 Server rejected action:', error.message)
      // Show brief error feedback (will be handled by UI if needed)
    })
  }

  /**
   * Get event emitter for game state updates
   */
  function onGameStateUpdate(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.on('game-state-update', callback)
  }

  /**
   * Remove game state update listener
   */
  function offGameStateUpdate(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.off('game-state-update', callback)
  }

  /**
   * Trigger a round transition (server-authoritative)
   */
  function triggerRoundTransition(newGameState: GameState, _roundResult: any): void {
    if (!socket.value?.connected || sessionStatus.value !== 'playing') {
      throw new Error('Cannot trigger round transition')
    }

    socket.value.emit('round-transition', {
      newGameState,
      roundResult: _roundResult,
    })
  }

  /**
   * Listen for server-initiated round starts
   */
  function onRoundStarted(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.on('round-started', callback)
  }

  /**
   * Remove round started listener
   */
  function offRoundStarted(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.off('round-started', callback)
  }

  /**
   * Listen for game started events
   */
  function onGameStarted(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.on('game-started', callback)
  }

  /**
   * Remove game started listener
   */
  function offGameStarted(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.off('game-started', callback)
  }

  /**
   * Listen for game ended events
   */
  function onGameEnded(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.on('game-ended', callback)
  }

  /**
   * Remove game ended listener
   */
  function offGameEnded(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.off('game-ended', callback)
  }

  /**
   * Listen for player disconnected events
   */
  function onPlayerDisconnected(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.on('player-disconnected', callback)
  }

  /**
   * Remove player disconnected listener
   */
  function offPlayerDisconnected(callback: (_data: any) => void): void {
    if (!socket.value) return
    socket.value.off('player-disconnected', callback)
  }

  /**
   * Listen for rematch declined events
   */
  function onRematchDeclined(callback: () => void): void {
    if (!socket.value) return
    socket.value.on('rematch-declined', callback)
  }

  /**
   * Remove rematch declined listener
   */
  function offRematchDeclined(callback: () => void): void {
    if (!socket.value) return
    socket.value.off('rematch-declined', callback)
  }

  /**
   * Register animation callback for multiplayer sync
   */
  function onAnimation(callback: (animation: any) => void): void {
    animationCallback.value = callback
  }

  /**
   * Send animation to other player
   */
  function sendAnimation(animation: any): void {
    if (!socket.value?.connected || sessionStatus.value !== 'playing') {
      return
    }
    socket.value.emit('animation', animation)
  }

  return {
    // State
    connectionStatus,
    sessionStatus,
    currentSession,
    lastError,
    rematchRequested,
    rematchFrom,

    // Computed
    isConnected,
    isInSession,
    canStartGame,
    sessionInviteUrl,

    // Actions
    connect,
    disconnect,
    ensureConnection,
    createSession,
    joinSession,
    startGame,
    sendGameAction,
    endGame,
    requestRematch,
    respondToRematch,
    updatePlayerName,
    leaveSession,
    onGameStateUpdate,
    offGameStateUpdate,
    triggerRoundTransition,
    onRoundStarted,
    offRoundStarted,
    onGameStarted,
    offGameStarted,
    onGameEnded,
    offGameEnded,
    onPlayerDisconnected,
    offPlayerDisconnected,
    onRematchDeclined,
    offRematchDeclined,
    onAnimation,
    sendAnimation,
  }
})
