# Kemi Crypto Platform Makefile
# Provides convenient commands for Docker management

.PHONY: help build start stop restart logs clean dev-start dev-stop dev-logs

# Default target
help:
	@echo "Kemi Crypto Platform Docker Commands"
	@echo "===================================="
	@echo ""
	@echo "Production Commands:"
	@echo "  make build       Build all containers"
	@echo "  make start       Start production environment"
	@echo "  make stop        Stop production environment"
	@echo "  make restart     Restart production environment"
	@echo "  make logs        Show production logs"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev-start   Start development environment"
	@echo "  make dev-stop    Stop development environment"
	@echo "  make dev-logs    Show development logs"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean       Clean up Docker resources"
	@echo "  make status      Show container status"
	@echo "  make shell-api   Open shell in API container"
	@echo "  make shell-frontend  Open shell in frontend container"

# Check if .env file exists
check-env:
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found. Creating from .env.example..."; \
		if [ -f .env.example ]; then \
			cp .env.example .env; \
			echo "⚠️  Please edit .env file and add your API keys"; \
		else \
			echo "❌ .env.example not found. Please create .env manually"; \
			exit 1; \
		fi; \
	fi

# Production commands
build: check-env
	@echo "🔨 Building containers..."
	docker-compose build

start: check-env
	@echo "🚀 Starting production environment..."
	docker-compose up -d
	@echo "✅ Production environment started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔧 Backend API: http://localhost:8000"
	@echo "📚 API Docs: http://localhost:8000/docs"

stop:
	@echo "🛑 Stopping production environment..."
	docker-compose down
	@echo "✅ Production environment stopped!"

restart: stop start

logs:
	docker-compose logs -f

# Development commands
dev-start: check-env
	@echo "🚀 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development environment started!"
	@echo "🌐 Frontend: http://localhost:5173"
	@echo "🔧 Backend API: http://localhost:8000"
	@echo "📚 API Docs: http://localhost:8000/docs"

dev-stop:
	@echo "🛑 Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down
	@echo "✅ Development environment stopped!"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Utility commands
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker system prune -f
	docker volume prune -f
	@echo "✅ Cleanup completed!"

status:
	@echo "📊 Container Status:"
	docker-compose ps

shell-api:
	docker-compose exec kemi-api /bin/bash

shell-frontend:
	docker-compose exec kemi-frontend /bin/sh

# Database/Redis commands
redis-cli:
	docker-compose exec redis redis-cli

# Health checks
health:
	@echo "🏥 Health Check:"
	@echo "API Health:"
	@curl -f http://localhost:8000/api/health || echo "❌ API unhealthy"
	@echo ""
	@echo "Frontend Health:"
	@curl -f http://localhost:3000/ > /dev/null && echo "✅ Frontend healthy" || echo "❌ Frontend unhealthy"

# Force rebuild
rebuild: stop
	@echo "🔨 Force rebuilding containers..."
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Containers rebuilt and started!"

# View specific service logs
logs-api:
	docker-compose logs -f kemi-api

logs-frontend:
	docker-compose logs -f kemi-frontend

logs-redis:
	docker-compose logs -f redis