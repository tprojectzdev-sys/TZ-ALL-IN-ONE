# FiveM Discord Bot - Complete Setup Guide

## 🎯 What You're Running

A full-featured Discord bot with:
- **Bot**: Moderation, Economy, Leveling, Music, Tickets, Giveaways
- **Dashboard**: Web interface at http://localhost:3000
- **Database**: MongoDB for data persistence
- **Music**: YouTube playback via yt-dlp + FFmpeg

---

## ⚡ Quick Install (Windows)

### **Option 1: Automatic Setup (Recommended)**

Run this PowerShell script as Administrator:

```powershell
.\INSTALL.ps1
```

This will automatically install:
- ✅ MongoDB Community Server
- ✅ yt-dlp (YouTube downloader)
- ✅ FFmpeg (audio processing)
- ✅ Node.js dependencies
- ✅ Start MongoDB service

Then skip to **Step 3: Configure Bot** below.

---

### **Option 2: Manual Setup**

If auto-install fails, follow these steps:

#### **Step 1: Install Node.js**
✅ You already have Node.js installed (since `node dashboard.js` works)

#### **Step 2: Install MongoDB**

1. **Download MongoDB Community Server**:
   - Go to: https://www.mongodb.com/try/download/community
   - Version: 8.0 or latest
   - OS: Windows
   - Package: MSI

2. **Install MongoDB**:
   - Run the MSI installer
   - Choose "Complete" installation
   - ✅ **IMPORTANT**: Check "Install MongoDB as a Service"
   - ✅ **IMPORTANT**: Check "Run service as Network Service user"
   - Leave default data/log directories

3. **Verify MongoDB is running**:
   ```powershell
   # In PowerShell (Admin):
   Get-Service MongoDB
   ```
   - Status should be "Running"
   - If not, start it: `Start-Service MongoDB`

4. **Test connection**:
   ```powershell
   # In PowerShell:
   mongosh
   ```
   - Should connect to `mongodb://127.0.0.1:27017`
   - Type `exit` to quit

#### **Step 3: Install FFmpeg (for Music)**

1. **Download FFmpeg**:
   - Go to: https://www.gyan.dev/ffmpeg/builds/
   - Download: `ffmpeg-release-essentials.zip`

2. **Extract to Program Files**:
   ```
   C:\Program Files\ffmpeg\
   ```

3. **Add to PATH**:
   - Press `Win + X` → System → Advanced system settings
   - Environment Variables → System Variables → Path → Edit
   - Add: `C:\Program Files\ffmpeg\bin`
   - Click OK on all windows

4. **Verify FFmpeg**:
   ```powershell
   # Open NEW PowerShell window
   ffmpeg -version
   ```

#### **Step 4: Install yt-dlp (for YouTube)**

1. **Download yt-dlp**:
   - PowerShell (Admin):
   ```powershell
   Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "C:\Windows\yt-dlp.exe"
   ```

2. **Verify yt-dlp**:
   ```powershell
   yt-dlp --version
   ```

#### **Step 5: Install Node Dependencies**

```powershell
# In bot directory:
cd "C:\Users\ddeni\OneDrive\Documents\DISCORD BOT"
npm install
```

---

## 🔧 Step 3: Configure Bot

### **1. Edit the .env file**

Open `.env` in Notepad and fill in your values:

```env
# Discord Bot (REQUIRED)
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=YOUR_CLIENT_ID_HERE
BOT_PREFIX=!
BOT_OWNERS=YOUR_DISCORD_USER_ID

# Database (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/tzpro

# Dashboard Security (REQUIRED - Change these!)
DASHBOARD_PORT=3000
DASHBOARD_BIND=127.0.0.1
DASHBOARD_ALLOWED_IPS=127.0.0.1,::1
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=YourSecurePassword123!
DASHBOARD_API_KEY=random_secure_key_here_change_this

# FiveM Server (Optional)
FIVEM_SERVER_IP=
FIVEM_SERVER_PORT=30120
```

### **2. Get Your Discord Bot Token**

1. Go to: https://discord.com/developers/applications
2. Click your application (or create new)
3. Go to "Bot" tab
4. Click "Reset Token" → Copy the token
5. Paste into `.env` file as `DISCORD_TOKEN`

### **3. Get Your Discord User ID**

1. In Discord: Settings → Advanced → Enable Developer Mode
2. Right-click your username → Copy User ID
3. Paste into `.env` as `BOT_OWNERS`

### **4. Enable Bot Intents**

**CRITICAL**: Your bot needs these intents enabled:

1. Go to: https://discord.com/developers/applications
2. Select your bot
3. Go to "Bot" tab
4. Scroll to "Privileged Gateway Intents"
5. ✅ Enable "SERVER MEMBERS INTENT"
6. ✅ Enable "MESSAGE CONTENT INTENT"
7. ✅ Enable "PRESENCE INTENT"
8. Click "Save Changes"

---

