#!/bin/bash

# Remove groupize.local from /etc/hosts
# Usage: bash local-dev/remove-hosts-entry.sh

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${BLUE}Removing groupize.local from /etc/hosts${NC}\n"

# Check if entry exists
if grep -q "groupize.local" /etc/hosts 2>/dev/null; then
  echo "You'll be prompted for your password..."
  echo ""
  
  # Remove entry from /etc/hosts
  sudo sed -i '' '/groupize.local/d' /etc/hosts  # macOS
  if [ $? -ne 0 ]; then
    sudo sed -i '/groupize.local/d' /etc/hosts   # Linux fallback
  fi
  
  echo -e "${GREEN}✓${NC} Removed from /etc/hosts"
else
  echo -e "${YELLOW}⚠${NC} groupize.local not found in /etc/hosts"
fi

echo ""
