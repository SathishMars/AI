#!/bin/bash

##############################################################################
# MongoDB Management Script
#
# Unified entry point for all MongoDB database operations
# Usage: npm run mongodb [command] [options]
#
# This script provides:
# - Container management (up, down, restart, status)
# - Health checks and diagnostics
# - Database operations (logs, shell, reset)
# - Helpful information and documentation
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
HEALTHCHECK_SCRIPT="${SCRIPT_DIR}/healthcheck.sh"

CONTAINER_NAME="groupize-mongodb-8"
MONGODB_PORT=27017
MONGODB_HOST="localhost"
MONGODB_USER="groupize_app"
MONGODB_PASSWORD="gr0up!zeapP"
MONGODB_AUTH_DB="admin"
DATABASE_NAME="groupize-workflows"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
}

print_subheader() {
  echo -e "\n${CYAN}▸ $1${NC}\n"
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
# Core Commands
##############################################################################

cmd_up() {
  print_header "Starting MongoDB 8.2.3"
  
  if docker ps | grep -q "$CONTAINER_NAME"; then
    print_warning "MongoDB container is already running"
    cmd_status
    return 0
  fi
  
  echo "Building and starting MongoDB container..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
  
  echo ""
  print_success "MongoDB container started"
  echo ""
  print_info "Waiting for container to be healthy (this may take a few seconds)..."
  sleep 5
  
  cmd_health "silent"
}

cmd_down() {
  print_header "Stopping MongoDB"
  
  if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_warning "MongoDB container is not running"
    return 0
  fi
  
  echo "Stopping MongoDB container..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" down
  
  echo ""
  print_success "MongoDB stopped successfully"
}

cmd_restart() {
  print_header "Restarting MongoDB"
  
  cmd_down
  sleep 2
  cmd_up
}

cmd_status() {
  print_header "MongoDB Status"
  
  if docker ps | grep -q "$CONTAINER_NAME"; then
    local container_info=$(docker ps | grep "$CONTAINER_NAME")
    echo "Container Status:"
    echo "$container_info"
    echo ""
    
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
    echo "Health Status: $health_status"
    echo "Port: $MONGODB_PORT (accessible)"
    echo "Connection: mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
    
    print_success "MongoDB is running"
  else
    print_error "MongoDB container is not running"
    echo ""
    echo "Start it with:"
    print_code "npm run mongodb up"
    return 1
  fi
}

cmd_health() {
  local silent_mode="${1:-}"
  
  if [ "$silent_mode" != "silent" ]; then
    print_header "MongoDB Health Check"
  fi
  
  if ! command -v bash &> /dev/null; then
    print_error "bash is required for health checks"
    return 1
  fi
  
  bash "$HEALTHCHECK_SCRIPT"
}

cmd_logs() {
  print_header "MongoDB Logs"
  echo "Showing last 50 lines (press Ctrl+C to exit):"
  echo ""
  docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail 50 -f
}

cmd_logs_recent() {
  print_header "MongoDB Recent Logs"
  docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail 100 mongodb
}

cmd_shell() {
  print_header "MongoDB Interactive Shell"
  echo "Connecting to MongoDB shell..."
  echo ""
  
  if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_error "MongoDB container is not running"
    return 1
  fi
  
  docker-compose -f "$DOCKER_COMPOSE_FILE" exec mongodb mongosh \
    -u "$MONGODB_USER" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase "$MONGODB_AUTH_DB" \
    "$DATABASE_NAME"
}

cmd_reset() {
  print_header "Reset MongoDB Database"
  
  echo -e "${YELLOW}⚠  This will delete ALL data in MongoDB${NC}"
  read -p "Are you sure you want to reset? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    print_warning "Reset cancelled"
    return 0
  fi
  
  echo "Stopping and removing MongoDB container and volumes..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
  
  echo ""
  print_success "Database reset complete"
  echo ""
  print_info "Restart MongoDB with:"
  print_code "npm run mongodb up"
}

cmd_info() {
  print_header "MongoDB Connection Information"
  
  echo "Connection Details:"
  echo ""
  echo "  Host:             $MONGODB_HOST"
  echo "  Port:             $MONGODB_PORT"
  echo "  Database:         $DATABASE_NAME"
  echo "  Username:         $MONGODB_USER"
  echo "  Password:         $MONGODB_PASSWORD"
  echo "  Auth Database:    $MONGODB_AUTH_DB"
  echo ""
  
  print_subheader "Connection Strings"
  
  echo "Standard connection:"
  print_code "mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
  echo ""
  
  echo "For MongoDB Compass:"
  print_code "mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
  echo ""
  
  echo "MongoDB Compass Fields:"
  echo "  Host:                    $MONGODB_HOST"
  echo "  Port:                    $MONGODB_PORT"
  echo "  Username:                $MONGODB_USER"
  echo "  Password:                $MONGODB_PASSWORD"
  echo "  Authentication Database: $MONGODB_AUTH_DB"
  echo ""
  
  print_subheader "Command Line Connection"
  
  echo "Connect with mongosh:"
  print_code "mongosh mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
  echo ""
  
  print_subheader "Environment Variables"
  
  echo "Add to .env.local:"
  print_code "DATABASE_ENVIRONMENT=local"
  print_code "MONGODB_URI=mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
}

cmd_stats() {
  print_header "MongoDB Container Statistics"
  
  if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_error "MongoDB container is not running"
    return 1
  fi
  
  docker stats "$CONTAINER_NAME" --no-stream
}

cmd_config() {
  print_header "MongoDB Configuration Files"
  
  echo "Configuration Files:"
  echo ""
  print_code "local-dev/mongodb/Dockerfile.mongodb"
  echo "  - MongoDB 8.0 Docker image definition"
  echo ""
  
  print_code "local-dev/mongodb/docker-compose.yml"
  echo "  - Docker Compose configuration"
  echo ""
  
  print_code "local-dev/mongodb/init-mongo.js"
  echo "  - Initialization script (creates user)"
  echo ""
  
  print_code "local-dev/mongodb/healthcheck.sh"
  echo "  - Health check script"
  echo ""
  
  print_code "local-dev/mongodb/README.md"
  echo "  - Detailed documentation"
  echo ""
  
  echo "View these files with:"
  print_code "cat local-dev/mongodb/docker-compose.yml"
}

cmd_menu() {
  while true; do
    print_header "MongoDB Management Menu"
    
    echo -e "${CYAN}Container Management:${NC}"
    echo "  1) Start MongoDB (up)"
    echo "  2) Stop MongoDB (down)"
    echo "  3) Restart MongoDB"
    echo "  4) Show Status"
    echo ""
    echo -e "${CYAN}Monitoring & Diagnostics:${NC}"
    echo "  5) Health Check"
    echo "  6) View Live Logs"
    echo "  7) View Recent Logs"
    echo "  8) Show Resource Stats"
    echo ""
    echo -e "${CYAN}Database Access & Management:${NC}"
    echo "  9) Open MongoDB Shell"
    echo "  10) Reset Database (delete all data)"
    echo ""
    echo -e "${CYAN}Information:${NC}"
    echo "  11) Show Connection Details"
    echo "  12) Show Configuration"
    echo "  13) Show Help"
    echo ""
    echo "  0) Exit"
    echo ""
    read -p "Select an option (0-13): " choice
    
    case "$choice" in
      1) cmd_up ;;
      2) cmd_down ;;
      3) cmd_restart ;;
      4) cmd_status ;;
      5) cmd_health ;;
      6) cmd_logs ;;
      7) cmd_logs_recent ;;
      8) cmd_stats ;;
      9) cmd_shell ;;
      10) cmd_reset ;;
      11) cmd_info ;;
      12) cmd_config ;;
      13) cmd_help ;;
      0) 
        echo ""
        print_info "Goodbye!"
        exit 0
        ;;
      *)
        echo ""
        print_error "Invalid option. Please try again."
        sleep 2
        ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
  done
}

