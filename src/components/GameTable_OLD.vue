<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import GameCard from '@/components/GameCard.vue'
import ChipList from '@/components/ChipList.vue'

const game = useGameStore()

const playerSum = computed(() =>
  game.player.hand.reduce((s, c) => s + c.value, 0)
)
const opponentSum = computed(() =>
  game.opponent.hand.reduce((s, c) => s + c.value, 0)
)
const limit = computed(() => game.round.limit)

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
        <div 
          v-if="game.currentRoundAnimation?.type === 'phew_draw'" 
          class="phew-draw-effect"
        >
          <div class="phew-emoji">😅</div>
          <div class="phew-text">Unentschieden!</div>
          <div class="relief-sparkles">
            <span v-for="i in 12" :key="i" class="sparkle">✨</span>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Main game table with stable grid layout -->
    <div class="table-surface">
      <!-- Opponent Area - Top -->
      <div class="grid-area opponent-zone">
        <!-- Fixed opponent info area -->
        <!-- Stake/Attack indicator -->
        <div v-if="game.round.stakeModifier > 0" class="stake-indicator">
          <div class="stake-glow" :style="{ '--stake-level': game.round.stakeModifier }"></div>
          <span class="stake-value">⚡{{ game.round.stakeModifier + 1 }} Leben</span>
        </div>
        <!-- Stake increase animation -->
        <Transition name="stake-increase">
          <div 
            v-if="game.currentChipAnimation?.type === 'stake_increase'" 
            class="stake-activation-effect"
          >
            <div class="stake-wave"></div>
            <div class="stake-lightning">
              <span v-for="i in 4" :key="i" class="lightning-bolt"></span>
            </div>
          </div>
        </Transition>
        <h2 class="player-label">Gegner</h2>
        <div 
          class="lives"
          :class="{
            'lives--protected': game.round.shieldOpponent > 0
          }"
        >
          <span class="lives-hearts">❤️ {{ game.opponent.lives }}</span>
          <!-- Heart attack animation for opponent -->
          <Transition name="heart-attack">
            <div 
              v-if="game.currentRoundAnimation?.type === 'heart_attack' && game.currentRoundAnimation?.target === 'opponent'" 
              class="heart-attack-effect"
            >
              <div class="hearts-breaking">
                <span v-for="i in (game.currentRoundAnimation?.amount || 1)" :key="i" class="breaking-heart">💔</span>
              </div>
              <div class="attack-lightning">⚡</div>
              <div class="damage-number">-{{ game.currentRoundAnimation?.amount || 1 }}</div>
            </div>
          </Transition>
          <!-- Shield protection indicator -->
          <div v-if="game.round.shieldOpponent > 0" class="shield-indicator">
            <div class="shield-glow" :style="{ '--shield-level': game.round.shieldOpponent }"></div>
            <span class="shield-value">🛡️{{ game.round.shieldOpponent }}</span>
          </div>
          <!-- Shield activation animation -->
          <Transition name="shield-activate">
            <div 
              v-if="game.currentChipAnimation?.type === 'shield_activate'" 
              class="shield-activation-effect"
            >
              <div class="shield-wave"></div>
              <div class="shield-particles">
                <span v-for="i in 8" :key="i" class="particle"></span>
              </div>
            </div>
          </Transition>
        </div>
        <div class="hand-row">
          <div class="hand">
            <GameCard
              v-for="(card, i) in game.opponent.hand"
              :key="card.id"
              :value="card.value"
              :hidden="game.opponent.hasHiddenCard && i === 0"
            />
          </div>
          <div
            v-if="!game.opponent.hasHiddenCard"
            class="points"
            :class="[
              pointsClass(opponentSum),
              {
                'points--winner': game.lastRoundWinner === 'opponent' && game.phase === 'round_result',
                'points--loser': game.lastRoundWinner !== 'opponent' && game.lastRoundWinner !== 'draw' && game.phase === 'round_result'
              }
            ]"
          >
            {{ opponentSum }}/{{ limit }}
          </div>
        </div>
        <ChipList :chips="game.opponent.chips" owner="opponent" />
      </section>

      <!-- Mitte: Limit, Deck -->
      <section class="center">
        <div 
          class="limit"
          :class="{
            'limit--animating': game.currentChipAnimation?.type === 'limit_change'
          }"
        >
          <span>Limit: {{ limit }}</span>
          <!-- Limit change animation -->
          <Transition name="limit-change">
            <div 
              v-if="game.currentChipAnimation?.type === 'limit_change'" 
              class="limit-change-effect"
            >
              <div class="limit-pulse">{{ game.currentChipAnimation.data.newLimit }}</div>
              <div class="limit-sparkles">
                <span v-for="i in 6" :key="i" class="sparkle"></span>
              </div>
            </div>
          </Transition>
        </div>
        <div class="deck">
          <span>Deck ({{ game.round.deck.length }})</span>
          <!-- Card draw animation -->
          <Transition name="card-draw">
            <div 
              v-if="game.currentChipAnimation?.type === 'card_draw' || game.currentChipAnimation?.type === 'perfect_draw'" 
              class="card-draw-effect"
            >
              <div class="flying-card">
                <span class="card-value">{{ game.currentChipAnimation.data.value || game.currentChipAnimation.data.newCard?.value }}</span>
                <div v-if="game.currentChipAnimation?.type === 'perfect_draw'" class="perfect-sparkles">
                  <span v-for="i in 4" :key="i" class="perfect-sparkle"></span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </section>

      <!-- Du: deine Karten siehst du immer (keine verdeckte erste Karte) -->
      <section class="player-area player-area-bottom">
        <h2 class="player-label">Du</h2>
        <div 
          class="lives"
          :class="{
            'lives--protected': game.round.shieldPlayer > 0
          }"
        >
          <span class="lives-hearts">❤️ {{ game.player.lives }}</span>
          <!-- Heart attack animation for player -->
          <Transition name="heart-attack">
            <div 
              v-if="game.currentRoundAnimation?.type === 'heart_attack' && game.currentRoundAnimation?.target === 'player'" 
              class="heart-attack-effect"
            >
              <div class="hearts-breaking">
                <span v-for="i in (game.currentRoundAnimation?.amount || 1)" :key="i" class="breaking-heart">💔</span>
              </div>
              <div class="attack-lightning">⚡</div>
              <div class="damage-number">-{{ game.currentRoundAnimation?.amount || 1 }}</div>
            </div>
          </Transition>
          <!-- Shield protection indicator -->
          <div v-if="game.round.shieldPlayer > 0" class="shield-indicator">
            <div class="shield-glow" :style="{ '--shield-level': game.round.shieldPlayer }"></div>
            <span class="shield-value">🛡️{{ game.round.shieldPlayer }}</span>
          </div>
          <!-- Shield activation animation -->
          <Transition name="shield-activate">
            <div 
              v-if="game.currentChipAnimation?.type === 'shield_activate'" 
              class="shield-activation-effect"
            >
              <div class="shield-wave"></div>
              <div class="shield-particles">
                <span v-for="i in 8" :key="i" class="particle"></span>
              </div>
            </div>
          </Transition>
        </div>
        <div class="hand-row">
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
                'points--winner': game.lastRoundWinner === 'player' && game.phase === 'round_result',
                'points--loser': game.lastRoundWinner !== 'player' && game.lastRoundWinner !== 'draw' && game.phase === 'round_result'
              }
            ]"
          >
            {{ playerSum }}/{{ limit }}
          </div>
        </div>
        <ChipList :chips="game.player.chips" owner="player" @use="game.applyChip" />
        <div class="actions">
          <button 
            type="button" 
            class="btn btn-hit" 
            :disabled="!game.isPlayerTurn || game.phase !== 'playing' || game.isAnimating"
            :class="{
              'btn--disabled': !game.isPlayerTurn || game.phase !== 'playing' || game.isAnimating
            }"
            @click="game.doHit"
          >
            Karte ziehen
          </button>
          <button 
            type="button" 
            class="btn btn-skip" 
            :disabled="!game.isPlayerTurn || game.phase !== 'playing' || game.isAnimating"
            :class="{
              'btn--disabled': !game.isPlayerTurn || game.phase !== 'playing' || game.isAnimating
            }"
            @click="game.doSkip"
          >
            Skip
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
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
  box-shadow: var(--shadow), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
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
}
.player-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-height: 200px;
}
.opponent-area {
  justify-content: flex-start;
}
.player-area-bottom {
  justify-content: flex-end;
}
.player-label {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-weight: 600;
}
.lives {
  font-size: 1.2rem;
}
.hand-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
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
  transition: background-color 0.2s, color 0.2s;
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

