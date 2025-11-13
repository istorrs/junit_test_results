#!/bin/bash

###############################################################################
# JUnit Test Results Dashboard - Deployment Script (Vue 3 Edition)
#
# This script handles deployment for the Vue 3 + Express + MongoDB stack
#
# Usage: ./deploy.sh [options]
# Options:
#   --full        Full rebuild: clear caches, rebuild containers, build Vue
#   --dev         Development mode: start all dev servers with hot reload
#   --prod        Production mode: build Vue and deploy to Docker
#   --backend     Only rebuild/restart backend container
#   --check       Check status without deploying
#   --clean       Nuclear option: remove all containers, volumes, caches
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Parse arguments
FULL_REBUILD=false
DEV_MODE=false
PROD_MODE=false
BACKEND_ONLY=false
CHECK_ONLY=false
CLEAN_ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_REBUILD=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --prod)
            PROD_MODE=true
            shift
            ;;
        --backend)
            BACKEND_ONLY=true
            shift
            ;;
        --check)
            CHECK_ONLY=true
            shift
            ;;
        --clean)
            CLEAN_ALL=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --full        Full rebuild (clear caches, rebuild containers, build Vue)"
            echo "  --dev         Development mode (Vite dev server + nodemon)"
            echo "  --prod        Production mode (build Vue, deploy to Docker)"
            echo "  --backend     Only rebuild/restart backend container"
            echo "  --check       Check status without deploying"
            echo "  --clean       Nuclear option: remove all containers, volumes, and caches"
            echo ""
            echo "Examples:"
            echo "  ./deploy.sh --full      # Complete rebuild for production"
            echo "  ./deploy.sh --dev       # Start development servers"
            echo "  ./deploy.sh --backend   # Quick backend restart"
            echo "  ./deploy.sh --clean     # Reset everything (use with caution!)"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

###############################################################################
# Pre-flight Checks
###############################################################################

print_status "Running pre-flight checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check docker compose command
if ! command -v docker-compose &> /dev/null; then
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
        print_error "Neither 'docker-compose' nor 'docker compose' found."
        exit 1
    fi
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi
print_success "Docker Compose available: $DOCKER_COMPOSE"

# Check Node.js for Vue build
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Required for Vue 3 development."
else
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
fi

###############################################################################
# Clean Everything (Nuclear Option)
###############################################################################

