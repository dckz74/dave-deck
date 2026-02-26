/**
 * Enhanced AI Logic: Strategic, probabilistic decision making with advanced player modeling.
 * Uses risk assessment, Bayesian inference, and multi-step planning.
 */

import { getBestCardValue } from './deck'
import type { GameState, Chip, Card } from './types'
import { ChipKind } from './types'

function handSum(hand: Card[]): number {
  return hand.reduce((s, c) => s + c.value, 0)
}

function valuesInDeck(deck: Card[]): number[] {
  return deck.map((c) => c.value)
}

function hasCardInDeck(deck: Card[], value: number): boolean {
  return deck.some((c) => c.value === value)
}

// === PROBABILISTIC RISK ASSESSMENT ===

interface WinProbability {
  winChance: number
  bustChance: number
  expectedValue: number
}

/**
 * Calculates win probability for a given hand sum against player's estimated range
 */
function calculateWinProbability(
  mySum: number,
  playerMinSum: number,
  playerMaxSum: number,
  limit: number,
  deck: Card[]
): WinProbability {
  const deckValues = valuesInDeck(deck)
  const totalCards = deckValues.length
  
  if (totalCards === 0) {
    return {
      winChance: mySum <= limit && mySum > Math.min(playerMaxSum, limit) ? 1.0 : 0.0,
      bustChance: mySum > limit ? 1.0 : 0.0,
      expectedValue: 0
    }
  }

  let winScenarios = 0
  let bustScenarios = 0
  
  // Evaluate each possible card draw
  for (const cardValue of deckValues) {
    const newSum = mySum + cardValue
    
    if (newSum > limit) {
      bustScenarios++
      continue
    }
    
    // Win if: I'm under limit AND (player busts OR I'm closer to limit)
    const playerBusted = playerMinSum > limit
    const winByScore = !playerBusted && newSum > Math.min(playerMaxSum, limit)
    
    if (playerBusted || winByScore) {
      winScenarios++
    }
  }
  
  return {
    winChance: winScenarios / totalCards,
    bustChance: bustScenarios / totalCards,
    expectedValue: (winScenarios - bustScenarios) / totalCards
  }
}

/**
 * Estimates player's hidden card value using Bayesian inference
 */
function estimatePlayerHiddenCard(
  state: GameState,
  _playerActions: string[] = []
): { estimatedMin: number; estimatedMax: number; confidence: number } {
  const visibleSum = state.player.hand.reduce((s, c) => s + c.value, 0)
  
  if (!state.player.hasHiddenCard || state.player.hand.length === 0) {
    return { estimatedMin: visibleSum, estimatedMax: visibleSum, confidence: 1.0 }
  }
  
  // Base range: hidden card can be 1-11
  let probabilities = new Array(11).fill(1/11) // Equal probability initially
  
  // Adjust based on player behavior
  const limit = state.round.limit
  // Future: could use remaining cards for more sophisticated modeling
  // const _remainingCards = valuesInDeck(state.round.deck)
  
  // If player has been aggressive (multiple hits), likely has low hidden card
  if (state.player.hand.length > 2) {
    for (let i = 0; i < 11; i++) {
      const hiddenValue = i + 1
      const totalWithHidden = visibleSum + hiddenValue
      if (totalWithHidden > limit - 5) { // Would be risky to hit multiple times
        probabilities[i] *= 0.3
      }
    }
  }
  
  // If player skipped early with low visible sum, likely has high hidden card
  if (state.round.lastMoveWasSkip && visibleSum < limit - 8) {
    for (let i = 0; i < 11; i++) {
      const hiddenValue = i + 1
      if (hiddenValue < 8) {
        probabilities[i] *= 0.2
      }
    }
  }
  
  // Normalize probabilities
  const sum = probabilities.reduce((a, b) => a + b, 0)
  probabilities = probabilities.map(p => p / sum)
  
  // Calculate weighted range
  let weightedMin = 0
  let weightedMax = 0
  let confidence = 0
  
  for (let i = 0; i < 11; i++) {
    const hiddenValue = i + 1
    weightedMin += hiddenValue * probabilities[i]
    weightedMax += hiddenValue * probabilities[i]
    confidence = Math.max(confidence, probabilities[i])
  }
  
  // Use range based on confidence
  const range = Math.ceil((1 - confidence) * 6) // Lower confidence = wider range
  
  return {
    estimatedMin: Math.max(1, Math.floor(weightedMin - range/2)),
    estimatedMax: Math.min(11, Math.ceil(weightedMax + range/2)),
    confidence
  }
}