/* Win/Loss highlight animations - very rewarding! */
.points--winner {
  animation: victory-pulse 2s ease-in-out;
  position: relative;
  z-index: 5;
}

.points--loser {
  animation: defeat-shake 1s ease-in-out;
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
  0%, 100% {
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
  0% { transform: translateX(-50%) scale(0.9); opacity: 0; }
  50% { transform: translateX(-50%) scale(1.05); }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}
.chip-feedback-enter-active,
.chip-feedback-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.chip-feedback-enter-from,
.chip-feedback-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
.center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}
.limit {
  font-weight: 700;
  color: var(--color-accent);
}
.deck {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
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

.btn:disabled,
.btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.7) brightness(0.8);
  transform: none !important;
  transition: all 0.2s ease;
}

.btn:disabled:hover,
.btn--disabled:hover {
  transform: none !important;
  opacity: 0.4;
}

/* =============== CHIP ANIMATION EFFECTS =============== */

/* Limit Change Animations */
.limit {
  position: relative;
  transition: all 0.3s ease;
}

.limit--animating {
  animation: limit-highlight 0.8s ease-in-out;
}

.limit-change-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.limit-pulse {
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-accent);
  text-shadow: 0 0 10px rgba(233, 69, 96, 0.8);
  animation: limit-pulse-effect 0.8s ease-out;
}

