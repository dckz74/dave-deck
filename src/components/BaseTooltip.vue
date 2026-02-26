<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from 'vue'

interface Props {
  /** The tooltip content */
  content: string
  /** The tooltip title/header */
  title?: string
  /** Delay before showing tooltip (ms) */
  delay?: number
  /** Position of the tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  /** Whether tooltip is disabled */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  delay: 600, // 600ms delay as requested
  position: 'auto',
  disabled: false,
})

const isVisible = ref(false)
const tooltipRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const tooltipStyle = ref({})
let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

// Computed position based on viewport and element position
const computedPosition = computed(() => {
  if (props.position !== 'auto') return props.position

  // Default to top, but this would need viewport detection for full auto mode
  return 'top'
})

// Calculate tooltip position
function calculatePosition() {
  if (!triggerRef.value || !isVisible.value) return

  const trigger = triggerRef.value
  const rect = trigger.getBoundingClientRect()
  const tooltipWidth = 280 // max-width
  const tooltipHeight = 80 // estimated height

  let top = 0
  let left = 0

  switch (computedPosition.value) {
    case 'top':
      top = rect.top - tooltipHeight - 8
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      break
    case 'bottom':
      top = rect.bottom + 8
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      break
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.left - tooltipWidth - 8
      break
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2
      left = rect.right + 8
      break
  }

  // Ensure tooltip stays within viewport
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  }

  left = Math.max(8, Math.min(left, viewport.width - tooltipWidth - 8))
  top = Math.max(8, Math.min(top, viewport.height - tooltipHeight - 8))

  tooltipStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    transform: 'none',
  }
}

function showTooltip() {
  if (props.disabled) return

  clearTimeout(hideTimer!)
  showTimer = setTimeout(() => {
    isVisible.value = true
    // Calculate position after tooltip becomes visible
    nextTick(() => {
      calculatePosition()
    })
  }, props.delay)
}

function hideTooltip() {
  clearTimeout(showTimer!)
  hideTimer = setTimeout(() => {
    isVisible.value = false
  }, 100) // Small delay for smoother interactions
}

function clearTimers() {
  clearTimeout(showTimer!)
  clearTimeout(hideTimer!)
}

// Handle mouse events
function onMouseEnter() {
  showTooltip()
}

function onMouseLeave() {
  hideTooltip()
}

// Handle focus events for accessibility
function onFocusIn() {
  showTooltip()
}

function onFocusOut() {
  hideTooltip()
}

onUnmounted(() => {
  clearTimers()
})

defineExpose({
  show: showTooltip,
  hide: hideTooltip,
  isVisible,
})
</script>

<template>
  <div
    ref="triggerRef"
    class="tooltip-trigger"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <!-- Trigger content -->
    <slot />

    <!-- Tooltip popup -->
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="isVisible"
          ref="tooltipRef"
          class="tooltip"
          :class="`tooltip--${computedPosition}`"
          :style="tooltipStyle"
          role="tooltip"
          :aria-hidden="!isVisible"
        >
          <!-- Arrow/pointer -->
          <div class="tooltip-arrow"></div>

          <!-- Tooltip content -->
          <div class="tooltip-content">
            <div v-if="title" class="tooltip-title">{{ title }}</div>
            <div class="tooltip-text">{{ content }}</div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tooltip-trigger {
  position: relative;
  display: inline-block;
}

.tooltip {
  position: fixed;
  z-index: 1000;
  max-width: 280px;
  padding: 0;
  pointer-events: none;
  transform-origin: bottom center;
}

.tooltip--top:not([style*='transform: none']) {
  transform: translateX(-50%) translateY(-100%);
}

.tooltip--bottom:not([style*='transform: none']) {
  transform: translateX(-50%) translateY(8px);
}

.tooltip--left:not([style*='transform: none']) {
  transform: translateX(-100%) translateY(-50%);
}

.tooltip--right:not([style*='transform: none']) {
  transform: translateX(8px) translateY(-50%);
}

.tooltip-content {
  background: var(--color-surface);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  background: rgba(22, 33, 62, 0.95);
}

.tooltip-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.tooltip-text {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.4;
  word-wrap: break-word;
}

/* Arrow styling */
.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--color-surface);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transform: rotate(45deg);
  z-index: -1;
}

.tooltip--top .tooltip-arrow {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-top: none;
  border-left: none;
}

.tooltip--bottom .tooltip-arrow {
  top: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-bottom: none;
  border-right: none;
}

.tooltip--left .tooltip-arrow {
  right: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-left: none;
  border-bottom: none;
}

.tooltip--right .tooltip-arrow {
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-right: none;
  border-top: none;
}

/* Smooth animations */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.tooltip-enter-to,
.tooltip-leave-from {
  opacity: 1;
  transform: scale(1);
}

/* Position-specific animations only when not using custom positioning */
.tooltip--top:not([style*='transform: none']).tooltip-enter-from,
.tooltip--top:not([style*='transform: none']).tooltip-leave-to {
  transform: translateX(-50%) translateY(-100%) scale(0.95);
}

.tooltip--bottom:not([style*='transform: none']).tooltip-enter-from,
.tooltip--bottom:not([style*='transform: none']).tooltip-leave-to {
  transform: translateX(-50%) translateY(8px) scale(0.95);
}

.tooltip--left:not([style*='transform: none']).tooltip-enter-from,
.tooltip--left:not([style*='transform: none']).tooltip-leave-to {
  transform: translateX(-100%) translateY(-50%) scale(0.95);
}

.tooltip--right:not([style*='transform: none']).tooltip-enter-from,
.tooltip--right:not([style*='transform: none']).tooltip-leave-to {
  transform: translateX(8px) translateY(-50%) scale(0.95);
}

/* Enhanced glow effect for special tooltips */
.tooltip-content {
  position: relative;
}

.tooltip-content::before {
  content: '';
  position: absolute;
  inset: -1px;
  padding: 1px;
  background: linear-gradient(
    45deg,
    transparent 0%,
    rgba(233, 69, 96, 0.2) 25%,
    rgba(74, 222, 128, 0.2) 75%,
    transparent 100%
  );
  border-radius: inherit;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tooltip:hover .tooltip-content::before {
  opacity: 1;
}

/* Responsive design */
@media (max-width: 640px) {
  .tooltip {
    max-width: 240px;
    font-size: 0.8rem;
  }

  .tooltip-content {
    padding: 0.6rem 0.8rem;
  }

  .tooltip-title {
    font-size: 0.85rem;
    margin-bottom: 0.4rem;
  }

  .tooltip-text {
    font-size: 0.8rem;
  }
}
</style>
