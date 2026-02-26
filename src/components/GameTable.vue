<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMultiplayerStore } from '@/stores/multiplayer'
import GameCard from '@/components/GameCard.vue'
import ChipList from '@/components/ChipList.vue'

const game = useGameStore()
const multiplayer = useMultiplayerStore()

const playerSum = computed(() => game.player.hand.reduce((s, c) => s + c.value, 0))
const opponentSum = computed(() => game.opponent.hand.reduce((s, c) => s + c.value, 0))

// Visible cards sum for opponent (excluding hidden card)
const opponentVisibleSum = computed(() => {
  if (!game.opponent.hasHiddenCard) {
    return opponentSum.value
  }
  // If there's a hidden card, sum all visible cards (skip the first card which is hidden)
  return game.opponent.hand.slice(1).reduce((s, c) => s + c.value, 0)
})

// Score display text for opponent
const opponentScoreText = computed(() => {
  if (game.opponent.hasHiddenCard) {
    return `? + ${opponentVisibleSum.value}/${limit.value}`
  }
  return `${opponentSum.value}/${limit.value}`
})
const limit = computed(() => game.round.limit)
const attackValue = computed(() => 1 + game.round.stakeModifier)
const hasIncreasedAttack = computed(() => game.round.stakeModifier > 0)

// Player names for display
const playerName = computed(() => {
  if (game.isMultiplayer && multiplayer.currentSession?.myPlayer?.name) {
    return multiplayer.currentSession.myPlayer.name
  }
  return 'Du'
})

const opponentName = computed(() => {
  if (game.isMultiplayer && multiplayer.currentSession?.opponentPlayer?.name) {
    return multiplayer.currentSession.opponentPlayer.name
  }
  return 'Gegner'
})

function pointsClass(sum: number): string {
  if (sum > limit.value) return 'points--bust'
  if (sum === limit.value) return 'points--perfect'
  return 'points--ok'
}
</script>

