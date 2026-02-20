#!/bin/bash

# ========================================
#   Discord Bot - Linux Installer
#   Tested on: Linux Mint (Xfce)
#   Run: chmod +x install.sh && ./install.sh
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

BOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Discord Bot - Linux Installer${NC}"
echo -e "${CYAN}  Linux Mint (Xfce) Edition${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ----------------------------------------
# Check if running with sudo when needed
# ----------------------------------------
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}[INFO] Some steps require sudo. You may be prompted for your password.${NC}"
        echo ""
    fi
}
check_sudo

# ----------------------------------------
# Step 1: Update system packages
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
echo -e "${YELLOW}========================================${NC}"
sudo apt update -y
echo -e "${GREEN}[OK] System packages updated${NC}"
echo ""

# ----------------------------------------
# Step 2: Install Node.js
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 2: Checking Node.js...${NC}"
echo -e "${YELLOW}========================================${NC}"

if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    echo -e "${GREEN}[OK] Node.js already installed: ${NODE_VER}${NC}"
else
    echo -e "${CYAN}[INFO] Installing Node.js 20 LTS...${NC}"
    # Install Node.js via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    NODE_VER=$(node --version)
    echo -e "${GREEN}[OK] Node.js installed: ${NODE_VER}${NC}"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    echo -e "${GREEN}[OK] npm installed: ${NPM_VER}${NC}"
else
    echo -e "${CYAN}[INFO] Installing npm...${NC}"
    sudo apt install -y npm
    echo -e "${GREEN}[OK] npm installed${NC}"
fi
echo ""

# ----------------------------------------
# Step 3: Install MongoDB
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 3: Installing MongoDB...${NC}"
echo -e "${YELLOW}========================================${NC}"

if command -v mongod &> /dev/null; then
    echo -e "${GREEN}[OK] MongoDB already installed${NC}"
else
    echo -e "${CYAN}[INFO] Installing MongoDB...${NC}"

    # Import MongoDB GPG key
    sudo apt install -y gnupg curl
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null || true

    # Detect Ubuntu version (Linux Mint is based on Ubuntu)
    UBUNTU_CODENAME=""
    if [ -f /etc/upstream-release/lsb-release ]; then
        UBUNTU_CODENAME=$(grep DISTRIB_CODENAME /etc/upstream-release/lsb-release | cut -d= -f2)
    fi
    if [ -z "$UBUNTU_CODENAME" ]; then
        # Fallback: try to detect from os-release
        UBUNTU_CODENAME=$(grep UBUNTU_CODENAME /etc/os-release 2>/dev/null | cut -d= -f2)
    fi
    if [ -z "$UBUNTU_CODENAME" ]; then
        # Default to jammy (Ubuntu 22.04) which most recent Mint versions are based on
        UBUNTU_CODENAME="jammy"
    fi

    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    sudo apt update -y
    sudo apt install -y mongodb-org || {
        echo -e "${YELLOW}[WARNING] MongoDB 7.0 repo failed. Trying system mongodb...${NC}"
        sudo apt install -y mongodb
    }

    echo -e "${GREEN}[OK] MongoDB installed${NC}"
fi

# Start and enable MongoDB
echo -e "${CYAN}[INFO] Starting MongoDB service...${NC}"
sudo systemctl start mongod 2>/dev/null || sudo systemctl start mongodb 2>/dev/null || true
sudo systemctl enable mongod 2>/dev/null || sudo systemctl enable mongodb 2>/dev/null || true

# Verify MongoDB is running
if systemctl is-active --quiet mongod 2>/dev/null || systemctl is-active --quiet mongodb 2>/dev/null; then
    echo -e "${GREEN}[OK] MongoDB is running${NC}"
else
    echo -e "${YELLOW}[WARNING] MongoDB may not be running. You can start it manually later:${NC}"
    echo -e "${YELLOW}  sudo systemctl start mongod${NC}"
fi
echo ""

# ----------------------------------------
# Step 4: Install FFmpeg
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 4: Installing FFmpeg...${NC}"
echo -e "${YELLOW}========================================${NC}"

