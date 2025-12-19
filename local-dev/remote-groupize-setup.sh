#!/bin/bash

# Setup script for local development environment
# - Generates browser-trusted SSL certificates using mkcert in Docker
# - Installs mkcert CA certificate in system keychain

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC} Local Development Environment Setup"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# ============================================================================
# 1. Check if Docker is running
# ============================================================================

if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠${NC} Docker is not running"
  echo ""
  echo "Please start Docker Desktop and try again:"
  echo "  open -a Docker"
  exit 1
fi

echo -e "${GREEN}✓${NC} Docker is running"
echo ""

# ============================================================================
# 2. Generate SSL Certificates using mkcert in Docker
# ============================================================================

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CERTS_DIR="$SCRIPT_DIR/nginx/certs"

CERT_PATH="$NGINX_CERTS_DIR/testing.app.groupize.com.pem"
KEY_PATH="$NGINX_CERTS_DIR/testing.app.groupize.com-key.pem"
MKCERT_CA_PATH="$NGINX_CERTS_DIR/mkcert-ca-cert.pem"
HOSTS_ENTRY="127.0.0.1 testing.app.groupize.com"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  echo -e "${YELLOW}⚠${NC} Browser-trusted SSL certificates not found"
  echo ""
  echo "Generating certificates using mkcert (in Docker container)..."
  echo ""
  
  mkdir -p "$NGINX_CERTS_DIR"
  
  # Use Docker to run mkcert - generates browser-trusted certificates
  # KEY: Mount ~/.config/mkcert to persist the CA across runs
  docker run --rm \
    -v "$NGINX_CERTS_DIR:/certs" \
    -v "$HOME/.config/mkcert:/root/.config/mkcert" \
    -v "$HOME/.local/share/mkcert:/root/.local/share/mkcert" \
    -w /certs \
    golang:1.21-alpine sh -c '
      # Install mkcert dependencies
      apk add --no-cache git make
      
      # Install mkcert
      git clone https://github.com/FiloSottile/mkcert.git /tmp/mkcert 2>/dev/null || true
      cd /tmp/mkcert 2>/dev/null || git clone https://github.com/FiloSottile/mkcert.git /tmp/mkcert
      go build -o /usr/local/bin/mkcert
      
      # Ensure CA directory exists
      mkdir -p /root/.local/share/mkcert
      
      # Install CA (reuses existing if available)
      CAROOT=/root/.local/share/mkcert mkcert -install 2>&1 | head -1 || true
      
      # Generate certificate for testing.app.groupize.com
      cd /certs
      CAROOT=/root/.local/share/mkcert mkcert testing.app.groupize.com 127.0.0.1 ::1 2>&1 | grep -E "cert|key" || true
      
      # Copy CA cert for installation in system keychain
      cp /root/.local/share/mkcert/rootCA.pem ./mkcert-ca-cert.pem
    ' > /dev/null 2>&1
  
  if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo -e "${GREEN}✓${NC} Browser-trusted certificates generated"
  else
    echo -e "${YELLOW}⚠${NC} Certificate generation may have issues"
    echo "   Fallback: Using self-signed certificates"
    echo ""
    
    # Fallback to self-signed if mkcert fails
    docker run --rm -v "$NGINX_CERTS_DIR:/certs" alpine/openssl req -x509 \
      -newkey rsa:4096 \
      -keyout /certs/testing.app.groupize.com-key.pem \
      -out /certs/testing.app.groupize.com.pem \
      -days 365 -nodes \
      -subj "/CN=testing.app.groupize.com" > /dev/null 2>&1
    
    echo -e "${GREEN}✓${NC} Self-signed certificates generated"
  fi
else
  echo -e "${GREEN}✓${NC} SSL certificates already exist"
fi

echo ""

# ============================================================================
# 3. Add testing.app.groupize.com to /etc/hosts
# ============================================================================

echo -e "${YELLOW}⚠${NC} Adding testing.app.groupize.com to /etc/hosts..."
echo ""

# Check if entry already exists
if grep -q "testing.app.groupize.com" /etc/hosts 2>/dev/null; then
  echo -e "${GREEN}✓${NC} testing.app.groupize.com already in /etc/hosts"
else
  echo "You'll be prompted for your password to update /etc/hosts"
  echo ""
  
  # Add entry to /etc/hosts (requires sudo on macOS/Linux)
  echo "$HOSTS_ENTRY" | sudo tee -a /etc/hosts > /dev/null
  
  echo -e "${GREEN}✓${NC} testing.app.groupize.com added to /etc/hosts"
