# Dashboard Issues - Diagnosis & Fixes

## 🔍 What Was Wrong

### 1. **API Key Issues**
- **Problem**: Dashboard endpoints required API key but frontend wasn't sending it
- **Fix**: Removed `requireApiKey` from endpoints already protected by Basic Auth
- **Affected**: Announcements, bot control, module toggles

### 2. **Bot Process Communication**
- **Problem**: Bot stats not reaching dashboard (activity, leaderboard empty)
- **Fix**: Added error handling and logging to stats sending code
- **Why**: Bot needs to run as child process to send stats via IPC

### 3. **No Error Details**
- **Problem**: Generic "Error" messages with no context
- **Fix**: Enhanced error handling and added debug endpoint

---

## 🚀 How to Restart and Test

### **Step 1: Restart Dashboard**

1. Press `Ctrl+C` in the terminal running `node dashboard.js`
2. Wait for "Bot stopped" message 
3. Run again:
   ```powershell
   node dashboard.js
   ```

4. Watch for these new log messages:
   ```
   [INFO] Starting bot process...
   [INFO] Bot process started with PID: 12345
   [IPC] Received message from bot: stats
   [IPC] Received message from bot: activity
   [IPC] Received message from bot: leaderboard
   ```

### **Step 2: Test Health Endpoint**

Open your browser to check communication:

**Method 1: Direct API**
```
http://localhost:3000/health
```

**What to look for:**
```json
{
  "status": "healthy",
  "botOnline": true,
  "botProcessRunning": true,
  "timeSinceLastUpdate": 2134,  // Should be < 10000
  "currentStats": {
    "servers": 1,
    "onlineUsers": 0,
    "commands24h": 0,
    "memoryMB": 85,
    "ping": 156,
    "uptime": "0d 0h 2m"
  },
  "activityLogSize": 5,  // Should be > 0 after some activity
  "leaderboardSize": 0   // Will be 0 until users gain XP
}
```

**If `timeSinceLastUpdate` is a big number (> 10000):**
- Bot is NOT sending stats
- Check console for errors

---

## 🧪 Test Each Feature

### **1. User Lookup**

**Why it was failing:**
- User ID not in database (no interactions yet)
- OR API error

**How to test:**
1. Send a message in Discord with the bot present
2. Check your user ID with command: `!profile`
3. Copy YOUR Discord user ID
4. Paste in dashboard "User Lookup"
5. Should now return your data

**If still failing:**
- The user hasn't interacted with bot
- Database is empty
- MongoDB not running

---

### **2. Announcements**

**Why it was failing:**
- Required API key (now fixed)
- Bot process not running
- Invalid channel ID

**How to test:**
1. Get a channel ID:
   - Discord → Right-click channel → Copy Channel ID
2. Paste in dashboard "Channel ID" field
3. Type message: "Test from dashboard!"
4. Click "Send Announcement"

**If still failing:**
- Bot not in that Discord server
- Bot lacks "Send Messages" permission
- Channel ID is wrong

---

### **3. Activity Log**

**Why it was empty:**
- Bot not sending activity data via IPC
- No user activity yet

**How to generate activity:**
1. In Discord, type: `!help`
2. Type: `!level`
3. Type: `!balance`
4. Refresh dashboard Activity page

**Should now show:**
```
COMMAND | Username | Executed: !help
COMMAND | Username | Executed: !level
COMMAND | Username | Executed: !balance
```

---

### **4. Leaderboard**

**Why it was empty:**
- No users in database with XP
- Bot not sending leaderboard data

**How to populate:**
1. Send 10-20 messages in Discord (1 per minute due to cooldown)
2. Bot awards 10 XP per message
3. Wait 15 seconds for leaderboard update
4. Refresh dashboard Leaderboard page

---

### **5. FiveM Server**

**Why showing error:**
- No FiveM server configured (expected)

**To fix (optional):**
Edit `.env`:
```env
FIVEM_SERVER_IP=your.server.ip
FIVEM_SERVER_PORT=30120
```

If you don't have a FiveM server, **ignore this error** - it's normal.