.limit-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: sparkle-burst 0.8s ease-out forwards;
}

.sparkle:nth-child(1) { --angle: 0deg; animation-delay: 0.1s; }
.sparkle:nth-child(2) { --angle: 60deg; animation-delay: 0.15s; }
.sparkle:nth-child(3) { --angle: 120deg; animation-delay: 0.2s; }
.sparkle:nth-child(4) { --angle: 180deg; animation-delay: 0.25s; }
.sparkle:nth-child(5) { --angle: 240deg; animation-delay: 0.3s; }
.sparkle:nth-child(6) { --angle: 300deg; animation-delay: 0.35s; }

@keyframes limit-highlight {
  0% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.1); filter: brightness(1.5); }
  100% { transform: scale(1); filter: brightness(1); }
}

@keyframes limit-pulse-effect {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}

@keyframes sparkle-burst {
  0% {
    transform: translate(
      calc(-50% + 0px), 
      calc(-50% + 0px)
    ) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(-50% + cos(var(--angle)) * 40px), 
      calc(-50% + sin(var(--angle)) * 40px)
    ) scale(1);
    opacity: 0;
  }
}

/* Shield Protection Effects */
.lives {
  position: relative;
  transition: all 0.3s ease;
}

.lives--protected .lives-hearts {
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}

.shield-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  z-index: 2;
}

.shield-glow {
  position: absolute;
  inset: -8px;
  background: radial-gradient(
    circle, 
    rgba(74, 222, 128, calc(0.3 * var(--shield-level, 1))) 0%, 
    transparent 70%
  );
  border-radius: 50%;
  animation: shield-pulse 2s infinite ease-in-out;
}

.shield-value {
  position: relative;
  font-size: 0.75rem;
  color: #4ade80;
  font-weight: 700;
  text-shadow: 0 0 4px rgba(74, 222, 128, 0.8);
}

.shield-activation-effect {
  position: absolute;
  inset: -20px;
  pointer-events: none;
}

.shield-wave {
  position: absolute;
  inset: 0;
  border: 2px solid #4ade80;
  border-radius: 50%;
  animation: shield-wave-expand 1s ease-out;
}

.shield-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: #4ade80;
  border-radius: 50%;
  animation: particle-burst 1s ease-out forwards;
}

