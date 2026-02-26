# Dave Deck Multiplayer Setup

This document provides instructions for setting up and running the multiplayer functionality in Dave Deck.

## Overview

Dave Deck now supports real-time multiplayer gameplay where you can invite friends to play via shareable invite links. The multiplayer system uses WebSockets (Socket.io) for real-time communication between players.

## Architecture

- **Frontend**: Vue 3 app with Socket.io client
- **Backend**: Node.js WebSocket server with Socket.io
- **Real-time Communication**: All game actions are synchronized between players
- **Session Management**: Room-based system with unique invite codes

## Quick Start

### 1. Install Dependencies

First, install client-side dependencies:
```bash
npm install
```

Then install server dependencies:
```bash
cd server
npm install
```

### 2. Start the Multiplayer Server

```bash
cd server
npm run dev  # Development with auto-restart
# or
npm start   # Production
```

The server will start on `http://localhost:3001`

### 3. Start the Client

In the main directory:
```bash
npm run dev
```

The client will start on `http://localhost:5173`

### 4. Play Multiplayer

1. Navigate to `http://localhost:5173`
2. Click "👥 Multiplayer" 
3. Click "🎮 Create Game" to host a session
4. Share the invite link or session code with a friend
5. When both players are in the lobby, the host can start the game

## Configuration

### Environment Variables

**Client (`.env`):**
```env
VITE_WEBSOCKET_URL=http://localhost:3001
```

**Production (`.env.production`):**
```env
VITE_WEBSOCKET_URL=https://your-production-server.com
```

### Server Configuration

The server can be configured via environment variables:

```bash
PORT=3001                    # Server port (default: 3001)
NODE_ENV=production         # Environment mode
```

## Features

### Implemented Features

✅ **Real-time Game Sync**: All game actions (hit, skip, chip usage) are synchronized instantly  
✅ **Invite System**: Share games via links or 6-character codes  
✅ **Lobby System**: Waiting room with player status indicators  
✅ **Connection Status**: Visual indicators for connection state  
✅ **Rematch System**: Request/accept rematches after games end  
✅ **Graceful Disconnection**: Handle player disconnections properly  
✅ **Turn Management**: Proper turn-based gameplay with validation  
✅ **Animation Sync**: Coordinate animations between both players  

### Game Flow

1. **Create Session**: Host creates a game session and receives invite code
2. **Join Session**: Friend joins using invite link or session code  
3. **Lobby**: Both players see each other in the waiting room
4. **Start Game**: Host starts the game when both players are ready
5. **Play**: Turn-based gameplay with real-time synchronization
6. **Game Over**: Players can request rematch or disconnect

## API Reference

### Client Events

**Outgoing (Client → Server):**
- `create-session` - Create new game session
- `join-session` - Join existing session by ID
- `start-game` - Start the game (host only)
- `game-action` - Send game action (hit/skip/chip)
- `game-over` - Game ended
- `request-rematch` - Request rematch
- `rematch-response` - Accept/decline rematch

**Incoming (Server → Client):**
- `session-created` - Session created successfully
- `session-joined` - Successfully joined session
- `join-failed` - Failed to join session
- `player-joined` - Another player joined
- `player-disconnected` - Player left session
- `game-started` - Game has started
- `game-state-update` - Receive opponent's game action
- `game-ended` - Game over
- `rematch-requested` - Opponent wants rematch
- `rematch-accepted` - Rematch accepted
- `rematch-declined` - Rematch declined

### REST Endpoints

- `GET /health` - Server health check
- `GET /api/sessions/:id` - Get session info (debugging)

## Development

### Running in Development

1. **Server**: `cd server && npm run dev`
2. **Client**: `npm run dev`
3. Navigate to `http://localhost:5173`

### Testing Multiplayer

1. Open two browser windows/tabs
2. Create session in one window
3. Copy invite link and paste in second window
4. Test real-time synchronization

### Debugging

- Server logs all major events (session creation, player actions, etc.)
- Client shows connection status indicators
- Use browser dev tools to inspect WebSocket messages

## Deployment

### Backend Deployment

Deploy the `server/` directory to your Node.js hosting platform:

```bash
# Build and run server
cd server
npm install --production
npm start
```

Common platforms:
- **Heroku**: Add `Procfile` with `web: node server.js`
- **Railway**: Auto-deploys from `server/package.json`
- **DigitalOcean**: Use App Platform with Node.js buildpack
- **AWS**: Deploy via Elastic Beanstalk or EC2

### Frontend Deployment

Update `.env.production` with your server URL:

```env
VITE_WEBSOCKET_URL=https://your-server-domain.com
```

Build and deploy:
```bash
npm run build
# Deploy 'dist/' folder to static hosting (Vercel, Netlify, etc.)
```

### CORS Configuration

Ensure your production server URL is added to CORS configuration in `server/server.js`:

```js
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? ["https://your-client-domain.com"]
  : ["http://localhost:5173"]
```

## Troubleshooting

### Connection Issues

**Client can't connect to server:**
- Check `VITE_WEBSOCKET_URL` in `.env`
- Ensure server is running on correct port
- Check CORS configuration
- Verify firewall settings

**Players can't join sessions:**
- Confirm both players are connected (`Connected` status)
- Check server logs for errors
- Try refreshing both browser windows

### Game Sync Issues

**Actions not syncing:**
- Check connection status indicators
- Verify both players are in same session
- Look for WebSocket errors in console

**Animation conflicts:**
- Game blocks actions during animations
- Wait for animations to complete before next action

### Performance

**High latency:**
- Use geographically closer servers
- Check network connection quality
- Consider server hardware/resource limits

## Security Considerations

- All game actions are validated server-side
- Session codes are randomly generated and unique
- Player input is sanitized before processing
- WebSocket connections use secure protocols in production (WSS)

## Future Enhancements

Potential improvements for multiplayer:

- **Spectator Mode**: Allow others to watch games
- **Private Sessions**: Password-protected games  
- **Player Profiles**: User accounts and statistics
- **Tournament Mode**: Multi-player tournaments
- **Replay System**: Save and replay games
- **Voice Chat**: Integrated communication
- **Mobile App**: Native mobile client

For questions or issues, please check the main repository documentation.