#!/bin/bash

##############################################################################
# MongoDB 8.0 Health Check Script
#
# This script provides various health check commands for MongoDB
# Usage: ./healthcheck.sh [command]
##############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="groupize-mongodb-8"
MONGODB_PORT=27017
MONGODB_HOST="localhost"
MONGODB_USER="groupize_app"
MONGODB_PASSWORD="gr0up!zeapP"
MONGODB_AUTH_DB="groupize-workflows"
DATABASE_NAME="groupize-workflows"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

##############################################################################
# Health Check Commands
##############################################################################

check_docker_running() {
  print_header "Checking Docker Status"
  
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    return 1
  fi
  
  if ! docker ps &> /dev/null; then
    print_error "Docker daemon is not running"
    return 1
  fi
  
  print_success "Docker is running"
}

check_container_running() {
  print_header "Checking MongoDB Container"
  
  if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_error "MongoDB container '$CONTAINER_NAME' is not running"
    
    if docker ps -a | grep -q "$CONTAINER_NAME"; then
      echo "Container exists but is stopped. Start it with: npm run mongodb up"
    else
      echo "Container does not exist. Create it with: npm run mongodb up"
    fi
    return 1
  fi
  
  print_success "MongoDB container is running"
}

check_container_health() {
  print_header "Checking MongoDB Container Health"
  
  if ! check_container_running; then
    return 1
  fi
  
  local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
  
  case "$health_status" in
    healthy)
      print_success "Container is healthy"
      ;;
    unhealthy)
      print_error "Container is unhealthy"
      print_warning "View logs with: npm run mongodb logs"
      return 1
      ;;
    starting)
      print_warning "Container is starting up (this is normal)"
      ;;
    *)
      print_warning "Container health status is unknown: $health_status"
      ;;
  esac
}

check_mongodb_connection() {
  print_header "Checking MongoDB Connection"
  
  if ! check_container_running; then
    return 1
  fi
  
  if docker exec "$CONTAINER_NAME" mongosh \
    --host localhost \
    --port $MONGODB_PORT \
    -u "$MONGODB_USER" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase "$MONGODB_AUTH_DB" \
    --eval "db.adminCommand('ping')" &> /dev/null; then
    
    print_success "MongoDB is responding to connections"
  else
    print_error "MongoDB is not responding to connections"
    return 1
  fi
}

check_database_exists() {
  print_header "Checking Database"
  
  if ! check_mongodb_connection; then
    return 1
  fi
  
  local db_exists=$(docker exec "$CONTAINER_NAME" mongosh \
    --host localhost \
    --port $MONGODB_PORT \
    -u "$MONGODB_USER" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase "$MONGODB_AUTH_DB" \
    "$DATABASE_NAME" \
    --eval "db.getName()" 2>/dev/null | grep -c "$DATABASE_NAME" || echo "0")
  
  if [ "$db_exists" -gt 0 ]; then
    print_success "Database '$DATABASE_NAME' exists"
  else
    print_error "Database '$DATABASE_NAME' does not exist"
    return 1
  fi
}

check_collections() {
  print_header "Checking Collections"
  
  if ! check_mongodb_connection; then
    return 1
  fi
  
  local collections=$(docker exec "$CONTAINER_NAME" mongosh \
    --host localhost \
    --port $MONGODB_PORT \
    -u "$MONGODB_USER" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase "$MONGODB_AUTH_DB" \
    "$DATABASE_NAME" \
    --eval "db.getCollectionNames().forEach(c => print(c))" 2>/dev/null)
  
  if [ -z "$collections" ]; then
    print_warning "No collections found in database (collections will be created on first use)"
    return 0
  fi
  
  echo "Collections:"
  echo "$collections" | while read -r collection; do
    [ -n "$collection" ] && echo "  - $collection"
  done
  
  print_success "Collections retrieved successfully"
}

check_indexes() {
  print_header "Checking Indexes on workflow_templates"
  
  if ! check_mongodb_connection; then
    return 1
  fi
  
  # Check if the collection exists first
  local collection_exists=$(docker exec "$CONTAINER_NAME" mongosh \
    --host localhost \
    --port $MONGODB_PORT \
    -u "$MONGODB_USER" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase "$MONGODB_AUTH_DB" \
    "$DATABASE_NAME" \
    --eval "db.getCollectionNames().includes('workflow_templates')" 2>/dev/null)
  
  if [ "$collection_exists" != "true" ]; then
    print_warning "workflow_templates collection does not exist yet (will be created on first use)"
    return 0
  fi
  
  local indexes=$(docker exec "$CONTAINER_NAME" mongosh \
    --host localhost \
    --port $MONGODB_PORT \
    -u "$MONGODB_USER" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase "$MONGODB_AUTH_DB" \
    "$DATABASE_NAME" \
    --eval "JSON.stringify(db.workflow_templates.getIndexes(), null, 2)" 2>/dev/null)
  
  if [ -z "$indexes" ]; then
    print_error "Could not retrieve indexes"
    return 1
  fi
  
  echo "$indexes" | head -20
  print_success "Indexes retrieved successfully"
}

check_port_available() {
  print_header "Checking Port $MONGODB_PORT"
  
  if lsof -Pi :$MONGODB_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_success "Port $MONGODB_PORT is in use (expected)"
  else
    print_warning "Port $MONGODB_PORT is not in use"
  fi
}

full_health_check() {
  print_header "Full MongoDB Health Check"
  
  local all_passed=true
  
  check_docker_running || all_passed=false
  check_container_running || all_passed=false
  check_container_health || all_passed=false
  check_port_available || all_passed=false
  check_mongodb_connection || all_passed=false
  check_database_exists || all_passed=false
  check_collections || all_passed=false
  check_indexes || all_passed=false
  
  echo ""
  if [ "$all_passed" = true ]; then
    print_success "All health checks passed! MongoDB is ready for use."
    echo "Connection string: mongodb://$MONGODB_USER:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$DATABASE_NAME"
  else
    print_error "Some health checks failed. See above for details."
    return 1
  fi
}

view_logs() {
  print_header "MongoDB Container Logs (last 100 lines)"
  docker logs --tail 100 "$CONTAINER_NAME"
}

view_stats() {
  print_header "MongoDB Container Statistics"
  docker stats "$CONTAINER_NAME" --no-stream
}

##############################################################################
# Main
##############################################################################

case "${1:-health}" in
  health|full)
    full_health_check
    ;;
  docker)
    check_docker_running
    ;;
  container)
    check_container_running
    ;;
  health-status)
    check_container_health
    ;;
  connection)
    check_mongodb_connection
    ;;
  database)
    check_database_exists
    ;;
  collections)
    check_collections
    ;;
  indexes)
    check_indexes
    ;;
  port)
    check_port_available
    ;;
  logs)
    view_logs
    ;;
  stats)
    view_stats
    ;;
  *)
    cat << EOF
MongoDB 8.0 Health Check Script

Usage: ./healthcheck.sh [command]

Commands:
  health              - Run full health check (default)
  full                - Same as 'health'
  docker              - Check if Docker is running
  container           - Check if MongoDB container is running
  health-status       - Check container health status
  connection          - Test MongoDB connection
  database            - Check if database exists
  collections         - List all collections
  indexes             - Show indexes on workflow_templates
  port                - Check if port 27017 is available
  logs                - View MongoDB logs (last 100 lines)
  stats               - View container statistics

Examples:
  ./healthcheck.sh health
  ./healthcheck.sh logs
  ./healthcheck.sh stats
  ./healthcheck.sh collections
EOF
    ;;
esac