/** Enhanced player range calculation with Bayesian estimation */
function playerSumRange(state: GameState): { min: number; max: number; known: number | null } {
  const hand = state.player.hand
  const visibleSum = hand.reduce((s, c) => s + c.value, 0)
  if (!state.player.hasHiddenCard || hand.length === 0) return { min: visibleSum, max: visibleSum, known: visibleSum }
  
  // Use Bayesian estimation for more accurate range
  const estimation = estimatePlayerHiddenCard(state)
  return {
    min: visibleSum + estimation.estimatedMin,
    max: visibleSum + estimation.estimatedMax,
    known: null
  }
}

export type OpponentAction = { type: 'hit' } | { type: 'skip' } | { type: 'chip'; chip: Chip }

// === STRATEGIC CHIP EVALUATION ===

interface ChipStrategy {
  chip: Chip
  priority: number
  reasoning: 'offensive' | 'defensive' | 'disruptive' | 'opportunistic'
  expectedValue: number
}

/**
 * Evaluates offensive chip strategies to pressure the player
 */
function evaluateOffensiveChips(state: GameState): ChipStrategy[] {
  const strategies: ChipStrategy[] = []
  const chips = state.opponent.chips
  const mySum = handSum(state.opponent.hand)
  const playerRange = playerSumRange(state)
  const limit = state.round.limit
  const livesAdvantage = state.opponent.lives - state.player.lives
  
  // Stake chips: Use when we have advantage and high confidence of winning
  const stakeChips = chips.filter(c => c.kind === ChipKind.StakePlus1 || c.kind === ChipKind.StakePlus2)
  for (const chip of stakeChips) {
    const stakePower = chip.kind === ChipKind.StakePlus2 ? 2 : 1
    const winProb = calculateWinProbability(mySum, playerRange.min, playerRange.max, limit, state.round.deck)
    
    // Use stake chips when we're likely to win and want to amplify damage
    if (winProb.winChance > 0.6 && livesAdvantage >= 0) {
      strategies.push({
        chip,
        priority: winProb.winChance * stakePower * 100,
        reasoning: 'offensive',
        expectedValue: winProb.winChance * stakePower
      })
    }
  }
  
  // Return Opponent Card: Disrupt when player draws valuable cards
  const returnOpponentCard = chips.find(c => c.kind === ChipKind.ReturnOpponentCard)
  if (returnOpponentCard && state.player.hand.length >= 2) {
    const playerLastCard = state.player.hand[state.player.hand.length - 1]
    const playerSum = handSum(state.player.hand)
    
    // High value if player drew a card that helps them significantly
    if (playerLastCard.value >= 7 && playerSum <= limit) {
      const disruptionValue = playerLastCard.value / 11 * 100
      strategies.push({
        chip: returnOpponentCard,
        priority: disruptionValue,
        reasoning: 'disruptive',
        expectedValue: disruptionValue / 100
      })
    }
  }
  
  return strategies
}

/**
 * Evaluates strategic limit manipulation
 */
function evaluateLimitManipulation(state: GameState): ChipStrategy[] {
  const strategies: ChipStrategy[] = []
  const chips = state.opponent.chips
  const mySum = handSum(state.opponent.hand)
  const playerRange = playerSumRange(state)
  const currentLimit = state.round.limit
  
  const limitChips = chips.filter(c => 
    c.kind === ChipKind.Limit17 || c.kind === ChipKind.Limit24 || c.kind === ChipKind.Limit27
  )
  
  for (const chip of limitChips) {
    let newLimit: number
    switch (chip.kind) {
      case ChipKind.Limit17: newLimit = 17; break
      case ChipKind.Limit24: newLimit = 24; break
      case ChipKind.Limit27: newLimit = 27; break
      default: continue
    }
    
    // Don't use if we're already over the new limit
    if (mySum > newLimit) continue
    
    const currentWinProb = calculateWinProbability(mySum, playerRange.min, playerRange.max, currentLimit, state.round.deck)
    const newWinProb = calculateWinProbability(mySum, playerRange.min, playerRange.max, newLimit, state.round.deck)
    
    const improvement = newWinProb.winChance - currentWinProb.winChance
    
    if (improvement > 0.1) { // Significant improvement
      strategies.push({
        chip,
        priority: improvement * 100,
        reasoning: 'opportunistic',
        expectedValue: improvement
      })
    }
  }
  
  return strategies
}

