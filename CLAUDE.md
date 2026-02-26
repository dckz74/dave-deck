# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dave Deck is a Blackjack-like card game built with Vue 3, TypeScript, and Vite. The game uses cards 1-11 (no face cards) from a shared, limited deck where each card exists only once. Players take turns drawing cards and can use special "Chips" (power-ups) that provide strategic advantages.

## Development Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Production build (vue-tsc -b && vite build)
npm run preview      # Preview production build

# Testing
npm run test         # Run tests with Vitest (watch mode)
npm run test:run     # Run tests once (CI mode)
```

## Architecture

### Core Structure
- **`src/game/`** - Pure game logic (framework-agnostic):
  - `types.ts` - Type definitions for cards, chips, players, rounds, game state
  - `engine.ts` - Core game actions (hit, skip, chip usage, round transitions)  
  - `deck.ts` - Deck management (creation, shuffling, card drawing)
  - `round.ts` - Round evaluation (winner determination, life loss calculation)
  - `chips.ts` - Chip definitions with names and tooltips
  - `ai.ts` - AI opponent logic
- **`src/stores/game.ts`** - Pinia store that wraps the game engine
- **`src/components/`** - Vue components (GameTable, GameCard, ChipList, GameOverlay)
- **`src/views/`** - Route views (HomeView, GameView)

### Key Design Principles
- **Separation of Concerns**: Game logic is completely separated from Vue/UI components
- **Pure Functions**: Game engine functions return new state rather than mutating existing state
- **Type Safety**: Comprehensive TypeScript types for all game entities
- **State Management**: Pinia store acts as bridge between UI and game engine

### Testing
- Unit tests exist for core game logic (`*.spec.ts` files in `src/game/`)
- Tests use Vitest with jsdom environment
- Test files are co-located with implementation files

## Game Rules Summary

The game follows detailed rules documented in `rules.md`. Key mechanics:
- Each player starts with 5 lives and one hidden card
- Players alternate turns drawing from shared deck (1-11, each card exists once)
- 50% chance to receive a "Chip" (power-up) when drawing cards
- Chips persist across rounds and provide various strategic effects
- Round ends when both players skip consecutively
- Closest to limit (default 21) without going over wins the round
- Game ends when a player reaches 0 lives

## Configuration

- **Vite Config**: Includes PWA plugin, Vue plugin, path aliases (`@` maps to `src/`)
- **PWA**: Progressive Web App with manifest and service worker
- **TypeScript**: Strict configuration with path mapping
- **Build Target**: ESNext with source maps enabled

## Animation & Visual Feedback System

### **Core Implementation Principles**
Dave Deck follows a **"Everything Must Be Visible"** approach for all game actions. No important game state changes should happen without immediate, clear visual feedback.

### **Animation Architecture**
The game uses a centralized animation system in the game store:
- `currentChipAnimation` - Tracks active animation state
- `isAnimating` - Blocks all interactions during animations
- Animation types are determined by chip effects and game state changes
- All animations have defined durations (800ms-1500ms) with proper cleanup

### **Interaction Blocking**
During animations, ALL user interactions are blocked:
- Buttons become disabled (`:disabled="game.isAnimating"`)
- Chips become non-clickable with visual feedback (opacity 0.6)
- AI moves are paused until animations complete
- This prevents animation conflicts and ensures clear feedback

### **Specific Animation Requirements**

**Chip Effects Must Be Immediately Visible:**
- **Limit Changes**: Pulsing effect on limit number with sparkles
- **Shield Effects**: Green protective aura around life hearts with level indicator
- **Attack Effects**: Red threatening glow around opponent area with lightning
- **Card Actions**: Flying cards from deck to hand, swap trails, return animations
- **Perfect Draw**: Special golden sparkle effects

**Visual State Indicators:**
- Active shields show persistent green glow around hearts
- Attack modifiers show persistent red aura around opponent
- All effects remain visible until consumed or round ends

### **Dialog Usage Policy**
**Minimize dialogs** - only use for critical decisions:
- ✅ **Use dialogs for**: Game quit confirmation, settings, rules display
- ❌ **Don't use dialogs for**: Chip explanations (use tooltips), status updates, round results
- ✅ **Alternative**: Use in-game overlays, tooltips, and direct visual feedback

### **Performance Requirements**
- All animations must maintain 60fps on modern devices
- Use GPU-accelerated properties: `transform`, `opacity`, `filter`
- Avoid layout-causing properties: `width`, `height`, `top`, `left` (unless position: fixed)
- Animations respect `prefers-reduced-motion` for accessibility

### **Implementation Patterns**

**Animation Component Structure:**
```vue
<Transition name="effect-name">
  <div v-if="game.currentChipAnimation?.type === 'effect_type'" class="effect-container">
    <!-- Animation elements -->
  </div>
