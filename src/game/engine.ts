/**
 * Spiel-Engine: Initialisierung, Hit, Skip, Chip-Effekte.
 * Reine Logik – keine Vue/Pinia. Vgl. rules.md.
 */

import { createDeck, drawFromDeck, drawCardByValue, shuffleDeck, getBestCardValue } from './deck'
import { evaluateRound } from './round'
import {
  DEFAULT_LIMIT,
  INITIAL_LIVES,
  CHIP_DRAW_CHANCE,
  ChipKind,
  type Card,
  type CardValue,
  type Chip,
  type GameState,
  type PlayerId,
  type RoundLimit,
} from './types'

let chipIdCounter = 0
function nextChipId(): string {
  return `chip-${chipIdCounter++}`
}

/** Ob ein Chip ein "Zieh X" ist (Wert 2–7). */
export function isDrawValueChip(
  kind: ChipKind
): kind is
  | ChipKind.Draw2
  | ChipKind.Draw3
  | ChipKind.Draw4
  | ChipKind.Draw5
  | ChipKind.Draw6
  | ChipKind.Draw7 {
  return [
    ChipKind.Draw2,
    ChipKind.Draw3,
    ChipKind.Draw4,
    ChipKind.Draw5,
    ChipKind.Draw6,
    ChipKind.Draw7,
  ].includes(kind)
}

/** Ob ein Chip das Limit verschiebt (17/24/27). */
export function isLimitChip(
  kind: ChipKind
): kind is ChipKind.Limit17 | ChipKind.Limit24 | ChipKind.Limit27 {
  return [ChipKind.Limit17, ChipKind.Limit24, ChipKind.Limit27].includes(kind)
}

function limitFromChip(kind: ChipKind.Limit17 | ChipKind.Limit24 | ChipKind.Limit27): RoundLimit {
  switch (kind) {
    case ChipKind.Limit17:
      return 17
    case ChipKind.Limit24:
      return 24
    case ChipKind.Limit27:
      return 27
    default:
      return DEFAULT_LIMIT
  }
}

function handSum(hand: Card[]): number {
  return hand.reduce((s, c) => s + c.value, 0)
}

/** Neues Spiel: 2 Startkarten (je 1 pro Spieler), 9 im Deck. */
export function createInitialState(startingPlayer: PlayerId = 'player'): GameState {
  const deck = createDeck(true)
  const playerCard = drawFromDeck(deck)!
  const opponentCard = drawFromDeck(deck)!

  return {
    phase: 'playing',
    player: {
      id: 'player',
      lives: INITIAL_LIVES,
      hand: [playerCard],
      chips: [],
      hasHiddenCard: true,
    },
    opponent: {
      id: 'opponent',
      lives: INITIAL_LIVES,
      hand: [opponentCard],
      chips: [],
      hasHiddenCard: true,
    },
    round: {
      limit: DEFAULT_LIMIT,
      currentTurn: startingPlayer,
      deck,
      lastMoveWasSkip: false,
      stakeModifier: 0,
      shieldPlayer: 0,
      shieldOpponent: 0,
    },
    lastRoundWinner: null,
    gameWinner: null,
  }
}

/** 50 % Chance: neuer Chip wird hinzugefügt. Gibt den neuen Chip oder null zurück. */
export function maybeGrantChip(): Chip | null {
  if (Math.random() < CHIP_DRAW_CHANCE) {
    const kinds = Object.values(ChipKind)
    const kind = kinds[Math.floor(Math.random() * kinds.length)] as ChipKind
    return { kind, id: nextChipId() }
  }
  return null
}

/** Deep clone eines GameState (für immutable Updates). */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state))
}

/** Wendet Lebensverlust an und prüft Game Over. */
function applyLifeLoss(state: GameState, who: PlayerId, amount: number): GameState {
  const s = cloneState(state)
  const p = who === 'player' ? s.player : s.opponent
  p.lives = Math.max(0, p.lives - amount)
  if (p.lives <= 0) {
    s.phase = 'game_over'
    s.gameWinner = who === 'player' ? 'opponent' : 'player'
  }
  return s
}

/** Optionen für startNewRound: Chips explizit übergeben (Single Source of Truth im Aufrufer). */
export interface StartNewRoundOptions {
  playerChips: Chip[]
  opponentChips: Chip[]
  startingPlayer?: PlayerId // Optional: who starts the round (defaults to 'player')
}

