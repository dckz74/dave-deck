/**
 * Deck-Logik: Karten 1–11, einmalig. Mischen, Ziehen.
 */

import type { Card, CardValue } from './types'

const CARD_VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

let cardIdCounter = 0
function nextCardId(): string {
  return `card-${cardIdCounter++}`
}

/** Erstellt ein frisches Deck (11 Karten 1–11), optional gemischt. */
export function createDeck(shuffle = true): Card[] {
  const deck: Card[] = CARD_VALUES.map(value => ({ value, id: nextCardId() }))
  if (shuffle) shuffleDeck(deck)
  return deck
}

/** Fisher-Yates in-place. */
export function shuffleDeck(deck: Card[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
}

/** Entfernt und gibt die erste Karte zurück, oder undefined wenn leer. */
export function drawFromDeck(deck: Card[]): Card | undefined {
  return deck.shift()
}

/** Sucht eine Karte mit value im Deck, entfernt sie und gibt sie zurück. */
export function drawCardByValue(deck: Card[], value: CardValue): Card | undefined {
  const idx = deck.findIndex(c => c.value === value)
  if (idx === -1) return undefined
  const [card] = deck.splice(idx, 1)
  return card
}

/** Gibt die „beste“ Karte für einen gegebenen Handwert und Limit zurück (Perfect Draw). */
export function getBestCardValue(handSum: number, limit: number): CardValue | undefined {
  const target = limit - handSum
  if (target < 1 || target > 11) return undefined
  return target as CardValue
}
