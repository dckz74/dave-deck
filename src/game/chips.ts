/**
 * Chip-Definitionen: IDs, Namen, Tooltips (vgl. rules.md §5).
 * Keine Spiel-Logik hier – nur Daten für UI und Lookup.
 */

import { ChipKind } from './types'

export interface ChipDef {
  kind: ChipKind
  name: string
  shortName: string
  description: string
  /** Für Zieh-X: der Wert 2–7; für Limit: 17|24|27; für Stake: 1|2; für Schild: 1|2 */
  value?: number
}

export const CHIP_DEFS: Record<ChipKind, ChipDef> = {
  [ChipKind.Draw2]: {
    kind: ChipKind.Draw2,
    name: 'Zieh 2',
    shortName: '2',
    description: 'Zieht sofort die Karte 2 aus dem Deck. Wenn nicht mehr im Deck, passiert nichts.',
    value: 2,
  },
  [ChipKind.Draw3]: {
    kind: ChipKind.Draw3,
    name: 'Zieh 3',
    shortName: '3',
    description: 'Zieht sofort die Karte 3 aus dem Deck.',
    value: 3,
  },
  [ChipKind.Draw4]: {
    kind: ChipKind.Draw4,
    name: 'Zieh 4',
    shortName: '4',
    description: 'Zieht sofort die Karte 4 aus dem Deck.',
    value: 4,
  },
  [ChipKind.Draw5]: {
    kind: ChipKind.Draw5,
    name: 'Zieh 5',
    shortName: '5',
    description: 'Zieht sofort die Karte 5 aus dem Deck.',
    value: 5,
  },
  [ChipKind.Draw6]: {
    kind: ChipKind.Draw6,
    name: 'Zieh 6',
    shortName: '6',
    description: 'Zieht sofort die Karte 6 aus dem Deck.',
    value: 6,
  },
  [ChipKind.Draw7]: {
    kind: ChipKind.Draw7,
    name: 'Zieh 7',
    shortName: '7',
    description: 'Zieht sofort die Karte 7 aus dem Deck.',
    value: 7,
  },
  [ChipKind.Limit17]: {
    kind: ChipKind.Limit17,
    name: 'Limit 17',
    shortName: '17',
    description: 'Setzt das Limit für diese Runde auf 17. Gilt für beide Spieler.',
    value: 17,
  },
  [ChipKind.Limit24]: {
    kind: ChipKind.Limit24,
    name: 'Limit 24',
    shortName: '24',
    description: 'Setzt das Limit für diese Runde auf 24. Gilt für beide Spieler.',
    value: 24,
  },
  [ChipKind.Limit27]: {
    kind: ChipKind.Limit27,
    name: 'Limit 27',
    shortName: '27',
    description: 'Setzt das Limit für diese Runde auf 27. Gilt für beide Spieler.',
    value: 27,
  },
  [ChipKind.SwapCards]: {
    kind: ChipKind.SwapCards,
    name: 'Karten tauschen',
    shortName: 'Tausch',
    description: 'Tauscht deine zuletzt gezogene Karte mit der zuletzt gezogenen Karte des Gegners.',
  },
  [ChipKind.StakePlus1]: {
    kind: ChipKind.StakePlus1,
    name: 'Einsatz +1',
    shortName: '+1',
    description: 'Bei der nächsten Niederlage verliert der Verlierer 2 Leben statt 1. Stapelbar.',
    value: 1,
  },
  [ChipKind.StakePlus2]: {
    kind: ChipKind.StakePlus2,
    name: 'Einsatz +2',
    shortName: '+2',
    description: 'Bei der nächsten Niederlage verliert der Verlierer 3 Leben statt 1. Stapelbar.',
    value: 2,
  },
  [ChipKind.ReturnMyCard]: {
    kind: ChipKind.ReturnMyCard,
    name: 'Meine Karte zurücklegen',
    shortName: 'Zurück (ich)',
    description: 'Legt deine zuletzt gezogene Karte zurück ins Deck und mischt den Rest.',
  },
  [ChipKind.ReturnOpponentCard]: {
    kind: ChipKind.ReturnOpponentCard,
    name: 'Gegner-Karte zurücklegen',
    shortName: 'Zurück (Gegner)',
    description: 'Legt die zuletzt gezogene Karte des Gegners zurück ins Deck und mischt.',
  },
  [ChipKind.PerfectDraw]: {
    kind: ChipKind.PerfectDraw,
    name: 'Perfect Draw',
    shortName: 'Perfect',
    description: 'Zieht die für dich beste Karte, wenn noch verfügbar (z. B. bei 13 und Limit 21 die 8).',
  },
  [ChipKind.Shield]: {
    kind: ChipKind.Shield,
    name: 'Schild',
    shortName: 'Schild',
    description: 'Reduziert das Leben, das du bei deiner nächsten Niederlage verlierst, um 1. Stapelbar.',
    value: 1,
  },
  [ChipKind.ShieldPlus]: {
    kind: ChipKind.ShieldPlus,
    name: 'Schild+',
    shortName: 'Schild+',
    description: 'Reduziert das Leben, das du bei deiner nächsten Niederlage verlierst, um 2. Stapelbar.',
    value: 2,
  },
}
