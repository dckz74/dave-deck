<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useMultiplayerStore } from '@/stores/multiplayer'

const router = useRouter()
const route = useRoute()
const game = useGameStore()
const multiplayer = useMultiplayerStore()

const showModeSelection = ref(false)
const joiningSession = ref(false)
const joinSessionId = ref('')
const errorMessage = ref('')
const playerName = ref('')

const canCreateSession = computed(() => 
  multiplayer.isConnected && multiplayer.sessionStatus === 'idle'
)

onMounted(async () => {
  // Check for invite link in URL
  const joinParam = route.query.join as string
  
  if (joinParam) {
    joinSessionId.value = joinParam
    showModeSelection.value = true
    
    // Automatically attempt to connect when join link is used
    try {
      await multiplayer.connect()
    } catch (error) {
      errorMessage.value = `Connection failed: ${error}`
    }
  }
})

function startSinglePlayer() {
  game.setGameMode('single-player')
  game.resetGame()
  router.push('/game')
}

async function showMultiplayerOptions() {
  showModeSelection.value = true
  errorMessage.value = ''
  
  // Automatically connect when showing multiplayer options
  if (!multiplayer.isConnected && multiplayer.connectionStatus !== 'connecting') {
    try {
      await multiplayer.connect()
    } catch (error) {
      errorMessage.value = `Failed to connect to server: ${error}`
    }
  }
}

async function createMultiplayerGame() {
  try {
    errorMessage.value = ''
    
    if (!multiplayer.isConnected) {
      await multiplayer.connect()
    }
    
    await multiplayer.createSession(playerName.value || undefined)
    router.push('/lobby')
  } catch (error) {
    errorMessage.value = `Failed to create session: ${error}`
  }
}

async function joinMultiplayerGame() {
  if (!joinSessionId.value.trim()) {
    errorMessage.value = 'Please enter a session code'
    return
  }

  try {
    errorMessage.value = ''
    
    if (!multiplayer.isConnected) {
      await multiplayer.connect()
    }
    
    await multiplayer.joinSession(joinSessionId.value.toUpperCase(), playerName.value || undefined)
    router.push('/lobby')
  } catch (error) {
    errorMessage.value = `Failed to join session: ${error}`
  }
}

async function connectAndJoinSession(sessionId: string) {
  try {
    errorMessage.value = ''
    
    if (!multiplayer.isConnected) {
      await multiplayer.connect()
    }
    
    await multiplayer.joinSession(sessionId.toUpperCase(), playerName.value || undefined)
    router.push('/lobby')
  } catch (error) {
    errorMessage.value = `Failed to join session: ${error}`
    joiningSession.value = false
  }
}

function backToMain() {
  showModeSelection.value = false
  joiningSession.value = false
  joinSessionId.value = ''
  errorMessage.value = ''
  
  // Clear URL parameter
  if (route.query.join) {
    router.replace('/')
  }
}

function viewStatistics() {
  router.push('/statistics')
}
</script>

