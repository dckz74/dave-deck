import { describe, it, expect } from 'vitest'
import { createInitialState, hit, skip, startNewRound } from './engine'
import { ChipKind } from './types'

describe('engine', () => {
  it('createInitialState: 2 hands of 1 card, 9 in deck', () => {
    const s = createInitialState()
    expect(s.player.hand).toHaveLength(1)
    expect(s.opponent.hand).toHaveLength(1)
    expect(s.round.deck).toHaveLength(9)
    expect(s.round.currentTurn).toBe('player')
    expect(s.player.lives).toBe(5)
    expect(s.opponent.lives).toBe(5)
  })

  it('hit: draws card, switches turn', () => {
    const s = createInitialState()
    const next = hit(s, 'player')
    expect(next).not.toBeNull()
    expect(next!.player.hand).toHaveLength(2)
    expect(next!.round.deck).toHaveLength(8)
    expect(next!.round.currentTurn).toBe('opponent')
  })

  it('skip: first skip switches turn', () => {
    const s = createInitialState()
    const { state: next } = skip(s, 'player')
    expect(next.round.currentTurn).toBe('opponent')
    expect(next.round.lastMoveWasSkip).toBe(true)
  })

  it('startNewRound: fresh deck, 1 card each, 9 in deck', () => {
    const s = createInitialState()
    const next = startNewRound(s, { playerChips: [], opponentChips: [] })
    expect(next.player.hand).toHaveLength(1)
    expect(next.opponent.hand).toHaveLength(1)
    expect(next.round.deck).toHaveLength(9)
    expect(next.phase).toBe('playing')
    expect(next.round.currentTurn).toBe('player')
  })

  it('startNewRound: chips come only from options (persistence)', () => {
    const s = createInitialState()
    const playerChips = [{ kind: ChipKind.PerfectDraw, id: 'chip-1' }]
    const opponentChips = [{ kind: ChipKind.Draw3, id: 'chip-2' }]
    const next = startNewRound(s, { playerChips, opponentChips })
    expect(next.player.chips).toHaveLength(1)
    expect(next.player.chips[0].kind).toBe(ChipKind.PerfectDraw)
    expect(next.opponent.chips).toHaveLength(1)
    expect(next.opponent.chips[0].kind).toBe(ChipKind.Draw3)
  })

  it('skip: double skip transitions to round_result and provides roundResult', () => {
    // Start with initial state
    const s = createInitialState()

    // First player skips
    const { state: afterPlayerSkip } = skip(s, 'player')
    expect(afterPlayerSkip.phase).toBe('playing')
    expect(afterPlayerSkip.round.lastMoveWasSkip).toBe(true)
    expect(afterPlayerSkip.round.currentTurn).toBe('opponent')

    // Opponent skips - should trigger round evaluation
    const { state: afterOpponentSkip, roundResult } = skip(afterPlayerSkip, 'opponent')
    expect(afterOpponentSkip.phase).toBe('round_result') // Critical: must be round_result
    expect(roundResult).toBeDefined()
    expect(roundResult!.winner).toBeDefined()
    expect(afterOpponentSkip.player.hasHiddenCard).toBe(false)
    expect(afterOpponentSkip.opponent.hasHiddenCard).toBe(false)

    // Verify that startNewRound can transition from round_result back to playing
    const playerChips = afterOpponentSkip.player.chips.map(c => ({ kind: c.kind, id: c.id }))
    const opponentChips = afterOpponentSkip.opponent.chips.map(c => ({ kind: c.kind, id: c.id }))
    const nextRound = startNewRound(afterOpponentSkip, { playerChips, opponentChips })

    expect(nextRound.phase).toBe('playing') // Critical: must return to playing
    expect(nextRound.round.currentTurn).toBe('player')
    expect(nextRound.player.hasHiddenCard).toBe(true)
    expect(nextRound.opponent.hasHiddenCard).toBe(true)
  })
})
