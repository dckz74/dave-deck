<script setup lang="ts">
import ChipTooltip from './ChipTooltip.vue'
import { CHIP_DEFS } from '@/game/chips'
import type { Chip, PlayerId } from '@/game/types'
import { ChipKind } from '@/game/types'

// Import chip assets - Draw chips (Teal/Blue)
import draw2Image from '@/assets/draw_2.jpg'
import draw3Image from '@/assets/draw_3.jpg'
import draw4Image from '@/assets/draw_4.png'
import draw5Image from '@/assets/draw_5.png'
import draw6Image from '@/assets/draw_6.png'
import draw7Image from '@/assets/draw_7.png'

// Utility chips (Purple)
import limit17Image from '@/assets/limit_17.png'
import limit24Image from '@/assets/limit_24.jpg'
import limit27Image from '@/assets/limit_27.png'
import cardSwapImage from '@/assets/card_swap.jpg'
import myCardBackImage from '@/assets/my_top_card_back.jpg'
import enemyCardBackImage from '@/assets/enemy_top_card_back.png'
import perfectDrawImage from '@/assets/perfect_draw.jpg'

// Aggressive chips (Red)
import attackImage from '@/assets/attack.jpg'
import attackPlusImage from '@/assets/attack_plus.png'

// Defensive chips (Orange)
import shieldImage from '@/assets/shield.jpg'
import shieldPlusImage from '@/assets/shield_plus.png'

defineProps<{
  chips: Chip[]
  owner: PlayerId
}>()
const emit = defineEmits<{ use: [chip: Chip] }>()

function getChipImage(kind: ChipKind): string | null {
  switch (kind) {
    // Draw chips (Teal/Blue)
    case ChipKind.Draw2:
      return draw2Image
    case ChipKind.Draw3:
      return draw3Image
    case ChipKind.Draw4:
      return draw4Image
    case ChipKind.Draw5:
      return draw5Image
    case ChipKind.Draw6:
      return draw6Image
    case ChipKind.Draw7:
      return draw7Image

    // Utility chips (Purple)
    case ChipKind.Limit17:
      return limit17Image
    case ChipKind.Limit24:
      return limit24Image
    case ChipKind.Limit27:
      return limit27Image
    case ChipKind.SwapCards:
      return cardSwapImage
    case ChipKind.ReturnMyCard:
      return myCardBackImage
    case ChipKind.ReturnOpponentCard:
      return enemyCardBackImage
    case ChipKind.PerfectDraw:
      return perfectDrawImage

    // Aggressive chips (Red)
    case ChipKind.StakePlus1:
      return attackImage
    case ChipKind.StakePlus2:
      return attackPlusImage

    // Defensive chips (Orange)
    case ChipKind.Shield:
      return shieldImage
    case ChipKind.ShieldPlus:
      return shieldPlusImage

    default:
      return null
  }
}

function getChipColorCategory(kind: ChipKind): 'draw' | 'utility' | 'aggressive' | 'defensive' {
  switch (kind) {
    case ChipKind.Draw2:
    case ChipKind.Draw3:
    case ChipKind.Draw4:
    case ChipKind.Draw5:
    case ChipKind.Draw6:
    case ChipKind.Draw7:
      return 'draw'

    case ChipKind.Limit17:
    case ChipKind.Limit24:
    case ChipKind.Limit27:
    case ChipKind.SwapCards:
    case ChipKind.ReturnMyCard:
    case ChipKind.ReturnOpponentCard:
    case ChipKind.PerfectDraw:
      return 'utility'

    case ChipKind.StakePlus1:
    case ChipKind.StakePlus2:
      return 'aggressive'

    case ChipKind.Shield:
    case ChipKind.ShieldPlus:
      return 'defensive'
  }
}
</script>

