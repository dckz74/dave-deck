<script setup lang="ts">
import { watch, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useMultiplayerStore } from '@/stores/multiplayer'
import GameTable from '@/components/GameTable.vue'
import GameOverlay from '@/components/GameOverlay.vue'

const router = useRouter()
const game = useGameStore()
const multiplayer = useMultiplayerStore()
const aiTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const showRematchDialog = ref(false)

const endGameText = computed(() => {
  if (game.isMultiplayer) {
    return 'Leave Game'
  }
  return 'Spiel beenden'
})

const connectionStatus = computed(() => {
  if (!game.isMultiplayer) return null
  return {
    status: multiplayer.connectionStatus,
    isConnected: multiplayer.isConnected,
    sessionActive: multiplayer.isInSession,
  }
})

const gameOverOptions = computed(() => {
  if (!game.isMultiplayer || game.phase !== 'game_over') return null

  return {
    canRematch: multiplayer.isInSession,
    rematchRequested: multiplayer.rematchRequested,
    rematchFrom: multiplayer.rematchFrom,
  }
})

onMounted(() => {
  // Setup multiplayer listeners if in multiplayer mode
  if (game.isMultiplayer) {
    game.setupMultiplayerListeners()
  }
})

function endGame() {
  if (game.isMultiplayer) {
    // In multiplayer, leaving the game should disconnect from session
    multiplayer.leaveSession()
    game.setGameMode('single-player')
  }

  game.resetGame()
  router.push('/')
}

function requestRematch() {
  if (game.isMultiplayer && multiplayer.isInSession) {
    multiplayer.requestRematch()
  }
}

function respondToRematch(accepted: boolean) {
  if (game.isMultiplayer) {
    multiplayer.respondToRematch(accepted)
    if (accepted) {
      // Reset game for rematch
      game.startMultiplayerGame()
      showRematchDialog.value = false
    } else {
      // Declined, go back to lobby or home
      router.push('/')
    }
  }
}

// Handle AI turns (only in single-player mode)
watch(
  () => ({ turn: game.isPlayerTurn, phase: game.phase, isMultiplayer: game.isMultiplayer }),
  ({ turn, phase, isMultiplayer }) => {
    // Skip AI logic in multiplayer mode
    if (isMultiplayer || phase !== 'playing' || turn) return

    if (aiTimeout.value) clearTimeout(aiTimeout.value)
    aiTimeout.value = setTimeout(() => {
      game.runOpponentTurn()
      aiTimeout.value = null
    }, 600)
  },
  { immediate: true }
)

// Handle rematch requests
watch(
  () => multiplayer.rematchRequested,
  requested => {
    if (requested && multiplayer.rematchFrom) {
      showRematchDialog.value = true
    }
  }
)
</script>

<template>
  <div class="game-view">
    <header class="game-header">
      <!-- Connection Status (Multiplayer only) -->
      <div
        v-if="connectionStatus"
        class="connection-indicator"
        :class="`status-${connectionStatus.status}`"
      >
        <span class="status-dot"></span>
        <span class="status-text">
          {{ connectionStatus.isConnected ? 'Connected' : 'Connection Issue' }}
        </span>
      </div>

      <!-- Game Mode Indicator -->
      <div class="game-mode-indicator">
        {{ game.isMultiplayer ? '👥 Multiplayer' : '🎯 Solo' }}
      </div>

      <button type="button" class="btn-end" :aria-label="endGameText" @click="endGame">
        {{ endGameText }}
      </button>
    </header>

    <GameTable />
    <GameOverlay />

    <!-- Rematch Dialog -->
    <div v-if="showRematchDialog" class="rematch-dialog-overlay">
      <div class="rematch-dialog">
        <h3>Rematch Request</h3>
        <p>Your opponent wants to play another round!</p>
        <div class="rematch-actions">
          <button type="button" class="btn btn-primary" @click="respondToRematch(true)">
            ✓ Accept
          </button>
          <button type="button" class="btn btn-secondary" @click="respondToRematch(false)">
            ✕ Decline
          </button>
        </div>
      </div>
    </div>

    <!-- Game Over Options (Multiplayer) -->
    <div v-if="gameOverOptions && game.phase === 'game_over'" class="game-over-multiplayer">
      <div class="multiplayer-options">
        <button
          v-if="!gameOverOptions.rematchRequested"
          type="button"
          class="btn btn-primary"
          @click="requestRematch"
          :disabled="!gameOverOptions.canRematch"
        >
          🔄 Request Rematch
        </button>

        <div v-else class="rematch-pending">
          <p>Rematch requested... waiting for opponent</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  min-height: 100vh;
  position: relative;
  background: var(--color-bg);
}

.game-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-end;
  z-index: 10;
}

/* Connection Indicator */
.connection-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-connected {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.status-connected .status-dot {
  background: rgb(34, 197, 94);
}

.status-connecting {
  background: rgba(249, 115, 22, 0.1);
  color: rgb(249, 115, 22);
}

.status-connecting .status-dot {
  background: rgb(249, 115, 22);
  animation: pulse 2s infinite;
}

.status-error,
.status-disconnected {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.status-error .status-dot,
.status-disconnected .status-dot {
  background: rgb(239, 68, 68);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Game Mode Indicator */
.game-mode-indicator {
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.btn-end {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.btn-end:hover {
  color: var(--color-text);
  border-color: rgba(255, 255, 255, 0.4);
}

/* Rematch Dialog */
.rematch-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.rematch-dialog {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow-lg);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.rematch-dialog h3 {
  color: var(--color-text);
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.rematch-dialog p {
  color: var(--color-text-muted);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.rematch-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Game Over Multiplayer Options */
.game-over-multiplayer {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.multiplayer-options {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow);
  text-align: center;
}

.rematch-pending {
  color: var(--color-text-muted);
  font-style: italic;
}

.rematch-pending p {
  margin: 0;
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:disabled:hover {
  filter: none;
  transform: none;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
  box-shadow: var(--shadow);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Responsive Design */
@media (max-width: 640px) {
  .game-header {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .connection-indicator,
  .game-mode-indicator {
    font-size: 0.75rem;
    padding: 0.375rem 0.5rem;
  }

  .btn-end {
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
  }

  .rematch-dialog {
    padding: 1.5rem;
    margin: 1rem;
  }

  .rematch-actions {
    flex-direction: column;
  }

  .game-over-multiplayer {
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    transform: none;
  }

  .multiplayer-options {
    padding: 0.75rem 1rem;
  }
}
</style>
