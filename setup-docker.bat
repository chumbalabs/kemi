@echo off
setlocal enabledelayedexpansion

REM Kemi Crypto Platform Docker Setup Script (Windows)
REM This script helps you set up the containerized environment

echo.
echo 🚀 Kemi Crypto Platform Docker Setup
echo ====================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [WARNING] Please edit .env file and add your API keys before running the containers
    ) else (
        echo [ERROR] .env.example file not found. Please create .env file manually.
        exit /b 1
    )
) else (
    echo [SUCCESS] .env file found
)

REM Parse command line arguments
set "command=%1"
set "mode=%2"
set "service=%3"

REM Default to production if no mode specified
if "%mode%"=="" set "mode=prod"
if "%mode%" neq "dev" if "%mode%" neq "prod" set "mode=prod"

REM Execute commands
if "%command%"=="start" goto start
if "%command%"=="stop" goto stop
if "%command%"=="restart" goto restart
if "%command%"=="logs" goto logs
if "%command%"=="cleanup" goto cleanup
if "%command%"=="help" goto help
if "%command%"=="--help" goto help
if "%command%"=="-h" goto help

echo [ERROR] Unknown command: %command%
goto help

:start
echo [INFO] Starting %mode% environment...
if "%mode%"=="dev" (
    docker-compose -f docker-compose.dev.yml up --build -d
) else (
    docker-compose up --build -d
)
if %errorlevel% equ 0 (
    echo [SUCCESS] Containers started successfully!
    if "%mode%"=="dev" (
        echo [INFO] Frontend: http://localhost:5173
    ) else (
        echo [INFO] Frontend: http://localhost:3000
    )
    echo [INFO] Backend API: http://localhost:8000
    echo [INFO] API Documentation: http://localhost:8000/docs
)
goto end

:stop
echo [INFO] Stopping %mode% environment...
if "%mode%"=="dev" (
    docker-compose -f docker-compose.dev.yml down
) else (
    docker-compose down
)
if %errorlevel% equ 0 echo [SUCCESS] Containers stopped successfully!
goto end

:restart
echo [INFO] Restarting %mode% environment...
if "%mode%"=="dev" (
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml up --build -d
) else (
    docker-compose down
    docker-compose up --build -d
)
if %errorlevel% equ 0 echo [SUCCESS] Containers restarted successfully!
goto end

:logs
echo [INFO] Showing logs for %mode% environment...
if "%service%" neq "" (
    if "%mode%"=="dev" (
        docker-compose -f docker-compose.dev.yml logs -f %service%
    ) else (
        docker-compose logs -f %service%
    )
) else (
    if "%mode%"=="dev" (
        docker-compose -f docker-compose.dev.yml logs -f
    ) else (
        docker-compose logs -f
    )
)
goto end

:cleanup
echo [INFO] Cleaning up Docker resources...
docker system prune -f
docker volume prune -f
echo [SUCCESS] Cleanup completed
goto end

:help
echo Usage: %0 [COMMAND] [OPTIONS]
echo.
echo Commands:
echo   start [dev^|prod]     Start the application (default: prod)
echo   stop [dev^|prod]      Stop the application (default: prod)
echo   restart [dev^|prod]   Restart the application (default: prod)
echo   logs [dev^|prod] [service]  Show logs (default: prod, all services)
echo   cleanup              Clean up Docker resources
echo   help                 Show this help message
echo.
echo Examples:
echo   %0 start dev         Start development environment
echo   %0 logs prod kemi-api    Show production API logs
echo   %0 restart           Restart production environment
goto end

:end
endlocal