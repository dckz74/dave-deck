<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{
  value: number
  hidden?: boolean
  /** If true, card plays deal animation when mounted */
  animate?: boolean
}>()

const cardElement = ref<HTMLElement | null>(null)

onMounted(() => {
  // Small delay to ensure smooth animation even on mount
  requestAnimationFrame(() => {
    if (cardElement.value) {
      cardElement.value.classList.add('card--animated')
    }
  })
})
</script>

<template>
  <div
    ref="cardElement"
    class="card"
    :class="{
      'card--hidden': hidden,
      'card--animate': animate !== false,
    }"
  >
    <div class="card-content">
      <template v-if="hidden">?</template>
      <template v-else>{{ value }}</template>
    </div>
    <div class="card-glow"></div>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  width: 56px;
  height: 80px;
  border-radius: 8px;
  background: linear-gradient(145deg, #fff 0%, #f0f0f0 100%);
  color: #1a1a2e;
  font-weight: 700;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition:
    transform var(--transition-normal) ease-out,
    box-shadow var(--transition-normal) ease-out;
  will-change: transform;
  transform-origin: center center;
}

.card--hidden {
  background: linear-gradient(145deg, var(--color-primary) 0%, var(--color-surface) 100%);
  color: var(--color-text-muted);
  font-size: 1.2rem;
}

/* Card content - ensures text is always on top */
.card-content {
  position: relative;
  z-index: 2;
  pointer-events: none;
}

/* Glow effect for card dealing animation */
.card-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    45deg,
    transparent 0%,
    rgba(233, 69, 96, 0.3) 25%,
    rgba(74, 222, 128, 0.3) 75%,
    transparent 100%
  );
  border-radius: 10px;
  opacity: 0;
  z-index: 1;
  pointer-events: none;
}

/* Card dealing animation - triggers on mount */
.card--animate {
  animation: card-deal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.card--animate .card-glow {
  animation: card-glow 0.8s ease-out forwards;
}

/* Subtle hover effect - card stays on table */
.card:hover {
  transform: scale(1.01);
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 0 8px rgba(233, 69, 96, 0.15);
}

/* Card deal animation - from deck position to final position */
@keyframes card-deal {
  0% {
    opacity: 0;
    transform: translateY(-40px) rotate(-10deg) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) rotate(-2deg) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

/* Glow effect during dealing */
@keyframes card-glow {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
  }
}

/* GPU optimization: Use transform3d to trigger hardware acceleration */
.card {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
</style>
