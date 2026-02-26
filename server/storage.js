import { createClient } from 'redis'

// Session storage abstraction - switches between Redis and in-memory based on environment
class SessionStorage {
  constructor() {
    this.isRedis = process.env.NODE_ENV === 'production' && process.env.REDIS_URL

    if (this.isRedis) {
      this.client = createClient({ url: process.env.REDIS_URL })
      this.client.on('error', err => console.error('Redis Client Error', err))
      this.client.connect()
      console.log('📡 Using Redis for session storage')
    } else {
      this.sessions = new Map()
      this.playerSessions = new Map()
      console.log('🗂️ Using in-memory storage for sessions (development)')
    }
  }

  async setSession(sessionId, session) {
    if (this.isRedis) {
      await this.client.setEx(`session:${sessionId}`, 3600, JSON.stringify(session)) // 1 hour TTL
    } else {
      this.sessions.set(sessionId, session)
    }
  }

  async getSession(sessionId) {
    if (this.isRedis) {
      const data = await this.client.get(`session:${sessionId}`)
      return data ? JSON.parse(data) : null
    } else {
      return this.sessions.get(sessionId) || null
    }
  }

  async deleteSession(sessionId) {
    if (this.isRedis) {
      await this.client.del(`session:${sessionId}`)
    } else {
      this.sessions.delete(sessionId)
    }
  }

  async setPlayerSession(playerId, sessionId) {
    if (this.isRedis) {
      await this.client.setEx(`player:${playerId}`, 3600, sessionId) // 1 hour TTL
    } else {
      this.playerSessions.set(playerId, sessionId)
    }
  }

  async getPlayerSession(playerId) {
    if (this.isRedis) {
      return await this.client.get(`player:${playerId}`)
    } else {
      return this.playerSessions.get(playerId) || null
    }
  }

  async deletePlayerSession(playerId) {
    if (this.isRedis) {
      await this.client.del(`player:${playerId}`)
    } else {
      this.playerSessions.delete(playerId)
    }
  }

  async getAllSessions() {
    if (this.isRedis) {
      const keys = await this.client.keys('session:*')
      const sessions = new Map()
      for (const key of keys) {
        const sessionId = key.replace('session:', '')
        const data = await this.client.get(key)
        if (data) {
          sessions.set(sessionId, JSON.parse(data))
        }
      }
      return sessions
    } else {
      return this.sessions
    }
  }

  getSessionCount() {
    if (this.isRedis) {
      // For Redis, we'd need to count keys, but this is expensive
      // Return a placeholder for health checks
      return 'redis-backed'
    } else {
      return this.sessions.size
    }
  }

  async disconnect() {
    if (this.isRedis && this.client) {
      await this.client.disconnect()
    }
  }
}

export default SessionStorage