.particle:nth-child(1) { --particle-angle: 0deg; animation-delay: 0.1s; }
.particle:nth-child(2) { --particle-angle: 45deg; animation-delay: 0.15s; }
.particle:nth-child(3) { --particle-angle: 90deg; animation-delay: 0.2s; }
.particle:nth-child(4) { --particle-angle: 135deg; animation-delay: 0.25s; }
.particle:nth-child(5) { --particle-angle: 180deg; animation-delay: 0.3s; }
.particle:nth-child(6) { --particle-angle: 225deg; animation-delay: 0.35s; }
.particle:nth-child(7) { --particle-angle: 270deg; animation-delay: 0.4s; }
.particle:nth-child(8) { --particle-angle: 315deg; animation-delay: 0.45s; }

@keyframes shield-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

@keyframes shield-wave-expand {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes particle-burst {
  0% {
    transform: translate(
      calc(-50% + 0px), 
      calc(-50% + 0px)
    ) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(-50% + cos(var(--particle-angle)) * 30px), 
      calc(-50% + sin(var(--particle-angle)) * 30px)
    ) scale(1);
    opacity: 0;
  }
}

/* Stake/Attack Effects */
.opponent-area {
  position: relative;
  transition: all 0.3s ease;
}

.opponent-area--targeted {
  animation: target-pulse 3s infinite ease-in-out;
}

.stake-indicator {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 3;
}

.stake-glow {
  position: absolute;
  inset: -15px;
  background: radial-gradient(
    circle, 
    rgba(239, 68, 68, calc(0.4 * var(--stake-level, 1))) 0%, 
    transparent 60%
  );
  border-radius: 50%;
  animation: stake-threat-pulse 1.5s infinite ease-in-out;
}

.stake-value {
  position: relative;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 700;
  text-shadow: 0 0 4px rgba(239, 68, 68, 0.8);
}

.stake-activation-effect {
  position: absolute;
  inset: -30px;
  pointer-events: none;
}

.stake-wave {
  position: absolute;
  inset: 0;
  border: 3px solid #ef4444;
  border-radius: 8px;
  animation: stake-wave-expand 1s ease-out;
}

.stake-lightning {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.lightning-bolt {
  position: absolute;
  width: 2px;
  height: 12px;
  background: linear-gradient(45deg, #fbbf24, #ef4444);
  animation: lightning-strike 1s ease-out forwards;
  clip-path: polygon(50% 0%, 0% 40%, 30% 40%, 0% 100%, 100% 60%, 70% 60%);
}

.lightning-bolt:nth-child(1) { --lightning-angle: 45deg; animation-delay: 0.2s; }
.lightning-bolt:nth-child(2) { --lightning-angle: 135deg; animation-delay: 0.3s; }
.lightning-bolt:nth-child(3) { --lightning-angle: 225deg; animation-delay: 0.4s; }
.lightning-bolt:nth-child(4) { --lightning-angle: 315deg; animation-delay: 0.5s; }

@keyframes target-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
}

@keyframes stake-threat-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes stake-wave-expand {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes lightning-strike {
  0% {
    transform: rotate(var(--lightning-angle)) translateY(-20px) scale(0);
    opacity: 0;
  }
  50% {
    opacity: 1;
    transform: rotate(var(--lightning-angle)) translateY(-10px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--lightning-angle)) translateY(0px) scale(1);
  }
}

/* Animation Transitions */
.limit-change-enter-active,
.shield-activate-enter-active,
.stake-increase-enter-active {
  transition: all 0.2s ease;
}

.limit-change-leave-active,
.shield-activate-leave-active,
.stake-increase-leave-active {
  transition: all 0.3s ease;
}

.limit-change-enter-from,
.limit-change-leave-to,
.shield-activate-enter-from,
.shield-activate-leave-to,
.stake-increase-enter-from,
.stake-increase-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Card Draw Animations */
.deck {
  position: relative;
}

.card-draw-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.flying-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 56px;
  background: var(--color-surface);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--color-text);
  transform: translate(-50%, -50%);
  animation: card-fly-to-player 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.card-value {
  font-size: 0.9rem;
  z-index: 2;
}

.perfect-sparkles {
  position: absolute;
  inset: -4px;
}