if [ "$CLEAN_ALL" = true ]; then
    print_warning "⚠️  NUCLEAR CLEAN MODE - This will remove EVERYTHING"
    print_warning "   - Docker containers and volumes"
    print_warning "   - Node modules and caches"
    print_warning "   - Build artifacts"
    echo ""
    read -p "Are you sure? Type 'yes' to confirm: " -r
    echo
    if [[ ! $REPLY == "yes" ]]; then
        print_info "Clean cancelled."
        exit 0
    fi

    print_status "Stopping and removing all containers..."
    $DOCKER_COMPOSE down -v

    print_status "Removing Docker images..."
    docker images | grep junit | awk '{print $3}' | xargs -r docker rmi -f || true

    print_status "Cleaning Vue client..."
    cd client
    rm -rf node_modules dist .vite
    cd ..

    print_status "Cleaning backend..."
    cd backend
    rm -rf node_modules uploads/* logs/*
    cd ..

    print_status "Removing build artifacts..."
    rm -rf public/*

    print_success "Clean complete! Run ./deploy.sh --full to rebuild everything."
    exit 0
fi

###############################################################################
# Status Check
###############################################################################

if [ "$CHECK_ONLY" = true ]; then
    print_status "Container Status:"
    $DOCKER_COMPOSE ps

    echo ""
    print_status "Health Checks:"

    # Backend
    if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
        print_success "Backend: http://localhost:5000/health"
    else
        print_error "Backend: UNHEALTHY"
    fi

    # Frontend (nginx)
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        print_success "Frontend (nginx): http://localhost/health"
    else
        print_error "Frontend: UNHEALTHY"
    fi

    # Dev server
    if curl -sf http://localhost:5173 > /dev/null 2>&1; then
        print_success "Vue Dev Server: http://localhost:5173"
    else
        print_info "Vue Dev Server: Not running"
    fi

    echo ""
    print_status "Recent Backend Logs:"
    $DOCKER_COMPOSE logs --tail=20 backend

    exit 0
fi

###############################################################################
# Development Mode
###############################################################################

if [ "$DEV_MODE" = true ]; then
    print_status "Starting DEVELOPMENT mode..."
    print_info "This will start:"
    print_info "  • MongoDB (Docker)"
    print_info "  • Backend with nodemon (Docker)"
    print_info "  • Vue dev server with Vite HMR (localhost:5173)"
    echo ""

    # Start backend services
    print_status "Starting backend services (MongoDB + Express)..."
    $DOCKER_COMPOSE up -d mongodb backend

    # Wait for backend to be ready
    print_status "Waiting for backend to be healthy..."
    for i in {1..30}; do
        if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
            print_success "Backend is ready!"
            break
        fi
        sleep 1
    done

    # Start Vue dev server
    print_status "Starting Vue dev server..."
    cd client

    # Clear Vite cache for clean start
    rm -rf node_modules/.vite

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing Vue dependencies..."
        npm install
    fi

    print_success "Starting Vite dev server on http://localhost:5173"
    print_info "Press Ctrl+C to stop"
    npm run dev

    exit 0
fi

###############################################################################
# Production Mode
###############################################################################

if [ "$PROD_MODE" = true ] || [ "$FULL_REBUILD" = true ]; then
    print_status "Building for PRODUCTION..."

    # Build Vue frontend
    print_status "Building Vue 3 frontend..."
    cd client

    # Clear caches and build artifacts
    print_status "Clearing Vite cache..."
    rm -rf node_modules/.vite dist

    # Install dependencies
    if [ ! -d "node_modules" ] || [ "$FULL_REBUILD" = true ]; then
        print_status "Installing dependencies..."
        npm install
    fi

    # Build production bundle (builds directly to ../public via vite.config)
    print_status "Running production build..."
    npm run build
    cd ..

    print_success "Vue build complete"

    # Rebuild backend if full rebuild
    if [ "$FULL_REBUILD" = true ]; then
        print_status "Rebuilding backend Docker image..."
        $DOCKER_COMPOSE build --no-cache backend
    fi

    # Stop and restart all services
    print_status "Restarting all services..."
    $DOCKER_COMPOSE down
    $DOCKER_COMPOSE up -d

    # Wait for services
    print_status "Waiting for services to start..."
    sleep 5
fi

###############################################################################
# Backend Only Restart
###############################################################################

if [ "$BACKEND_ONLY" = true ]; then
    print_status "Rebuilding backend only..."

    # Rebuild backend
    print_status "Building backend Docker image..."
    $DOCKER_COMPOSE build backend

    # Restart backend
    print_status "Restarting backend container..."
    $DOCKER_COMPOSE up -d backend

    print_success "Backend restarted"
fi

###############################################################################
# Health Checks
###############################################################################

print_status "Running health checks..."

# Wait for containers
sleep 3

# Check containers
CONTAINERS=("junit-mongodb" "junit-backend" "junit-nginx")
ALL_HEALTHY=true

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "running" ]; then
            print_success "$container: running"
        else
            print_error "$container: $STATUS"
            ALL_HEALTHY=false
        fi
    else
        print_warning "$container: not found (may be intentional in dev mode)"
    fi
done

# Health endpoints
print_status "Checking health endpoints..."

sleep 2

# Backend
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    print_success "Backend API: http://localhost:5000 ✓"
else
    print_error "Backend API: FAILED"
    ALL_HEALTHY=false
fi

# Nginx (production only)
if curl -sf http://localhost/health > /dev/null 2>&1; then
    print_success "Frontend (nginx): http://localhost ✓"
elif [ "$DEV_MODE" = true ]; then
    print_info "Nginx not running (dev mode uses Vite on :5173)"
else
    print_error "Frontend (nginx): FAILED"
    ALL_HEALTHY=false
fi

###############################################################################
# Summary
###############################################################################

echo ""
echo "========================================="
echo " Deployment Summary"
echo "========================================="

$DOCKER_COMPOSE ps

echo ""

if [ "$ALL_HEALTHY" = true ]; then
    print_success "Deployment successful!"
    echo ""
    if [ "$DEV_MODE" = true ]; then
        echo "🚀 Development Mode Active:"
        echo "  • Vue Dev Server: http://localhost:5173 (with HMR)"
        echo "  • Backend API: http://localhost:5000"
        echo ""
        echo "Changes to Vue files will hot-reload automatically."
        echo "Backend uses nodemon for auto-restart on changes."
    else
        echo "🚀 Production Mode Active:"
        echo "  • Frontend: http://localhost"
        echo "  • Backend API: http://localhost:5000"
        echo "  • Built with: Vue 3 + Vite"
    fi
else
    print_warning "Deployment completed with issues"
    echo ""
    echo "Check logs:"
    echo "  $DOCKER_COMPOSE logs backend"
    echo "  $DOCKER_COMPOSE logs nginx"
fi

echo ""
echo "Useful Commands:"
echo "  Start dev mode:     ./deploy.sh --dev"
echo "  Build production:   ./deploy.sh --prod"
echo "  Full rebuild:       ./deploy.sh --full"
echo "  Backend only:       ./deploy.sh --backend"
echo "  Check status:       ./deploy.sh --check"
echo "  Clean everything:   ./deploy.sh --clean"
echo "  View logs:          $DOCKER_COMPOSE logs -f [service]"
echo ""
