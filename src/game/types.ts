/**
 * Dave Deck – Spiel-Typen (vgl. rules.md)
 * Karten 1–11, ein Deck, zwei Spieler, Chips.
 */

export const DEFAULT_LIMIT = 21
export const INITIAL_LIVES = 5
export const CHIP_DRAW_CHANCE = 0.5

/** Kartenwert 1–11 (keine Bildkarten, kein Ass) */
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export interface Card {
  value: CardValue
  /** Eindeutige ID für Animation/Key (z. B. "7-0") */
  id: string
}

export type PlayerId = 'player' | 'opponent'

/** Chip-Typen laut rules.md §5 */
export enum ChipKind {
  Draw2 = 'draw_2',
  Draw3 = 'draw_3',
  Draw4 = 'draw_4',
  Draw5 = 'draw_5',
  Draw6 = 'draw_6',
  Draw7 = 'draw_7',
  Limit17 = 'limit_17',
  Limit24 = 'limit_24',
  Limit27 = 'limit_27',
  SwapCards = 'swap_cards',
  StakePlus1 = 'stake_plus_1',
  StakePlus2 = 'stake_plus_2',
  ReturnMyCard = 'return_my_card',
  ReturnOpponentCard = 'return_opponent_card',
  PerfectDraw = 'perfect_draw',
  Shield = 'shield',
  ShieldPlus = 'shield_plus',
}

export interface Chip {
  kind: ChipKind
  id: string
}

export interface PlayerState {
  id: PlayerId
  lives: number
  /** Nur die Startkarte ist ggf. verdeckt; Rest sichtbar */
  hand: Card[]
  /** Chips in dieser Runde (beide sehen die des Gegners) */
  chips: Chip[]
  /** Versteckte Startkarte (nur für diesen Spieler sichtbar im UI) */
  hasHiddenCard: boolean
}

/** Runden-Limit (Standard 21, Chips können 17/24/27 setzen) */
export type RoundLimit = 17 | 21 | 24 | 27

export interface RoundState {
  /** Aktuelles Limit für diese Runde */
  limit: RoundLimit
  /** Wer ist am Zug (vor Hit/Skip) */
  currentTurn: PlayerId
  /** Deck (verbleibende Karten) */
  deck: Card[]
  /** Beide haben nacheinander Skip gespielt → Runde auswerten */
  lastMoveWasSkip: boolean
  /** Einsatz-Erhöhungen für die *nächste* Niederlage (stapelbar) */
  stakeModifier: number
  /** Schild-Stapel pro Spieler (reduzieren Lebensverlust bei nächster Niederlage) */
  shieldPlayer: number
  shieldOpponent: number
}

export type GamePhase = 'playing' | 'round_result' | 'game_over'

export interface GameState {
  phase: GamePhase
  player: PlayerState
  opponent: PlayerState
  round: RoundState
  /** Sieger der letzten Runde (für Anzeige) */
  lastRoundWinner: PlayerId | 'draw' | null
  /** Sieger des gesamten Spiels (wenn phase === 'game_over') */
  gameWinner: PlayerId | null
}

/** Ergebnis einer Rundenauswertung */
export interface RoundResult {
  winner: PlayerId | 'draw'
  lifeLost: PlayerId | null
  lifeAmount: number
}
