import { describe, it, expect, beforeEach } from 'vitest'
import { createDeck, drawFromDeck, drawCardByValue, getBestCardValue } from './deck'

describe('deck', () => {
  beforeEach(() => {
    // optional: reset state if needed
  })

  it('createDeck returns 11 cards with values 1-11', () => {
    const deck = createDeck(false)
    expect(deck).toHaveLength(11)
    const values = deck.map(c => c.value).sort((a, b) => a - b)
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('drawFromDeck removes and returns first card', () => {
    const deck = createDeck(false)
    const first = deck[0]
    const drawn = drawFromDeck(deck)
    expect(drawn).toEqual(first)
    expect(deck).toHaveLength(10)
  })

  it('drawCardByValue finds and removes card', () => {
    const deck = createDeck(false)
    const card = drawCardByValue(deck, 7)
    expect(card?.value).toBe(7)
    expect(deck).toHaveLength(10)
    expect(deck.every(c => c.value !== 7)).toBe(true)
  })

  it('drawCardByValue returns undefined if value not in deck', () => {
    const deck = createDeck(false)
    drawCardByValue(deck, 7)
    const again = drawCardByValue(deck, 7)
    expect(again).toBeUndefined()
  })

  it('getBestCardValue returns ideal card for limit', () => {
    expect(getBestCardValue(13, 21)).toBe(8)
    expect(getBestCardValue(20, 21)).toBe(1)
    expect(getBestCardValue(10, 17)).toBe(7)
  })

  it('getBestCardValue returns undefined when target out of range', () => {
    expect(getBestCardValue(20, 21)).toBe(1)
    expect(getBestCardValue(21, 21)).toBeUndefined()
    expect(getBestCardValue(15, 17)).toBe(2)
  })
})
