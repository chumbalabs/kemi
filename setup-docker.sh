#!/bin/bash

# Kemi Crypto Platform Docker Setup Script
# This script helps you set up the containerized environment

set -e

echo "🚀 Kemi Crypto Platform Docker Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please edit .env file and add your API keys before running the containers"
        else
            print_error ".env.example file not found. Please create .env file manually."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Build and start containers
start_containers() {
    local mode=$1
    
    if [ "$mode" = "dev" ]; then
        print_status "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up --build -d
    else
        print_status "Starting production environment..."
        docker-compose up --build -d
    fi
}

# Stop containers
stop_containers() {
    local mode=$1
    
    if [ "$mode" = "dev" ]; then
        print_status "Stopping development environment..."
        docker-compose -f docker-compose.dev.yml down
    else
        print_status "Stopping production environment..."
        docker-compose down
    fi
}

# Show logs
show_logs() {
    local mode=$1
    local service=$2
    
    if [ "$mode" = "dev" ]; then
        if [ -n "$service" ]; then
            docker-compose -f docker-compose.dev.yml logs -f "$service"
        else
            docker-compose -f docker-compose.dev.yml logs -f
        fi
    else
        if [ -n "$service" ]; then
            docker-compose logs -f "$service"
        else
            docker-compose logs -f
        fi
    fi
}

# Clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
    print_success "Cleanup completed"
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [dev|prod]     Start the application (default: prod)"
    echo "  stop [dev|prod]      Stop the application (default: prod)"
    echo "  restart [dev|prod]   Restart the application (default: prod)"
    echo "  logs [dev|prod] [service]  Show logs (default: prod, all services)"
    echo "  cleanup              Clean up Docker resources"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start dev         Start development environment"
    echo "  $0 logs prod kemi-api    Show production API logs"
    echo "  $0 restart           Restart production environment"
}

# Main script logic
main() {
    local command=$1
    local mode=$2
    local service=$3
    
    # Default to production if no mode specified
    if [ -z "$mode" ] || ([ "$mode" != "dev" ] && [ "$mode" != "prod" ]); then
        if [ "$command" != "help" ] && [ "$command" != "cleanup" ]; then
            mode="prod"
        fi
    fi
    
    case $command in
        "start")
            check_docker
            check_env_file
            start_containers "$mode"
            print_success "Containers started successfully!"
            if [ "$mode" = "dev" ]; then
                print_status "Frontend: http://localhost:5173"
            else
                print_status "Frontend: http://localhost:3000"
            fi
            print_status "Backend API: http://localhost:8000"
            print_status "API Documentation: http://localhost:8000/docs"
            ;;
        "stop")
            stop_containers "$mode"
            print_success "Containers stopped successfully!"
            ;;
        "restart")
            stop_containers "$mode"
            start_containers "$mode"
            print_success "Containers restarted successfully!"
            ;;
        "logs")
            show_logs "$mode" "$service"
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"