<template>
  <div class="game-container">
    <!-- Fixed overlay elements that don't affect layout -->
    <div class="overlay-effects">
      <!-- Chip feedback -->
      <Transition name="chip-feedback">
        <div v-if="game.lastChipFeedback" class="chip-feedback">
          <span class="chip-feedback-icon">◆</span>
          <span class="chip-feedback-text">{{ game.lastChipFeedback }}</span>
        </div>
      </Transition>

      <!-- Phew animation for draws -->
      <Transition name="phew-draw">
        <div v-if="game.currentRoundAnimation?.type === 'phew_draw'" class="phew-draw-effect">
          <div class="phew-emoji">😅</div>
          <div class="phew-text">Unentschieden!</div>
          <div class="relief-sparkles">
            <span v-for="i in 12" :key="i" class="sparkle">✨</span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Centered game table with stable layout -->
    <div class="table">
      <div class="table-surface" :class="{ 'danger-zone': hasIncreasedAttack }">
        <!-- Opponent Area - Top -->
        <section class="player-area opponent-area">
          <div class="player-section">
            <h2 class="player-label">{{ opponentName }}</h2>
            <div class="lives" :class="{ 'lives--protected': game.round.shieldOpponent > 0 }">
              <span class="lives-hearts">❤️ {{ game.opponent.lives }}</span>

              <!-- Shield protection animation -->
              <div
                v-if="game.round.shieldOpponent > 0"
                class="shield-border"
                :style="{ '--shield-level': game.round.shieldOpponent }"
              >
                <div class="shield-ring"></div>
                <div class="shield-particles">
                  <span v-for="i in 8" :key="i" class="shield-particle"></span>
                </div>
              </div>

              <!-- Shield activation animation -->
              <Transition name="shield-activate">
                <div
                  v-if="
                    game.currentChipAnimation?.type === 'shield_activate' &&
                    game.currentChipAnimation?.data?.newShield >
                      (game.currentChipAnimation?.data?.oldShield || 0) &&
                    game.currentChipAnimation?.data?.target === 'opponent'
                  "
                  class="shield-activation-effect"
                >
                  <div class="shield-burst">
                    <span v-for="i in 6" :key="i" class="shield-burst-ring"></span>
                  </div>
                  <div class="shield-level-indicator">
                    +{{
                      (game.currentChipAnimation?.data?.newShield || 1) -
                      (game.currentChipAnimation?.data?.oldShield || 0)
                    }}
                    🛡️
                  </div>
                </div>
              </Transition>

              <!-- Heart attack animation for opponent -->
              <Transition name="heart-attack">
                <div
                  v-if="
                    game.currentRoundAnimation?.type === 'heart_attack' &&
                    game.currentRoundAnimation?.target === 'opponent'
                  "
                  class="heart-attack-effect"
                >
                  <div class="hearts-breaking">
                    <span
                      v-for="i in game.currentRoundAnimation?.amount || 1"
                      :key="i"
                      class="breaking-heart"
                      >💔</span
                    >
                  </div>
                  <div class="attack-lightning">⚡</div>
                  <div class="damage-number">-{{ game.currentRoundAnimation?.amount || 1 }}</div>
                  <div
                    v-if="
                      game.currentRoundAnimation?.data?.originalAttack &&
                      game.currentRoundAnimation.data.originalAttack >
                        (game.currentRoundAnimation.amount || 0)
                    "
                    class="attack-value"
                  >
                    {{ game.currentRoundAnimation.data.originalAttack }} Angriff
                  </div>
                </div>
              </Transition>

              <!-- Shield blocking animation for opponent -->
              <Transition name="shield-block">
                <div
                  v-if="
                    game.currentRoundAnimation?.type === 'shield_block' &&
                    game.currentRoundAnimation?.target === 'opponent'
                  "
                  class="shield-block-effect"
                >
                  <div class="blocking-shield">🛡️</div>
                  <div class="block-sparks">
                    <span v-for="i in 6" :key="i" class="spark">✨</span>
                  </div>
                  <div class="attack-blocked">
                    <div class="attack-value">
                      {{ game.currentRoundAnimation?.amount || 1 }} Angriff
                    </div>
                    <div class="blocked-text">BLOCKIERT!</div>
                  </div>
                  <div class="shield-pulse-ring"></div>
                </div>
              </Transition>
            </div>
          </div>

          <div class="cards-section">
            <div class="hand-row enemy-hand-row">
              <div class="hand">
                <GameCard
                  v-for="(card, i) in game.opponent.hand"
                  :key="card.id"
                  :value="card.value"
                  :hidden="game.opponent.hasHiddenCard && i === 0"
                />
              </div>
              <div
                class="points"
                :class="[
                  pointsClass(opponentVisibleSum),
                  {
                    'points--winner':
                      game.lastRoundWinner === 'opponent' && game.phase === 'round_result',
                    'points--loser':
                      game.lastRoundWinner !== 'opponent' &&
                      game.lastRoundWinner !== 'draw' &&
                      game.phase === 'round_result',
                  },
                ]"
              >
                {{ opponentScoreText }}
              </div>
            </div>
          </div>

          <div class="chips-section">
            <ChipList :chips="game.opponent.chips" owner="opponent" />
          </div>
        </section>

        <!-- Center: Limit, Deck -->
        <section class="center">
          <div
            class="limit"
            :class="{ 'limit--changing': game.currentChipAnimation?.type === 'limit_change' }"
          >
            <span>Limit: {{ limit }}</span>

            <!-- Limit change animation -->
            <Transition name="limit-change">
              <div
                v-if="game.currentChipAnimation?.type === 'limit_change'"
                class="limit-change-effect"
              >
                <div class="limit-sparkles">
                  <span v-for="i in 12" :key="i" class="limit-sparkle">✨</span>
                </div>
                <div class="limit-change-text">
                  {{ game.currentChipAnimation?.data?.oldLimit || 21 }}
                  →
                  {{ game.currentChipAnimation?.data?.newLimit || 21 }}
                </div>
              </div>
            </Transition>
          </div>

          <!-- Attack value indicator when stake is increased -->
          <Transition name="attack-indicator">
            <div
              v-if="hasIncreasedAttack"
              class="attack-indicator"
              :class="{ 'danger-pulse': hasIncreasedAttack }"
            >
              <div
                class="attack-glow"
                :style="{ '--attack-level': game.round.stakeModifier }"
              ></div>
              <div class="attack-content">
                <div class="attack-icon">⚡</div>
                <div class="attack-text">
                  <span class="attack-value">{{ attackValue }}</span>
                  <span class="attack-label">ANGRIFF</span>
                </div>
                <div class="danger-sparks">
                  <span v-for="i in 4" :key="i" class="danger-spark">💥</span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Stake increase animation -->
          <Transition name="stake-increase">
            <div
              v-if="game.currentChipAnimation?.type === 'stake_increase'"
              class="stake-increase-effect"
            >
              <div class="stake-explosion">
                <div class="explosion-rings">
                  <span v-for="i in 4" :key="i" class="explosion-ring"></span>
                </div>
                <div class="lightning-bolts">
                  <span v-for="i in 6" :key="i" class="lightning-bolt">⚡</span>
                </div>
              </div>
              <div class="stake-increase-text">
                Angriff +{{ game.currentChipAnimation?.data?.increase || 1 }}!
              </div>
            </div>
          </Transition>
          <div class="deck-container">
            <div class="deck-visual">
              <!-- Stacked deck cards - show 1-3 based on remaining cards -->
              <div class="deck-stack">
                <img
                  v-if="game.round.deck.length >= 1"
                  src="@/assets/deck.png"
                  alt="Card Deck"
                  class="deck-image deck-card-1"
                />
                <img
                  v-if="game.round.deck.length >= 8"
                  src="@/assets/deck.png"
                  alt="Card Deck"
                  class="deck-image deck-card-2"
                />
                <img
                  v-if="game.round.deck.length >= 15"
                  src="@/assets/deck.png"
                  alt="Card Deck"
                  class="deck-image deck-card-3"
                />
              </div>
              <div class="deck-count">{{ game.round.deck.length }}</div>
              <!-- Card flying animation -->
              <Transition name="card-fly">
                <div
                  v-if="game.currentRoundAnimation?.type === 'card_draw'"
                  class="flying-card-effect"
                >
                  <div
                    class="flying-card"
                    :class="{ 'flying-to-player': game.currentRoundAnimation?.target === 'player' }"
                  >
                    <div class="card-back"></div>
                    <div class="card-front">
                      {{ game.currentRoundAnimation?.data?.value || '?' }}
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- Chip animations overlay -->
              <div class="chip-animations">
                <!-- Card return animation -->
                <Transition name="card-return">
                  <div
                    v-if="game.currentChipAnimation?.type === 'card_return'"
                    class="card-return-effect"
                  >
                    <div
                      class="returning-card"
                      :class="{
                        'return-from-player': game.currentChipAnimation?.data?.player === 'player',
                        'return-from-opponent':
                          game.currentChipAnimation?.data?.player === 'opponent',
                      }"
                    >
                      <div class="card-back"></div>
                      <div class="return-trail"></div>
                    </div>
                  </div>
                </Transition>

                <!-- Cards swap animation -->
                <Transition name="cards-swap">
                  <div
                    v-if="game.currentChipAnimation?.type === 'cards_swap'"
                    class="cards-swap-effect"
                  >
                    <!-- Player card moving to opponent -->
                    <div class="swap-card swap-from-player">
                      <div class="card-front">
                        {{ game.currentChipAnimation?.data?.playerCard?.value || '?' }}
                      </div>
                      <div class="swap-trail-circular player-trail"></div>
                    </div>
                    <!-- Opponent card moving to player -->
                    <div class="swap-card swap-from-opponent">
                      <div class="card-front">
                        {{ game.currentChipAnimation?.data?.opponentCard?.value || '?' }}
                      </div>
                      <div class="swap-trail-circular opponent-trail"></div>
                    </div>
                    <!-- Visual enhancement elements -->
                    <div class="swap-magic-circle"></div>
                    <div class="swap-energy-burst"></div>
                  </div>
                </Transition>

                <!-- Perfect draw animation -->
                <Transition name="perfect-draw">
                  <div
                    v-if="game.currentChipAnimation?.type === 'perfect_draw'"
                    class="perfect-draw-effect"
                  >
                    <div class="perfect-card">
                      <div class="card-front golden">
                        {{ game.currentChipAnimation?.data?.newCard?.value || '?' }}
                      </div>
                      <div class="golden-sparkles">
                        <span v-for="i in 8" :key="i" class="golden-sparkle">✨</span>
                      </div>
                      <div class="perfect-aura"></div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </section>

        <!-- Player Area - Bottom -->
        <section class="player-area player-area-bottom">
          <div class="chips-section">
            <ChipList :chips="game.player.chips" owner="player" @use="game.applyChip" />
          </div>

          <div class="cards-section">
            <div class="hand-row player-hand-row">
              <div class="hand">
                <GameCard
                  v-for="card in game.player.hand"
                  :key="card.id"
                  :value="card.value"
                  :hidden="false"
                />
              </div>
              <div
                class="points"
                :class="[
                  pointsClass(playerSum),
                  {
                    'points--winner':
                      game.lastRoundWinner === 'player' && game.phase === 'round_result',
                    'points--loser':
                      game.lastRoundWinner !== 'player' &&
                      game.lastRoundWinner !== 'draw' &&
                      game.phase === 'round_result',
                  },
                ]"
              >
                {{ playerSum }}/{{ limit }}
              </div>
            </div>
          </div>

          <div class="player-section">
            <div class="actions">
              <button
                type="button"
                class="btn btn-hit"
                :disabled="!game.isPlayerTurn || game.phase !== 'playing' || game.isAnimating"
                @click="game.doHit"
              >
                Karte ziehen
              </button>
              <button
                type="button"
                class="btn btn-skip"
                :disabled="!game.isPlayerTurn || game.phase !== 'playing' || game.isAnimating"
                @click="game.doSkip"
              >
                Skip
              </button>
            </div>
            <div class="lives" :class="{ 'lives--protected': game.round.shieldPlayer > 0 }">
              <span class="lives-hearts">❤️ {{ game.player.lives }}</span>

              <!-- Shield protection animation -->
              <div
                v-if="game.round.shieldPlayer > 0"
                class="shield-border"
                :style="{ '--shield-level': game.round.shieldPlayer }"
              >
                <div class="shield-ring"></div>
                <div class="shield-particles">
                  <span v-for="i in 8" :key="i" class="shield-particle"></span>
                </div>
              </div>

              <!-- Shield activation animation -->
              <Transition name="shield-activate">
                <div
                  v-if="
                    game.currentChipAnimation?.type === 'shield_activate' &&
                    game.currentChipAnimation?.data?.newShield >
                      (game.currentChipAnimation?.data?.oldShield || 0) &&
                    game.currentChipAnimation?.data?.target === 'player'
                  "
                  class="shield-activation-effect"
                >
                  <div class="shield-burst">
                    <span v-for="i in 6" :key="i" class="shield-burst-ring"></span>
                  </div>
                  <div class="shield-level-indicator">
                    +{{
                      (game.currentChipAnimation?.data?.newShield || 1) -
                      (game.currentChipAnimation?.data?.oldShield || 0)
                    }}
                    🛡️
                  </div>
                </div>
              </Transition>

              <!-- Heart attack animation for player -->
              <Transition name="heart-attack">
                <div
                  v-if="
                    game.currentRoundAnimation?.type === 'heart_attack' &&
                    game.currentRoundAnimation?.target === 'player'
                  "
                  class="heart-attack-effect"
                >
                  <div class="hearts-breaking">
                    <span
                      v-for="i in game.currentRoundAnimation?.amount || 1"
                      :key="i"
                      class="breaking-heart"
                      >💔</span
                    >
                  </div>
                  <div class="attack-lightning">⚡</div>
                  <div class="damage-number">-{{ game.currentRoundAnimation?.amount || 1 }}</div>
                  <div
                    v-if="
                      game.currentRoundAnimation?.data?.originalAttack &&
                      game.currentRoundAnimation.data.originalAttack >
                        (game.currentRoundAnimation.amount || 0)
                    "
                    class="attack-value"
                  >
                    {{ game.currentRoundAnimation.data.originalAttack }} Angriff
                  </div>
                </div>
              </Transition>

              <!-- Shield blocking animation for player -->
              <Transition name="shield-block">
                <div
                  v-if="
                    game.currentRoundAnimation?.type === 'shield_block' &&
                    game.currentRoundAnimation?.target === 'player'
                  "
                  class="shield-block-effect"
                >
                  <div class="blocking-shield">🛡️</div>
                  <div class="block-sparks">
                    <span v-for="i in 6" :key="i" class="spark">✨</span>
                  </div>
                  <div class="attack-blocked">
                    <div class="attack-value">
                      {{ game.currentRoundAnimation?.amount || 1 }} Angriff
                    </div>
                    <div class="blocked-text">BLOCKIERT!</div>
                  </div>
                  <div class="shield-pulse-ring"></div>
                </div>
              </Transition>
            </div>
            <h2 class="player-label">{{ playerName }}</h2>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
}

