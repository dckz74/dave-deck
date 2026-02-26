/**
 * Rundenauswertung: Wer gewinnt, Lebensabzug (Limit, Bust, Schild, Einsatz).
 * Vgl. rules.md §4 und §5.
 */

import type { PlayerId } from './types'
import type { RoundLimit } from './types'
import type { RoundResult } from './types'

/**
 * Ermittelt Sieger und Lebensabzug für die aktuelle Runde.
 * Beide haben nacheinander Skip gespielt → Karten aufgedeckt, Auswertung.
 */
export function evaluateRound(
  playerSum: number,
  opponentSum: number,
  limit: RoundLimit,
  stakeModifier: number,
  shieldPlayer: number,
  shieldOpponent: number
): RoundResult {
  const playerBust = playerSum > limit
  const opponentBust = opponentSum > limit

  let winner: PlayerId | 'draw' = 'draw'
  let lifeLost: PlayerId | null = null
  let lifeAmount = 1

  if (playerBust && opponentBust) {
    winner = 'draw'
  } else if (playerBust) {
    winner = 'opponent'
    lifeLost = 'player'
    lifeAmount = Math.max(0, 1 + stakeModifier - (lifeLost === 'player' ? shieldPlayer : shieldOpponent))
  } else if (opponentBust) {
    winner = 'player'
    lifeLost = 'opponent'
    lifeAmount = Math.max(0, 1 + stakeModifier - (lifeLost === 'opponent' ? shieldOpponent : shieldPlayer))
  } else if (playerSum > opponentSum) {
    winner = 'player'
    lifeLost = 'opponent'
    lifeAmount = Math.max(0, 1 + stakeModifier - shieldOpponent)
  } else if (opponentSum > playerSum) {
    winner = 'opponent'
    lifeLost = 'player'
    lifeAmount = Math.max(0, 1 + stakeModifier - shieldPlayer)
  }

  return { winner, lifeLost, lifeAmount }
}