/** Start einer neuen Runde: frisches Deck, je 1 Startkarte, 9 im Deck. Limit/Shields zurückgesetzt. Chips kommen ausschließlich aus options (kein Lesen aus state). */
export function startNewRound(state: GameState, options: StartNewRoundOptions): GameState {
  const s = cloneState(state)
  s.round.limit = DEFAULT_LIMIT
  s.round.lastMoveWasSkip = false
  s.round.stakeModifier = 0
  s.round.shieldPlayer = 0
  s.round.shieldOpponent = 0
  const deck = createDeck(true)
  const pCard = drawFromDeck(deck)!
  const oCard = drawFromDeck(deck)!
  s.player.hand = [pCard]
  s.opponent.hand = [oCard]
  s.player.hasHiddenCard = true
  s.opponent.hasHiddenCard = true
  s.round.deck = deck
  s.round.currentTurn = options.startingPlayer || 'player'
  s.lastRoundWinner = null
  s.phase = 'playing'
  s.player.chips = options.playerChips.map(c => ({ kind: c.kind, id: c.id }))
  s.opponent.chips = options.opponentChips.map(c => ({ kind: c.kind, id: c.id }))
  return s
}

/** Nach Chip-Nutzung: Chip ist verbraucht, „Doppel-Skip" wird zurückgesetzt, aber Zug bleibt beim aktuellen Spieler. */
function afterChipUsed(s: GameState): void {
  s.round.lastMoveWasSkip = false
  // Zug wechselt NICHT - Spieler kann weitere Chips nutzen oder Hit/Skip machen
}

/** Chip anwenden. Chip wird immer verbraucht; wirkt nichts (z. B. Karte nicht im Deck), passiert nur nichts. Nach Chip-Einsatz ist der andere Spieler dran und darf wieder Hit/Skip. */
export function useChip(state: GameState, playerId: PlayerId, chip: Chip): GameState | null {
  if (state.phase !== 'playing' || state.round.currentTurn !== playerId) return null
  const me = playerId === 'player' ? state.player : state.opponent
  const chipIndex = me.chips.findIndex(c => c.id === chip.id)
  if (chipIndex === -1) return null

  const s = cloneState(state)
  const myHand = playerId === 'player' ? s.player : s.opponent
  const otherHand = playerId === 'player' ? s.opponent : s.player
  const deck = s.round.deck

  const removeChip = () => {
    myHand.chips.splice(
      myHand.chips.findIndex(c => c.id === chip.id),
      1
    )
  }

  switch (chip.kind) {
    case ChipKind.Draw2:
    case ChipKind.Draw3:
    case ChipKind.Draw4:
    case ChipKind.Draw5:
    case ChipKind.Draw6:
    case ChipKind.Draw7: {
      const value =
        chip.kind === ChipKind.Draw2
          ? 2
          : chip.kind === ChipKind.Draw3
            ? 3
            : chip.kind === ChipKind.Draw4
              ? 4
              : chip.kind === ChipKind.Draw5
                ? 5
                : chip.kind === ChipKind.Draw6
                  ? 6
                  : 7
      const card = drawCardByValue(deck, value as CardValue)
      if (card) myHand.hand.push(card)
      removeChip()
      afterChipUsed(s)
      return s
    }
    case ChipKind.Limit17:
    case ChipKind.Limit24:
    case ChipKind.Limit27:
      s.round.limit = limitFromChip(chip.kind)
      removeChip()
      afterChipUsed(s)
      return s
    case ChipKind.SwapCards: {
      if (myHand.hand.length >= 2 && otherHand.hand.length >= 2) {
        const myLast = myHand.hand[myHand.hand.length - 1]
        const otherLast = otherHand.hand[otherHand.hand.length - 1]
        myHand.hand[myHand.hand.length - 1] = otherLast
        otherHand.hand[otherHand.hand.length - 1] = myLast
      }
      removeChip()
      afterChipUsed(s)
      return s
    }
    case ChipKind.StakePlus1:
      s.round.stakeModifier += 1
      removeChip()
      afterChipUsed(s)
      return s
    case ChipKind.StakePlus2:
      s.round.stakeModifier += 2
      removeChip()
      afterChipUsed(s)
      return s
    case ChipKind.ReturnMyCard: {
      if (myHand.hand.length >= 2) {
        const last = myHand.hand.pop()!
        deck.push(last)
        s.round.deck = [...deck]
        shuffleDeck(s.round.deck)
      }
      removeChip()
      afterChipUsed(s)
      return s
    }
    case ChipKind.ReturnOpponentCard: {
      if (otherHand.hand.length >= 2) {
        const last = otherHand.hand.pop()!
        deck.push(last)
        s.round.deck = [...deck]
        shuffleDeck(s.round.deck)
      }
      removeChip()
      afterChipUsed(s)
      return s
    }
    case ChipKind.PerfectDraw: {
      const sum = handSum(myHand.hand)
      const bestValue = getBestCardValue(sum, s.round.limit)
      const card = bestValue !== undefined ? drawCardByValue(deck, bestValue) : undefined
      if (card) myHand.hand.push(card)
      removeChip()
      afterChipUsed(s)
      return s
    }
    case ChipKind.Shield:
      if (playerId === 'player') s.round.shieldPlayer += 1
      else s.round.shieldOpponent += 1
      removeChip()
      afterChipUsed(s)
      return s
    case ChipKind.ShieldPlus:
      if (playerId === 'player') s.round.shieldPlayer += 2
      else s.round.shieldOpponent += 2
      removeChip()
      afterChipUsed(s)
      return s
    default:
      return null
  }
}