if command -v ffmpeg &> /dev/null; then
    FFMPEG_VER=$(ffmpeg -version 2>&1 | head -n1)
    echo -e "${GREEN}[OK] FFmpeg already installed: ${FFMPEG_VER}${NC}"
else
    echo -e "${CYAN}[INFO] Installing FFmpeg...${NC}"
    sudo apt install -y ffmpeg
    echo -e "${GREEN}[OK] FFmpeg installed${NC}"
fi
echo ""

# ----------------------------------------
# Step 5: Install yt-dlp
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 5: Installing yt-dlp...${NC}"
echo -e "${YELLOW}========================================${NC}"

if command -v yt-dlp &> /dev/null; then
    YTDLP_VER=$(yt-dlp --version)
    echo -e "${GREEN}[OK] yt-dlp already installed: ${YTDLP_VER}${NC}"
else
    echo -e "${CYAN}[INFO] Installing yt-dlp...${NC}"
    # Try pip first, then fallback to direct download
    if command -v pip3 &> /dev/null; then
        pip3 install yt-dlp
    else
        sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
        sudo chmod a+rx /usr/local/bin/yt-dlp
    fi
    echo -e "${GREEN}[OK] yt-dlp installed${NC}"
fi
echo ""

# ----------------------------------------
# Step 6: Install build tools (for native npm modules)
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 6: Installing build tools...${NC}"
echo -e "${YELLOW}========================================${NC}"

echo -e "${CYAN}[INFO] Installing build essentials for native modules...${NC}"
sudo apt install -y build-essential python3 libsodium-dev libtool autoconf automake
echo -e "${GREEN}[OK] Build tools installed${NC}"
echo ""

# ----------------------------------------
# Step 7: Collect configuration from user
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 7: Bot Configuration${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${CYAN}Get your bot token & client ID from:${NC}"
echo -e "${WHITE}  https://discord.com/developers/applications${NC}"
echo ""
echo -e "${CYAN}Get your Guild (Server) ID:${NC}"
echo -e "${WHITE}  Right-click your server name in Discord > Copy Server ID${NC}"
echo -e "${WHITE}  (Enable Developer Mode in Settings > Advanced if you don't see it)${NC}"
echo ""
echo -e "${CYAN}Get your User ID (for bot owner):${NC}"
echo -e "${WHITE}  Right-click your username in Discord > Copy User ID${NC}"
echo ""

# --- Discord Token ---
echo -e "${WHITE}──────────────────────────────────────${NC}"
read -p "$(echo -e ${CYAN}Enter your Discord Bot Token: ${NC})" DISCORD_TOKEN
while [ -z "$DISCORD_TOKEN" ]; do
    echo -e "${RED}  Token cannot be empty!${NC}"
    read -p "$(echo -e ${CYAN}Enter your Discord Bot Token: ${NC})" DISCORD_TOKEN
done

# --- Client ID ---
echo ""
read -p "$(echo -e ${CYAN}Enter your Discord Client ID: ${NC})" DISCORD_CLIENT_ID
while [ -z "$DISCORD_CLIENT_ID" ]; do
    echo -e "${RED}  Client ID cannot be empty!${NC}"
    read -p "$(echo -e ${CYAN}Enter your Discord Client ID: ${NC})" DISCORD_CLIENT_ID
done

# --- Client Secret (optional) ---
echo ""
read -p "$(echo -e ${CYAN}Enter your Discord Client Secret ${YELLOW}[press Enter to skip]${CYAN}: ${NC})" DISCORD_CLIENT_SECRET

# --- Bot Owner User ID ---
echo ""
read -p "$(echo -e ${CYAN}Enter your Discord User ID ${YELLOW}(bot owner)${CYAN}: ${NC})" BOT_OWNERS
while [ -z "$BOT_OWNERS" ]; do
    echo -e "${RED}  Owner User ID cannot be empty!${NC}"
    read -p "$(echo -e ${CYAN}Enter your Discord User ID ${YELLOW}(bot owner)${CYAN}: ${NC})" BOT_OWNERS
done

# --- Bot Prefix ---
echo ""
read -p "$(echo -e ${CYAN}Enter bot command prefix ${YELLOW}[default: !]${CYAN}: ${NC})" BOT_PREFIX
BOT_PREFIX="${BOT_PREFIX:-!}"

# --- MongoDB URI ---
echo ""
echo -e "${WHITE}──────────────────────────────────────${NC}"
echo -e "${CYAN}MongoDB is installed locally. The default URI works for most setups.${NC}"
read -p "$(echo -e ${CYAN}Enter MongoDB URI ${YELLOW}[default: mongodb://localhost:27017/fivem_bot]${CYAN}: ${NC})" MONGODB_URI
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/fivem_bot}"