/**
 * Evaluates defensive chip usage with better timing
 */
function evaluateDefensiveChips(state: GameState): ChipStrategy[] {
  const strategies: ChipStrategy[] = []
  const chips = state.opponent.chips
  const mySum = handSum(state.opponent.hand)
  const playerRange = playerSumRange(state)
  const limit = state.round.limit
  const livesAdvantage = state.opponent.lives - state.player.lives
  
  // Shield chips: Use proactively when expecting to lose
  const shieldChips = chips.filter(c => c.kind === ChipKind.Shield || c.kind === ChipKind.ShieldPlus)
  for (const chip of shieldChips) {
    const shieldPower = chip.kind === ChipKind.ShieldPlus ? 2 : 1
    const loseProb = 1 - calculateWinProbability(mySum, playerRange.min, playerRange.max, limit, state.round.deck).winChance
    
    // Use shields when likely to lose, especially if behind in lives
    if (loseProb > 0.5 && (livesAdvantage <= 0 || state.opponent.lives <= 3)) {
      strategies.push({
        chip,
        priority: loseProb * shieldPower * 50,
        reasoning: 'defensive',
        expectedValue: loseProb * shieldPower * 0.5
      })
    }
  }
  
  return strategies
}

/**
 * Gets the best strategic chip to use, considering all factors
 */
function getBestStrategicChip(state: GameState): ChipStrategy | null {
  const allStrategies = [
    ...evaluateOffensiveChips(state),
    ...evaluateLimitManipulation(state),
    ...evaluateDefensiveChips(state)
  ]
  
  if (allStrategies.length === 0) return null
  
  // Sort by priority and return the best
  allStrategies.sort((a, b) => b.priority - a.priority)
  return allStrategies[0]
}

// === MULTI-STEP LOOKAHEAD ===

interface ChipCombination {
  chips: Chip[]
  expectedValue: number
  finalSum: number
  priority: number
}

/**
 * Evaluates complex chip combinations for multi-step planning
 */
function evaluateChipCombinations(state: GameState, maxDepth: number = 2): ChipCombination[] {
  const combinations: ChipCombination[] = []
  const chips = state.opponent.chips
  const mySum = handSum(state.opponent.hand)
  const playerRange = playerSumRange(state)
  const limit = state.round.limit
  
  // Helper function to simulate chip usage
  function simulateChipUsage(currentSum: number, usedChips: Chip[], remainingChips: Chip[], depth: number): void {
    if (depth >= maxDepth || remainingChips.length === 0) {
      if (usedChips.length > 0) {
        const finalWinProb = calculateWinProbability(currentSum, playerRange.min, playerRange.max, limit, state.round.deck)
        combinations.push({
          chips: [...usedChips],
          expectedValue: finalWinProb.winChance,
          finalSum: currentSum,
          priority: finalWinProb.winChance * 100 * usedChips.length // Bonus for using multiple chips effectively
        })
      }
      return
    }
    
    // Try each remaining chip
    for (let i = 0; i < remainingChips.length; i++) {
      const chip = remainingChips[i]
      let newSum = currentSum
      let shouldTry = true
      
      // Simulate chip effect
      switch (chip.kind) {
        case ChipKind.Draw2: case ChipKind.Draw3: case ChipKind.Draw4:
        case ChipKind.Draw5: case ChipKind.Draw6: case ChipKind.Draw7:
          const value = parseInt(chip.kind.split('_')[1])
          if (hasCardInDeck(state.round.deck, value)) {
            newSum += value
          } else {
            shouldTry = false // No point if card not available
          }
          break
        case ChipKind.PerfectDraw:
          const best = getBestCardValue(currentSum, limit)
          if (best && hasCardInDeck(state.round.deck, best)) {
            newSum += best
          } else {
            shouldTry = false
          }
          break
        case ChipKind.Limit17: case ChipKind.Limit24: case ChipKind.Limit27:
          // Limit changes are handled in win probability calculation
          break
        default:
          // Other chips don't directly change sum
          break
      }
      
      if (shouldTry && newSum <= 27) { // Don't explore obviously bad combinations
        const newRemainingChips = remainingChips.slice()
        newRemainingChips.splice(i, 1)
        simulateChipUsage(newSum, [...usedChips, chip], newRemainingChips, depth + 1)
      }
    }
  }
  
  simulateChipUsage(mySum, [], chips, 0)
  
  // Sort by priority and return top combinations
  return combinations.sort((a, b) => b.priority - a.priority).slice(0, 5)
}

