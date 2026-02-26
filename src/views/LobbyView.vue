<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useMultiplayerStore } from '@/stores/multiplayer'

const router = useRouter()
const game = useGameStore()
const multiplayer = useMultiplayerStore()

const copiedInvite = ref(false)
const showInviteDetails = ref(false)
const editingName = ref(false)
const newPlayerName = ref('')
const nameInput = ref<HTMLInputElement>()

const playerStatus = computed(() => {
  if (!multiplayer.currentSession) return 'No session'
  
  if (multiplayer.currentSession.playerCount === 1) {
    return multiplayer.currentSession.isHost ? 'Waiting for player to join...' : 'Joining session...'
  } else {
    return 'Ready to play!'
  }
})

const canStartGame = computed(() => 
  multiplayer.canStartGame && multiplayer.currentSession?.playerCount === 2
)

const inviteUrl = computed(() => multiplayer.sessionInviteUrl)

const sessionCode = computed(() => multiplayer.currentSession?.id || '')

onMounted(() => {
  // Redirect if not in a session
  if (!multiplayer.isInSession) {
    router.push('/')
    return
  }
  
  // Setup multiplayer listeners
  game.setupMultiplayerListeners()
  
  // Listen for game start event
  multiplayer.onGameStateUpdate((data) => {
    // This will handle game state updates during the game
  })
})

// Watch for session status changes to handle game start
watch(
  () => multiplayer.sessionStatus,
  (newStatus) => {
    if (newStatus === 'playing') {
      // Game has started, navigate to game view
      console.log('🎮 Game started, navigating to game view...')
      game.startMultiplayerGame()
      router.push('/game')
    }
  }
)

function copyInviteLink() {
  if (inviteUrl.value) {
    navigator.clipboard.writeText(inviteUrl.value).then(() => {
      copiedInvite.value = true
      setTimeout(() => {
        copiedInvite.value = false
      }, 2000)
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = inviteUrl.value!
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      
      copiedInvite.value = true
      setTimeout(() => {
        copiedInvite.value = false
      }, 2000)
    })
  }
}

function copySessionCode() {
  if (sessionCode.value) {
    navigator.clipboard.writeText(sessionCode.value).then(() => {
      // Could add feedback here
    })
  }
}

function startGame() {
  if (canStartGame.value) {
    // Initialize game state
    game.startMultiplayerGame()
    router.push('/game')
  }
}

function leaveLobby() {
  multiplayer.leaveSession()
  router.push('/')
}

function toggleInviteDetails() {
  showInviteDetails.value = !showInviteDetails.value
}

async function startEditingName() {
  newPlayerName.value = multiplayer.currentSession?.myPlayer?.name || ''
  editingName.value = true
  await nextTick()
  nameInput.value?.focus()
}

function cancelEditingName() {
  editingName.value = false
  newPlayerName.value = ''
}

function savePlayerName() {
  if (newPlayerName.value.trim()) {
    multiplayer.updatePlayerName(newPlayerName.value.trim())
  }
  editingName.value = false
}

// Handle page refresh/close
onUnmounted(() => {
  // Clean up if needed
})
</script>