.perfect-sparkle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: #fbbf24;
  border-radius: 50%;
  animation: perfect-sparkle-orbit 1.2s linear forwards;
}

.perfect-sparkle:nth-child(1) { --orbit-angle: 0deg; animation-delay: 0.2s; }
.perfect-sparkle:nth-child(2) { --orbit-angle: 90deg; animation-delay: 0.4s; }
.perfect-sparkle:nth-child(3) { --orbit-angle: 180deg; animation-delay: 0.6s; }
.perfect-sparkle:nth-child(4) { --orbit-angle: 270deg; animation-delay: 0.8s; }

@keyframes card-fly-to-player {
  0% {
    transform: translate(-50%, -50%) scale(0.8) rotateZ(0deg);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(1.1) rotateZ(-10deg);
    opacity: 1;
  }
  80% {
    transform: translate(-50%, calc(100vh - 200px)) scale(1) rotateZ(5deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, calc(100vh - 200px)) scale(0.9) rotateZ(0deg);
    opacity: 0;
  }
}

@keyframes perfect-sparkle-orbit {
  0% {
    transform: rotate(var(--orbit-angle)) translateY(-15px) scale(0);
    opacity: 0;
  }
  30% {
    opacity: 1;
    transform: rotate(var(--orbit-angle)) translateY(-20px) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(calc(var(--orbit-angle) + 180deg)) translateY(-25px) scale(0.5);
  }
}

/* Card Return Animation */
.card-return-effect {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.returning-card {
  position: absolute;
  width: 40px;
  height: 56px;
  background: var(--color-surface);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  animation: card-return-to-deck 1s ease-in-out forwards;
}

@keyframes card-return-to-deck {
  0% {
    transform: scale(1) rotateZ(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(0.7) rotateZ(180deg) translateY(-30px);
    opacity: 0.8;
  }
  100% {
    transform: scale(0.3) rotateZ(360deg) translateY(-60px);
    opacity: 0;
  }
}

/* Cards Swap Animation */
.cards-swap-effect {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.swap-trail {
  position: absolute;
  width: 2px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: swap-particle-trail 1.5s ease-out forwards;
}

@keyframes swap-particle-trail {
  0% {
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  80% {
    top: 80%;
    left: 50%;
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    top: 80%;
    left: 50%;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
}

/* Animation Transitions for Card Effects */
.card-draw-enter-active,
.card-return-enter-active,
.cards-swap-enter-active {
  transition: all 0.2s ease;
}

.card-draw-leave-active,
.card-return-leave-active,
.cards-swap-leave-active {
  transition: all 0.3s ease;
}

.card-draw-enter-from,
.card-draw-leave-to,
.card-return-enter-from,
.card-return-leave-to,
.cards-swap-enter-from,
.cards-swap-leave-to {
  opacity: 0;
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

.breaking-heart:nth-child(1) { animation-delay: 0s; }
.breaking-heart:nth-child(2) { animation-delay: 0.2s; }
.breaking-heart:nth-child(3) { animation-delay: 0.4s; }

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

.sparkle:nth-child(1) { --angle: 0deg; animation-delay: 0.1s; }
.sparkle:nth-child(2) { --angle: 30deg; animation-delay: 0.2s; }
.sparkle:nth-child(3) { --angle: 60deg; animation-delay: 0.3s; }
.sparkle:nth-child(4) { --angle: 90deg; animation-delay: 0.1s; }
.sparkle:nth-child(5) { --angle: 120deg; animation-delay: 0.2s; }
.sparkle:nth-child(6) { --angle: 150deg; animation-delay: 0.3s; }
.sparkle:nth-child(7) { --angle: 180deg; animation-delay: 0.1s; }
.sparkle:nth-child(8) { --angle: 210deg; animation-delay: 0.2s; }
.sparkle:nth-child(9) { --angle: 240deg; animation-delay: 0.3s; }
.sparkle:nth-child(10) { --angle: 270deg; animation-delay: 0.1s; }
.sparkle:nth-child(11) { --angle: 300deg; animation-delay: 0.2s; }
.sparkle:nth-child(12) { --angle: 330deg; animation-delay: 0.3s; }

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
</style>