---

## 🐛 Common Issues

### **"Module Update Failed - economy could not be updated"**

**Cause**: Module toggle works but message is confusing

**Fix**: Check console for:
```
[WARNING] Bot process not running - module toggle will not take effect until bot restarts
```

Module state is saved, just restart dashboard.

---

### **"Error fetching user data"**

**Cause**: User is not in database

**Fix**: 
1. Interact with bot in Discord first (`!help`, `!level`, `!balance`)
2. THEN lookup your user

The bot creates user records on first interaction.

---

### **Activity/Leaderboard still empty**

**Cause**: IPC communication not working

**Check**:
1. Console shows: `[IPC] Received message from bot: stats`
2. `/health` endpoint shows `timeSinceLastUpdate < 10000`

**If not working**:
```powershell
# Check if multiple node processes
Get-Process node

# Kill all and restart
Stop-Process -Name node -Force
node dashboard.js
```

---

### **Announcements still fail**

**Cause**: Bot not connected or lacks permissions

**Check**:
1. Is bot in your Discord server?
2. Does bot have "Send Messages" permission?
3. Is Channel ID correct? (Right-click channel → Copy ID)

**Test bot is working**:
Type in Discord: `!help`
- If bot responds: Bot is working
- If no response: Check Discord Developer Portal → Enable **MESSAGE CONTENT INTENT**

---

## 📊 Expected Behavior After Fix

### **Dashboard should show:**

✅ **Modules Page**
- All toggles work
- No "Update Failed" errors

✅ **Activity Page**
- Shows recent bot commands
- Updates in real-time

✅ **Leaderboard Page**
- Shows users with XP
- Sorted by level

✅ **Features Page**
- User Lookup returns data for active users
- Announcements send successfully
- Audit Log shows actions

✅ **Overview Page**
- Live stats update every 3 seconds
- Latency shows real ping
- Uptime counts correctly

---

## 🔧 Advanced Troubleshooting

### **Check MongoDB Connection**

```powershell
mongosh
```

Should connect. If not:
```powershell
Start-Service MongoDB
```

---

### **Check Bot is in Discord Server**

1. Go to: https://discord.com/developers/applications
2. Your bot → OAuth2 → URL Generator
3. Check "bot" scope
4. Select permissions: Administrator (8)
5. Copy URL → Open in browser → Add to server

---

### **Enable All Bot Intents**

**CRITICAL** - Without these, bot can't see messages:

1. Go to: https://discord.com/developers/applications
2. Your bot → Bot tab
3. Enable ALL 3 Privileged Gateway Intents:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
4. Save Changes
5. Restart bot

---

## 📝 Status Check Commands

After restarting, run these in PowerShell:

### **Check MongoDB**
```powershell
Get-Service MongoDB
# Should show: Running
```

### **Check Bot Process**
```powershell
Get-Process node
# Should show node.exe processes
```

### **Check Health Endpoint**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get | ConvertTo-Json
# Should show botProcessRunning: true
```

### **Test Stats API**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/stats" -Method Get | ConvertTo-Json
# Should show servers, onlineUsers, ping, etc.
```

---

## ✅ Success Checklist

- [ ] MongoDB service running
- [ ] Dashboard starts without errors
- [ ] Console shows `[IPC] Received message from bot:`
- [ ] `/health` shows `botProcessRunning: true`
- [ ] Bot responds to `!help` in Discord
- [ ] User Lookup returns data after using bot
- [ ] Activity log populates after commands
- [ ] Announcements send successfully
- [ ] Leaderboard shows users after gaining XP
- [ ] Live stats update every 3-5 seconds

---

## 🎯 Next Steps

Once everything works:

1. **Invite bot to your main Discord server**
2. **Test all commands**: `!help`, `!level`, `!daily`, `!work`, `!slots 100`
3. **Configure welcome messages**: Dashboard → Settings
4. **Set up FiveM integration** (if you have a server)
5. **Deploy 24/7 with PM2**:
   ```powershell
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

Need help? Check the [README.md](README.md) or paste error messages for specific fixes.