/**
 * Gets the best first chip from a multi-step combination
 */
function getBestMultiStepChip(state: GameState): Chip | null {
  const combinations = evaluateChipCombinations(state)
  
  if (combinations.length === 0) return null
  
  const bestCombination = combinations[0]
  
  // Only use multi-step if it's significantly better than single chip usage
  if (bestCombination.priority > 80 && bestCombination.chips.length > 1) {
    return bestCombination.chips[0]
  }
  
  return null
}

// === GAME PHASE AWARENESS ===

/**
 * Determines current game phase for strategic adaptation
 */
function getGamePhase(state: GameState): 'early' | 'mid' | 'late' | 'critical' {
  const maxLives = Math.max(state.player.lives, state.opponent.lives)
  const minLives = Math.min(state.player.lives, state.opponent.lives)
  
  if (minLives <= 1) return 'critical'
  if (maxLives <= 2) return 'late'
  if (maxLives <= 3) return 'mid'
  return 'early'
}

/**
 * Adapts AI strategy based on game phase
 */
function getPhaseStrategy(phase: 'early' | 'mid' | 'late' | 'critical', livesAdvantage: number) {
  switch (phase) {
    case 'early':
      return {
        riskTolerance: 0.6,
        chipAggressiveness: livesAdvantage > 0 ? 0.7 : 0.4,
        prioritizeOffensive: livesAdvantage > 1
      }
    case 'mid':
      return {
        riskTolerance: 0.5,
        chipAggressiveness: livesAdvantage > 0 ? 0.8 : 0.3,
        prioritizeOffensive: livesAdvantage > 0
      }
    case 'late':
      return {
        riskTolerance: 0.4,
        chipAggressiveness: 0.9,
        prioritizeOffensive: livesAdvantage >= 0
      }
    case 'critical':
      return {
        riskTolerance: 0.3,
        chipAggressiveness: 1.0,
        prioritizeOffensive: true
      }
  }
}

/**
 * Enhanced AI decision making: Strategic, probabilistic approach with advanced chip usage.
 * Considers offensive opportunities, player psychology, and multi-step planning.
 */