## 🚀 Running the Bot

### **Start the Bot + Dashboard**

```powershell
node dashboard.js
```

This starts:
- ✅ Discord bot
- ✅ Web dashboard at http://localhost:3000

### **Access Dashboard**

1. Open browser: http://localhost:3000
2. Login with credentials from `.env`:
   - Username: `admin` (or what you set in DASHBOARD_USER)
   - Password: Your DASHBOARD_PASSWORD

---

## 📊 Production Deployment (PM2)

For 24/7 operation:

```powershell
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save for auto-restart
pm2 save
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs TZ-PRO

# Stop
pm2 stop TZ-PRO

# Restart
pm2 restart TZ-PRO
```

---

## 🔍 Troubleshooting

### **Problem: Bot hangs after "Dashboard Auth configured"**

**Cause**: MongoDB not running

**Fix**:
```powershell
# Check MongoDB status
Get-Service MongoDB

# Start MongoDB
Start-Service MongoDB

# If service doesn't exist, MongoDB isn't installed
```

### **Problem: "DISCORD_TOKEN not found in .env"**

**Fix**: Make sure `.env` file exists in the bot directory (not `.env.example`)

### **Problem: "Failed to connect to MongoDB"**

**Fix**:
```powershell
# Test MongoDB connection
mongosh

# If fails, ensure MongoDB service is running:
Start-Service MongoDB
```

### **Problem: Music commands don't work**

**Fix**:
```powershell
# Verify FFmpeg installed
ffmpeg -version

# Verify yt-dlp installed
yt-dlp --version

# If missing, reinstall following Step 3 & 4
```

### **Problem: "Cannot find module 'discord.js'"**

**Fix**:
```powershell
# Reinstall dependencies
npm install
```

### **Problem: Bot connects but no response to commands**

**Fix**: Enable **MESSAGE CONTENT INTENT** in Discord Developer Portal:
1. https://discord.com/developers/applications
2. Your bot → Bot → Privileged Gateway Intents
3. ✅ Enable "MESSAGE CONTENT INTENT"

### **Problem: Permission errors for commands**

**Fix**: 
1. Make sure your Discord User ID is in `BOT_OWNERS` in `.env`
2. Restart the bot after changing `.env`

---

## 📁 Project Structure

```
DISCORD BOT/
├── index.js              # Main bot file (3147 lines)
├── dashboard.js          # Web dashboard + API
├── features_new.js       # Leveling, Economy, Tickets, etc.
├── music.js              # Music system
├── security.js           # Security & anti-spam
├── db.js                 # MongoDB schemas
├── package.json          # Dependencies
├── ecosystem.config.js   # PM2 config
├── .env                  # Your config (DO NOT SHARE)
├── .env.example          # Template
└── bot-dashboard-simple/ # React UI (optional)
```

---

## 🎮 Bot Commands

### **Admin Commands**
- `!ban @user [reason]` - Ban user
- `!kick @user [reason]` - Kick user
- `!purge <amount>` - Delete messages
- `!setmoney @user <amount>` - Set user balance
- `!setlevel @user <level>` - Set user level

### **Moderation**
- `!warn @user [reason]` - Warn user
- `!timeout @user <minutes>` - Timeout user
- `!slowmode <seconds>` - Set slowmode
- `!lock` / `!unlock` - Lock/unlock channel

### **Economy**
- `!balance` - Check balance
- `!daily` - Daily reward ($500)
- `!work` - Work for money ($250)
- `!pay @user <amount>` - Send money
- `!shop` - View shop items
- `!buy <item>` - Buy item
- `!slots <bet>` - Slot machine
- `!roulette <bet> <red|black>` - Roulette

### **Leveling**
- `!level` - Check your level
- `!leaderboard` - Top 15 users

### **Tickets**
- `!ticket [reason]` - Create support ticket

### **Music**
- `!play <YouTube URL>` - Play music
- `!skip` - Skip current song
- `!queue` - Show queue
- `!stop` - Stop music

### **FiveM**
- `!fivem` - Server status
- `!whitelist <steamID>` - Apply for whitelist

### **Utility**
- `!help` - Show commands
- `!profile` - Your profile
- `!achievements` - Your badges

---

## 🔒 Security Notes

- ✅ Never share your `.env` file (contains bot token)
- ✅ Never commit `.env` to Git (already in .gitignore)
- ✅ Change default dashboard password
- ✅ Dashboard only accessible from localhost by default
- ✅ API key required for dashboard API calls

---

## 📞 Support

**Common Issues**:
1. **Bot offline**: Check MongoDB running + Discord token valid
2. **Commands not working**: Enable Message Content Intent
3. **Permission errors**: Add your User ID to BOT_OWNERS
4. **Music not working**: Install FFmpeg + yt-dlp

**Need Help?**
- Check logs: `pm2 logs` or console output
- Test MongoDB: `mongosh` should connect
- Test bot token: Make sure it's valid in Developer Portal
