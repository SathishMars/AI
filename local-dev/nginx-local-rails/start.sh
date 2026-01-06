#!/bin/bash

##############################################################################
# Nginx Management Script for Local Rails + Next.js Development
#
# Unified entry point for Nginx Docker container management
# Usage: npm run nginx:local-rails [command]
#
# This script provides:
# - Container management (start, stop, restart, status)
# - Health checks and diagnostics
# - Logs and debugging
##############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
CONTAINER_NAME="groupize-workflows-nginx-local"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

print_code() {
  echo -e "${CYAN}  $1${NC}"
}

##############################################################################
# Validation Functions
##############################################################################

check_docker() {
  if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running"
    echo ""
    print_info "Please start Docker Desktop and try again"
    exit 1
  fi
}

##############################################################################
# Core Commands
##############################################################################

cmd_start() {
  print_header "Starting Nginx for Local Rails + Next.js"
  
  check_docker
  
  # Check if already running
  if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
    print_warning "Nginx container is already running"
    echo ""
    cmd_status
    return 0
  fi
  
  # Start container
  docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d
  
  # Wait for container to be healthy
  echo ""
  print_info "Waiting for nginx to start..."
  sleep 2
  
  if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
    print_success "Nginx started successfully"
    echo ""
    print_info "Access your app at: ${GREEN}http://groupize.local${NC}"
    print_info "Next.js at: ${GREEN}http://groupize.local/aime${NC}"
  else
    print_error "Failed to start nginx"
    echo ""
    print_info "Check logs with: npm run nginx:local-rails logs"
    exit 1
  fi
}

cmd_stop() {
  print_header "Stopping Nginx"
  
  docker-compose -f "${DOCKER_COMPOSE_FILE}" down
  
  print_success "Nginx stopped"
}

cmd_restart() {
  print_header "Restarting Nginx"
  
  cmd_stop
  echo ""
  cmd_start
}

cmd_status() {
  print_header "Nginx Status"
  
  if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
    print_success "Nginx is running"
    echo ""
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Check health
    if docker inspect "${CONTAINER_NAME}" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
      print_success "Health check: healthy"
    elif docker inspect "${CONTAINER_NAME}" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "starting"; then
      print_warning "Health check: starting..."
    else
      print_warning "Health check: unhealthy or not configured"
    fi
  else
    print_warning "Nginx is not running"
    echo ""
    print_info "Start with: npm run nginx:local-rails"
  fi
}

cmd_logs() {
  print_header "Nginx Logs"
  
  if ! docker ps --filter "name=${CONTAINER_NAME}" | grep -q "${CONTAINER_NAME}"; then
    print_error "Nginx container is not running"
    exit 1
  fi
  
  docker-compose -f "${DOCKER_COMPOSE_FILE}" logs -f
}

cmd_health() {
  print_header "Nginx Health Check"
  
  if ! docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
    print_error "Nginx is not running"
    exit 1
  fi
  
  # Test health endpoint
  if curl -sf http://localhost/health > /dev/null 2>&1; then
    print_success "Health endpoint responding"
  else
    print_error "Health endpoint not responding"
    exit 1
  fi
  
  # Test Rails connectivity
  echo ""
  print_info "Testing Rails connection (port 3000)..."
  if curl -sf --max-time 2 http://localhost:3000 > /dev/null 2>&1; then
    print_success "Rails accessible on port 3000"
  else
    print_warning "Rails not responding on port 3000"
    print_info "Make sure Rails is running: rails s -p 3000"
  fi
  
  # Test Next.js connectivity
  echo ""
  print_info "Testing Next.js connection (port 3001)..."
  if curl -sf --max-time 2 http://localhost:3001/aime > /dev/null 2>&1; then
    print_success "Next.js accessible on port 3001"
  else
    print_warning "Next.js not responding on port 3001"
    print_info "Make sure Next.js is running: npm run dev:local-rails"
  fi
  
  echo ""
  print_success "All health checks passed!"
}

cmd_help() {
  cat << EOF

${BLUE}Nginx Management for Local Rails + Next.js${NC}

${CYAN}Usage:${NC}
  npm run nginx:local-rails [command]

${CYAN}Commands:${NC}
  (no args)     Start nginx (default)
  start         Start nginx container
  stop          Stop nginx container
  restart       Restart nginx container
  status        Show container status
  logs          Show and follow nginx logs
  health        Run health checks
  help          Show this help message

${CYAN}Quick Start:${NC}
  1. Add to /etc/hosts: 127.0.0.1 groupize.local
  2. npm run nginx:local-rails
  3. rails s -p 3000 (in Rails directory)
  4. npm run dev:local-rails
  5. Visit: http://groupize.local/aime

${CYAN}Examples:${NC}
  npm run nginx:local-rails          # Start nginx
  npm run nginx:local-rails status   # Check status
  npm run nginx:local-rails logs     # View logs
  npm run nginx:local-rails health   # Health check

${CYAN}Troubleshooting:${NC}
  - Check status: npm run nginx:local-rails status
  - View logs: npm run nginx:local-rails logs
  - Health check: npm run nginx:local-rails health
  - Check ports: lsof -i :80 :3000 :3001

EOF
}

##############################################################################
# Menu System (Interactive Mode)
##############################################################################

show_menu() {
  clear
  print_header "Nginx Management for Local Rails + Next.js"
  
  echo "Choose an option:"
  echo ""
  echo "  1) Start nginx"
  echo "  2) Stop nginx"
  echo "  3) Restart nginx"
  echo "  4) Show status"
  echo "  5) View logs"
  echo "  6) Health check"
  echo "  7) Help"
  echo "  8) Exit"
  echo ""
  read -p "Enter choice [1-8]: " choice
  
  case $choice in
    1) cmd_start ;;
    2) cmd_stop ;;
    3) cmd_restart ;;
    4) cmd_status ;;
    5) cmd_logs ;;
    6) cmd_health ;;
    7) cmd_help ;;
    8) exit 0 ;;
    *) 
      print_error "Invalid option"
      sleep 2
      show_menu
      ;;
  esac
  
  echo ""
  read -p "Press Enter to continue..."
  show_menu
}

##############################################################################
# Main Entry Point
##############################################################################

# If no arguments, show interactive menu
if [ $# -eq 0 ]; then
  cmd_start
  exit 0
fi

# Parse command
COMMAND=$1

case "$COMMAND" in
  start|up)
    cmd_start
    ;;
  stop|down)
    cmd_stop
    ;;
  restart)
    cmd_restart
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs
    ;;
  health|check)
    cmd_health
    ;;
  menu)
    show_menu
    ;;
  help|-h|--help)
    cmd_help
    ;;
  *)
    print_error "Unknown command: $COMMAND"
    echo ""
    cmd_help
    exit 1
    ;;
esac
