#!/bin/bash

###############################################################################
# JUnit Test Results Dashboard - Deployment Script
#
# This script deploys the competitive analysis features including:
# - Performance Analysis Dashboard
# - Test Run Comparison
# - Global Search (Ctrl+/)
# - Enhanced Test Detail Modal
#
# Usage: ./deploy.sh [options]
# Options:
#   --full        Full rebuild of all containers
#   --backend     Only restart backend
#   --frontend    Only restart frontend (nginx)
#   --check       Only check status, don't deploy
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Parse arguments
FULL_REBUILD=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_REBUILD=true
            shift
            ;;
        --backend)
            BACKEND_ONLY=true
            shift
            ;;
        --frontend)
            FRONTEND_ONLY=true
            shift
            ;;
        --check)
            CHECK_ONLY=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --full        Full rebuild of all containers"
            echo "  --backend     Only restart backend"
            echo "  --frontend    Only restart frontend (nginx)"
            echo "  --check       Only check status, don't deploy"
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

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
        print_error "Neither 'docker-compose' nor 'docker compose' found. Please install Docker Compose."
        exit 1
    fi
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi
print_success "Docker Compose is available ($DOCKER_COMPOSE)"

# Check if required files exist
REQUIRED_FILES=(
    "docker-compose.yml"
    "nginx.conf"
    "compare-runs.html"
    "performance-analysis.html"
    "global-search.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_success "All required files present"

###############################################################################
# Update docker-compose.yml if needed
###############################################################################

print_status "Checking docker-compose.yml for new files..."

# Files that should be mounted
NEW_FILES=(
    "compare-runs.html"
    "performance-analysis.html"
    "global-search.js"
)

NEEDS_UPDATE=false
for file in "${NEW_FILES[@]}"; do
    if ! grep -q "$file" docker-compose.yml; then
        print_warning "File not in docker-compose.yml: $file"
        NEEDS_UPDATE=true
    fi
done

if [ "$NEEDS_UPDATE" = true ]; then
    print_status "Updating docker-compose.yml with new file mounts..."

    # Backup original
    cp docker-compose.yml docker-compose.yml.backup
    print_success "Backed up docker-compose.yml to docker-compose.yml.backup"

    # Add new HTML files after flaky-tests.html
    if ! grep -q "compare-runs.html" docker-compose.yml; then
        sed -i '/flaky-tests.html/a\            - ./compare-runs.html:/usr/share/nginx/html/compare-runs.html:ro\n            - ./performance-analysis.html:/usr/share/nginx/html/performance-analysis.html:ro' docker-compose.yml
        print_success "Added new HTML files to docker-compose.yml"
    fi

    # Add global-search.js after navigation.js
    if ! grep -q "global-search.js" docker-compose.yml; then
        sed -i '/navigation.js/a\            - ./global-search.js:/usr/share/nginx/html/global-search.js:ro' docker-compose.yml
        print_success "Added global-search.js to docker-compose.yml"
    fi
else
    print_success "docker-compose.yml is up to date"
fi

###############################################################################
# Status Check
###############################################################################

if [ "$CHECK_ONLY" = true ]; then
    print_status "Checking container status..."
    $DOCKER_COMPOSE ps

    print_status "Checking health status..."
    $DOCKER_COMPOSE ps | grep -E "mongodb|backend|nginx"

    print_status "Recent backend logs:"
    $DOCKER_COMPOSE logs --tail=20 backend

    exit 0
fi

###############################################################################
# Deployment
###############################################################################

print_status "Starting deployment..."

if [ "$FULL_REBUILD" = true ]; then
    print_status "Performing full rebuild..."

    # Stop all containers
    print_status "Stopping containers..."
    $DOCKER_COMPOSE down

    # Rebuild backend
    print_status "Rebuilding backend..."
    $DOCKER_COMPOSE build backend

    # Start all services
    print_status "Starting all services..."
    $DOCKER_COMPOSE up -d

elif [ "$BACKEND_ONLY" = true ]; then
    print_status "Restarting backend only..."
    $DOCKER_COMPOSE restart backend

elif [ "$FRONTEND_ONLY" = true ]; then
    print_status "Restarting frontend (nginx) only..."
    $DOCKER_COMPOSE restart nginx

else
    # Default: graceful restart
    print_status "Restarting services gracefully..."

    # Restart nginx to pick up new file mounts
    print_status "Restarting nginx..."
    $DOCKER_COMPOSE restart nginx

    # Check if backend code changed
    if git diff HEAD~1 HEAD --name-only | grep -q "backend/"; then
        print_status "Backend code changed, restarting backend..."
        $DOCKER_COMPOSE restart backend
    else
        print_success "Backend code unchanged, skipping backend restart"
    fi
fi

###############################################################################
# Health Checks
###############################################################################

print_status "Waiting for services to be healthy..."

# Wait for containers to start
sleep 3

# Check container status
CONTAINERS=("junit-mongodb" "junit-backend" "junit-nginx")
ALL_HEALTHY=true

for container in "${CONTAINERS[@]}"; do
    if docker ps | grep -q "$container"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")

        if [ "$STATUS" = "running" ]; then
            print_success "$container is running"
        else
            print_error "$container is not running (status: $STATUS)"
            ALL_HEALTHY=false
        fi
    else
        print_error "$container not found"
        ALL_HEALTHY=false
    fi
done

# Check health endpoints
print_status "Checking health endpoints..."

# Backend health
sleep 2  # Give backend time to start
if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    print_success "Backend health check passed"
else
    print_warning "Backend health check failed (may still be starting)"
    ALL_HEALTHY=false
fi

# Frontend health
if curl -sf http://localhost/health > /dev/null 2>&1; then
    print_success "Frontend health check passed"
else
    print_warning "Frontend health check failed (may still be starting)"
    ALL_HEALTHY=false
fi

# Verify new pages are accessible
print_status "Verifying new pages are accessible..."

NEW_PAGES=(
    "compare-runs.html"
    "performance-analysis.html"
)

for page in "${NEW_PAGES[@]}"; do
    if curl -sf "http://localhost/$page" > /dev/null 2>&1; then
        print_success "$page is accessible"
    else
        print_error "$page is NOT accessible"
        ALL_HEALTHY=false
    fi
done

###############################################################################
# Summary
###############################################################################

echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="

$DOCKER_COMPOSE ps

echo ""
if [ "$ALL_HEALTHY" = true ]; then
    print_success "Deployment completed successfully!"
    echo ""
    echo "🚀 New Features Available:"
    echo "  • Performance Analysis: http://localhost/performance-analysis.html"
    echo "  • Compare Runs: http://localhost/compare-runs.html"
    echo "  • Global Search: Press Ctrl+/ on any page"
    echo "  • Enhanced Test Modal: Click any test to see tabs"
    echo ""
    echo "📊 Navigate via the top menu bar:"
    echo "  Dashboard | Test Details | Flaky Tests | Performance | Compare Runs | Reports"
else
    print_warning "Deployment completed with warnings. Check logs for details:"
    echo "  Backend logs:  $DOCKER_COMPOSE logs backend"
    echo "  Nginx logs:    $DOCKER_COMPOSE logs nginx"
    echo "  MongoDB logs:  $DOCKER_COMPOSE logs mongodb"
fi

echo ""
echo "Useful commands:"
echo "  View logs:        $DOCKER_COMPOSE logs -f [service]"
echo "  Restart service:  $DOCKER_COMPOSE restart [service]"
echo "  Stop all:         $DOCKER_COMPOSE down"
echo "  Full rebuild:     ./deploy.sh --full"
echo ""