# --- Dashboard Port ---
echo ""
echo -e "${WHITE}──────────────────────────────────────${NC}"
echo -e "${CYAN}Dashboard settings:${NC}"
read -p "$(echo -e ${CYAN}Enter Dashboard Port ${YELLOW}[default: 3000]${CYAN}: ${NC})" DASHBOARD_PORT
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"

# --- Dashboard Bind Address ---
echo ""
read -p "$(echo -e ${CYAN}Bind dashboard to all interfaces? ${YELLOW}(y = 0.0.0.0, n = localhost only) [default: n]${CYAN}: ${NC})" BIND_ALL
if [ "$BIND_ALL" = "y" ] || [ "$BIND_ALL" = "Y" ]; then
    DASHBOARD_BIND="0.0.0.0"
else
    DASHBOARD_BIND="127.0.0.1"
fi

# --- Dashboard Allowed IPs ---
echo ""
read -p "$(echo -e ${CYAN}Enter allowed IPs for dashboard ${YELLOW}(comma-separated) [default: 127.0.0.1,::1]${CYAN}: ${NC})" DASHBOARD_ALLOWED_IPS
DASHBOARD_ALLOWED_IPS="${DASHBOARD_ALLOWED_IPS:-127.0.0.1,::1}"

# --- Dashboard Username ---
echo ""
read -p "$(echo -e ${CYAN}Enter Dashboard Username ${YELLOW}[default: admin]${CYAN}: ${NC})" DASHBOARD_USER
DASHBOARD_USER="${DASHBOARD_USER:-admin}"

# --- Dashboard Password ---
echo ""
read -sp "$(echo -e ${CYAN}Enter Dashboard Password: ${NC})" DASHBOARD_PASSWORD
echo ""
while [ -z "$DASHBOARD_PASSWORD" ]; do
    echo -e "${RED}  Password cannot be empty!${NC}"
    read -sp "$(echo -e ${CYAN}Enter Dashboard Password: ${NC})" DASHBOARD_PASSWORD
    echo ""
done

# --- Dashboard API Key ---
echo ""
read -p "$(echo -e ${CYAN}Enter Dashboard API Key ${YELLOW}[press Enter to auto-generate]${CYAN}: ${NC})" DASHBOARD_API_KEY
if [ -z "$DASHBOARD_API_KEY" ]; then
    DASHBOARD_API_KEY=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    echo -e "${GREEN}  Auto-generated API key: ${DASHBOARD_API_KEY}${NC}"
fi

# --- Session Secret ---
echo ""
read -p "$(echo -e ${CYAN}Enter Session Secret ${YELLOW}[press Enter to auto-generate]${CYAN}: ${NC})" DASHBOARD_SESSION_SECRET
if [ -z "$DASHBOARD_SESSION_SECRET" ]; then
    DASHBOARD_SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    echo -e "${GREEN}  Auto-generated session secret: ${DASHBOARD_SESSION_SECRET}${NC}"
fi

# --- FiveM Settings ---
echo ""
echo -e "${WHITE}──────────────────────────────────────${NC}"
echo -e "${CYAN}FiveM Server settings (optional - press Enter to skip):${NC}"

read -p "$(echo -e ${CYAN}Enter FiveM Server IP ${YELLOW}[press Enter to skip]${CYAN}: ${NC})" FIVEM_SERVER_IP
read -p "$(echo -e ${CYAN}Enter FiveM Server Port ${YELLOW}[default: 30120]${CYAN}: ${NC})" FIVEM_SERVER_PORT
FIVEM_SERVER_PORT="${FIVEM_SERVER_PORT:-30120}"

