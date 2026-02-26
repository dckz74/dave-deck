# Dave Deck

Black-Jack-artiges Kartenspiel mit Karten 1–11, einem gemeinsamen Deck und Chips.  
Regeln und Scope: **rules.md**.

## Tech-Stack

- **Frontend**: Vue 3 + TypeScript + Vite + PWA
- **Backend**: Node.js + Express + Socket.IO (multiplayer)

## Quick Start

### Development Setup
```bash
# Automatic setup (recommended)
./scripts/setup-dev.sh

# Manual setup
npm install
cd server && npm install && cd ..
```

### Running Locally
```bash
# Frontend (Terminal 1)
npm run dev       # http://localhost:5173

# Backend (Terminal 2) 
cd server && npm run dev  # http://localhost:3001
```

### Production Deployment
See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete hosting instructions using Vercel + Koyeb.

## Scripts

```bash
npm run build     # Production build → dist/
npm run preview   # Preview production build
npm run test:run  # Run unit tests (Vitest)
```

## Projektstruktur

- **`src/game/`** – reine Spiel-Logik (ohne Vue):
  - `types.ts` – Karten, Chips, Spieler, Runde, GameState
  - `chips.ts` – Chip-Definitionen (Namen, Tooltips)
  - `deck.ts` – Deck erstellen, mischen, ziehen
  - `round.ts` – Rundenauswertung (Sieger, Lebensabzug)
  - `engine.ts` – Hit, Skip, Chip nutzen, neue Runde
- **`src/stores/game.ts`** – Pinia-Store (ruft Engine auf)
- **`src/views/`** – Home, Game
- **`src/components/`** – GameTable, GameCard, ChipList, GameOverlay

## Nächste Schritte (aus rules.md)

- KI: Chips einsetzen, versteckte Karte abschätzen
- Animationen: Karten ziehen (GPU-freundlich), Gewinn/Verlust
- Audio: Karten, Skip, Runde, Chip, Musik
- Statistiken (lokal speichern)
- i18n vorbereiten (derzeit Deutsch)
