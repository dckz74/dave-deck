<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import BaseTooltip from './BaseTooltip.vue'
import { CHIP_DEFS } from '@/game/chips'
import type { ChipKind } from '@/game/types'

interface Props {
  /** The chip kind to show tooltip for */
  chipKind: ChipKind
  /** Whether tooltip is disabled */
  disabled?: boolean
  /** Delay before showing tooltip (ms) */
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  delay: 500 // Slightly shorter delay for chips since they're interactive
})

const triggerElement = ref<HTMLElement>()
const tooltipPosition = ref<'top' | 'bottom' | 'left' | 'right'>('top')

// Get chip definition
const chipDef = computed(() => CHIP_DEFS[props.chipKind])

// Enhanced tooltip content with formatting
const tooltipTitle = computed(() => chipDef.value.name)

const tooltipContent = computed(() => {
  const def = chipDef.value
  let content = def.description
  
  // Add value information for certain chips
  if (def.value !== undefined) {
    switch (props.chipKind) {
      case 'draw_2':
      case 'draw_3':
      case 'draw_4':
      case 'draw_5':
      case 'draw_6':
      case 'draw_7':
        content += ` (Kartenwert: ${def.value})`
        break
      case 'limit_17':
      case 'limit_24':
      case 'limit_27':
        content += ` (Neues Limit: ${def.value})`
        break
      case 'stake_plus_1':
        content += ` (Zusätzliche Leben: +${def.value})`
        break
      case 'stake_plus_2':
        content += ` (Zusätzliche Leben: +${def.value})`
        break
      case 'shield':
        content += ` (Schutz: -${def.value} Leben)`
        break
      case 'shield_plus':
        content += ` (Schutz: -${def.value} Leben)`
        break
    }
  }
  
  return content
})

// Auto-detect optimal tooltip position based on element position
function updateTooltipPosition() {
  if (!triggerElement.value) return
  
  const rect = triggerElement.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  
  // Determine best position based on available space
  const spaceAbove = rect.top
  const spaceBelow = viewportHeight - rect.bottom
  const spaceLeft = rect.left
  const spaceRight = viewportWidth - rect.right
  
  // Prefer top, but switch to bottom if not enough space above
  if (spaceAbove > 100) {
    tooltipPosition.value = 'top'
  } else if (spaceBelow > 100) {
    tooltipPosition.value = 'bottom'
  } else if (spaceRight > 200) {
    tooltipPosition.value = 'right'
  } else if (spaceLeft > 200) {
    tooltipPosition.value = 'left'
  } else {
    tooltipPosition.value = 'top' // fallback
  }
}

onMounted(() => {
  updateTooltipPosition()
  window.addEventListener('resize', updateTooltipPosition)
  window.addEventListener('scroll', updateTooltipPosition)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTooltipPosition)
  window.removeEventListener('scroll', updateTooltipPosition)
})
</script>

<template>
  <BaseTooltip
    :title="tooltipTitle"
    :content="tooltipContent"
    :disabled="disabled"
    :delay="delay"
    :position="tooltipPosition"
  >
    <div ref="triggerElement" class="chip-tooltip-trigger">
      <slot />
    </div>
  </BaseTooltip>
</template>

<style scoped>
.chip-tooltip-trigger {
  display: inline-block;
  width: 100%;
  height: 100%;
}
</style>