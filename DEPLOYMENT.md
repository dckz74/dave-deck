# Dave Deck Deployment Guide

This guide explains how to deploy Dave Deck multiplayer game using Koyeb (backend) and Vercel (frontend).

## Architecture Overview

- **Frontend**: Vue.js Progressive Web App deployed on Vercel
- **Backend**: Node.js WebSocket server deployed on Koyeb
- **Storage**: Redis for production session storage (Koyeb add-on)

## Prerequisites

- GitHub account with your Dave Deck repository
- Vercel account (free tier available)
- Koyeb account (free tier available)

## Part 1: Backend Deployment (Koyeb)

### 1. Koyeb Setup

1. **Create Koyeb Account**: Go to [koyeb.com](https://koyeb.com) and sign up
2. **Connect GitHub**: Link your GitHub account and select the Dave Deck repository
3. **Create New Service**: Choose "Docker" deployment type

### 2. Configure Koyeb Service

1. **Service Settings**:
   - Name: `dave-deck-server`
   - Source: GitHub repository
   - Build context: `/server`
   - Dockerfile path: `server/Dockerfile`

2. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

3. **Optional: Redis Setup** (for scaling):
   - Add Koyeb Redis service
   - Set `REDIS_URL` environment variable

4. **Health Check**:
   - Path: `/health`
   - Port: 3001

5. **Region**: Choose closest to your users (fra, was, etc.)

6. **Deploy**: Click "Deploy" and wait for deployment

7. **Get Server URL**: Note your Koyeb app URL (e.g., `https://your-app.koyeb.app`)

### 3. Verify Backend

Test your backend by visiting:
- Health check: `https://your-koyeb-app.koyeb.app/health`
- Should return: `{"status":"ok","activeSessions":0,"timestamp":"..."}`

## Part 2: Frontend Deployment (Vercel)

### 1. Vercel Setup

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Import Project**: Click "New Project" and import your Dave Deck repository
3. **Framework**: Vercel should auto-detect Vue.js/Vite

### 2. Configure Vercel Project

1. **Environment Variables**:
   - Variable: `VITE_WEBSOCKET_URL`
   - Value: `https://your-koyeb-app.koyeb.app` (your Koyeb server URL)

2. **Build Settings**:
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm ci` (auto-detected)

3. **Deploy**: Click "Deploy" and wait for build

4. **Get Frontend URL**: Note your Vercel app URL (e.g., `https://your-app.vercel.app`)

### 3. Update Backend CORS

After getting your Vercel URL, update your Koyeb environment variable:
- `FRONTEND_URL=https://your-app.vercel.app`

Redeploy your Koyeb service to apply the change.

## Part 3: Testing

### 1. Test Single Player
- Visit your Vercel URL
- Create a single-player game
- Verify game works correctly

### 2. Test Multiplayer
- Open your Vercel URL in two browser tabs/windows
- Create a multiplayer session in one tab
- Join the session from the other tab
- Test gameplay and disconnection handling

### 3. Test Mobile/PWA
- Visit your Vercel URL on mobile
- Add to home screen (PWA feature)
- Test touch controls and responsiveness

## Configuration Reference

### Environment Variables

#### Frontend (.env.production)
```bash
VITE_WEBSOCKET_URL=https://your-koyeb-app.koyeb.app
```

#### Backend (Koyeb Environment)
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-vercel-app.vercel.app
REDIS_URL=redis://your-redis-url (optional, for scaling)
```

### Custom Domains (Optional)

#### Vercel Custom Domain
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update CORS in backend with new domain

#### Koyeb Custom Domain
1. Go to Service Settings → Networking
2. Add custom domain
3. Configure DNS records
4. Update frontend WebSocket URL

## Monitoring & Maintenance

### Health Monitoring
- Koyeb: Built-in monitoring dashboard
- Vercel: Analytics and performance monitoring
- Set up uptime monitoring (UptimeRobot, etc.)

### Logs & Debugging
- Koyeb: View logs in service dashboard
- Vercel: Function logs and build logs
- Use health check endpoints for automated monitoring

### Scaling Considerations
- **Traffic Growth**: Both platforms auto-scale
- **Session Storage**: Add Redis when needed for multiple server instances
- **Regional Deployment**: Deploy closer to your user base

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify `FRONTEND_URL` matches exactly
   - Check browser console for specific errors
   - Ensure both HTTP and WebSocket connections use HTTPS

2. **Connection Failures**:
   - Verify WebSocket URL is correct
   - Check Koyeb service health
   - Test health check endpoint

3. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Review build logs for specific errors

### Support
- Koyeb: Support documentation and community
- Vercel: Excellent documentation and Discord community
- GitHub: Create issues for game-specific problems

## Cost Estimation

### Free Tier Limits
- **Vercel**: 100GB bandwidth, unlimited static deployments
- **Koyeb**: 2 apps, 512MB RAM, 2.5GB transfer
- **Total**: $0/month for moderate usage

### Paid Plans (if needed)
- **Vercel Pro**: $20/month - better performance, analytics
- **Koyeb Starter**: $5.5/month - more resources, multiple apps
- **Total**: ~$25/month for production-ready setup

This deployment setup provides a robust, scalable foundation for your multiplayer card game!