</Transition>
```

**CSS Animation Standards:**
```css
/* Use GPU acceleration */
.animated-element {
  transform: translateZ(0);
  will-change: transform, opacity;
}

/* Timing functions */
.entrance { animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
.exit { animation-timing-function: cubic-bezier(0.55, 0.085, 0.68, 0.53); }
```

**State Management:**
```ts
// Always check animation state before allowing actions
function playerAction() {
  if (isAnimating.value) return // Block during animations
  // ... execute action
}
```

### **Testing Animations**
- All animation timings must be tested on low-end devices
- Visual regression testing for animation states
- Ensure animations complete properly without memory leaks
- Test animation blocking prevents action conflicts

## Chip Color Coding System

### **Visual Design Principles**
All chips follow a standardized color coding system for immediate strategic recognition:

### **Chip Categories & Colors**

**🔵 Draw Chips (Teal/Blue)**
- **Chips**: Draw 2, Draw 3, Draw 4, Draw 5, Draw 6, Draw 7
- **Function**: Immediate card acquisition with specific values
- **Visual**: `rgba(20, 184, 166, 0.6)` border with teal glow effects
- **CSS Class**: `.chip--draw`

**🔴 Aggressive Chips (Red)**  
- **Chips**: Stake +1, Stake +2
- **Function**: Increase damage on next defeat (any player)
- **Visual**: `rgba(239, 68, 68, 0.6)` border with red glow effects
- **CSS Class**: `.chip--aggressive`

**🟣 Utility Chips (Purple)**
- **Chips**: Limit 17, Limit 24, Limit 27, Card Swap, Return My Card, Return Opponent Card, Perfect Draw
- **Function**: Strategic manipulation and field control
- **Visual**: `rgba(147, 51, 234, 0.6)` border with purple glow effects
- **CSS Class**: `.chip--utility`

**🟠 Defensive Chips (Orange)**
- **Chips**: Shield, Shield+
- **Function**: Reduce damage from own defeats
- **Visual**: `rgba(249, 115, 22, 0.6)` border with orange glow effects
- **CSS Class**: `.chip--defensive`

### **Implementation Guidelines**

**Color Assignment Function:**
```typescript
function getChipColorCategory(kind: ChipKind): 'draw' | 'utility' | 'aggressive' | 'defensive' {
  switch (kind) {
    case ChipKind.Draw2: case ChipKind.Draw3: case ChipKind.Draw4:
    case ChipKind.Draw5: case ChipKind.Draw6: case ChipKind.Draw7:
      return 'draw'
    case ChipKind.Limit17: case ChipKind.Limit24: case ChipKind.Limit27:
    case ChipKind.SwapCards: case ChipKind.ReturnMyCard: 
    case ChipKind.ReturnOpponentCard: case ChipKind.PerfectDraw:
      return 'utility'
    case ChipKind.StakePlus1: case ChipKind.StakePlus2:
      return 'aggressive'
    case ChipKind.Shield: case ChipKind.ShieldPlus:
      return 'defensive'
  }
}
```

**CSS Implementation Pattern:**
```css
.chip--[category] {
  border-color: rgba([color-values], 0.6);
  box-shadow: 0 0 8px rgba([color-values], 0.3);
}

.chip--[category]:hover {
  border-color: rgba([color-values], 0.8);
  box-shadow: 0 0 12px rgba([color-values], 0.5);
}
```

**Asset Management:**
- Chip images support mixed formats (PNG/JPG)
- Asset imports are categorized by color group in comments
- Images override background colors when available
- Fallback to colored text when image missing

**Tooltips Integration:**
- Tooltips should mention chip category for better learning curve
- Category information aids strategic decision making
- Color coding is reinforced in hover states

### **Future Animation Extensions**
When adding new game features:
1. **Define the visual effect first** - what should the user see?
2. **Add to animation system** - create new animation type
3. **Implement visual feedback** - ensure immediate, clear indication
4. **Test interaction blocking** - verify no conflicts during animation
5. **Document in rules.md** - update animation specifications