<template>
  <div class="lobby">
    <div class="lobby-container">
      <!-- Header -->
      <header class="lobby-header">
        <h1>Game Lobby</h1>
        <div class="session-info">
          <span class="session-code" @click="copySessionCode">
            Session: {{ sessionCode }}
          </span>
        </div>
      </header>

      <!-- Connection Status -->
      <div class="connection-status" :class="`status-${multiplayer.connectionStatus}`">
        <span class="status-indicator"></span>
        <span class="status-text">
          {{ multiplayer.connectionStatus === 'connected' ? 'Connected' : 
             multiplayer.connectionStatus === 'connecting' ? 'Connecting...' :
             'Connection Issue' }}
        </span>
      </div>

      <!-- Player Status -->
      <div class="player-status">
        <div class="status-content">
          <div class="player-count">
            <span class="count">{{ multiplayer.currentSession?.playerCount || 0 }}</span>
            <span class="total">/2 Players</span>
          </div>
          <p class="status-message">{{ playerStatus }}</p>
        </div>

        <!-- Player indicators -->
        <div class="player-indicators">
          <div class="player-slot" :class="{ active: true, host: multiplayer.currentSession?.myPlayer?.isHost }">
            <div class="player-avatar">
              {{ multiplayer.currentSession?.myPlayer?.isHost ? '👑' : '🎮' }}
            </div>
            <div v-if="!editingName" class="player-name-display">
              <span class="player-name">
                {{ multiplayer.currentSession?.myPlayer?.name || 'You' }}
              </span>
              <button @click="startEditingName" class="edit-name-btn" title="Edit name">
                ✏️
              </button>
            </div>
            <div v-else class="player-name-edit">
              <input 
                v-model="newPlayerName" 
                @keyup.enter="savePlayerName"
                @keyup.escape="cancelEditingName"
                class="name-input"
                placeholder="Enter your name"
                maxlength="20"
                ref="nameInput"
              >
              <button @click="savePlayerName" class="save-btn" title="Save">✓</button>
              <button @click="cancelEditingName" class="cancel-btn" title="Cancel">✗</button>
            </div>
            <span v-if="multiplayer.currentSession?.myPlayer?.isHost" class="host-badge">Host</span>
          </div>

          <div class="player-slot" :class="{ active: (multiplayer.currentSession?.playerCount || 0) >= 2 }">
            <div class="player-avatar">
              {{ (multiplayer.currentSession?.playerCount || 0) >= 2 ? '🎯' : '⏳' }}
            </div>
            <span class="player-name">
              {{ multiplayer.currentSession?.opponentPlayer?.name || 
                 ((multiplayer.currentSession?.playerCount || 0) >= 2 ? 'Opponent' : 'Waiting...') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Invite Section -->
      <div v-if="multiplayer.currentSession?.isHost && (multiplayer.currentSession?.playerCount || 0) < 2" class="invite-section">
        <h3>Invite a Friend</h3>
        
        <div class="invite-options">
          <!-- Quick Share -->
          <div class="invite-quick">
            <button 
              type="button" 
              class="btn btn-primary invite-btn"
              @click="copyInviteLink"
              :disabled="!inviteUrl"
            >
              {{ copiedInvite ? '✓ Copied!' : '🔗 Copy Invite Link' }}
            </button>
          </div>

          <!-- Show Details Toggle -->
          <button 
            type="button" 
            class="btn btn-ghost details-toggle"
            @click="toggleInviteDetails"
          >
            {{ showInviteDetails ? 'Hide Details' : 'Show More Options' }}
          </button>

          <!-- Detailed Options -->
          <div v-if="showInviteDetails" class="invite-details">
            <div class="detail-item">
              <label>Session Code:</label>
              <div class="code-display" @click="copySessionCode">
                <code>{{ sessionCode }}</code>
                <span class="copy-hint">Click to copy</span>
              </div>
            </div>

            <div class="detail-item">
              <label>Full Invite Link:</label>
              <div class="url-display">
                <input 
                  :value="inviteUrl" 
                  readonly 
                  class="url-input"
                  @focus="$event.target.select()"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Actions -->
      <div class="game-actions">
        <button 
          v-if="canStartGame"
          type="button" 
          class="btn btn-primary btn-large start-btn"
          @click="startGame"
        >
          🎮 Start Game
        </button>
        
        <div v-else-if="!multiplayer.currentSession?.isHost && (multiplayer.currentSession?.playerCount || 0) >= 2" class="waiting-message">
          <p>Waiting for host to start the game...</p>
        </div>

        <button 
          type="button" 
          class="btn btn-secondary leave-btn"
          @click="leaveLobby"
        >
          ← Leave Lobby
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="multiplayer.lastError" class="error-message">
        {{ multiplayer.lastError }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-bg);
}

.lobby-container {
  width: 100%;
  max-width: 600px;
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Header */
.lobby-header {
  text-align: center;
  margin-bottom: 2rem;
}

.lobby-header h1 {
  color: var(--color-text);
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.session-info {
  margin-bottom: 1rem;
}

.session-code {
  background: var(--color-bg);
  color: var(--color-accent);
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: 600;
  font-family: monospace;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background var(--transition-fast);
}

.session-code:hover {
  background: var(--color-primary);
}

/* Connection Status */
.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 2rem;
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

/* Player Status */
.player-status {
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-content {
  text-align: center;
  margin-bottom: 1.5rem;
}

.player-count {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.player-count .total {
  font-size: 1.2rem;
  color: var(--color-text-muted);
}

.status-message {
  color: var(--color-text);
  font-size: 1.1rem;
  margin: 0;
}

.player-indicators {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.player-slot {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: var(--radius);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  transition: all var(--transition-fast);
  position: relative;
}

.player-slot.active {
  border-color: var(--color-accent);
  background: rgba(59, 130, 246, 0.05);
}

.player-slot.host {
  background: rgba(234, 179, 8, 0.05);
  border-color: rgb(234, 179, 8);
}

.player-avatar {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.player-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.player-name-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.edit-name-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.edit-name-btn:hover {
  opacity: 1;
}

.player-name-edit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}

.name-input {
  background: var(--color-bg);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  padding: 0.25rem 0.5rem;
  color: var(--color-text);
  font-size: 0.9rem;
  width: 120px;
}

.name-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.save-btn, .cancel-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem;
  border-radius: var(--radius);
  transition: background-color 0.2s;
}

.save-btn {
  color: rgb(34, 197, 94);
}

.save-btn:hover {
  background: rgba(34, 197, 94, 0.1);
}

.cancel-btn {
  color: rgb(239, 68, 68);
}

.cancel-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.host-badge {
  background: rgb(234, 179, 8);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: calc(var(--radius) / 2);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Invite Section */
.invite-section {
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.invite-section h3 {
  color: var(--color-text);
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.invite-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invite-quick {
  text-align: center;
}

.invite-btn {
  min-width: 200px;
}

.details-toggle {
  background: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  align-self: center;
  min-width: auto;
  padding: 0.5rem 1rem;
}

.invite-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-item label {
  display: block;
  color: var(--color-text);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.code-display {
  background: var(--color-surface);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-display:hover {
  background: var(--color-primary);
}

.code-display code {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.1em;
}

.copy-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.url-input {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  color: var(--color-text);
  font-family: monospace;
  font-size: 0.9rem;
}

.url-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Game Actions */
.game-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.waiting-message {
  text-align: center;
  padding: 1rem;
  background: rgba(249, 115, 22, 0.1);
  color: rgb(249, 115, 22);
  border-radius: var(--radius);
  font-weight: 500;
}

.start-btn {
  font-size: 1.2rem;
  padding: 1rem 2rem;
  min-width: 200px;
}

.leave-btn {
  min-width: 150px;
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

.btn-ghost {
  background: none;
  color: var(--color-text-muted);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(:disabled) {
  color: var(--color-text);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.2rem;
}

/* Error Message */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  text-align: center;
  font-weight: 500;
  margin-top: 1rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Responsive Design */
@media (max-width: 640px) {
  .lobby {
    padding: 1rem;
  }
  
  .lobby-container {
    padding: 1.5rem;
  }
  
  .player-indicators {
    flex-direction: column;
  }
  
  .player-slot {
    flex-direction: row;
    text-align: left;
    justify-content: flex-start;
    gap: 1rem;
  }
  
  .player-avatar {
    margin-bottom: 0;
  }
  
  .invite-details {
    gap: 0.75rem;
  }
  
  .url-input {
    font-size: 0.8rem;
  }
}
</style>