/* Overlay effects that don't affect layout */
.overlay-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.table {
  min-height: 100vh;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-surface {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 4/3;
  background-image: url('@/assets/table.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 24px;
  box-shadow:
    var(--shadow),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  gap: 0.5rem;
  padding: 1rem;
  position: relative;
}

.table-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 24px;
  pointer-events: none;
  transition: all 0.3s ease;
}

/* Danger zone effect when attack is increased */
.table-surface.danger-zone {
  animation: danger-pulse 2s ease-in-out infinite;
}

.table-surface.danger-zone::before {
  background: rgba(220, 38, 38, 0.3);
  animation: danger-glow 2s ease-in-out infinite;
}

@keyframes danger-pulse {
  0%,
  100% {
    box-shadow:
      var(--shadow),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow:
      var(--shadow),
      0 0 40px rgba(220, 38, 38, 0.6),
      0 0 80px rgba(220, 38, 38, 0.4),
      inset 0 0 0 2px rgba(220, 38, 38, 0.8);
  }
}

@keyframes danger-glow {
  0%,
  100% {
    background: rgba(220, 38, 38, 0.1);
  }
  50% {
    background: rgba(220, 38, 38, 0.3);
  }
}

/* Attack value indicator styling */
.attack-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.5rem 0;
  z-index: 5;
}

.attack-glow {
  position: absolute;
  inset: -8px;
  background: radial-gradient(
    circle,
    rgba(239, 68, 68, calc(0.4 + var(--attack-level, 1) * 0.2)) 0%,
    rgba(220, 38, 38, calc(0.2 + var(--attack-level, 1) * 0.1)) 50%,
    transparent 100%
  );
  border-radius: 12px;
  animation: attack-glow-pulse 1.5s ease-in-out infinite;
}

.attack-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(220, 38, 38, 0.9);
  border-radius: 8px;
  border: 2px solid rgba(239, 68, 68, 0.8);
  box-shadow:
    0 0 20px rgba(220, 38, 38, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.attack-icon {
  font-size: 1.8rem;
  animation: lightning-flash 1s ease-in-out infinite;
}

.attack-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.attack-value {
  font-size: 1.4rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
}

.attack-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.1em;
}

.danger-sparks {
  position: absolute;
  inset: -20px;
  pointer-events: none;
}

.danger-spark {
  position: absolute;
  font-size: 1.2rem;
  animation: spark-dance 2s ease-in-out infinite;
}

.danger-spark:nth-child(1) {
  top: -10px;
  left: -10px;
  animation-delay: 0s;
}

.danger-spark:nth-child(2) {
  top: -10px;
  right: -10px;
  animation-delay: 0.5s;
}

.danger-spark:nth-child(3) {
  bottom: -10px;
  left: -10px;
  animation-delay: 1s;
}

.danger-spark:nth-child(4) {
  bottom: -10px;
  right: -10px;
  animation-delay: 1.5s;
}

@keyframes attack-glow-pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes lightning-flash {
  0%,
  90%,
  100% {
    filter: brightness(1);
  }
  45%,
  55% {
    filter: brightness(2) drop-shadow(0 0 8px rgba(255, 255, 0, 0.8));
  }
}

@keyframes spark-dance {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.8) rotate(0deg);
  }
  25% {
    opacity: 1;
    transform: scale(1.2) rotate(90deg);
  }
  50% {
    opacity: 0.6;
    transform: scale(1) rotate(180deg);
  }
  75% {
    opacity: 1;
    transform: scale(1.1) rotate(270deg);
  }
}

.attack-indicator-enter-active {
  animation: attack-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.attack-indicator-leave-active {
  animation: attack-disappear 0.3s ease-in;
}

@keyframes attack-appear {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(-20px);
  }
  60% {
    opacity: 1;
    transform: scale(1.1) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes attack-disappear {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}

.player-area {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 1rem;
  min-height: 200px;
  z-index: 1;
  padding: 1rem;
}

.opponent-area {
  justify-content: flex-start;
}

.player-area-bottom {
  justify-content: flex-end;
}

.player-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
}

.player-section:first-child {
  margin-top: -50px;
}


.cards-section {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 100px;
}

.chips-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80px;
  padding: 0.5rem;
}

.player-label {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 600;
  margin: 0;
}

.lives {
  font-size: 1.2rem;
  position: relative
}

.lives--protected .lives-hearts {
  text-shadow: 0 0 12px rgba(34, 197, 94, 0.8);
  animation: shield-heart-pulse 2s ease-in-out infinite;
}