read -p "$(echo -e ${CYAN}Enter FiveM API URL ${YELLOW}[default: http://127.0.0.1:30120]${CYAN}: ${NC})" FIVEM_API_URL
FIVEM_API_URL="${FIVEM_API_URL:-http://127.0.0.1:30120}"

read -p "$(echo -e ${CYAN}Enter FiveM API Key ${YELLOW}[press Enter for default]${CYAN}: ${NC})" FIVEM_API_KEY
FIVEM_API_KEY="${FIVEM_API_KEY:-TZ_ANTICHEAT_SECRET_KEY_CHANGE_ME}"

read -p "$(echo -e ${CYAN}Enter FiveM Bridge Directory ${YELLOW}[press Enter to skip]${CYAN}: ${NC})" FIVEM_BRIDGE_DIR

echo ""

# ----------------------------------------
# Step 8: Write .env file
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 8: Writing .env configuration...${NC}"
echo -e "${YELLOW}========================================${NC}"

# Backup existing .env if it exists
if [ -f "$BOT_DIR/.env" ]; then
    cp "$BOT_DIR/.env" "$BOT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${CYAN}[INFO] Existing .env backed up${NC}"
fi

cat > "$BOT_DIR/.env" << ENVEOF
# DISCORD BOT CONFIGURATION
# Generated by install.sh on $(date)
DISCORD_TOKEN=${DISCORD_TOKEN}
DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}

# BOT SETTINGS
BOT_PREFIX=${BOT_PREFIX}
BOT_OWNERS=${BOT_OWNERS}

# DASHBOARD
DASHBOARD_PORT=${DASHBOARD_PORT}
DASHBOARD_USER=${DASHBOARD_USER}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
DASHBOARD_API_KEY=${DASHBOARD_API_KEY}
DASHBOARD_SESSION_SECRET=${DASHBOARD_SESSION_SECRET}
ENABLE_DASHBOARD=true
DASHBOARD_BIND=${DASHBOARD_BIND}
DASHBOARD_ALLOWED_IPS=${DASHBOARD_ALLOWED_IPS}
DASHBOARD_TRUST_PROXY=false

# DATABASE (MongoDB)
MONGODB_URI=${MONGODB_URI}

# FIVEM
FIVEM_SERVER_IP=${FIVEM_SERVER_IP}
FIVEM_SERVER_PORT=${FIVEM_SERVER_PORT}

# FiveM AntiCheat Integration (for !kick, !ban, !players commands)
FIVEM_API_URL=${FIVEM_API_URL}
FIVEM_API_KEY=${FIVEM_API_KEY}
FIVEM_BRIDGE_DIR=${FIVEM_BRIDGE_DIR}
ENVEOF

echo -e "${GREEN}[OK] .env file created${NC}"
echo ""

# ----------------------------------------
# Step 9: Install npm dependencies
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 9: Installing Node.js dependencies...${NC}"
echo -e "${YELLOW}========================================${NC}"

cd "$BOT_DIR"

if [ -d "node_modules" ]; then
    echo -e "${CYAN}[INFO] Cleaning old node_modules...${NC}"
    rm -rf node_modules
fi

echo -e "${CYAN}[INFO] Running npm install (this may take 2-5 minutes)...${NC}"
npm install --no-audit

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] npm packages installed successfully${NC}"
else
    echo -e "${RED}[ERROR] npm install failed. Try running 'npm install' manually.${NC}"
fi
echo ""

# ----------------------------------------
# Step 10: Test MongoDB connection
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 10: Testing MongoDB connection...${NC}"
echo -e "${YELLOW}========================================${NC}"

if command -v mongosh &> /dev/null; then
    MONGO_TEST=$(mongosh --eval "db.version()" --quiet 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] MongoDB connection successful (version: ${MONGO_TEST})${NC}"
    else
        echo -e "${YELLOW}[WARNING] MongoDB connection test failed. It may still work when the bot starts.${NC}"
    fi
