<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMultiplayerStore } from '@/stores/multiplayer'
import { useRouter } from 'vue-router'

const game = useGameStore()
const multiplayer = useMultiplayerStore()
const router = useRouter()

const isRoundResultOrGameOver = computed(() =>
  game.phase === 'game_over' || game.player.lives <= 0 || game.opponent.lives <= 0
)

const showGameOver = computed(() =>
  game.phase === 'game_over' || game.player.lives <= 0 || game.opponent.lives <= 0
)

const effectiveGameWinner = computed(() => {
  // In multiplayer, the server might not always send correct perspective
  // So we determine winner based on actual life counts - this is always accurate
  if (game.player.lives <= 0 && game.opponent.lives > 0) {
    return 'opponent'
  }
  if (game.opponent.lives <= 0 && game.player.lives > 0) {
    return 'player'
  }
  
  // If both players have same lives or other edge cases, fall back to gameWinner
  if (game.gameWinner) {
    return game.gameWinner
  }
  
  return null
})

// Removed unused variables since round dialogs are removed

// Safety mechanism: automatically advance from round_result to playing if stuck for too long
watchEffect(() => {
  if (game.phase === 'round_result' && !game.currentRoundAnimation) {
    // If we're in round_result but no animation is playing, force transition after 5 seconds
    const timeoutId = setTimeout(() => {
      if (game.phase === 'round_result') {
        console.warn('Round stuck in round_result phase - forcing transition')
        game.nextRound()
      }
    }, 5000)
    
    // Clear timeout if phase changes
    return () => clearTimeout(timeoutId)
  }
})

function goHome() {
  if (game.gameMode === 'multiplayer') {
    // In multiplayer, leave session (now properly ends session for both players)
    multiplayer.leaveSession()
  }
  game.resetGame()
  router.push('/')
}

function rematch() {
  if (game.gameMode === 'multiplayer') {
    // In multiplayer, request rematch through multiplayer store
    multiplayer.requestRematch()
  } else {
    // In single player, just reset the game
    game.resetGame()
  }
}

function acceptRematch() {
  multiplayer.respondToRematch(true)
}

function declineRematch() {
  multiplayer.respondToRematch(false)
  // After declining rematch, both players should go home
  // The respondToRematch(false) will notify the server, which should handle both players
  goHome()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="isRoundResultOrGameOver"
        class="overlay"
      >
        <div class="modal">
          <template v-if="showGameOver">
            <div class="game-over-content">
              <div class="game-over-background">
                <div class="victory-rays" v-if="effectiveGameWinner === 'player'"></div>
                <div class="defeat-shadow" v-else></div>
              </div>
              
              <div class="game-over-icon">
                <span v-if="effectiveGameWinner === 'player'">🏆</span>
                <span v-else>😔</span>
              </div>
              
              <h1 class="game-over-title" v-if="effectiveGameWinner === 'player'">
                Sieg!
              </h1>
              <h1 class="game-over-title game-over-title--defeat" v-else>
                Niederlage
              </h1>
              
              <div class="game-over-subtitle">
                <p v-if="effectiveGameWinner === 'player'" class="result result--win">
                  🎉 Glückwunsch! Du hast den Gegner besiegt!
                </p>
                <p v-else class="result result--lose">
                  💪 Versuche es erneut und zeig dem Gegner, wer der Boss ist!
                </p>
              </div>
              
              <div class="game-stats">
                <div class="stat-item">
                  <span class="stat-label">Dein Leben:</span>
                  <span class="stat-value">{{ game.player.lives }} ❤️</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Gegner Leben:</span>
                  <span class="stat-value">{{ game.opponent.lives }} ❤️</span>
                </div>
              </div>
              
              <div class="game-over-actions">
                <!-- Multiplayer rematch logic -->
                <template v-if="game.gameMode === 'multiplayer'">
                  <!-- Show rematch request UI if someone requested rematch -->
                  <template v-if="multiplayer.rematchRequested && multiplayer.rematchFrom">
                    <div class="rematch-request">
                      <p>{{ multiplayer.rematchFrom }} möchte eine Revanche!</p>
                      <div class="rematch-buttons">
                        <button type="button" class="btn btn-success btn-large" @click="acceptRematch">
                          <span>✅ Akzeptieren</span>
                        </button>
                        <button type="button" class="btn btn-danger btn-large" @click="declineRematch">
                          <span>❌ Ablehnen</span>
                        </button>
                      </div>
                    </div>
                  </template>
                  <!-- Show normal buttons if no rematch request pending -->
                  <template v-else>
                    <button type="button" class="btn btn-secondary btn-large" @click="rematch" :disabled="multiplayer.rematchRequested">
                      <span v-if="multiplayer.rematchRequested">⏳ Warte auf Antwort...</span>
                      <span v-else>🔄 Rematch</span>
                    </button>
                    <button type="button" class="btn btn-primary btn-large" @click="goHome">
                      <span>🏠 Zurück zur Home</span>
                    </button>
                  </template>
                </template>
                <!-- Single player rematch logic -->
                <template v-else>
                  <button type="button" class="btn btn-secondary btn-large" @click="rematch">
                    <span>🔄 Rematch</span>
                  </button>
                  <button type="button" class="btn btn-primary btn-large" @click="goHome">
                    <span>🏠 Zurück zur Home</span>
                  </button>
                </template>
              </div>
            </div>
          </template>
          <!-- Round result dialogs removed - feedback shown on board instead -->
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal {
  background: linear-gradient(135deg, var(--color-surface) 0%, rgba(26, 26, 46, 0.95) 100%);
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 480px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
}
.modal h2 {
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
}
.modal p {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}
.scores {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}
.score-line {
  margin-bottom: 0.25rem;
  font-size: 1rem;
}
.score-line:last-child {
  margin-bottom: 0;
}
.score-label {
  margin-right: 0.5rem;
  color: var(--color-text-muted);
}
.result {
  margin-bottom: 1.5rem !important;
}
.result--win {
  color: #4ade80;
  font-weight: 600;
}
.result--lose {
  color: #f87171;
  font-weight: 600;
}
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-large {
  padding: 1.25rem 2.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  border-radius: 16px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-accent), #e94560);
  color: white;
  box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
}