/** Hit: eine Karte ziehen, ggf. Chip bekommen, Zug Ende. Wenn das Deck leer wird, Runde automatisch beenden. */
export function hit(state: GameState, playerId: PlayerId): { state: GameState; roundResult?: { winner: PlayerId | 'draw'; lifeLost: PlayerId | null; lifeAmount: number } } | null {
  if (state.phase !== 'playing' || state.round.currentTurn !== playerId) return null
  const card = drawFromDeck(state.round.deck)
  if (!card) return null // Deck is empty - let caller handle this
  const s = cloneState(state)
  const p = playerId === 'player' ? s.player : s.opponent
  p.hand.push(card)
  const newChip = maybeGrantChip()
  if (newChip) p.chips.push(newChip)
  
  // Check if deck is now empty after drawing - if so, end the round immediately
  if (s.round.deck.length === 0) {
    // Reveal hidden cards
    s.player.hasHiddenCard = false
    s.opponent.hasHiddenCard = false
    
    const playerSum = s.player.hand.reduce((sum, card) => sum + card.value, 0)
    const opponentSum = s.opponent.hand.reduce((sum, card) => sum + card.value, 0)
    
    const result = evaluateRound(
      playerSum,
      opponentSum,
      s.round.limit,
      s.round.stakeModifier,
      s.round.shieldPlayer,
      s.round.shieldOpponent
    )
    
    if (result.lifeLost && result.lifeAmount > 0) {
      const next = applyLifeLoss(s, result.lifeLost, result.lifeAmount)
      next.lastRoundWinner = result.winner
      if (next.phase === 'game_over') {
        return {
          state: next,
          roundResult: {
            winner: result.winner,
            lifeLost: result.lifeLost,
            lifeAmount: result.lifeAmount,
          },
        }
      }
      next.phase = 'round_result'
      return {
        state: next,
        roundResult: {
          winner: result.winner,
          lifeLost: result.lifeLost,
          lifeAmount: result.lifeAmount,
        },
      }
    }
    s.lastRoundWinner = result.winner
    s.phase = 'round_result'
    return {
      state: s,
      roundResult: {
        winner: result.winner,
        lifeLost: result.lifeLost,
        lifeAmount: result.lifeAmount,
      },
    }
  }
  
  s.round.currentTurn = playerId === 'player' ? 'opponent' : 'player'
  s.round.lastMoveWasSkip = false
  return { state: s }
}

/** Skip: Zug Ende. Wenn Gegner zuletzt auch Skip gemacht hat → Runde auswerten. */
export function skip(
  state: GameState,
  playerId: PlayerId
): {
  state: GameState
  roundResult?: { winner: PlayerId | 'draw'; lifeLost: PlayerId | null; lifeAmount: number }
} {
  if (state.phase !== 'playing' || state.round.currentTurn !== playerId) return { state }
  const s = cloneState(state)
  const wasSkip = s.round.lastMoveWasSkip
  s.round.lastMoveWasSkip = true
  s.round.currentTurn = playerId === 'player' ? 'opponent' : 'player'

  if (wasSkip) {
    s.player.hasHiddenCard = false
    s.opponent.hasHiddenCard = false
    const playerSum = handSum(s.player.hand)
    const opponentSum = handSum(s.opponent.hand)
    const result = evaluateRound(
      playerSum,
      opponentSum,
      s.round.limit,
      s.round.stakeModifier,
      s.round.shieldPlayer,
      s.round.shieldOpponent
    )
    if (result.lifeLost && result.lifeAmount > 0) {
      const next = applyLifeLoss(s, result.lifeLost, result.lifeAmount)
      next.lastRoundWinner = result.winner
      if (next.phase === 'game_over') {
        return {
          state: next,
          roundResult: {
            winner: result.winner,
            lifeLost: result.lifeLost,
            lifeAmount: result.lifeAmount,
          },
        }
      }
      next.phase = 'round_result'
      return {
        state: next,
        roundResult: {
          winner: result.winner,
          lifeLost: result.lifeLost,
          lifeAmount: result.lifeAmount,
        },
      }
    }
    s.lastRoundWinner = result.winner
    s.phase = 'round_result'
    return {
      state: s,
      roundResult: {
        winner: result.winner,
        lifeLost: result.lifeLost,
        lifeAmount: result.lifeAmount,
      },
    }
  }
  return { state: s }
}