.hand-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.player-hand-row {
  flex-direction: column;
  margin-top: -65px;
}

.enemy-hand-row {
  flex-direction: column-reverse;
  margin-top: 70px;
}

.hand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  min-height: 80px;
}

.points {
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 3.5rem;
  text-align: center;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.points--ok {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

.points--perfect {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.35);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
}

.points--bust {
  color: #f87171;
  background: rgba(248, 113, 113, 0.2);
}

/* Win/Loss highlight animations */
.points--winner {
  animation: victory-pulse 2s ease-in-out;
  position: relative;
  z-index: 5;
}

.points--loser {
  animation: defeat-shake 1s ease-in-out;
}

.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 2;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  margin: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.limit {
  font-weight: 700;
  color: var(--color-accent);
}

.deck-visual {
  position: relative;
  width: 60px;
  height: 84px;
  background: transparent;
}

.deck-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.deck-image {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: none;
  background: none;
  padding: 0;
  image-rendering: crisp-edges;
  transition: all 0.3s ease;
}

/* Stacked deck cards with depth effect */
.deck-card-1 {
  z-index: 3;
  transform: translateX(0) translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.deck-card-2 {
  z-index: 2;
  transform: translateX(-1px) translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.deck-card-3 {
  z-index: 1;
  transform: translateX(-2px) translateY(-2px);
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.25);
}

.deck-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.4rem;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.deck-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: -20px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.btn:active {
  transform: scale(0.97);
}

.btn-hit {
  background: var(--color-success);
  color: #111;
}

.btn-skip {
  background: var(--color-primary);
  color: var(--color-text);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.7) brightness(0.8);
  transform: none !important;
  transition: all 0.2s ease;
}

/* Chip feedback */
.chip-feedback {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius);
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
  animation: chip-pulse 0.5s ease;
}

.chip-feedback-icon {
  color: var(--color-accent);
  font-size: 1.1rem;
}

.chip-feedback-text {
  font-weight: 700;
  color: var(--color-text);
}

@keyframes chip-pulse {
  0% {
    transform: translateX(-50%) scale(0.9);
    opacity: 0;
  }
  50% {
    transform: translateX(-50%) scale(1.05);
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}

.chip-feedback-enter-active,
.chip-feedback-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.chip-feedback-enter-from,
.chip-feedback-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* Heart attack animation for life loss */
.heart-attack-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
}

.hearts-breaking {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.breaking-heart {
  font-size: 2rem;
  animation: heart-break 2s ease-out forwards;
}

.breaking-heart:nth-child(1) {
  animation-delay: 0s;
}
.breaking-heart:nth-child(2) {
  animation-delay: 0.2s;
}
.breaking-heart:nth-child(3) {
  animation-delay: 0.4s;
}

.attack-lightning {
  font-size: 3rem;
  animation: lightning-strike 0.6s ease-out;
  color: #fbbf24;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
}

.damage-number {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  font-weight: 900;
  color: #ef4444;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
  animation: damage-float 2s ease-out forwards;
}

@keyframes lightning-strike {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-45deg);
  }
  20% {
    opacity: 1;
    transform: scale(1.2) rotate(-15deg);
  }
  40% {
    opacity: 0.8;
    transform: scale(0.9) rotate(10deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.1) rotate(-5deg);
  }
  100% {
    opacity: 0;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes damage-float {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(0) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translateX(-50%) translateY(-20px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-60px) scale(0.8);
  }
}

@keyframes heart-break {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(0deg);
  }
  20% {
    opacity: 1;
    transform: scale(1.3) rotate(-15deg);
  }
  40% {
    transform: scale(1.1) rotate(10deg) translateY(-20px);
  }
  60% {
    transform: scale(0.9) rotate(-5deg) translateY(-40px);
  }
  100% {
    opacity: 0;
    transform: scale(0.6) rotate(0deg) translateY(-80px);
  }
}

.heart-attack-enter-active {
  animation: heart-attack-appear 0.6s ease-out;
}

.heart-attack-leave-active {
  animation: heart-attack-disappear 2s ease-out;
}

@keyframes heart-attack-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes heart-attack-disappear {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Shield blocking animation */
.shield-block-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
}

.blocking-shield {
  font-size: 4rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: shield-block-pulse 0.6s ease-out infinite alternate;
  filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.8));
}

.block-sparks {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spark {
  position: absolute;
  font-size: 1.5rem;
  animation: spark-burst 0.8s ease-out forwards;
}

.spark:nth-child(1) {
  transform: rotate(0deg) translateX(60px);
  animation-delay: 0s;
}
.spark:nth-child(2) {
  transform: rotate(60deg) translateX(60px);
  animation-delay: 0.1s;
}
.spark:nth-child(3) {
  transform: rotate(120deg) translateX(60px);
  animation-delay: 0.2s;
}
.spark:nth-child(4) {
  transform: rotate(180deg) translateX(60px);
  animation-delay: 0.1s;
}
.spark:nth-child(5) {
  transform: rotate(240deg) translateX(60px);
  animation-delay: 0.3s;
}
.spark:nth-child(6) {
  transform: rotate(300deg) translateX(60px);
  animation-delay: 0.05s;
}

.attack-blocked {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  animation: text-impact 0.6s ease-out;
}

.attack-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ef4444;
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
  margin-bottom: 0.25rem;
}

.blocked-text {
  font-size: 1.5rem;
  font-weight: 900;
  color: #22c55e;
  text-shadow: 0 0 12px rgba(34, 197, 94, 0.9);
  animation: blocked-flash 0.8s ease-out;
}

.shield-pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border: 3px solid rgba(34, 197, 94, 0.6);
  border-radius: 50%;
  animation: shield-ring-pulse 1s ease-out;
}

@keyframes shield-block-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

@keyframes spark-burst {
  0% {
    opacity: 1;
    transform: scale(0) translateX(0);
  }
  50% {
    opacity: 1;
    transform: scale(1.2) translateX(40px);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateX(80px);
  }
}

