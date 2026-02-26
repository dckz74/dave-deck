import { describe, it, expect } from 'vitest'
import { evaluateRound } from './round'

describe('evaluateRound', () => {
  it('both under limit: higher sum wins', () => {
    const r = evaluateRound(20, 18, 21, 0, 0, 0)
    expect(r.winner).toBe('player')
    expect(r.lifeLost).toBe('opponent')
    expect(r.lifeAmount).toBe(1)
  })

  it('both bust: draw', () => {
    const r = evaluateRound(22, 25, 21, 0, 0, 0)
    expect(r.winner).toBe('draw')
    expect(r.lifeLost).toBeNull()
  })

  it('player bust: opponent wins, player loses 1 life', () => {
    const r = evaluateRound(23, 20, 21, 0, 0, 0)
    expect(r.winner).toBe('opponent')
    expect(r.lifeLost).toBe('player')
    expect(r.lifeAmount).toBe(1)
  })

  it('stake modifier +1: loser loses 2 life', () => {
    const r = evaluateRound(20, 18, 21, 1, 0, 0)
    expect(r.lifeAmount).toBe(2)
  })

  it('shield reduces life lost', () => {
    const r = evaluateRound(20, 18, 21, 0, 0, 1)
    expect(r.lifeLost).toBe('opponent')
    expect(r.lifeAmount).toBe(0)
  })
})
