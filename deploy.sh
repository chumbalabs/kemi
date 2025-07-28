#!/bin/bash

# Kemi Crypto Platform Deployment Script
set -e

echo "🚀 Deploying Kemi Crypto Platform..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your API keys"
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY is required in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check backend health
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API health check failed"
    docker-compose logs kemi-api
    exit 1
fi

# Check frontend health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    docker-compose logs kemi-frontend
    exit 1
fi

echo ""
echo "🎉 Deployment successful!"
echo ""
echo "📊 Access your Kemi Crypto Platform:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""