@keyframes text-impact {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes blocked-flash {
  0%,
  100% {
    opacity: 1;
    text-shadow: 0 0 12px rgba(34, 197, 94, 0.9);
  }
  25%,
  75% {
    opacity: 1;
    text-shadow:
      0 0 20px rgba(34, 197, 94, 1),
      0 0 30px rgba(34, 197, 94, 0.8);
  }
  50% {
    opacity: 1;
    text-shadow:
      0 0 25px rgba(34, 197, 94, 1),
      0 0 35px rgba(34, 197, 94, 0.9);
  }
}

@keyframes shield-ring-pulse {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}

.shield-block-enter-active {
  animation: shield-block-appear 0.4s ease-out;
}

.shield-block-leave-active {
  animation: shield-block-disappear 2s ease-out;
}

@keyframes shield-block-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes shield-block-disappear {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Phew animation for draws */
.phew-draw-effect {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  text-align: center;
  pointer-events: none;
}

.phew-emoji {
  font-size: 4rem;
  animation: phew-bounce 1.5s ease-out;
  margin-bottom: 1rem;
}

.phew-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
  animation: phew-text-glow 1.5s ease-out;
  margin-bottom: 1rem;
}

.relief-sparkles {
  position: relative;
}

.sparkle {
  position: absolute;
  font-size: 1.2rem;
  animation: sparkle-burst 1.8s ease-out forwards;
}

.sparkle:nth-child(1) {
  --angle: 0deg;
  animation-delay: 0.1s;
}
.sparkle:nth-child(2) {
  --angle: 30deg;
  animation-delay: 0.2s;
}
.sparkle:nth-child(3) {
  --angle: 60deg;
  animation-delay: 0.3s;
}
.sparkle:nth-child(4) {
  --angle: 90deg;
  animation-delay: 0.1s;
}
.sparkle:nth-child(5) {
  --angle: 120deg;
  animation-delay: 0.2s;
}
.sparkle:nth-child(6) {
  --angle: 150deg;
  animation-delay: 0.3s;
}
.sparkle:nth-child(7) {
  --angle: 180deg;
  animation-delay: 0.1s;
}
.sparkle:nth-child(8) {
  --angle: 210deg;
  animation-delay: 0.2s;
}
.sparkle:nth-child(9) {
  --angle: 240deg;
  animation-delay: 0.3s;
}
.sparkle:nth-child(10) {
  --angle: 270deg;
  animation-delay: 0.1s;
}
.sparkle:nth-child(11) {
  --angle: 300deg;
  animation-delay: 0.2s;
}
.sparkle:nth-child(12) {
  --angle: 330deg;
  animation-delay: 0.3s;
}

@keyframes phew-bounce {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(50px);
  }
  40% {
    opacity: 1;
    transform: scale(1.1) translateY(-10px);
  }
  60% {
    transform: scale(0.95) translateY(5px);
  }
  80% {
    transform: scale(1.05) translateY(-2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes phew-text-glow {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  50% {
    opacity: 1;
    transform: translateY(-5px);
    text-shadow: 0 0 15px rgba(16, 185, 129, 0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    text-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
  }
}

@keyframes sparkle-burst {
  0% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(0) scale(0);
  }
  30% {
    opacity: 1;
    transform: rotate(var(--angle)) translateX(60px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(100px) scale(0.3);
  }
}

.phew-draw-enter-active {
  animation: phew-appear 0.6s ease-out;
}

.phew-draw-leave-active {
  animation: phew-disappear 0.4s ease-in;
}

@keyframes phew-appear {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes phew-disappear {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
}

/* Victory animation - pulsing glow with particles */
@keyframes victory-pulse {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  20% {
    transform: scale(1.15);
    filter: brightness(1.5);
    box-shadow:
      0 0 20px rgba(34, 197, 94, 0.8),
      0 0 40px rgba(34, 197, 94, 0.6),
      0 0 60px rgba(34, 197, 94, 0.4);
  }
  40% {
    transform: scale(1.08);
    filter: brightness(1.3);
  }
  60% {
    transform: scale(1.12);
    filter: brightness(1.4);
  }
  100% {
    transform: scale(1);
    filter: brightness(1.2);
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
  }
}

/* Defeat animation - subtle shake */
@keyframes defeat-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-2px);
    filter: brightness(0.8);
  }
  40% {
    transform: translateX(2px);
    filter: brightness(0.6);
  }
  60% {
    transform: translateX(-1px);
    filter: brightness(0.8);
  }
  80% {
    transform: translateX(1px);
    filter: brightness(0.9);
  }
}

/* Flying card animation */
.flying-card-effect {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.flying-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 56px;
  transform: translate(-50%, -50%);
  transform-style: preserve-3d;
  animation: card-fly-to-opponent 1.2s ease-out forwards;
}

.flying-card.flying-to-player {
  animation: card-fly-to-player 1.2s ease-out forwards;
}

.card-back,
.card-front {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  backface-visibility: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.card-back {
  background: linear-gradient(45deg, #374151, #4b5563);
  border: 2px solid #6b7280;
}

.card-front {
  background: white;
  color: #111;
  border: 2px solid #d1d5db;
  transform: rotateY(180deg);
}

@keyframes card-fly-to-opponent {
  0% {
    transform: translate(-50%, -50%) scale(0.8) rotateY(0deg) rotateZ(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(-30%, -120px) scale(0.9) rotateY(45deg) rotateZ(-10deg);
    opacity: 1;
  }
  50% {
    transform: translate(-10%, -180px) scale(0.9) rotateY(90deg) rotateZ(-20deg);
    opacity: 1;
  }
  75% {
    transform: translate(10%, -220px) scale(0.8) rotateY(135deg) rotateZ(-15deg);
    opacity: 1;
  }
  100% {
    transform: translate(30%, -280px) scale(0.7) rotateY(180deg) rotateZ(0deg);
    opacity: 0;
  }
}

@keyframes card-fly-to-player {
  0% {
    transform: translate(-50%, -50%) scale(0.8) rotateY(0deg) rotateZ(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(-30%, 120px) scale(0.9) rotateY(-45deg) rotateZ(10deg);
    opacity: 1;
  }
  50% {
    transform: translate(-10%, 180px) scale(0.9) rotateY(-90deg) rotateZ(20deg);
    opacity: 1;
  }
  75% {
    transform: translate(10%, 220px) scale(0.8) rotateY(-135deg) rotateZ(15deg);
    opacity: 1;
  }
  100% {
    transform: translate(30%, 280px) scale(0.7) rotateY(-180deg) rotateZ(0deg);
    opacity: 0;
  }
}

.card-fly-enter-active {
  animation: card-appear 0.3s ease-out;
}

.card-fly-leave-active {
  animation: card-disappear 0.3s ease-in;
}

@keyframes card-appear {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes card-disappear {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Shield Protection Animation */
.shield-border {
  position: absolute;
  inset: -8px;
  pointer-events: none;
  z-index: 1;
}

.shield-ring {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(34, 197, 94, calc(0.6 + var(--shield-level, 1) * 0.2));
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(34, 197, 94, calc(0.1 + var(--shield-level, 1) * 0.05)) 0%,
    transparent 70%
  );
  animation: shield-rotate calc(3s - var(--shield-level, 1) * 0.5s) linear infinite;
  box-shadow:
    0 0 15px rgba(34, 197, 94, calc(0.4 + var(--shield-level, 1) * 0.2)),
    inset 0 0 10px rgba(34, 197, 94, calc(0.2 + var(--shield-level, 1) * 0.1));
}

.shield-ring::before {
  content: '';
  position: absolute;
  top: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: rgba(34, 197, 94, 0.9);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
  animation: shield-marker-pulse 1s ease-in-out infinite alternate;
}

@keyframes shield-rotate {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: rotate(180deg) scale(1.05);
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 0.8;
  }
}

@keyframes shield-marker-pulse {
  0% {
    transform: translateX(-50%) scale(1);
    opacity: 0.7;
  }
  100% {
    transform: translateX(-50%) scale(1.3);
    opacity: 1;
    box-shadow: 0 0 12px rgba(34, 197, 94, 1);
  }
}

@keyframes shield-particle-orbit {
  0% {
    transform: rotate(0deg) translateX(var(--orbit-radius, 25px)) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) translateX(var(--orbit-radius, 25px)) rotate(-360deg);
    opacity: 0;
  }
}

@keyframes shield-heart-pulse {
  0%,
  100% {
    transform: scale(1);
    text-shadow: 0 0 12px rgba(34, 197, 94, 0.8);
  }
  50% {
    transform: scale(1.05);
    text-shadow: 0 0 18px rgba(34, 197, 94, 1);
  }
}

/* Shield intensity variations */
.shield-border[style*='--shield-level: 1'] .shield-ring {
  border-color: rgba(34, 197, 94, 0.8);
  animation-duration: 2.5s;
}

.shield-border[style*='--shield-level: 2'] .shield-ring {
  border-color: rgba(34, 197, 94, 1);
  animation-duration: 2s;
  border-width: 4px;
}

.shield-border[style*='--shield-level: 3'] .shield-ring {
  border-color: rgba(34, 197, 94, 1);
  animation-duration: 1.5s;
  border-width: 5px;
  box-shadow:
    0 0 20px rgba(34, 197, 94, 0.8),
    inset 0 0 15px rgba(34, 197, 94, 0.4);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .table {
    padding: 0.5rem;
  }

  .table-surface {
    padding: 0.75rem;
    gap: 0.25rem;
  }

  .player-area {
    grid-template-columns: 80px 1fr 80px;
    gap: 0.5rem;
    min-height: 150px;
    padding: 0.5rem;
  }

  .center {
    padding: 1rem;
    margin: 0.5rem;
  }

  .player-section {
    min-width: 80px;
  }

  .chips-section {
    min-height: 60px;
    padding: 0.25rem;
  }

  .hand {
    min-height: 60px;
  }

  .actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .deck-visual {
    width: 50px;
    height: 70px;
  }
}

/* ===== CHIP ANIMATIONS ===== */

/* Chip animations container */
.chip-animations {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}

/* Card Return Animation */
.card-return-effect {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.returning-card {
  position: absolute;
  width: 40px;
  height: 56px;
  transform-style: preserve-3d;
  z-index: 2;
}

.returning-card.return-from-player {
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  animation: card-return-from-player 1s ease-out forwards;
}

.returning-card.return-from-opponent {
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  animation: card-return-from-opponent 1s ease-out forwards;
}

.return-trail {
  position: absolute;
  width: 3px;
  height: 80px;
  background: linear-gradient(
    to bottom,
    rgba(147, 51, 234, 0.8) 0%,
    rgba(147, 51, 234, 0.4) 50%,
    transparent 100%
  );
  left: 50%;
  transform: translateX(-50%);
  animation: trail-fade 1s ease-out forwards;
}

@keyframes card-return-from-player {
  0% {
    bottom: 20%;
    opacity: 1;
    transform: translateX(-50%) rotateY(0deg) scale(1);
  }
  50% {
    bottom: 60%;
    opacity: 0.8;
    transform: translateX(-50%) rotateY(90deg) scale(0.7);
  }
  100% {
    bottom: 80%;
    opacity: 0;
    transform: translateX(-50%) rotateY(180deg) scale(0.4);
  }
}

@keyframes card-return-from-opponent {
  0% {
    top: 20%;
    opacity: 1;
    transform: translateX(-50%) rotateY(0deg) scale(1);
  }
  50% {
    top: 60%;
    opacity: 0.8;
    transform: translateX(-50%) rotateY(-90deg) scale(0.7);
  }
  100% {
    top: 80%;
    opacity: 0;
    transform: translateX(-50%) rotateY(-180deg) scale(0.4);
  }
}

@keyframes trail-fade {
  0% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
  }
}

.card-return-enter-active,
.card-return-leave-active {
  transition: opacity 0.2s ease;
}

.card-return-enter-from,
.card-return-leave-to {
  opacity: 0;
}

/* Cards Swap Animation */
.cards-swap-effect {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.swap-card {
  position: absolute;
  width: 40px;
  height: 56px;
  z-index: 3;
}

.swap-card .card-front {
  position: absolute;
  width: 100%;
  height: 100%;
  background: white;
  color: #111;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.swap-from-player {
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  animation: swap-card-circular-up 2.5s ease-in-out forwards;
}

.swap-from-opponent {
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  animation: swap-card-circular-down 2.5s ease-in-out forwards;
}

.swap-trail-circular {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(147, 51, 234, 0.9) 0%,
    rgba(147, 51, 234, 0.6) 60%,
    transparent 100%
  );
  box-shadow: 0 0 12px rgba(147, 51, 234, 0.8);
  z-index: 2;
}

.player-trail {
  animation: trail-circular-up 2.5s ease-in-out forwards;
}

.opponent-trail {
  animation: trail-circular-down 2.5s ease-in-out forwards;
}

.swap-magic-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150px;
  height: 150px;
  transform: translate(-50%, -50%);
  border: 3px solid rgba(147, 51, 234, 0.7);
  border-radius: 50%;
  z-index: 1;
  animation: magic-circle-pulse 2.5s ease-in-out forwards;
}

.swap-energy-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(
    circle,
    rgba(147, 51, 234, 0.8) 0%,
    rgba(147, 51, 234, 0.4) 40%,
    transparent 70%
  );
  border-radius: 50%;
  z-index: 3;
  animation: energy-burst-pulse 2.5s ease-in-out forwards;
}

/* Player card moving in clockwise circle to opponent position */
@keyframes swap-card-circular-up {
  0% {
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%) rotate(0deg) scale(1);
    opacity: 1;
  }
  20% {
    bottom: 35%;
    left: 70%;
    transform: translateX(-50%) rotate(72deg) scale(1.1);
    opacity: 0.95;
  }
  40% {
    bottom: 50%;
    left: 70%;
    transform: translateX(-50%) rotate(144deg) scale(1.15);
    opacity: 0.9;
  }
  60% {
    bottom: 65%;
    left: 50%;
    transform: translateX(-50%) rotate(216deg) scale(1.15);
    opacity: 0.9;
  }
  80% {
    bottom: 80%;
    left: 30%;
    transform: translateX(-50%) rotate(288deg) scale(1.1);
    opacity: 0.95;
  }
  100% {
    top: 20%;
    left: 50%;
    transform: translateX(-50%) rotate(360deg) scale(1);
    opacity: 0;
  }
}

/* Opponent card moving in counter-clockwise circle to player position */
@keyframes swap-card-circular-down {
  0% {
    top: 20%;
    left: 50%;
    transform: translateX(-50%) rotate(0deg) scale(1);
    opacity: 1;
  }
  20% {
    top: 35%;
    left: 30%;
    transform: translateX(-50%) rotate(-72deg) scale(1.1);
    opacity: 0.95;
  }
  40% {
    top: 50%;
    left: 30%;
    transform: translateX(-50%) rotate(-144deg) scale(1.15);
    opacity: 0.9;
  }
  60% {
    top: 65%;
    left: 50%;
    transform: translateX(-50%) rotate(-216deg) scale(1.15);
    opacity: 0.9;
  }
  80% {
    top: 80%;
    left: 70%;
    transform: translateX(-50%) rotate(-288deg) scale(1.1);
    opacity: 0.95;
  }
  100% {
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%) rotate(-360deg) scale(1);
    opacity: 0;
  }
}

/* Trailing particle effects following the cards */
@keyframes trail-circular-up {
  0% {
    bottom: 18%;
    left: 48%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  20% {
    bottom: 33%;
    left: 68%;
    opacity: 0.8;
  }
  40% {
    bottom: 48%;
    left: 68%;
    opacity: 0.7;
  }
  60% {
    bottom: 63%;
    left: 48%;
    opacity: 0.6;
  }
  80% {
    bottom: 78%;
    left: 28%;
    opacity: 0.4;
  }
  100% {
    top: 22%;
    left: 48%;
    opacity: 0;
  }
}

@keyframes trail-circular-down {
  0% {
    top: 18%;
    left: 48%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  20% {
    top: 33%;
    left: 28%;
    opacity: 0.8;
  }
  40% {
    top: 48%;
    left: 28%;
    opacity: 0.7;
  }
  60% {
    top: 63%;
    left: 48%;
    opacity: 0.6;
  }
  80% {
    top: 78%;
    left: 68%;
    opacity: 0.4;
  }
  100% {
    bottom: 22%;
    left: 48%;
    opacity: 0;
  }
}

/* Magic circle rotating effect */
@keyframes magic-circle-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
    opacity: 0;
    border-color: rgba(147, 51, 234, 0.9);
  }
  25% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.8) rotate(90deg);
    border-color: rgba(147, 51, 234, 0.7);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
    border-color: rgba(147, 51, 234, 0.6);
  }
  75% {
    transform: translate(-50%, -50%) scale(1.1) rotate(270deg);
    border-color: rgba(147, 51, 234, 0.5);
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4) rotate(360deg);
    opacity: 0;
    border-color: rgba(147, 51, 234, 0.3);
  }
}