.btn-secondary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(233, 69, 96, 0.4);
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(239, 68, 68, 0.4);
}

.btn-primary:active,
.btn-secondary:active,
.btn-success:active,
.btn-danger:active {
  transform: translateY(0);
}
/* Enhanced modal animations */
.game-over-content {
  position: relative;
  animation: modal-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  z-index: 2;
}

/* Removed special victory animation to match loss screen layout */

.game-over-background {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 24px;
  overflow: hidden;
}

.victory-rays {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(74, 222, 128, 0.2) 0%, transparent 70%);
  animation: victory-rays-pulse 2s ease-in-out infinite;
}

.defeat-shadow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
  animation: defeat-shadow-pulse 3s ease-in-out infinite;
}

.game-over-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  animation: icon-bounce 1s ease-out 0.3s both;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
}

/* Removed special victory icon animation to match loss screen */

.game-over-title {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: title-slide-up 0.8s ease-out 0.5s both;
  opacity: 0;
  text-shadow: none;
}

.game-over-title--defeat {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-over-subtitle {
  margin-bottom: 2rem;
  animation: subtitle-fade-in 0.6s ease-out 0.7s both;
  opacity: 0;
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2.5rem;
  animation: stats-slide-in 0.6s ease-out 0.9s both;
  opacity: 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 120px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.game-over-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  animation: actions-slide-up 0.6s ease-out 1.1s both;
  opacity: 0;
}

.rematch-request {
  text-align: center;
  animation: rematch-request-appear 0.5s ease-out;
}

.rematch-request p {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--color-text);
}

.rematch-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Modal entrance animation */
@keyframes modal-enter {
  0% {
    opacity: 0;
    transform: translateY(50px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Removed victory modal animation for consistency */

/* Icon animations */
@keyframes icon-bounce {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateY(-5px) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes victory-icon-spin {
  0% {
    opacity: 0;
    transform: rotate(-180deg) scale(0.3);
  }
  50% {
    opacity: 1;
    transform: rotate(0deg) scale(1.2);
  }
  70% {
    transform: rotate(-10deg) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
  }
}

@keyframes celebration-bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(-15px) scale(1.1);
  }
  60% {
    transform: translateY(-7px) scale(1.05);
  }
}

@keyframes text-slide-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Enhanced win/loss result styles */
.result--win {
  animation: win-glow 1.5s ease-in-out 0.6s both;
  position: relative;
}

.result--win::after {
  content: '';
  position: absolute;
  inset: -4px;
  background: linear-gradient(45deg, transparent, rgba(74, 222, 128, 0.3), transparent);
  border-radius: 8px;
  z-index: -1;
  animation: win-halo 2s ease-in-out infinite;
}

@keyframes win-glow {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
    text-shadow: 0 0 10px rgba(74, 222, 128, 0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    text-shadow: 0 0 5px rgba(74, 222, 128, 0.5);
  }
}

@keyframes win-halo {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.7;
  }
}

/* New enhanced animations */
@keyframes victory-rays-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

@keyframes defeat-shadow-pulse {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

/* Removed complex victory icon animation for consistency */

@keyframes title-slide-up {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes subtitle-fade-in {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes stats-slide-in {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes actions-slide-up {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rematch-request-appear {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