fi

echo ""

# ============================================================================
# 4. Install mkcert CA certificate in system keychain/store
# ============================================================================

# Detect operating system
OS_TYPE=$(uname -s)

if [ -f "$MKCERT_CA_PATH" ]; then
  case "$OS_TYPE" in
    Darwin)
      # macOS
      echo -e "${YELLOW}⚠${NC} Installing mkcert CA certificate in macOS Keychain..."
      echo ""
      
      # Remove old mkcert CAs from keychain to avoid conflicts
      security find-certificate -c "mkcert" /Library/Keychains/System.keychain 2>/dev/null | \
        grep "alis" | \
        sed 's/.*"alis"<blob>="\(.*\)"/\1/' | \
        while read cert_name; do
          sudo security delete-certificate -c "$cert_name" /Library/Keychains/System.keychain 2>/dev/null || true
        done
      
      echo "You'll be prompted for your password (to trust the certificate)"
      echo ""
      
      # Add the CA certificate to the system keychain
      sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$MKCERT_CA_PATH"
      
      echo -e "${GREEN}✓${NC} CA certificate installed in Keychain"
      echo ""
      ;;
    
    MINGW* | MSYS* | CYGWIN*)
      # Windows (Git Bash, WSL, Cygwin)
      echo -e "${YELLOW}⚠${NC} Installing mkcert CA certificate in Windows Certificate Store..."
      echo ""
      echo "You'll be prompted to allow elevated permissions to install the certificate"
      echo ""
      
      # Convert the PEM certificate to DER format for Windows
      DER_CERT_PATH="${MKCERT_CA_PATH%.pem}.der"
      openssl x509 -inform PEM -in "$MKCERT_CA_PATH" -outform DER -out "$DER_CERT_PATH" 2>/dev/null
      
      # Install to Windows Trusted Root Certification Authorities store
      certutil -addstore -f "Root" "$DER_CERT_PATH"
      
      # Clean up DER file
      rm -f "$DER_CERT_PATH"
      
      echo -e "${GREEN}✓${NC} CA certificate installed in Windows Certificate Store"
      echo ""
      ;;
    
    Linux)
      # Linux
      echo -e "${YELLOW}⚠${NC} Installing mkcert CA certificate in Linux system store..."
      echo ""
      echo "You'll be prompted for your password to install the certificate"
      echo ""
      
      if command -v update-ca-certificates &> /dev/null; then
        # Debian/Ubuntu based
        sudo cp "$MKCERT_CA_PATH" /usr/local/share/ca-certificates/mkcert-ca.crt
        sudo update-ca-certificates
      elif command -v update-ca-trust &> /dev/null; then
        # RHEL/Fedora based
        sudo cp "$MKCERT_CA_PATH" /etc/pki/ca-trust/source/anchors/mkcert-ca.crt
        sudo update-ca-trust
      else
        echo -e "${YELLOW}⚠${NC} Could not detect Linux distribution for certificate installation"
        echo "   You may need to install the CA manually from: $MKCERT_CA_PATH"
      fi
      
      echo -e "${GREEN}✓${NC} CA certificate installed in system store"
      echo ""
      ;;
    
    *)
      echo -e "${YELLOW}⚠${NC} Unknown operating system: $OS_TYPE"
      echo "   Please install the CA certificate manually from: $MKCERT_CA_PATH"
      echo ""
      ;;
  esac
fi

echo ""

# ============================================================================
# 4. Show next steps
# ============================================================================

echo -e "${BLUE}Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo -e "  1. Close and reopen your browser (to load new CA certificate)"
echo ""
echo -e "  2. Start Nginx reverse proxy:"
echo -e "     ${GREEN}npm run nginx${NC}"
echo ""
echo -e "  3. In another terminal, start Next.js dev server:"
echo -e "     ${GREEN}npm run dev${NC}"
echo ""
echo -e "  4. (Optional) Start MongoDB:"
echo -e "     ${GREEN}npm run mongodb${NC}"
echo ""
echo -e "Then visit: ${GREEN}https://testing.app.groupize.com/aime${NC}"
echo -e "You should see a ${GREEN}green lock${NC} with no warnings!"
echo ""
echo "To clean up and remove testing.app.groupize.com from /etc/hosts later:"
echo -e "  ${YELLOW}sudo sed -i '' '/testing.app.groupize.com/d' /etc/hosts${NC}"
echo ""