/* Enhanced energy burst */
@keyframes energy-burst-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.9;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0.7;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.2);
    opacity: 0;
  }
}

.cards-swap-enter-active,
.cards-swap-leave-active {
  transition: opacity 0.3s ease;
}

.cards-swap-enter-from,
.cards-swap-leave-to {
  opacity: 0;
}

/* Perfect Draw Animation */
.perfect-draw-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
}

.perfect-card {
  position: relative;
  width: 50px;
  height: 70px;
  animation: perfect-card-emerge 1.2s ease-out forwards;
}

.perfect-card .card-front.golden {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #111;
  border: 3px solid #fbbf24;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.2rem;
  box-shadow:
    0 0 20px rgba(251, 191, 36, 0.8),
    0 4px 12px rgba(0, 0, 0, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.golden-sparkles {
  position: absolute;
  inset: -20px;
}

.golden-sparkle {
  position: absolute;
  font-size: 1.5rem;
  color: #fbbf24;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.8));
  animation: golden-sparkle-dance 1.8s ease-out forwards;
}

.golden-sparkle:nth-child(1) {
  --sparkle-angle: 0deg;
  animation-delay: 0.1s;
}
.golden-sparkle:nth-child(2) {
  --sparkle-angle: 45deg;
  animation-delay: 0.2s;
}
.golden-sparkle:nth-child(3) {
  --sparkle-angle: 90deg;
  animation-delay: 0.3s;
}
.golden-sparkle:nth-child(4) {
  --sparkle-angle: 135deg;
  animation-delay: 0.1s;
}
.golden-sparkle:nth-child(5) {
  --sparkle-angle: 180deg;
  animation-delay: 0.2s;
}
.golden-sparkle:nth-child(6) {
  --sparkle-angle: 225deg;
  animation-delay: 0.3s;
}
.golden-sparkle:nth-child(7) {
  --sparkle-angle: 270deg;
  animation-delay: 0.1s;
}
.golden-sparkle:nth-child(8) {
  --sparkle-angle: 315deg;
  animation-delay: 0.2s;
}

.perfect-aura {
  position: absolute;
  inset: -15px;
  background: radial-gradient(
    circle,
    rgba(251, 191, 36, 0.4) 0%,
    rgba(251, 191, 36, 0.2) 40%,
    transparent 70%
  );
  border-radius: 50%;
  animation: perfect-aura-pulse 1.2s ease-out infinite alternate;
}

@keyframes perfect-card-emerge {
  0% {
    opacity: 0;
    transform: scale(0.3) rotateY(-180deg);
  }
  30% {
    opacity: 0.8;
    transform: scale(1.2) rotateY(-90deg);
  }
  60% {
    opacity: 1;
    transform: scale(0.9) rotateY(0deg);
  }
  80% {
    opacity: 1;
    transform: scale(1.1) rotateY(0deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotateY(0deg);
  }
}

@keyframes golden-sparkle-dance {
  0% {
    opacity: 0;
    transform: rotate(var(--sparkle-angle)) translateX(0) scale(0);
  }
  30% {
    opacity: 1;
    transform: rotate(var(--sparkle-angle)) translateX(40px) scale(1.3);
  }
  60% {
    opacity: 0.8;
    transform: rotate(var(--sparkle-angle)) translateX(60px) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--sparkle-angle)) translateX(80px) scale(0.3);
  }
}

@keyframes perfect-aura-pulse {
  0% {
    opacity: 0.4;
    transform: scale(1);
  }
  100% {
    opacity: 0.8;
    transform: scale(1.2);
  }
}

.perfect-draw-enter-active,
.perfect-draw-leave-active {
  transition: opacity 0.3s ease;
}

.perfect-draw-enter-from,
.perfect-draw-leave-to {
  opacity: 0;
}

/* Limit Change Animation */
.limit--changing {
  position: relative;
  animation: limit-pulse 0.8s ease-out;
}

.limit-change-effect {
  position: absolute;
  inset: -30px;
  pointer-events: none;
  z-index: 2;
}

.limit-sparkles {
  position: absolute;
  inset: 0;
}

.limit-sparkle {
  position: absolute;
  font-size: 1.2rem;
  color: #e94560;
  filter: drop-shadow(0 0 6px rgba(233, 69, 96, 0.8));
  animation: limit-sparkle-burst 1.5s ease-out forwards;
}

.limit-sparkle:nth-child(1) {
  --limit-angle: 0deg;
  animation-delay: 0s;
}
.limit-sparkle:nth-child(2) {
  --limit-angle: 30deg;
  animation-delay: 0.1s;
}
.limit-sparkle:nth-child(3) {
  --limit-angle: 60deg;
  animation-delay: 0.2s;
}
.limit-sparkle:nth-child(4) {
  --limit-angle: 90deg;
  animation-delay: 0s;
}
.limit-sparkle:nth-child(5) {
  --limit-angle: 120deg;
  animation-delay: 0.1s;
}
.limit-sparkle:nth-child(6) {
  --limit-angle: 150deg;
  animation-delay: 0.2s;
}
.limit-sparkle:nth-child(7) {
  --limit-angle: 180deg;
  animation-delay: 0s;
}
.limit-sparkle:nth-child(8) {
  --limit-angle: 210deg;
  animation-delay: 0.1s;
}
.limit-sparkle:nth-child(9) {
  --limit-angle: 240deg;
  animation-delay: 0.2s;
}
.limit-sparkle:nth-child(10) {
  --limit-angle: 270deg;
  animation-delay: 0s;
}
.limit-sparkle:nth-child(11) {
  --limit-angle: 300deg;
  animation-delay: 0.1s;
}
.limit-sparkle:nth-child(12) {
  --limit-angle: 330deg;
  animation-delay: 0.2s;
}

.limit-change-text {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(233, 69, 96, 0.9);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 0 15px rgba(233, 69, 96, 0.6);
  animation: limit-text-appear 0.8s ease-out forwards;
  white-space: nowrap;
}

@keyframes limit-pulse {
  0% {
    transform: scale(1);
    color: var(--color-accent);
  }
  30% {
    transform: scale(1.2);
    color: #e94560;
    text-shadow: 0 0 10px rgba(233, 69, 96, 0.8);
  }
  60% {
    transform: scale(1.1);
    color: #e94560;
  }
  100% {
    transform: scale(1);
    color: var(--color-accent);
  }
}

@keyframes limit-sparkle-burst {
  0% {
    opacity: 0;
    transform: rotate(var(--limit-angle)) translateX(0) scale(0);
  }
  40% {
    opacity: 1;
    transform: rotate(var(--limit-angle)) translateX(50px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--limit-angle)) translateX(80px) scale(0.3);
  }
}