cmd_help() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} MongoDB Database Management"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${CYAN}Usage:${NC}"
  echo "  npm run mongodb [command] [options]"
  echo ""
  
  echo -e "${CYAN}Container Commands:${NC}"
  echo "  up              Start MongoDB container"
  echo "  down            Stop MongoDB container"
  echo "  restart         Restart MongoDB container"
  echo "  status          Show container status"
  echo ""
  
  echo -e "${CYAN}Monitoring & Diagnostics:${NC}"
  echo "  health          Run comprehensive health checks"
  echo "  logs            View live logs (Ctrl+C to exit)"
  echo "  logs:recent     View recent logs (last 100 lines)"
  echo "  stats           Show container resource usage"
  echo ""
  
  echo -e "${CYAN}Database Access:${NC}"
  echo "  shell           Open interactive MongoDB shell"
  echo ""
  
  echo -e "${CYAN}Data Management:${NC}"
  echo "  reset           Delete all data and reinitialize"
  echo ""
  
  echo -e "${CYAN}Information:${NC}"
  echo "  info            Display connection details"
  echo "  config          Show configuration files"
  echo "  help            Display this help message"
  echo "  menu            Show interactive menu"
  echo ""
  
  echo -e "${CYAN}Examples:${NC}"
  echo "  npm run mongodb up"
  echo "  npm run mongodb health"
  echo "  npm run mongodb shell"
  echo "  npm run mongodb logs"
  echo "  npm run mongodb status"
  echo "  npm run mongodb reset"
  echo "  npm run mongodb menu"
  echo ""
  
  echo -e "${CYAN}Environment:${NC}"
  echo "  Database:  $DATABASE_NAME"
  echo "  User:      $MONGODB_USER"
  echo "  Host:      $MONGODB_HOST:$MONGODB_PORT"
  echo ""
  
  echo -e "${CYAN}Connection String:${NC}"
  echo "  mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
  echo ""
  
  echo -e "${CYAN}Documentation:${NC}"
  echo "  See local-dev/mongodb/README.md for detailed information"
  echo ""
}

##############################################################################
# Command Router
##############################################################################

case "${1:-menu}" in
  up)
    cmd_up
    ;;
  down)
    cmd_down
    ;;
  restart)
    cmd_restart
    ;;
  status)
    cmd_status
    ;;
  health)
    cmd_health
    ;;
  logs)
    cmd_logs
    ;;
  logs:recent|recent-logs)
    cmd_logs_recent
    ;;
  shell)
    cmd_shell
    ;;
  reset)
    cmd_reset
    ;;
  info)
    cmd_info
    ;;
  stats)
    cmd_stats
    ;;
  config)
    cmd_config
    ;;
  menu)
    cmd_menu
    ;;
  help|--help|-h)
    cmd_help
    ;;
  *)
    print_error "Unknown command: $1"
    echo ""
    cmd_help
    exit 1
    ;;
esac