elif command -v mongo &> /dev/null; then
    MONGO_TEST=$(mongo --eval "db.version()" --quiet 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] MongoDB connection successful${NC}"
    else
        echo -e "${YELLOW}[WARNING] MongoDB connection test inconclusive${NC}"
    fi
else
    echo -e "${CYAN}[INFO] MongoDB shell not found - skipping connection test${NC}"
    echo -e "${CYAN}  MongoDB should still work with the bot${NC}"
fi
echo ""

# ----------------------------------------
# Step 11: Create start.sh script
# ----------------------------------------
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 11: Creating startup script...${NC}"
echo -e "${YELLOW}========================================${NC}"

# Create start.sh in bot directory
cat > "$BOT_DIR/start.sh" << 'STARTEOF'
#!/bin/bash

# ========================================
#   Discord Bot - Startup Script
#   Linux Mint (Xfce) Edition
# ========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BOT_DIR"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Discord Bot - Status Check${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check Node.js
echo -e "[Checking] Node.js..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}[OK] Node.js installed: $(node --version)${NC}"
else
    echo -e "${RED}[ERROR] Node.js not found! Run install.sh first.${NC}"
    read -p "Press Enter to exit..."
    exit 1
fi
echo ""

# Check MongoDB
echo -e "[Checking] MongoDB service..."
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}[OK] MongoDB is running${NC}"
elif systemctl is-active --quiet mongodb 2>/dev/null; then
    echo -e "${GREEN}[OK] MongoDB is running${NC}"
else
    echo -e "${YELLOW}[WARNING] MongoDB not running. Attempting to start...${NC}"
    sudo systemctl start mongod 2>/dev/null || sudo systemctl start mongodb 2>/dev/null
    sleep 2
    if systemctl is-active --quiet mongod 2>/dev/null || systemctl is-active --quiet mongodb 2>/dev/null; then
        echo -e "${GREEN}[OK] MongoDB started${NC}"
    else
        echo -e "${RED}[ERROR] Failed to start MongoDB. Run: sudo systemctl start mongod${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi
echo ""

# Check .env
echo -e "[Checking] Configuration file..."
if [ -f "$BOT_DIR/.env" ]; then
    echo -e "${GREEN}[OK] .env file found${NC}"
    if grep -q "DISCORD_TOKEN=your_discord_token_here" "$BOT_DIR/.env" 2>/dev/null; then
        echo -e "${RED}[ERROR] DISCORD_TOKEN not configured in .env${NC}"
        echo -e "Please edit .env and add your Discord bot token."
        read -p "Open .env in text editor? (y/n): " OPEN_ENV
        if [ "$OPEN_ENV" = "y" ] || [ "$OPEN_ENV" = "Y" ]; then
            xdg-open "$BOT_DIR/.env" 2>/dev/null || nano "$BOT_DIR/.env"
        fi
        exit 1
    fi
else
    echo -e "${RED}[ERROR] .env file not found! Run install.sh first.${NC}"
    read -p "Press Enter to exit..."
    exit 1
fi
echo ""

# Check node_modules
echo -e "[Checking] Dependencies..."
if [ -d "$BOT_DIR/node_modules" ]; then
    echo -e "${GREEN}[OK] Dependencies installed${NC}"
else
    echo -e "${CYAN}[INFO] Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install dependencies${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo -e "${GREEN}[OK] Dependencies installed${NC}"