@keyframes limit-text-appear {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.limit-change-enter-active,
.limit-change-leave-active {
  transition: opacity 0.2s ease;
}

.limit-change-enter-from,
.limit-change-leave-to {
  opacity: 0;
}

/* Shield Activation Animation */
.shield-activation-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
}

.shield-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.shield-burst-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 3px solid rgba(34, 197, 94, 0.8);
  border-radius: 50%;
  animation: shield-ring-expand 1s ease-out forwards;
}

.shield-burst-ring:nth-child(1) {
  animation-delay: 0s;
}
.shield-burst-ring:nth-child(2) {
  animation-delay: 0.1s;
}
.shield-burst-ring:nth-child(3) {
  animation-delay: 0.2s;
}
.shield-burst-ring:nth-child(4) {
  animation-delay: 0.3s;
}
.shield-burst-ring:nth-child(5) {
  animation-delay: 0.4s;
}
.shield-burst-ring:nth-child(6) {
  animation-delay: 0.5s;
}

.shield-level-indicator {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(34, 197, 94, 0.9);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.6);
  animation: shield-level-pop 1s ease-out forwards;
  white-space: nowrap;
}

@keyframes shield-ring-expand {
  0% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(0.5);
    border-color: rgba(34, 197, 94, 0.9);
    border-width: 4px;
  }
  50% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1.5);
    border-color: rgba(34, 197, 94, 0.6);
    border-width: 2px;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.5);
    border-color: rgba(34, 197, 94, 0.2);
    border-width: 1px;
  }
}

