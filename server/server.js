import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import SessionStorage from './storage.js'

const app = express()
const server = createServer(app)

// Configure CORS for both Express and Socket.io
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL, // Main production frontend URL
      /\.vercel\.app$/, // Allow all Vercel preview deployments
      /localhost:\d+$/ // Allow localhost for development
    ].filter(Boolean) // Remove undefined values
  : true // Allow all origins in development

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  }
})

// Initialize session storage (Redis in production, in-memory in development)
const storage = new SessionStorage()

/**
 * Flip game state perspective for multiplayer
 * Swaps player/opponent and adjusts turn and shields
 */
function flipGameState(gameState) {
  return {
    ...gameState,
    player: gameState.opponent,
    opponent: gameState.player,
    // Flip the lastRoundWinner perspective
    lastRoundWinner: gameState.lastRoundWinner === 'player' ? 'opponent' : 
                    gameState.lastRoundWinner === 'opponent' ? 'player' : 
                    gameState.lastRoundWinner, // Keep 'draw' and null as-is
    round: {
      ...gameState.round,
      currentTurn: gameState.round.currentTurn === 'player' ? 'opponent' : 'player',
      shieldPlayer: gameState.round.shieldOpponent,
      shieldOpponent: gameState.round.shieldPlayer
    }
  }
}

/**
 * Flip round result perspective for multiplayer
 * Swaps player/opponent in lifeLost and winner fields
 */
function flipRoundResult(roundResult) {
  if (!roundResult) return roundResult
  
  return {
    ...roundResult,
    winner: roundResult.winner === 'player' ? 'opponent' : 
            roundResult.winner === 'opponent' ? 'player' : 
            roundResult.winner, // Keep 'draw' as-is
    lifeLost: roundResult.lifeLost === 'player' ? 'opponent' :
              roundResult.lifeLost === 'opponent' ? 'player' :
              roundResult.lifeLost // Keep null as-is
  }
}

/**
 * Generate a short, shareable room code (e.g., "ABC123")
 */
async function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // Ensure uniqueness
  const existing = await storage.getSession(result)
  if (existing) {
    return generateRoomCode()
  }
  return result
}

/**
 * Create a new game session
 */
async function createGameSession(hostSocketId, playerName) {
  const sessionId = await generateRoomCode()
  const session = {
    id: sessionId,
    host: hostSocketId,
    players: [{ 
      id: hostSocketId, 
      name: playerName || 'Player 1',
      isHost: true 
    }],
    gameState: null, // Will be set when game starts
    status: 'waiting', // waiting, playing, finished
    createdAt: Date.now(),
    gameMetadata: {
      roundNumber: 0,
      firstPlayerThisRound: null, // tracks who should start next round
      initialRandomPlayer: null   // tracks who was randomly selected first
    }
  }
  
  await storage.setSession(sessionId, session)
  await storage.setPlayerSession(hostSocketId, sessionId)
  
  return session
}

/**
 * Join an existing game session
 */
async function joinGameSession(sessionId, playerSocketId, playerName) {
  const session = await storage.getSession(sessionId)
  
  if (!session) {
    return { success: false, error: 'Session not found' }
  }
  
  if (session.players.length >= 2) {
    return { success: false, error: 'Session is full' }
  }
  
  if (session.status !== 'waiting') {
    return { success: false, error: 'Game already in progress' }
  }
  
  session.players.push({ 
    id: playerSocketId, 
    name: playerName || 'Player 2',
    isHost: false 
  })
  await storage.setPlayerSession(playerSocketId, sessionId)
  
  // Start game when 2 players joined
  if (session.players.length === 2) {
    session.status = 'playing'
  }
  
  await storage.setSession(sessionId, session)
  
  return { success: true, session }
}

/**
 * Remove player from session and clean up if needed
 */