export function getOpponentAction(state: GameState): OpponentAction {
  if (state.phase !== 'playing' || state.round.currentTurn !== 'opponent') {
    return { type: 'skip' }
  }

  const mySum = handSum(state.opponent.hand)
  const playerRange = playerSumRange(state)
  const limit = state.round.limit
  const shouldEndRound = state.round.lastMoveWasSkip
  const winProb = calculateWinProbability(mySum, playerRange.min, playerRange.max, limit, state.round.deck)
  
  // Game phase analysis for strategic adaptation
  const gamePhase = getGamePhase(state)
  const livesAdvantage = state.opponent.lives - state.player.lives
  const phaseStrategy = getPhaseStrategy(gamePhase, livesAdvantage)
  
  // Multi-step lookahead for complex scenarios
  const multiStepChip = getBestMultiStepChip(state)
  
  // Strategic chip evaluation with phase awareness
  const bestChipStrategy = getBestStrategicChip(state)
  
  // High-priority multi-step combinations take precedence
  if (multiStepChip && gamePhase !== 'early') {
    return { type: 'chip', chip: multiStepChip }
  }
  
  // Phase-adjusted chip priority thresholds
  const chipPriorityThreshold = phaseStrategy.chipAggressiveness * 75
  if (bestChipStrategy && bestChipStrategy.priority > chipPriorityThreshold) {
    return { type: 'chip', chip: bestChipStrategy.chip }
  }
  
  // If round should end, evaluate if we should still make strategic moves
  if (shouldEndRound) {
    // Don't end round if we're losing badly and have good chip options
    if (winProb.winChance < 0.3 && bestChipStrategy && bestChipStrategy.priority > 40) {
      return { type: 'chip', chip: bestChipStrategy.chip }
    }
    
    // Otherwise end the round unless we're busting
    if (mySum <= limit) {
      return { type: 'skip' }
    }
  }

  const myHand = state.opponent.hand
  const playerHand = state.player.hand
  const deck = state.round.deck
  const chips = state.opponent.chips
  const myLastCard = myHand.length >= 2 ? myHand[myHand.length - 1].value : null
  const playerLastCard = playerHand.length >= 2 ? playerHand[playerHand.length - 1].value : null
  const inDeck = valuesInDeck(deck)

  const limit27Chip = chips.find((c) => c.kind === ChipKind.Limit27)
  const limit24Chip = chips.find((c) => c.kind === ChipKind.Limit24)
  const effectiveLimitForDraw =
    limit27Chip && mySum <= 27 ? 27 : limit24Chip && mySum <= 24 ? 24 : limit

  // ---- 1) Player analysis: Strategic response to player state ----
  if (playerRange.known !== null && playerRange.known > limit) {
    // Player has busted - but consider using stake chips if we have them
    const stakeStrategy = evaluateOffensiveChips(state).find(s => s.reasoning === 'offensive')
    if (stakeStrategy && stakeStrategy.priority > 50) {
      return { type: 'chip', chip: stakeStrategy.chip }
    }
    return { type: 'skip' }
  }
  if (playerRange.min > limit) {
    // Same logic for guaranteed player bust
    const stakeStrategy = evaluateOffensiveChips(state).find(s => s.reasoning === 'offensive')
    if (stakeStrategy && stakeStrategy.priority > 50) {
      return { type: 'chip', chip: stakeStrategy.chip }
    }
    return { type: 'skip' }
  }

  // ---- 2) Rescue from busting: Enhanced logic with better prioritization ----
  if (mySum > limit) {
    // Prioritize limit chips in order of effectiveness
    const rescueChips = chips.filter(c => 
      (c.kind === ChipKind.Limit27 && mySum <= 27) ||
      (c.kind === ChipKind.Limit24 && mySum <= 24) ||
      (c.kind === ChipKind.Limit17 && mySum <= 17)
    ).sort((a, b) => {
      // Prefer smaller limit increases (more conservative)
      const aLimit = a.kind === ChipKind.Limit17 ? 17 : a.kind === ChipKind.Limit24 ? 24 : 27
      const bLimit = b.kind === ChipKind.Limit17 ? 17 : b.kind === ChipKind.Limit24 ? 24 : 27
      return aLimit - bLimit
    })
    
    if (rescueChips.length > 0) {
      return { type: 'chip', chip: rescueChips[0] }
    }
    
    // Card manipulation as backup
    if (myHand.length >= 2) {
      const returnMy = chips.find((c) => c.kind === ChipKind.ReturnMyCard)
      if (returnMy) return { type: 'chip', chip: returnMy }
    }
    
    // Strategic card swap - improved logic
    if (
      chips.some((c) => c.kind === ChipKind.SwapCards) &&
      myHand.length >= 2 &&
      playerHand.length >= 2 &&
      playerLastCard !== null &&
      myLastCard !== null &&
      playerLastCard < myLastCard &&
      mySum - myLastCard + playerLastCard <= limit
    ) {
      const c = chips.find((c) => c.kind === ChipKind.SwapCards)!
      return { type: 'chip', chip: c }
    }
    return { type: 'skip' }
  }

  // ---- 3) Strategic chip usage: Enhanced decision making ----
  
  // Use best strategic chip if priority is high enough
  if (bestChipStrategy && bestChipStrategy.priority > 30) {
    return { type: 'chip', chip: bestChipStrategy.chip }
  }
  
  // Perfect Draw: Enhanced evaluation
  const perfectDraw = chips.find((c) => c.kind === ChipKind.PerfectDraw)
  if (perfectDraw) {
    const best = getBestCardValue(mySum, effectiveLimitForDraw)
    if (best !== undefined && hasCardInDeck(deck, best)) {
      // Consider if perfect draw gives us significant advantage
      const newSum = mySum + best
      const newWinProb = calculateWinProbability(newSum, playerRange.min, playerRange.max, limit, deck)
      if (newWinProb.winChance > winProb.winChance + 0.2) {
        return { type: 'chip', chip: perfectDraw }
      }
    }
  }

  // Draw chips: Evaluate strategically rather than just availability
  const drawChipValues: Record<string, number> = {
    [ChipKind.Draw2]: 2,
    [ChipKind.Draw3]: 3,
    [ChipKind.Draw4]: 4,
    [ChipKind.Draw5]: 5,
    [ChipKind.Draw6]: 6,
    [ChipKind.Draw7]: 7,
  }
  
  const viableDrawChips = chips.filter(chip => {
    const value = drawChipValues[chip.kind]
    if (value === undefined || !hasCardInDeck(deck, value)) return false
    
    const newSum = mySum + value
    if (newSum > effectiveLimitForDraw) return false
    
    // Only use if it significantly improves our position
    const newWinProb = calculateWinProbability(newSum, playerRange.min, playerRange.max, limit, deck)
    return newWinProb.winChance > winProb.winChance + 0.15
  })
  
  if (viableDrawChips.length > 0) {
    // Pick the draw chip that maximizes our winning chances
    const bestDrawChip = viableDrawChips.reduce((best, chip) => {
      const value = drawChipValues[chip.kind]!
      const newSum = mySum + value
      const winChance = calculateWinProbability(newSum, playerRange.min, playerRange.max, limit, deck).winChance
      const bestValue = drawChipValues[best.kind]!
      const bestNewSum = mySum + bestValue
      const bestWinChance = calculateWinProbability(bestNewSum, playerRange.min, playerRange.max, limit, deck).winChance
      return winChance > bestWinChance ? chip : best
    })
    return { type: 'chip', chip: bestDrawChip }
  }

  // Card swap: Enhanced strategic evaluation
  if (
    chips.some((c) => c.kind === ChipKind.SwapCards) &&
    myHand.length >= 2 &&
    playerHand.length >= 2 &&
    myLastCard !== null &&
    playerLastCard !== null
  ) {
    const newSum = mySum - myLastCard + playerLastCard
    if (newSum <= effectiveLimitForDraw && newSum > mySum) {
      const swapWinProb = calculateWinProbability(newSum, playerRange.min - playerLastCard + myLastCard, playerRange.max - playerLastCard + myLastCard, limit, deck)
      if (swapWinProb.winChance > winProb.winChance + 0.1) {
        const c = chips.find((c) => c.kind === ChipKind.SwapCards)!
        return { type: 'chip', chip: c }
      }
    }
  }

  // ---- 4) Hit or Skip: Probabilistic decision making ----
  
  // Don't hit if we're already at or over the limit
  if (mySum >= effectiveLimitForDraw) {
    return { type: 'skip' }
  }
  
  if (deck.length === 0) {
    return { type: 'skip' }
  }
  
  // Calculate expected value of hitting
  const hitWinProbs = inDeck.map(cardValue => {
    const newSum = mySum + cardValue
    if (newSum > effectiveLimitForDraw) {
      return 0 // Bust = automatic loss
    }
    return calculateWinProbability(newSum, playerRange.min, playerRange.max, limit, deck.filter(c => c.value !== cardValue)).winChance
  })
  
  const averageHitWinProb = hitWinProbs.reduce((sum, prob) => sum + prob, 0) / hitWinProbs.length
  const currentWinProb = winProb.winChance
  
  // Use phase strategy for risk tolerance
  const riskTolerance = phaseStrategy.riskTolerance
  
  // Decision logic
  if (averageHitWinProb > currentWinProb + 0.05) { // Hit improves our chances
    const bustChance = inDeck.filter(v => mySum + v > effectiveLimitForDraw).length / inDeck.length
    if (bustChance < (1 - riskTolerance)) {
      return { type: 'hit' }
    }
  }
  
  // Conservative play when we have a reasonable chance of winning
  if (currentWinProb > riskTolerance) {
    return { type: 'skip' }
  }
  
  // Aggressive play when desperate
  if (currentWinProb < 0.3 && winProb.bustChance < 0.7) {
    return { type: 'hit' }
  }
  
  return { type: 'skip' }
}