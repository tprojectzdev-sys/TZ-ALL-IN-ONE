const express = require('express');
const basicAuth = require('express-basic-auth');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const BIND_ADDRESS = process.env.DASHBOARD_BIND || '127.0.0.1';
const TRUST_PROXY = process.env.DASHBOARD_TRUST_PROXY === 'true';
const ALLOWED_IPS = (process.env.DASHBOARD_ALLOWED_IPS || '127.0.0.1,::1')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);
const HTTPS_KEY_PATH = process.env.DASHBOARD_HTTPS_KEY || '';
const HTTPS_CERT_PATH = process.env.DASHBOARD_HTTPS_CERT || '';
const HTTPS_ENABLED = Boolean(HTTPS_KEY_PATH && HTTPS_CERT_PATH);

if (TRUST_PROXY) {
  app.set('trust proxy', true);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  hsts: HTTPS_ENABLED,
  crossOriginEmbedderPolicy: false
}));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests, try again later',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(generalLimiter);

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

function normalizeIp(ip) {
  if (!ip) return '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

const allowedIpSet = new Set(ALLOWED_IPS.map(normalizeIp));
app.use((req, res, next) => {
  const clientIp = normalizeIp(req.ip || req.connection?.remoteAddress || '');
  if (allowedIpSet.size > 0 && !allowedIpSet.has(clientIp)) {
    return res.status(403).send('Forbidden');
  }
  return next();
});

// Basic auth for security
const dashboardUser = process.env.DASHBOARD_USER;
const dashboardPass = process.env.DASHBOARD_PASSWORD;
const dashboardApiKey = process.env.DASHBOARD_API_KEY || '';

if (!dashboardUser || !dashboardPass) {
  console.error('ERROR: DASHBOARD_USER and DASHBOARD_PASSWORD must be set.');
  process.exit(1);
}

if (!dashboardApiKey) {
  console.error('ERROR: DASHBOARD_API_KEY must be set.');
  process.exit(1);
}

// Don't log credentials
console.log('Dashboard Auth configured for user: ' + dashboardUser);

const users = {};
users[dashboardUser] = dashboardPass;

app.use(basicAuth({
  users: users,
  challenge: true
}));

function requireApiKey(req, res, next) {
  const key = req.headers['x-dashboard-key'];
  if (key !== dashboardApiKey) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  return next();
}

// Serve static UI files
app.use(express.static(path.join(__dirname, 'public')));

let botProcess = null;
let botStatus = 'Offline';
let botStartTime = null;
let currentStats = {
  servers: 0,
  onlineUsers: 0,
  commands24h: 0,
  memoryMB: 0,
  ping: 0,
  uptime: '0d 0h 0m',
  fivemPlayers: 0,
  fivemStatus: 'offline',
  pendingWhitelist: 0,
  openTickets: 0,
  lastUpdate: Date.now()
};
let isPaused = false;
let activityLog = [];
let leaderboard = [];

let enabledModules = {
  moderation: true,
  'auto-mod': true,
  leveling: true,
  economy: true,
  tickets: true,
  giveaways: true,
  fivem: true,
  reports: true,
  music: true,
  notifications: true,
  games: true,
  analytics: true
};

process.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') return;
  
  if (msg.type === 'stats') {
    currentStats = Object.assign({}, currentStats, msg.data, { lastUpdate: Date.now() });
    botStatus = 'Online';
  } else if (msg.type === 'activity') {
    activityLog = msg.data || [];
  } else if (msg.type === 'leaderboard') {
    leaderboard = msg.data || [];
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const isHealthy = Date.now() - currentStats.lastUpdate < 10000;
    res.json({
      success: true,
      stats: {
        totalCommands: currentStats.commands24h || 0,
        totalMembers: currentStats.onlineUsers || 0,
        latency: currentStats.ping || 0,
        activeTickets: currentStats.openTickets || 0,
        servers: currentStats.servers || 0,
        uptime: currentStats.uptime || '0d 0h 0m',
        botOnline: isHealthy && botProcess != null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/toggle-module', (req, res) => {
  try {
    const { module, enabled } = req.body;
    
    if (!module) {
      return res.status(400).json({ success: false, error: 'Module name required' });
    }

    enabledModules[module] = Boolean(enabled);

    if (botProcess) {
      botProcess.send({ type: 'moduleToggle', module: module, enabled: enabled });
    } else {
      console.log('[WARNING] Bot process not running - module toggle will not take effect until bot restarts');
    }

    res.json({
      success: true,
      message: `Module ${module} ${enabled ? 'enabled' : 'disabled'}`,
      module: module,
      enabled: enabled
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/modules', (req, res) => {
  try {
    res.json({ success: true, data: enabledModules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
      success: true,
      data: activityLog.slice(0, limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    res.json({
      success: true,
      data: leaderboard.slice(0, limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/control/:action', (req, res) => {
  try {
    const action = req.params.action.toLowerCase();
    const validActions = ['restart', 'pause', 'resume', 'shutdown'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action. Valid: ' + validActions.join(', ')
      });
    }

    if (action === 'restart') {
      if (botProcess) botProcess.kill('SIGINT');
      setTimeout(() => startBot(), 2000);
      return res.json({ success: true, message: 'Bot restart initiated' });
    } else if (action === 'shutdown') {
      if (botProcess) botProcess.kill('SIGINT');
      return res.json({ success: true, message: 'Bot shutdown initiated' });
    } else if (action === 'pause') {
      if (botProcess) botProcess.send({ action: 'pause' });
      isPaused = true;
      return res.json({ success: true, message: 'Bot paused' });
    } else if (action === 'resume') {
      if (botProcess) botProcess.send({ action: 'resume' });
      isPaused = false;
      return res.json({ success: true, message: 'Bot resumed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/command', requireApiKey, (req, res) => {
  try {
    const command = req.body.command;
    
    if (!command) {
      return res.status(400).json({ success: false, error: 'Command required' });
    }

    if (botProcess) {
      botProcess.send({ type: 'executeCommand', command: command });
      res.json({ success: true, message: 'Command queued', command: command });
    } else {
      res.status(503).json({ success: false, error: 'Bot process not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/module/:name', (req, res) => {
  try {
    const moduleName = req.params.name.toLowerCase();
    const enabled = req.body.enabled;

    if (!(moduleName in enabledModules)) {
      return res.status(400).json({ success: false, error: 'Module not found: ' + moduleName });
    }

    enabledModules[moduleName] = Boolean(enabled);

    if (botProcess) {
      botProcess.send({ type: 'moduleToggle', module: moduleName, enabled: enabled });
    }

    res.json({
      success: true,
      message: 'Module ' + moduleName + (enabled ? ' enabled' : ' disabled'),
      modules: enabledModules
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/modules', (req, res) => {
  try {
    res.json({ success: true, data: enabledModules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/fivem/status', async (req, res) => {
  try {
    const axios = require('axios');
    const fivemIP = process.env.FIVEM_SERVER_IP;
    const fivemPort = process.env.FIVEM_SERVER_PORT || 30120;

    if (!fivemIP || fivemIP === '') {
      return res.json({
        success: true,
        data: {
          online: false,
          players: 0,
          maxPlayers: 32,
          serverName: 'Not Configured',
          error: 'No FiveM server configured. Add FIVEM_SERVER_IP to .env file to enable.'
        }
      });
    }

    // Retry logic: try up to 2 times with longer timeout
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await axios.get(`http://${fivemIP}:${fivemPort}/dynamic.json`, {
          timeout: 10000 // Increased from 5s to 10s
        });

        const serverData = response.data;
        return res.json({
          success: true,
          data: {
            online: true,
            players: serverData.clients || 0,
            maxPlayers: serverData.sv_maxclients || 32,
            serverName: serverData.hostname || serverData.server || 'FiveM Server'
          }
        });
      } catch (err) {
        lastError = err;
        if (attempt < 1) {
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries failed
    res.json({
      success: true,
      data: {
        online: false,
        players: 0,
        maxPlayers: 32,
        serverName: fivemIP,
        error: lastError?.code === 'ECONNABORTED' 
          ? `Server timeout (slow response) at ${fivemIP}:${fivemPort}`
          : `Server offline or unreachable at ${fivemIP}:${fivemPort}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { UserModel } = require('./db');
    const limit = parseInt(req.query.limit) || 20;
    
    const users = await UserModel.find({})
      .sort({ level: -1, xp: -1 })
      .limit(limit)
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      username: user.username,
      level: user.level,
      xp: user.xp,
      money: user.money,
      totalMessages: user.totalMessages
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/top-earners', async (req, res) => {
  try {
    const { UserModel } = require('./db');
    const limit = parseInt(req.query.limit) || 10;
    
    const users = await UserModel.find({})
      .sort({ money: -1 })
      .limit(limit)
      .lean();

    const earners = users.map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      username: user.username,
      money: user.money
    }));

    res.json({ success: true, data: earners });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/user-lookup/:userId', async (req, res) => {
  try {
    const { UserModel, DashboardAuditModel } = require('./db');
    const userId = req.params.userId;

    if (!userId || userId.length < 17) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const user = await UserModel.findOne({ userId }).lean();

    // Log the lookup action
    await DashboardAuditModel.create({
      action: 'USER_LOOKUP',
      actor: 'admin',
      targetId: userId,
      details: user ? `Found user: ${user.username || userId}` : `User not found: ${userId}`,
      status: user ? 'success' : 'not_found'
    });

    if (!user) {
      return res.json({ 
        success: true, 
        found: false, 
        message: 'User not found in database' 
      });
    }

    res.json({
      success: true,
      found: true,
      data: {
        userId: user.userId,
        username: user.username || 'Unknown',
        xp: user.xp || 0,
        level: user.level || 1,
        money: user.money || 0,
        totalMessages: user.totalMessages || 0,
        badges: user.badges || [],
        achievements: user.achievements || [],
        lastDaily: user.lastDaily,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/announcement', async (req, res) => {
  try {
    const { DashboardAuditModel } = require('./db');
    const { channelId, message, embed, mention } = req.body;

    if (!channelId || !message) {
      return res.status(400).json({ success: false, error: 'Channel ID and message required' });
    }

    // Send command to bot process
    if (botProcess) {
      botProcess.send({ 
        type: 'announcement', 
        channelId, 
        message, 
        embed: Boolean(embed),
        mention: Boolean(mention)
      });
      
      // Log the action
      await DashboardAuditModel.create({
        action: 'ANNOUNCEMENT',
        actor: 'admin',
        targetId: channelId,
        details: `Sent announcement to channel ${channelId}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        status: 'success'
      });

      res.json({ success: true, message: 'Announcement sent' });
    } else {
      await DashboardAuditModel.create({
        action: 'ANNOUNCEMENT',
        actor: 'admin',
        targetId: channelId,
        details: 'Failed - bot offline',
        status: 'failed'
      });
      res.status(503).json({ success: false, error: 'Bot process not available' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard-audit', async (req, res) => {
  try {
    const { DashboardAuditModel } = require('./db');
    const limit = parseInt(req.query.limit) || 50;
    const filter = req.query.filter;

    let query = {};
    if (filter && filter !== 'all') {
      query.action = filter;
    }

    const logs = await DashboardAuditModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log module toggles to audit
app.post('/api/module/:name/audit', async (req, res) => {
  try {
    const { DashboardAuditModel } = require('./db');
    const moduleName = req.params.name;
    const { enabled } = req.body;

    await DashboardAuditModel.create({
      action: 'MODULE_TOGGLE',
      actor: 'admin',
      details: `Module "${moduleName}" ${enabled ? 'enabled' : 'disabled'}`,
      status: 'success'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log bot control actions to audit
app.post('/api/control/:action/audit', requireApiKey, async (req, res) => {
  try {
    const { DashboardAuditModel } = require('./db');
    const action = req.params.action;

    await DashboardAuditModel.create({
      action: 'BOT_CONTROL',
      actor: 'admin',
      details: `Bot control action: ${action}`,
      status: 'success'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  const isHealthy = botProcess != null && Date.now() - currentStats.lastUpdate < 10000;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    botOnline: isHealthy,
    botProcessRunning: botProcess !== null,
    lastUpdate: currentStats.lastUpdate,
    timeSinceLastUpdate: Date.now() - currentStats.lastUpdate,
    currentStats: currentStats,
    activityLogSize: activityLog.length,
    leaderboardSize: leaderboard.length,
    timestamp: Date.now()
  });
});

function startBot() {
  if (botProcess) {
    console.log('[INFO] Bot process already running');
    return;
  }
  
  console.log('[INFO] Starting bot process...');
  
  botProcess = spawn('node', [path.join(__dirname, 'index.js')], {
    stdio: ['ipc', 'inherit', 'inherit']
  });

  botStatus = 'Online';
  isPaused = false;
  botStartTime = Date.now();

  botProcess.on('message', (msg) => {
    // Only log non-routine messages to reduce spam
    if (msg.type !== 'stats' && msg.type !== 'activity' && msg.type !== 'leaderboard') {
      console.log('[IPC] Received message from bot:', msg.type);
    }
    
    if (msg.type === 'stats') {
      currentStats = Object.assign({}, currentStats, msg.data, { lastUpdate: Date.now() });
      botStatus = 'Online';
    } else if (msg.type === 'activity') {
      activityLog = msg.data || [];
    } else if (msg.type === 'leaderboard') {
      leaderboard = msg.data || [];
    }
  });

  botProcess.on('exit', (code, signal) => {
    console.log(`[INFO] Bot process exited with code ${code}, signal ${signal}`);
    botProcess = null;
    botStatus = 'Offline';
    botStartTime = null;
  });

  botProcess.on('error', (err) => {
    console.error('[ERROR] Bot process error:', err);
  });

  console.log('[INFO] Bot process started with PID:', botProcess.pid);
}

app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error('Dashboard error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Connect to MongoDB then start server
connectDB().then(() => {
  console.log('Dashboard connected to MongoDB');
  
  const server = HTTPS_ENABLED
    ? https.createServer({
        key: fs.readFileSync(path.resolve(__dirname, HTTPS_KEY_PATH)),
        cert: fs.readFileSync(path.resolve(__dirname, HTTPS_CERT_PATH))
      }, app)
    : http.createServer(app);

  server.listen(PORT, BIND_ADDRESS, () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && iface.address !== '127.0.0.1') {
          ipAddress = iface.address;
          break;
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('DASHBOARD SERVER STARTED');
    console.log('='.repeat(70));
    const protocol = HTTPS_ENABLED ? 'https' : 'http';
    console.log('Local URL: ' + protocol + '://localhost:' + PORT);
    console.log('Network URL: ' + protocol + '://' + ipAddress + ':' + PORT);
    console.log('Bind Address: ' + BIND_ADDRESS);
    console.log('Allowed IPs: ' + (ALLOWED_IPS.length ? ALLOWED_IPS.join(', ') : 'None'));
    console.log('Username: ' + dashboardUser);
    console.log('API Key Required: Yes');
    console.log('='.repeat(70) + '\n');
    
    startBot();
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  console.log('Starting dashboard without database features...');
  
  const server = HTTPS_ENABLED
    ? https.createServer({
        key: fs.readFileSync(path.resolve(__dirname, HTTPS_KEY_PATH)),
        cert: fs.readFileSync(path.resolve(__dirname, HTTPS_CERT_PATH))
      }, app)
    : http.createServer(app);

  server.listen(PORT, BIND_ADDRESS, () => {
    const protocol = HTTPS_ENABLED ? 'https' : 'http';
    console.log('Dashboard running at ' + protocol + '://localhost:' + PORT);
    startBot();
  });
});

module.exports = app;