<template>
  <div class="home">
    <header class="hero">
      <h1>Dave Deck</h1>
      <p class="tagline">Black Jack mit Twist – Karten 1–11, ein Deck, Chips.</p>
    </header>

    <!-- Main menu -->
    <main v-if="!showModeSelection" class="actions">
      <button type="button" class="btn btn-primary" @click="startSinglePlayer">
        🎯 Solo spielen
      </button>
      <button type="button" class="btn btn-primary" @click="showMultiplayerOptions">
        👥 Multiplayer
      </button>
      <button type="button" class="btn btn-secondary" @click="viewStatistics">
        📊 Statistiken
      </button>
    </main>

    <!-- Multiplayer options -->
    <main v-else class="multiplayer-options">

      <div v-if="joiningSession" class="joining-message">
        <h2>Joining Session...</h2>
        <p>Attempting to join session: {{ joinSessionId }}</p>
      </div>

      <div v-else class="options-container">
        <h2 v-if="joinSessionId">Join Game: {{ joinSessionId }}</h2>
        <h2 v-else>Multiplayer Options</h2>
        
        <!-- Connection status -->
        <div class="connection-status" :class="`status-${multiplayer.connectionStatus}`">
          <span class="status-indicator"></span>
          <span class="status-text">
            {{ multiplayer.connectionStatus === 'connected' ? 'Connected' : 
               multiplayer.connectionStatus === 'connecting' ? 'Connecting...' :
               multiplayer.connectionStatus === 'error' ? 'Connection Error' : 'Disconnected' }}
          </span>
        </div>

        <div class="multiplayer-actions">
          <!-- Player Name Input -->
          <div class="action-group player-name-group">
            <label for="playerName" class="name-label">Your Name (Optional)</label>
            <input 
              id="playerName"
              v-model="playerName" 
              type="text" 
              placeholder="Enter your name..."
              class="name-input"
              maxlength="20"
            >
          </div>

          <!-- Create session -->
          <div v-if="!joinSessionId" class="action-group">
            <button 
              type="button" 
              class="btn btn-primary"
              @click="createMultiplayerGame"
              :disabled="!canCreateSession"
            >
              🎮 Create Game
            </button>
            <p class="action-description">Start a new game and invite a friend</p>
          </div>

          <!-- Join session -->
          <div class="action-group">
            <div class="join-form">
              <input 
                v-model="joinSessionId" 
                type="text" 
                placeholder="Enter session code (e.g. ABC123)"
                class="session-input"
                maxlength="6"
                @input="joinSessionId = joinSessionId.toUpperCase()"
              >
              <button 
                type="button" 
                class="btn btn-primary"
                @click="joinMultiplayerGame"
                :disabled="!multiplayer.isConnected"
              >
                {{ joinSessionId ? '🚪 Join This Game' : '🚪 Join Game' }}
              </button>
            </div>
            <p class="action-description">
              {{ joinSessionId ? 'Enter your name above (optional) and join the game' : 'Join a friend\'s game using their code' }}
            </p>
            
            <!-- Quick join button for invite links -->
            <div v-if="joinSessionId && multiplayer.isConnected" style="margin-top: 0.5rem;">
              <button 
                type="button" 
                class="btn btn-success"
                @click="joinMultiplayerGame"
                style="font-size: 0.9rem; padding: 0.4rem 1rem;"
              >
                🚀 Quick Join {{ joinSessionId }}
              </button>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Back button -->
        <button type="button" class="btn btn-secondary back-btn" @click="backToMain">
          ← Back to Menu
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-bg);
}

.hero {
  text-align: center;
  margin-bottom: 2rem;
}

.hero h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.tagline {
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

/* Multiplayer Options Styles */
.multiplayer-options {
  width: 100%;
  max-width: 500px;
}

.joining-message {
  text-align: center;
  padding: 2rem;
  background: var(--color-surface);
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.joining-message h2 {
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.joining-message p {
  color: var(--color-text-muted);
}

.options-container {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.options-container h2 {
  color: var(--color-text);
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

/* Connection Status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-connected {
  background: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.status-connected .status-indicator {
  background: rgb(34, 197, 94);
}

.status-connecting {
  background: rgba(249, 115, 22, 0.1);
  color: rgb(249, 115, 22);
}

.status-connecting .status-indicator {
  background: rgb(249, 115, 22);
  animation: pulse 2s infinite;
}

.status-error, .status-disconnected {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

.status-error .status-indicator,
.status-disconnected .status-indicator {
  background: rgb(239, 68, 68);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Multiplayer Actions */
.multiplayer-actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.action-group {
  text-align: center;
}

.player-name-group {
  background: var(--color-bg);
  padding: 1rem;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.name-label {
  display: block;
  color: var(--color-text);
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.name-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 1rem;
  text-align: center;
}

.name-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.name-input::placeholder {
  color: var(--color-text-muted);
}

.action-description {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.join-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.session-input {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.1em;
  min-width: 150px;
}

.session-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.session-input::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
  letter-spacing: normal;
}

/* Error Message */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  text-align: center;
  font-weight: 500;
  margin-bottom: 1rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Back Button */
.back-btn {
  width: 100%;
  margin-top: 1rem;
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), filter var(--transition-fast);
  min-width: 140px;
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
  .home {
    padding: 1rem;
  }
  
  .options-container {
    padding: 1.5rem;
  }
  
  .join-form {
    flex-direction: column;
    align-items: center;
  }
  
  .session-input {
    min-width: 200px;
  }
  
  .multiplayer-actions {
    gap: 1rem;
  }
}
</style>
