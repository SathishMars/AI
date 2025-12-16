#!/bin/bash

# Cleanup script for local development environment
# - Removes testing.app.groupize.com from /etc/hosts
# - Removes mkcert CA certificate from system keychain/store

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC} Local Development Environment Cleanup"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CERTS_DIR="$SCRIPT_DIR/nginx/certs"
MKCERT_CA_PATH="$NGINX_CERTS_DIR/mkcert-ca-cert.pem"

# ============================================================================
# 1. Remove testing.app.groupize.com from /etc/hosts
# ============================================================================

echo -e "${YELLOW}⚠${NC} Removing testing.app.groupize.com from /etc/hosts..."
echo ""

# Check if entry exists
if grep -q "testing.app.groupize.com" /etc/hosts 2>/dev/null; then
  echo "You'll be prompted for your password to update /etc/hosts"
  echo ""
  
  # Remove entry from /etc/hosts (requires sudo on macOS/Linux)
  sudo sed -i '' '/testing.app.groupize.com/d' /etc/hosts
  
  echo -e "${GREEN}✓${NC} testing.app.groupize.com removed from /etc/hosts"
else
  echo -e "${GREEN}✓${NC} testing.app.groupize.com not found in /etc/hosts (already removed)"
fi

echo ""

# ============================================================================
# 2. Remove mkcert CA certificate from system keychain/store
# ============================================================================

if [ ! -f "$MKCERT_CA_PATH" ]; then
  echo -e "${YELLOW}⚠${NC} mkcert CA certificate not found at $MKCERT_CA_PATH"
  echo "    Skipping certificate removal"
  echo ""
else
  # Detect operating system
  OS_TYPE=$(uname -s)

  case "$OS_TYPE" in
    Darwin)
      # macOS
      echo -e "${YELLOW}⚠${NC} Removing mkcert CA certificate from macOS Keychain..."
      echo ""
      echo "You'll be prompted for your password to remove the certificate"
      echo ""
      
      # Find and remove mkcert CAs from keychain
      # Note: This attempts to find certs with "mkcert" in the name and remove them
      security find-certificate -c "mkcert" /Library/Keychains/System.keychain 2>/dev/null | \
        grep "alis" | \
        sed 's/.*"alis"<blob>="\(.*\)"/\1/' | \
        while read cert_name; do
          sudo security delete-certificate -c "$cert_name" /Library/Keychains/System.keychain 2>/dev/null || true
        done
      
      # Also try to remove by the common name directly
      sudo security delete-certificate -c "mkcert rootCA" /Library/Keychains/System.keychain 2>/dev/null || true
      
      echo -e "${GREEN}✓${NC} mkcert CA certificate removed from Keychain"
      echo ""
      ;;
    
    MINGW* | MSYS* | CYGWIN*)
      # Windows (Git Bash, WSL, Cygwin)
      echo -e "${YELLOW}⚠${NC} Removing mkcert CA certificate from Windows Certificate Store..."
      echo ""
      echo "You'll be prompted to allow elevated permissions to remove the certificate"
      echo ""
      
      # Remove from Windows Trusted Root Certification Authorities store
      certutil -delstore -f "Root" "mkcert" 2>/dev/null || true
      
      echo -e "${GREEN}✓${NC} mkcert CA certificate removed from Windows Certificate Store"
      echo ""
      ;;
    
    Linux)
      # Linux
      echo -e "${YELLOW}⚠${NC} Removing mkcert CA certificate from Linux system store..."
      echo ""
      echo "You'll be prompted for your password to remove the certificate"
      echo ""
      
      if command -v update-ca-certificates &> /dev/null; then
        # Debian/Ubuntu based
        sudo rm -f /usr/local/share/ca-certificates/mkcert-ca.crt
        sudo update-ca-certificates
      elif command -v update-ca-trust &> /dev/null; then
        # RHEL/Fedora based
        sudo rm -f /etc/pki/ca-trust/source/anchors/mkcert-ca.crt
        sudo update-ca-trust
      else
        echo -e "${YELLOW}⚠${NC} Could not detect Linux distribution for certificate removal"
        echo "   You may need to remove the CA manually"
      fi
      
      echo -e "${GREEN}✓${NC} mkcert CA certificate removed from system store"
      echo ""
      ;;
    
    *)
      echo -e "${YELLOW}⚠${NC} Unknown operating system: $OS_TYPE"
      echo "   You may need to remove the CA manually from your system store"
      echo ""
      ;;
  esac
fi

echo ""

# ============================================================================
# 3. Show completion message
# ============================================================================

echo -e "${BLUE}Cleanup Complete!${NC}"
echo ""
echo "The following have been removed:"
echo -e "  ${GREEN}✓${NC} testing.app.groupize.com from /etc/hosts"
echo -e "  ${GREEN}✓${NC} mkcert CA certificate from system store"
echo ""
echo "Note: Close and reopen your browser to ensure old certificates are cleared"
echo ""