<template>
  <div class="chip-list">
    <TransitionGroup name="chip" tag="div" class="chip-container">
      <ChipTooltip
        v-for="(chip, index) in chips"
        :key="chip.id"
        :chip-kind="chip.kind"
        :delay="400"
      >
        <button
          type="button"
          class="chip"
          :class="{
            'chip--interactive': owner === 'player',
            [`chip--${getChipColorCategory(chip.kind)}`]: true,
          }"
          :style="{ '--chip-index': index }"
          :disabled="false"
          @click="owner === 'player' ? emit('use', chip) : undefined"
        >
          <img
            v-if="getChipImage(chip.kind)"
            :src="getChipImage(chip.kind)!"
            :alt="CHIP_DEFS[chip.kind].name"
            class="chip-image"
          />
          <span v-else class="chip-content">{{ CHIP_DEFS[chip.kind].shortName }}</span>
          <div class="chip-glow"></div>
        </button>
      </ChipTooltip>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.chip-list {
  display: flex;
  justify-content: center;
}

.chip-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: center;
}

.chip {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  transform: translateZ(0); /* GPU acceleration */
  animation: chip-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: calc(var(--chip-index, 0) * 0.1s);
  opacity: 0;
  overflow: hidden;
}

.chip:has(.chip-image) {
  background: transparent;
}

.chip-content {
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.chip-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  position: relative;
  z-index: 2;
  pointer-events: none;
  transform: scale(150%);
}

.chip-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(233, 69, 96, 0.8) 0%, transparent 70%);
  opacity: 0;
  z-index: 1;
  transition: opacity var(--transition-fast);
}

.chip--interactive:hover {
  transform: translateY(-3px) scale(1.15) translateZ(0);
  box-shadow: 0 8px 24px rgba(233, 69, 96, 0.6);
}

.chip--interactive:hover .chip-glow {
  opacity: 1;
}

.chip--interactive:active {
  transform: translateY(0) scale(0.95) translateZ(0);
  transition-duration: 100ms;
}

.chip--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(0.7) brightness(0.8);
  transform: none !important;
  transition: all 0.2s ease;
}

/* Chip appearance animation */
@keyframes chip-appear {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.6) rotateZ(-180deg);
  }
  60% {
    opacity: 1;
    transform: translateY(-5px) scale(1.1) rotateZ(-20deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateZ(0deg);
  }
}

/* Chip transition animations for add/remove */
.chip-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chip-leave-active {
  transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.chip-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.3) rotateZ(180deg);
}

.chip-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.3) rotateZ(-90deg);
}

.chip-move {
  transition: transform 0.3s ease;
}

/* Color coding for chip types */
.chip--draw {
  box-shadow:
    0 0 12px rgba(20, 184, 166, 0.4),
    0 0 0 2px rgba(20, 184, 166, 0.3);
}

.chip--draw:hover {
  box-shadow:
    0 8px 24px rgba(20, 184, 166, 0.6),
    0 0 0 3px rgba(20, 184, 166, 0.6);
}

.chip--utility {
  box-shadow:
    0 0 12px rgba(147, 51, 234, 0.4),
    0 0 0 2px rgba(147, 51, 234, 0.3);
}

.chip--utility:hover {
  box-shadow:
    0 8px 24px rgba(147, 51, 234, 0.6),
    0 0 0 3px rgba(147, 51, 234, 0.6);
}

.chip--aggressive {
  box-shadow:
    0 0 12px rgba(239, 68, 68, 0.4),
    0 0 0 2px rgba(239, 68, 68, 0.3);
}

.chip--aggressive:hover {
  box-shadow:
    0 8px 24px rgba(239, 68, 68, 0.6),
    0 0 0 3px rgba(239, 68, 68, 0.6);
}

.chip--defensive {
  box-shadow:
    0 0 12px rgba(249, 115, 22, 0.4),
    0 0 0 2px rgba(249, 115, 22, 0.3);
}

.chip--defensive:hover {
  box-shadow:
    0 8px 24px rgba(249, 115, 22, 0.6),
    0 0 0 3px rgba(249, 115, 22, 0.6);
}
</style>
