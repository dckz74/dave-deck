#!/bin/bash

# Dave Deck Development Setup Script
echo "🎮 Setting up Dave Deck for development..."

# Create environment files if they don't exist
if [ ! -f .env ]; then
    echo "📄 Creating frontend .env file..."
    cp .env.example .env
    echo "✅ Created .env from template"
fi

if [ ! -f server/.env ]; then
    echo "📄 Creating backend .env file..."
    cd server && cp .env.example .env && cd ..
    echo "✅ Created server/.env from template"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server && npm install && cd ..

echo ""
echo "✅ Development setup complete!"
echo ""
echo "🚀 To start development:"
echo "  Frontend: npm run dev"
echo "  Backend:  cd server && npm run dev"
echo ""
echo "🌐 URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo "  Health:   http://localhost:3001/health"
echo ""
echo "📖 See DEPLOYMENT.md for production hosting instructions"