async function removePlayerFromSession(socketId) {
  const sessionId = await storage.getPlayerSession(socketId)
  if (!sessionId) return null
  
  const session = await storage.getSession(sessionId)
  if (!session) return null
  
  // Remove player from session
  session.players = session.players.filter(player => player.id !== socketId)
  await storage.deletePlayerSession(socketId)
  
  // If no players left or host left, delete session
  if (session.players.length === 0 || session.host === socketId) {
    await storage.deleteSession(sessionId)
    // Notify remaining player if any
    for (const player of session.players) {
      await storage.deletePlayerSession(player.id)
    }
    return { deleted: true, session }
  }
  
  // If one player remains, back to waiting status
  if (session.players.length === 1) {
    session.status = 'waiting'
    session.gameState = null
    await storage.setSession(sessionId, session)
  }
  
  return { deleted: false, session }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`)
  
  // Create new game session
  socket.on('create-session', async (data) => {
    try {
      const { playerName } = data || {}
      const session = await createGameSession(socket.id, playerName)
      socket.join(session.id)
      
      console.log(`📤 Sending session-created to host ${socket.id}:`, {
        sessionId: session.id,
        isHost: true,
        players: session.players
      })
      
      socket.emit('session-created', {
        sessionId: session.id,
        isHost: true,
        players: session.players
      })
      
      console.log(`Session created: ${session.id} by ${socket.id} (${playerName || 'Player 1'})`)
    } catch (error) {
      console.error('Error creating session:', error)
      socket.emit('error', { message: 'Failed to create session' })
    }
  })
  
  // Join existing session
  socket.on('join-session', async (data) => {
    try {
      const { sessionId, playerName } = typeof data === 'string' ? { sessionId: data, playerName: null } : data
      const result = await joinGameSession(sessionId, socket.id, playerName)
      
      if (!result.success) {
        socket.emit('join-failed', { error: result.error })
        return
      }
      
      socket.join(sessionId)
      
      // Notify joining player
      socket.emit('session-joined', {
        sessionId: sessionId,
        isHost: false,
        players: result.session.players
      })
      
      // Notify all players about updated player list
      const updateData = {
        players: result.session.players,
        canStart: result.session.players.length === 2
      }
      console.log(`📡 Broadcasting player-list-updated to session ${sessionId}:`, updateData)
      io.to(sessionId).emit('player-list-updated', updateData)
      
      // Also send legacy event for backward compatibility
      socket.to(sessionId).emit('player-joined', {
        playerId: socket.id,
        canStart: result.session.players.length === 2
      })
      
      console.log(`Player ${socket.id} (${playerName || 'Player 2'}) joined session ${sessionId}`)
    } catch (error) {
      console.error('Error joining session:', error)
      socket.emit('join-failed', { error: 'Failed to join session' })
    }
  })
  
  // Start game
  socket.on('start-game', async (initialGameState) => {
    try {
      const sessionId = await storage.getPlayerSession(socket.id)
      const session = await storage.getSession(sessionId)
      
      if (!session || session.host !== socket.id || session.status !== 'playing') {
        socket.emit('error', { message: 'Cannot start game' })
        return
      }
      
      // Initialize game metadata for first round
      session.gameMetadata.roundNumber = 1
      
      // Randomly select who starts first (host perspective: 'player' or 'opponent')
      const randomStartingPlayer = Math.random() < 0.5 ? 'player' : 'opponent'
      session.gameMetadata.initialRandomPlayer = randomStartingPlayer
      session.gameMetadata.firstPlayerThisRound = randomStartingPlayer
      
      // Ensure the game state reflects the correct starting player
      const correctedGameState = {
        ...initialGameState,
        round: {
          ...initialGameState.round,
          currentTurn: randomStartingPlayer
        }
      }
      
      session.gameState = correctedGameState
      await storage.setSession(sessionId, session)
      
      // Send game state to each player with correct perspective
      session.players.forEach(player => {
        const isHost = player.isHost
        const gameStateForPlayer = isHost ? correctedGameState : flipGameState(correctedGameState)
        
        console.log(`🚀 Sending game-started to ${player.name} (${isHost ? 'host' : 'guest'}):`, {
          perspective: isHost ? 'normal' : 'flipped',
          currentTurn: gameStateForPlayer.round.currentTurn
        })
        
        io.to(player.id).emit('game-started', {
          gameState: gameStateForPlayer,
          players: session.players,
          isHost: isHost
        })
      })
      
      console.log(`Game started in session ${sessionId}`)
    } catch (error) {
      console.error('Error starting game:', error)
      socket.emit('error', { message: 'Failed to start game' })
    }
  })
  
  // Game action (hit, skip, chip)
  socket.on('game-action', async(actionData) => {
    const sessionId = await storage.getPlayerSession(socket.id)
    const session = await storage.getSession(sessionId)
    
    if (!session || session.status !== 'playing') {
      socket.emit('error', { message: 'Invalid game action' })
      return
    }
    
    const actingPlayer = session.players.find(p => p.id === socket.id)
    const isHost = actingPlayer?.isHost || false
    
    // Validate that it's the player's turn (server-side turn enforcement)
    const currentGameState = session.gameState
    if (currentGameState && currentGameState.phase === 'playing') {
      // From the server's canonical state perspective (host's perspective):
      // - If currentTurn is 'player', then the host should be acting
      // - If currentTurn is 'opponent', then the guest should be acting
      const shouldHostAct = currentGameState.round.currentTurn === 'player'
      const hostIsActing = isHost
      
      if (shouldHostAct !== hostIsActing) {
        console.log(`🚫 Turn validation failed for ${actingPlayer?.name} (${isHost ? 'host' : 'guest'}). Server expects ${shouldHostAct ? 'host' : 'guest'} to act, but ${hostIsActing ? 'host' : 'guest'} acted.`)
        socket.emit('error', { message: 'Not your turn' })
        return
      }
    }
    
    // Store the canonical game state (from host's perspective)
    const canonicalState = isHost ? actionData.gameState : flipGameState(actionData.gameState)
    session.gameState = canonicalState
    
    // Send flipped state to the other player
    const otherPlayer = session.players.find(p => p.id !== socket.id)
    if (otherPlayer) {
      const stateForOtherPlayer = otherPlayer.isHost ? canonicalState : flipGameState(canonicalState)
      
      console.log(`Game action in session ${sessionId}: ${actionData.action} by ${actingPlayer?.name} (${isHost ? 'host' : 'guest'})`)
      
      socket.to(otherPlayer.id).emit('game-state-update', {
        action: actionData.action,
        gameState: stateForOtherPlayer,
        playerId: socket.id,
        playerName: actingPlayer?.name,
        data: actionData.data // Include action data (like chip info)
      })
    }
  })
  
  // Round transition (triggered when a round ends and new round should start)
  socket.on('round-transition', async (data) => {
    const sessionId = await storage.getPlayerSession(socket.id)
    const session = await storage.getSession(sessionId)
    
    if (!session || session.status !== 'playing') return
    
    const { newGameState, roundResult } = data
    
    // Increment round number and determine next starting player
    session.gameMetadata.roundNumber++
    
    // Alternate starting player: if initial was 'player', next round starts with 'opponent' and vice versa
    const lastStarter = session.gameMetadata.firstPlayerThisRound
    const nextStarter = lastStarter === 'player' ? 'opponent' : 'player'
    session.gameMetadata.firstPlayerThisRound = nextStarter
    
    // Ensure the new game state has the correct starting turn
    const correctedGameState = {
      ...newGameState,
      round: {
        ...newGameState.round,
        currentTurn: nextStarter
      }
    }
    
    session.gameState = correctedGameState
    
    // Send synchronized round transition to both players
    session.players.forEach(player => {
      const isHost = player.isHost
      const gameStateForPlayer = isHost ? correctedGameState : flipGameState(correctedGameState)
      const roundResultForPlayer = isHost ? roundResult : flipRoundResult(roundResult)
      
      // Determine starting player name from perspective of receiving player
      const hostPlayer = session.players.find(p => p.isHost)
      const guestPlayer = session.players.find(p => !p.isHost)
      const starterFromHostPerspective = nextStarter === 'player' ? hostPlayer?.name : guestPlayer?.name
      
      io.to(player.id).emit('round-started', {
        gameState: gameStateForPlayer,
        roundNumber: session.gameMetadata.roundNumber,
        roundResult: roundResultForPlayer, // who won the previous round (flipped for guest)
        startingPlayer: nextStarter, // 'player' or 'opponent' from host perspective
        starterName: starterFromHostPerspective, // actual player name who starts
        players: session.players // include player info for context
      })
    })
    
    console.log(`Round ${session.gameMetadata.roundNumber} started in session ${sessionId}, starting player: ${nextStarter}`)
  })

  // Game over
  socket.on('game-over', async (gameResult) => {
    const sessionId = await storage.getPlayerSession(socket.id)
    const session = await storage.getSession(sessionId)
    
    if (!session) return
    
    session.status = 'finished'
    
    // Send game over result to each player with correct perspective
    session.players.forEach(player => {
      const isHost = player.isHost
      const actingPlayer = session.players.find(p => p.id === socket.id)
      const isActingPlayerHost = actingPlayer?.isHost || false
      
      let gameResultForPlayer = gameResult
      
      // If the game result comes from the guest player, we need to flip it for the host
      // If the game result comes from the host, we need to flip it for the guest
      if ((isActingPlayerHost && !isHost) || (!isActingPlayerHost && isHost)) {
        // Flip the game result perspective
        gameResultForPlayer = {
          ...gameResult,
          gameWinner: gameResult.gameWinner === 'player' ? 'opponent' : 
                     gameResult.gameWinner === 'opponent' ? 'player' : 
                     gameResult.gameWinner,
          finalLives: gameResult.finalLives ? {
            player: gameResult.finalLives.opponent,
            opponent: gameResult.finalLives.player
          } : undefined,
          gameState: gameResult.gameState ? flipGameState(gameResult.gameState) : undefined
        }
      }
      
      io.to(player.id).emit('game-ended', gameResultForPlayer)
    })
    
    console.log(`Game ended in session ${sessionId}`)
  })
  
  // Request rematch
  socket.on('request-rematch', async () => {
    const sessionId = await storage.getPlayerSession(socket.id)
    const session = await storage.getSession(sessionId)
    
    if (!session) return
    
    // Notify other player about rematch request
    socket.to(sessionId).emit('rematch-requested', {
      from: socket.id
    })
    
    console.log(`Rematch requested in session ${sessionId}`)
  })
  
  // Accept/decline rematch
  socket.on('rematch-response', async (accepted) => {
    const sessionId = await storage.getPlayerSession(socket.id)
    const session = await storage.getSession(sessionId)
    
    if (!session) return
    
    if (accepted) {
      // Reset game state for new game
      session.status = 'playing'
      session.gameState = null
      
      io.to(sessionId).emit('rematch-accepted')
    } else {
      socket.to(sessionId).emit('rematch-declined')
    }
    
    console.log(`Rematch ${accepted ? 'accepted' : 'declined'} in session ${sessionId}`)
  })
  
  // Update player name
  socket.on('update-player-name',async (data) => {
    const { playerName } = data
    const sessionId = await storage.getPlayerSession(socket.id)
    const session = await storage.getSession(sessionId)
    
    if (!session) return
    
    // Find and update player name
    const player = session.players.find(p => p.id === socket.id)
    if (player) {
      const oldName = player.name
      player.name = playerName || (player.isHost ? 'Player 1' : 'Player 2')
      
      console.log(`Player ${socket.id} updated name from "${oldName}" to "${player.name}" in session ${sessionId}`)
      
      // Notify all players in the session about updated player list
      io.to(sessionId).emit('player-list-updated', {
        players: session.players,
        canStart: session.players.length === 2
      })
    }
  })
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`Player disconnected: ${socket.id}`)
    
    try {
      const result = await removePlayerFromSession(socket.id)
      if (result) {
        if (result.deleted) {
          // Session was deleted, no one to notify
          console.log(`Session ${result.session.id} deleted due to disconnect`)
        } else {
          // Notify remaining player
          socket.to(result.session.id).emit('player-disconnected', {
            playerId: socket.id
          })
          console.log(`Player left session ${result.session.id}`)
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error)
    }
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    activeSessions: storage.getSessionCount(),
    timestamp: new Date().toISOString()
  })
})

// API endpoint to get session info (for debugging)
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const session = await storage.getSession(req.params.sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    res.json({
      id: session.id,
      playerCount: session.players.length,
      status: session.status,
      createdAt: session.createdAt
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3001

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Dave Deck multiplayer server running on port ${PORT}`)
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`)
})

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...')
  await storage.disconnect()
  server.close(() => {
    console.log('✅ Server shut down gracefully')
    process.exit(0)
  })
})