@keyframes shield-level-pop {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.5);
  }
  30% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.3);
  }
  60% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(0.9);
  }
  80% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

.shield-activate-enter-active,
.shield-activate-leave-active {
  transition: opacity 0.3s ease;
}

.shield-activate-enter-from,
.shield-activate-leave-to {
  opacity: 0;
}

/* Stake Increase Animation - Enhanced table danger effects */
.table-surface.danger-zone .center {
  position: relative;
}

.table-surface.danger-zone .center::before {
  content: '';
  position: absolute;
  inset: -10px;
  background: radial-gradient(
    circle,
    rgba(220, 38, 38, 0.3) 0%,
    rgba(220, 38, 38, 0.1) 50%,
    transparent 70%
  );
  border-radius: 20px;
  animation: stake-aura-pulse 2s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

.table-surface.danger-zone .deck-visual {
  position: relative;
  animation: deck-danger-glow 3s ease-in-out infinite;
}

.table-surface.danger-zone .deck-visual::after {
  content: '';
  position: absolute;
  inset: -5px;
  background: rgba(220, 38, 38, 0.4);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.6);
  animation: danger-glow-pulse 2s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes stake-aura-pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes deck-danger-glow {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2) saturate(1.3);
  }
}

@keyframes danger-glow-pulse {
  0%,
  100% {
    opacity: 0.3;
    box-shadow: 0 0 15px rgba(220, 38, 38, 0.4);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 25px rgba(220, 38, 38, 0.8);
  }
}

/* Stake Increase Explosion Animation */
.stake-increase-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  pointer-events: none;
}

.stake-explosion {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.explosion-rings {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.explosion-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border: 4px solid rgba(239, 68, 68, 0.9);
  border-radius: 50%;
  animation: explosion-ring-burst 1s ease-out forwards;
}

.explosion-ring:nth-child(1) {
  animation-delay: 0s;
}
.explosion-ring:nth-child(2) {
  animation-delay: 0.1s;
}
.explosion-ring:nth-child(3) {
  animation-delay: 0.2s;
}
.explosion-ring:nth-child(4) {
  animation-delay: 0.3s;
}

.lightning-bolts {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.lightning-bolt {
  position: absolute;
  font-size: 2rem;
  color: #fbbf24;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9));
  animation: lightning-blast 1.2s ease-out forwards;
}

.lightning-bolt:nth-child(1) {
  --blast-angle: 0deg;
  animation-delay: 0.1s;
}
.lightning-bolt:nth-child(2) {
  --blast-angle: 60deg;
  animation-delay: 0.2s;
}
.lightning-bolt:nth-child(3) {
  --blast-angle: 120deg;
  animation-delay: 0.3s;
}
.lightning-bolt:nth-child(4) {
  --blast-angle: 180deg;
  animation-delay: 0.1s;
}
.lightning-bolt:nth-child(5) {
  --blast-angle: 240deg;
  animation-delay: 0.2s;
}
.lightning-bolt:nth-child(6) {
  --blast-angle: 300deg;
  animation-delay: 0.3s;
}

.stake-increase-text {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.95);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 900;
  text-align: center;
  box-shadow:
    0 0 20px rgba(239, 68, 68, 0.8),
    0 4px 12px rgba(0, 0, 0, 0.3);
  animation: stake-text-explosive 1s ease-out forwards;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

@keyframes explosion-ring-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.2);
    border-color: rgba(239, 68, 68, 1);
    border-width: 6px;
  }
  50% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(1.8);
    border-color: rgba(239, 68, 68, 0.7);
    border-width: 3px;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(3.5);
    border-color: rgba(239, 68, 68, 0.2);
    border-width: 1px;
  }
}

@keyframes lightning-blast {
  0% {
    opacity: 0;
    transform: rotate(var(--blast-angle)) translateX(0) scale(0.3);
    filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
  }
  30% {
    opacity: 1;
    transform: rotate(var(--blast-angle)) translateX(40px) scale(1.5);
    filter: drop-shadow(0 0 12px rgba(251, 191, 36, 1));
  }
  60% {
    opacity: 0.8;
    transform: rotate(var(--blast-angle)) translateX(70px) scale(1.2);
    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8));
  }
  100% {
    opacity: 0;
    transform: rotate(var(--blast-angle)) translateX(100px) scale(0.6);
    filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.3));
  }
}

@keyframes stake-text-explosive {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.3) rotateZ(-10deg);
  }
  20% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.4) rotateZ(5deg);
  }
  40% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(0.8) rotateZ(-2deg);
  }
  60% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.2) rotateZ(1deg);
  }
  80% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(0.9) rotateZ(0deg);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1) rotateZ(0deg);
  }
}

.stake-increase-enter-active,
.stake-increase-leave-active {
  transition: opacity 0.3s ease;
}

.stake-increase-enter-from,
.stake-increase-leave-to {
  opacity: 0;
}
</style>
