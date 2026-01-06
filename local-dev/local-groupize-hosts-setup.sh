#!/bin/bash

# Add groupize.local to /etc/hosts
# Usage: bash local-dev/add-hosts-entry.sh

set -e

HOSTS_ENTRY="127.0.0.1 groupize.local"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}Adding groupize.local to /etc/hosts${NC}\n"

# Check if entry already exists
if grep -q "groupize.local" /etc/hosts 2>/dev/null; then
  echo -e "${GREEN}✓${NC} groupize.local already in /etc/hosts"
  grep "groupize.local" /etc/hosts
else
  echo "You'll be prompted for your password..."
  echo ""
  
  # Add entry to /etc/hosts
  echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts > /dev/null
  
  echo -e "\n${GREEN}✓${NC} Added to /etc/hosts:"
  grep "groupize.local" /etc/hosts
fi

echo ""