fi
echo ""

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Starting Discord Bot + Dashboard${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Dashboard will be available at:"
echo -e "  ${GREEN}http://localhost:${DASHBOARD_PORT:-3000}${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop the bot"
echo -e "${CYAN}========================================${NC}"
echo ""

# Load port from .env for display
source "$BOT_DIR/.env" 2>/dev/null

# Start the bot
node dashboard.js

echo ""
echo "========================================" 
echo "Bot stopped."
echo "========================================"
read -p "Press Enter to exit..."
STARTEOF

chmod +x "$BOT_DIR/start.sh"
echo -e "${GREEN}[OK] start.sh created in bot directory${NC}"

# Create desktop shortcut
DESKTOP_DIR="$HOME/Desktop"
if [ ! -d "$DESKTOP_DIR" ]; then
    # Some locales use translated folder names
    DESKTOP_DIR=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")
fi

if [ -d "$DESKTOP_DIR" ]; then
    # Create .desktop launcher
    cat > "$DESKTOP_DIR/Discord-Bot.desktop" << DESKTOPEOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Discord Bot
Comment=Start the FiveM Discord Bot + Dashboard
Exec=bash -c 'cd "${BOT_DIR}" && ./start.sh; exec bash'
Icon=utilities-terminal
Terminal=true
Categories=Application;
Path=${BOT_DIR}
DESKTOPEOF

    chmod +x "$DESKTOP_DIR/Discord-Bot.desktop"
    # Mark as trusted on Linux Mint / Xfce (suppress untrusted warning)
    gio set "$DESKTOP_DIR/Discord-Bot.desktop" metadata::trusted true 2>/dev/null || true
    echo -e "${GREEN}[OK] Desktop shortcut created: Discord-Bot.desktop${NC}"
else
    echo -e "${YELLOW}[WARNING] Desktop folder not found. You can run the bot with:${NC}"
    echo -e "${WHITE}  cd $BOT_DIR && ./start.sh${NC}"
fi
echo ""

# ----------------------------------------
# Summary
# ----------------------------------------
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Installation Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${WHITE}What was installed:${NC}"
echo -e "  ${GREEN}✓${NC} Node.js & npm"
echo -e "  ${GREEN}✓${NC} MongoDB"
echo -e "  ${GREEN}✓${NC} FFmpeg"
echo -e "  ${GREEN}✓${NC} yt-dlp"
echo -e "  ${GREEN}✓${NC} Build tools (for native modules)"
echo -e "  ${GREEN}✓${NC} npm dependencies"
echo -e "  ${GREEN}✓${NC} .env configuration"
echo -e "  ${GREEN}✓${NC} Desktop startup shortcut"
echo ""
echo -e "${WHITE}Your configuration:${NC}"
echo -e "  Bot Prefix:      ${GREEN}${BOT_PREFIX}${NC}"
echo -e "  Dashboard Port:  ${GREEN}${DASHBOARD_PORT}${NC}"
echo -e "  Dashboard Bind:  ${GREEN}${DASHBOARD_BIND}${NC}"
echo -e "  MongoDB URI:     ${GREEN}${MONGODB_URI}${NC}"
echo -e "  FiveM Server:    ${GREEN}${FIVEM_SERVER_IP:-not set}:${FIVEM_SERVER_PORT}${NC}"
echo ""
echo -e "${WHITE}To start the bot:${NC}"
echo -e "  ${CYAN}Option 1:${NC} Double-click ${GREEN}Discord-Bot${NC} on your Desktop"
echo -e "  ${CYAN}Option 2:${NC} Run: ${GREEN}cd \"$BOT_DIR\" && ./start.sh${NC}"
echo -e "  ${CYAN}Option 3:${NC} Run: ${GREEN}cd \"$BOT_DIR\" && node dashboard.js${NC}"
echo ""
echo -e "${WHITE}Dashboard will be at:${NC}"
echo -e "  ${GREEN}http://localhost:${DASHBOARD_PORT}${NC}"
echo ""
echo -e "${WHITE}Make sure these Discord intents are enabled:${NC}"
echo -e "  ${YELLOW}→${NC} SERVER MEMBERS INTENT"
echo -e "  ${YELLOW}→${NC} MESSAGE CONTENT INTENT"
echo -e "  ${YELLOW}→${NC} PRESENCE INTENT"
echo -e "  ${CYAN}At: https://discord.com/developers/applications/${DISCORD_CLIENT_ID}/bot${NC}"
echo ""
echo -e "${CYAN}For help, see README.md${NC}"
echo ""

# Ask if user wants to start the bot now
read -p "$(echo -e ${CYAN}Start the bot now? \(y/n\): ${NC})" START_NOW
if [ "$START_NOW" = "y" ] || [ "$START_NOW" = "Y" ]; then
    echo ""
    echo -e "${CYAN}Starting bot...${NC}"
    cd "$BOT_DIR"
    node dashboard.js
fi
