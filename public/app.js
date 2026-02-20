const state = {
    statsHistory: [],
    fivemHistory: [],
    activity: [],
    leaderboard: [],
    earners: [],
    modules: {},
    apiKey: localStorage.getItem('dashboardApiKey') || '',
    soundEnabled: localStorage.getItem('dashboardSoundEnabled') !== 'false',
    soundUrl: localStorage.getItem('dashboardSoundUrl') || ''
};

const MAX_HISTORY = 20;

const elements = {
    sidebarStatus: document.getElementById('sidebarStatus'),
    sidebarUpdated: document.getElementById('sidebarUpdated'),
    stats: {
        servers: document.getElementById('statServers'),
        users: document.getElementById('statUsers'),
        latency: document.getElementById('statLatency'),
        commands: document.getElementById('statCommands'),
        tickets: document.getElementById('statTickets'),
        uptime: document.getElementById('statUptime')
    },
    health: {
        status: document.getElementById('healthStatus'),
        bot: document.getElementById('healthBot'),
        latency: document.getElementById('healthLatency'),
        uptime: document.getElementById('healthUptime')
    },
    recentActivity: document.getElementById('recentActivity'),
    recentActivityEmpty: document.getElementById('recentActivityEmpty'),
    activityList: document.getElementById('activityList'),
    activityEmpty: document.getElementById('activityEmpty'),
    modulesList: document.getElementById('modulesList'),
    modulesEmpty: document.getElementById('modulesEmpty'),
    leaderboardTable: document.getElementById('leaderboardTable'),
    leaderboardEmpty: document.getElementById('leaderboardEmpty'),
    earnersTable: document.getElementById('earnersTable'),
    earnersEmpty: document.getElementById('earnersEmpty'),
    podium: document.getElementById('podium'),
    activityFilters: document.getElementById('activityFilters'),
    settingsNotice: document.getElementById('settingsNotice'),
    apiKeyInput: document.getElementById('apiKey'),
    alerts: {
        bot: document.getElementById('alertBot'),
        botTitle: document.getElementById('alertBotTitle'),
        botDesc: document.getElementById('alertBotDesc'),
        latency: document.getElementById('alertLatency'),
        latencyTitle: document.getElementById('alertLatencyTitle'),
        latencyDesc: document.getElementById('alertLatencyDesc'),
        raid: document.getElementById('alertRaid'),
        raidTitle: document.getElementById('alertRaidTitle'),
        raidDesc: document.getElementById('alertRaidDesc')
    },
    themeButtons: document.querySelectorAll('.theme-btn'),
    notifyToggle: document.getElementById('notifyToggle'),
    soundUrlInput: document.getElementById('soundUrl'),
    saveSound: document.getElementById('saveSound'),
    testSound: document.getElementById('testSound'),
    toastContainer: document.getElementById('toastContainer'),
    fivem: {
        indicator: document.getElementById('fivemIndicator'),
        serverName: document.getElementById('fivemServerName'),
        serverStatus: document.getElementById('fivemServerStatus'),
        players: document.getElementById('fivemPlayers'),
        maxPlayers: document.getElementById('fivemMaxPlayers'),
        gamemode: document.getElementById('fivemGamemode'),
        version: document.getElementById('fivemVersion'),
        resources: document.getElementById('fivemResources'),
        lastCheck: document.getElementById('fivemLastCheck'),
        pending: document.getElementById('whitelistPending'),
        approved: document.getElementById('whitelistApproved'),
        denied: document.getElementById('whitelistDenied')
    }
};

const chartContext = document.getElementById('statsChart').getContext('2d');
const statsChart = new Chart(chartContext, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Latency (ms)',
                data: [],
                borderColor: '#38e8ff',
                backgroundColor: 'rgba(56, 232, 255, 0.12)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Commands',
                data: [],
                borderColor: '#12cfd0',
                backgroundColor: 'rgba(18, 207, 208, 0.08)',
                tension: 0.4,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#9fb5c9' }
            }
        },
        scales: {
            x: {
                ticks: { color: '#9fb5c9' },
                grid: { color: 'rgba(120, 200, 220, 0.08)' }
            },
            y: {
                ticks: { color: '#9fb5c9' },
                grid: { color: 'rgba(120, 200, 220, 0.08)' }
            }
        }
    }
});

const fivemChartContext = document.getElementById('fivemChart').getContext('2d');
const fivemChart = new Chart(fivemChartContext, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Players',
                data: [],
                borderColor: '#10b5ff',
                backgroundColor: 'rgba(16, 181, 255, 0.12)',
                tension: 0.4,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#9fb5c9' }
            }
        },
        scales: {
            x: {
                ticks: { color: '#9fb5c9' },
                grid: { color: 'rgba(120, 200, 220, 0.08)' }
            },
            y: {
                ticks: { color: '#9fb5c9' },
                grid: { color: 'rgba(120, 200, 220, 0.08)' }
            }
        }
    }
});

function withApiKey(options = {}) {
    const headers = options.headers ? { ...options.headers } : {};
    if (state.apiKey) {
        headers['x-dashboard-key'] = state.apiKey;
    }
    return { ...options, headers };
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Request failed');
    }
    return response.json();
}

function updateSidebarStatus(isOnline) {
    elements.sidebarStatus.textContent = isOnline ? 'Online' : 'Offline';
    elements.sidebarStatus.style.color = isOnline ? '#19f7a0' : '#ff4d6d';
}

function setAlertStatus(element, status) {
    element.classList.remove('status-ok', 'status-warn', 'status-danger');
    if (status) {
        element.classList.add(status);
    }
}

function resolveUserLabel(entry) {
    return entry.username || entry.userId || 'Unknown';
}

function formatNumber(value) {
    if (value === null || value === undefined) return '--';
    return value.toLocaleString();
}

function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid fa-bell"></i>
        <div>
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${message}</div>
        </div>
    `;

    elements.toastContainer.appendChild(toast);
    playNotificationSound();

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

let audioContext;
function playNotificationSound() {
    if (!state.soundEnabled) return;

    if (state.soundUrl) {
        const audio = new Audio(state.soundUrl);
        audio.volume = 0.7;
        audio.play().catch(() => {});
        return;
    }

    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 740;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 140);
    } catch {
        // ignore audio errors
    }
}

function pushHistory(stats) {
    state.statsHistory.push({
        time: formatTime(),
        latency: stats.latency || 0,
        commands: stats.totalCommands || 0
    });

    if (state.statsHistory.length > MAX_HISTORY) {
        state.statsHistory.shift();
    }

    statsChart.data.labels = state.statsHistory.map(point => point.time);
    statsChart.data.datasets[0].data = state.statsHistory.map(point => point.latency);
    statsChart.data.datasets[1].data = state.statsHistory.map(point => point.commands);
    statsChart.update();
}

function pushFivemHistory(players) {
    state.fivemHistory.push({
        time: formatTime(),
        players: players || 0
    });

    if (state.fivemHistory.length > MAX_HISTORY) {
        state.fivemHistory.shift();
    }

    fivemChart.data.labels = state.fivemHistory.map(point => point.time);
    fivemChart.data.datasets[0].data = state.fivemHistory.map(point => point.players);
    fivemChart.update();
}

async function loadStats() {
    try {
        const result = await fetchJson('/api/stats');
        const stats = result.stats || {};

        elements.stats.servers.textContent = formatNumber(stats.servers);
        elements.stats.users.textContent = formatNumber(stats.totalMembers);
        elements.stats.latency.textContent = stats.latency !== undefined ? `${stats.latency} ms` : '--';
        elements.stats.commands.textContent = formatNumber(stats.totalCommands);
        elements.stats.tickets.textContent = formatNumber(stats.activeTickets);
        elements.stats.uptime.textContent = stats.uptime || '--';

        elements.health.bot.textContent = stats.botOnline ? 'Online' : 'Offline';
        elements.health.latency.textContent = stats.latency !== undefined ? `${stats.latency} ms` : '--';
        elements.health.uptime.textContent = stats.uptime || '--';
        elements.health.status.textContent = stats.botOnline ? 'Healthy' : 'Offline';

        updateSidebarStatus(stats.botOnline);
        elements.sidebarUpdated.textContent = formatTime();

        if (stats.botOnline) {
            setAlertStatus(elements.alerts.bot, 'status-ok');
            elements.alerts.botTitle.textContent = 'Bot Online';
            elements.alerts.botDesc.textContent = 'All systems operational.';
        } else {
            setAlertStatus(elements.alerts.bot, 'status-danger');
            elements.alerts.botTitle.textContent = 'Bot Offline';
            elements.alerts.botDesc.textContent = 'No heartbeat detected.';
        }

        const latencyValue = stats.latency || 0;
        if (latencyValue >= 500) {
            setAlertStatus(elements.alerts.latency, 'status-danger');
            elements.alerts.latencyTitle.textContent = 'High Latency';
            elements.alerts.latencyDesc.textContent = `${latencyValue} ms`;
        } else if (latencyValue >= 200) {
            setAlertStatus(elements.alerts.latency, 'status-warn');
            elements.alerts.latencyTitle.textContent = 'Latency Warning';
            elements.alerts.latencyDesc.textContent = `${latencyValue} ms`;
        } else {
            setAlertStatus(elements.alerts.latency, 'status-ok');
            elements.alerts.latencyTitle.textContent = 'Latency Stable';
            elements.alerts.latencyDesc.textContent = `${latencyValue} ms`;
        }

        pushHistory({
            latency: stats.latency || 0,
            totalCommands: stats.totalCommands || 0
        });
    } catch (error) {
        updateSidebarStatus(false);
        elements.health.status.textContent = 'Error';
    }
}

function activityIcon(type) {
    const map = {
        COMMAND: 'fa-terminal',
        AUTO_MOD: 'fa-shield-halved',
        BAN: 'fa-user-slash',
        KICK: 'fa-user-xmark',
        WARN: 'fa-triangle-exclamation',
        TIMEOUT: 'fa-clock',
        PURGE: 'fa-broom',
        LOCK: 'fa-lock',
        UNLOCK: 'fa-lock-open',
        JOIN: 'fa-user-plus',
        LEAVE: 'fa-user-minus'
    };
    return map[type] || 'fa-circle-info';
}

function renderActivity(list, container, emptyEl, limit = 50) {
    container.innerHTML = '';
    const slice = list.slice(0, limit);
    if (slice.length === 0) {
        emptyEl.classList.add('show-empty');
        return;
    }

    emptyEl.classList.remove('show-empty');

    slice.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'activity-item';
        wrapper.innerHTML = `
            <div class="activity-icon"><i class="fa-solid ${activityIcon(item.type)}"></i></div>
            <div>
                <div class="activity-title">${item.type || 'Event'}</div>
                <div class="activity-desc">${item.details || ''}</div>
            </div>
            <div class="activity-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
        `;
        container.appendChild(wrapper);
    });
}

async function loadActivity() {
    try {
        const result = await fetchJson('/api/activity?limit=100');
        state.activity = result.data || [];

        renderActivity(state.activity, elements.recentActivity, elements.recentActivityEmpty, 15);
        renderActivity(state.activity, elements.activityList, elements.activityEmpty, 100);

        const recentRaid = state.activity.find(item => item.type === 'RAID_DETECTED');
        if (recentRaid) {
            setAlertStatus(elements.alerts.raid, 'status-danger');
            elements.alerts.raidTitle.textContent = 'Raid Detected';
            elements.alerts.raidDesc.textContent = recentRaid.details || 'Immediate action required.';
        } else {
            setAlertStatus(elements.alerts.raid, 'status-ok');
            elements.alerts.raidTitle.textContent = 'Raid Watch';
            elements.alerts.raidDesc.textContent = 'No threats detected.';
        }
    } catch (error) {
        elements.recentActivityEmpty.classList.add('show-empty');
        elements.activityEmpty.classList.add('show-empty');
    }
}

function buildActivityFilters() {
    const types = ['ALL', 'COMMAND', 'AUTO_MOD', 'BAN', 'KICK', 'WARN', 'TIMEOUT', 'JOIN', 'LEAVE'];
    elements.activityFilters.innerHTML = '';

    types.forEach(type => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = type;
        chip.dataset.type = type;
        if (type === 'ALL') chip.classList.add('active');
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(el => el.classList.remove('active'));
            chip.classList.add('active');
            const filtered = type === 'ALL' ? state.activity : state.activity.filter(item => item.type === type);
            renderActivity(filtered, elements.activityList, elements.activityEmpty, 100);
        });
        elements.activityFilters.appendChild(chip);
    });
}

async function loadModules() {
    try {
        const result = await fetchJson('/api/modules');
        state.modules = result.data || {};
        const entries = Object.entries(state.modules);

        elements.modulesList.innerHTML = '';

        if (entries.length === 0) {
            elements.modulesEmpty.classList.add('show-empty');
            return;
        }

        elements.modulesEmpty.classList.remove('show-empty');

        entries.forEach(([name, enabled]) => {
            const card = document.createElement('div');
            card.className = 'module-card glass';
            card.innerHTML = `
                <div class="module-info">
                    <h4>${name}</h4>
                    <p>${enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <label class="switch">
                    <input type="checkbox" ${enabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;

            const input = card.querySelector('input');
            input.addEventListener('change', async () => {
                const desired = input.checked;
                try {
                    // Module toggle endpoint is now protected by Basic Auth (no API key needed)
                    await fetchJson(`/api/module/${name}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: desired })
                    });
                    // Log to audit (also no longer requires API key)
                    fetchJson(`/api/module/${name}/audit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: desired })
                    }).catch(() => {});
                    
                    card.querySelector('p').textContent = desired ? 'Enabled' : 'Disabled';
                    showToast(
                        desired ? 'Module Enabled' : 'Module Disabled',
                        `${name} is now ${desired ? 'enabled' : 'disabled'}.`,
                        desired ? 'success' : 'warn'
                    );
                    // Refresh audit log if visible
                    if (typeof window.loadAuditLog === 'function') window.loadAuditLog();
                } catch (error) {
                    input.checked = !desired;
                    elements.settingsNotice.textContent = 'Failed to toggle module. Check API key.';
                    showToast('Module Update Failed', `${name} could not be updated.`, 'error');
                }
            });

            elements.modulesList.appendChild(card);
        });
    } catch (error) {
        elements.modulesEmpty.classList.add('show-empty');
    }
}

async function loadLeaderboard() {
    try {
        const result = await fetchJson('/api/leaderboard?limit=20');
        state.leaderboard = result.data || [];

        elements.leaderboardTable.innerHTML = '';
        elements.podium.innerHTML = '';

        if (state.leaderboard.length === 0) {
            elements.leaderboardEmpty.classList.add('show-empty');
            return;
        }

        elements.leaderboardEmpty.classList.remove('show-empty');

        const podium = state.leaderboard.slice(0, 3);
        podium.forEach((entry, index) => {
            const card = document.createElement('div');
            card.className = 'podium-card';
            card.innerHTML = `
                <div class="podium-rank">Rank ${index + 1}</div>
                <div class="podium-name">${resolveUserLabel(entry)}</div>
                <div class="podium-metric">Level ${entry.level}</div>
            `;
            elements.podium.appendChild(card);
        });

        state.leaderboard.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${entry.rank}</td>
                <td>${resolveUserLabel(entry)}</td>
                <td>${entry.level}</td>
                <td>${formatNumber(entry.xp)}</td>
            `;
            elements.leaderboardTable.appendChild(row);
        });
    } catch (error) {
        elements.leaderboardEmpty.classList.add('show-empty');
    }
}

async function loadTopEarners() {
    try {
        const result = await fetchJson('/api/top-earners?limit=20');
        state.earners = result.data || [];

        elements.earnersTable.innerHTML = '';

        if (state.earners.length === 0) {
            elements.earnersEmpty.classList.add('show-empty');
            return;
        }

        elements.earnersEmpty.classList.remove('show-empty');

        state.earners.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${entry.rank}</td>
                <td>${resolveUserLabel(entry)}</td>
                <td>$${formatNumber(entry.money)}</td>
            `;
            elements.earnersTable.appendChild(row);
        });
    } catch (error) {
        elements.earnersEmpty.classList.add('show-empty');
    }
}

async function loadFivemStatus() {
    try {
        const result = await fetchJson('/api/fivem/status');
        const data = result.data || {};

        const isOnline = Boolean(data.online);
        elements.fivem.indicator.classList.toggle('online', isOnline);
        elements.fivem.indicator.classList.toggle('offline', !isOnline);

        elements.fivem.serverName.textContent = data.serverName || 'FiveM Server';
        
        // Show the actual error message from the backend (includes helpful info)
        if (data.error) {
            elements.fivem.serverStatus.textContent = data.error;
        } else {
            elements.fivem.serverStatus.textContent = isOnline ? 'Online' : 'Offline';
        }
        
        elements.fivem.players.textContent = formatNumber(data.players || 0);
        elements.fivem.maxPlayers.textContent = formatNumber(data.maxPlayers || 0);
        elements.fivem.gamemode.textContent = data.gamemode || 'RP';
        elements.fivem.version.textContent = data.version || 'Unknown';
        elements.fivem.resources.textContent = formatNumber(data.resources || 0);
        elements.fivem.lastCheck.textContent = formatTime();

        pushFivemHistory(data.players || 0);
    } catch (error) {
        elements.fivem.indicator.classList.remove('online');
        elements.fivem.indicator.classList.add('offline');
        elements.fivem.serverStatus.textContent = 'API error - check dashboard is running';
    }
}

async function loadWhitelistStats() {
    try {
        const pending = await fetchJson('/api/stats');
        elements.fivem.pending.textContent = formatNumber(pending.stats?.pendingWhitelist || 0);
    } catch {
        elements.fivem.pending.textContent = '--';
    }

    elements.fivem.approved.textContent = '--';
    elements.fivem.denied.textContent = '--';
}

async function sendControl(action) {
    try {
        await fetchJson(`/api/control/${action}`, withApiKey({ method: 'POST' }));
        // Log to audit
        fetchJson(`/api/control/${action}/audit`, withApiKey({ method: 'POST' })).catch(() => {});
        elements.settingsNotice.textContent = `Action '${action}' sent.`;
        showToast('Bot Control', `Action '${action}' sent.`, 'success');
        // Refresh audit log if available
        if (typeof window.loadAuditLog === 'function') window.loadAuditLog();
    } catch (error) {
        elements.settingsNotice.textContent = `Failed to send '${action}'. Check API key.`;
        showToast('Bot Control Failed', `Action '${action}' was blocked.`, 'error');
    }
}

function bindControls() {
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const sectionId = button.dataset.section;
            document.querySelectorAll('.section').forEach(section => {
                section.classList.toggle('active', section.id === sectionId);
            });
        });
    });

    document.getElementById('refreshOverview').addEventListener('click', () => {
        loadStats();
        loadActivity();
    });

    document.getElementById('refreshModules').addEventListener('click', loadModules);
    document.getElementById('refreshActivity').addEventListener('click', loadActivity);
    document.getElementById('refreshLeaderboard').addEventListener('click', loadLeaderboard);
    document.getElementById('refreshFivem').addEventListener('click', () => {
        loadFivemStatus();
        loadWhitelistStats();
    });

    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (action === 'shutdown' || action === 'restart') {
                if (!confirm(`Confirm ${action}?`)) return;
            }
            sendControl(action);
        });
    });

    elements.apiKeyInput.value = state.apiKey;
    document.getElementById('saveApiKey').addEventListener('click', () => {
        state.apiKey = elements.apiKeyInput.value.trim();
        localStorage.setItem('dashboardApiKey', state.apiKey);
        elements.settingsNotice.textContent = 'API key saved.';
    });

    if (!state.soundUrl || !state.soundUrl.trim()) {
        state.soundUrl = '/sounds/mixkit-long-pop-2358.wav';
    }

    elements.notifyToggle.checked = state.soundEnabled;
    elements.soundUrlInput.value = state.soundUrl;

    elements.notifyToggle.addEventListener('change', () => {
        state.soundEnabled = elements.notifyToggle.checked;
        localStorage.setItem('dashboardSoundEnabled', String(state.soundEnabled));
        elements.settingsNotice.textContent = `Notifications ${state.soundEnabled ? 'enabled' : 'disabled'}.`;
    });

    elements.saveSound.addEventListener('click', () => {
        const value = elements.soundUrlInput.value.trim();
        state.soundUrl = value || '/sounds/mixkit-long-pop-2358.wav';
        localStorage.setItem('dashboardSoundUrl', state.soundUrl);
        elements.settingsNotice.textContent = 'Sound URL saved.';
    });

    elements.testSound.addEventListener('click', () => {
        playNotificationSound();
        showToast('Sound Test', 'Notification sound played.', 'success');
    });

    elements.themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.theme;
            document.body.dataset.theme = theme;
            localStorage.setItem('dashboardTheme', theme);
            elements.themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

function startPolling() {
    loadStats();
    loadActivity();
    loadModules();
    loadLeaderboard();
    loadTopEarners();
    loadFivemStatus();
    loadWhitelistStats();

    setInterval(loadStats, 5000);
    setInterval(loadActivity, 10000);
    setInterval(loadModules, 30000);
    setInterval(loadLeaderboard, 30000);
    setInterval(loadTopEarners, 30000);
    setInterval(loadFivemStatus, 15000);
    setInterval(loadWhitelistStats, 30000);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('dashboardTheme') || 'cyan';
    document.body.dataset.theme = savedTheme;
    elements.themeButtons.forEach(button => {
        if (button.dataset.theme === savedTheme) {
            button.classList.add('active');
        }
    });
    bindControls();
    buildActivityFilters();
    startPolling();
    initExtras();
});

function initExtras() {
    // --- Terminal Logic ---
    const termInput = document.getElementById('terminalInput');
    const termOutput = document.getElementById('terminalOutput');
    
    if (termInput && termOutput) {
        termInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = termInput.value.trim().toLowerCase();
                if (!cmd) return;
                
                // Add user command
                const cmdLine = document.createElement('div');
                cmdLine.className = 'msg command';
                cmdLine.textContent = cmd;
                termOutput.appendChild(cmdLine);
                
                termInput.value = '';
                termOutput.scrollTop = termOutput.scrollHeight;

                setTimeout(() => {
                    const response = document.createElement('div');
                    response.className = 'msg info';
                    
                    if (cmd === 'help') {
                        response.innerHTML = `Available commands:<br>
                        - <span style="color:var(--accent)">status</span> - System health check<br>
                        - <span style="color:var(--accent)">stats</span> - Bot statistics<br>
                        - <span style="color:var(--accent)">uptime</span> - Bot uptime info<br>
                        - <span style="color:var(--accent)">ping</span> - Check latency<br>
                        - <span style="color:var(--accent)">version</span> - Dashboard version<br>
                        - <span style="color:var(--accent)">date</span> - Current date/time<br>
                        - <span style="color:var(--accent)">clear</span> - Clear console<br>
                        - <span style="color:var(--accent)">restart</span> - Restart bot<br>
                        - <span style="color:var(--accent)">whoami</span> - Session info`;
                    } else if (cmd === 'clear') {
                        termOutput.innerHTML = '<div class="msg system">[SYSTEM] Console cleared.</div>';
                        return;
                    } else if (cmd === 'status') {
                        const botStatus = document.getElementById('healthBot')?.textContent || '--';
                        const latency = document.getElementById('healthLatency')?.textContent || '--';
                        response.className = 'msg success';
                        response.innerHTML = `[STATUS] Bot: ${botStatus} | Latency: ${latency}`;
                    } else if (cmd === 'stats') {
                        const servers = document.getElementById('statServers')?.textContent || '--';
                        const users = document.getElementById('statUsers')?.textContent || '--';
                        const commands = document.getElementById('statCommands')?.textContent || '--';
                        response.className = 'msg info';
                        response.innerHTML = `[STATS] Servers: ${servers} | Users: ${users} | Commands: ${commands}`;
                    } else if (cmd === 'uptime') {
                        const uptime = document.getElementById('statUptime')?.textContent || '--';
                        response.className = 'msg success';
                        response.innerHTML = `[UPTIME] Bot has been running for: ${uptime}`;
                    } else if (cmd === 'ping') {
                        const latency = document.getElementById('statLatency')?.textContent || '--';
                        response.className = 'msg success';
                        response.innerHTML = `[PING] Current latency: ${latency}`;
                    } else if (cmd === 'version') {
                        response.className = 'msg system';
                        response.innerHTML = '[VERSION] TZ PRO Dashboard v2.1.0 | Build 2026.02';
                    } else if (cmd === 'date') {
                        const now = new Date();
                        response.className = 'msg info';
                        response.innerHTML = `[DATE] ${now.toLocaleString()}`;
                    } else if (cmd === 'restart') {
                        response.className = 'msg system';
                        response.innerHTML = '[SYSTEM] Initiating restart sequence...';
                        setTimeout(() => {
                            const msg = document.createElement('div');
                            msg.className = 'msg success';
                            msg.innerHTML = '[SYSTEM] Restart signal sent to bot instance.';
                            termOutput.appendChild(msg);
                            termOutput.scrollTop = termOutput.scrollHeight;
                        }, 1000);
                    } else if (cmd === 'whoami') {
                        response.className = 'msg info';
                        response.innerHTML = '[SESSION] Admin @ TZ PRO Dashboard | Role: Owner';
                    } else {
                        response.className = 'msg error';
                        response.innerHTML = `Command not found: ${cmd}. Type "help" for available commands.`;
                    }
                    
                    termOutput.appendChild(response);
                    termOutput.scrollTop = termOutput.scrollHeight;
                }, 200);
            }
        });
    }

    // --- Music Logic with Local File Support ---
    const playBtn = document.getElementById('playPauseBtn');
    const visualizer = document.getElementById('visualizer');
    const trackTitle = document.getElementById('trackTitle');
    const trackArtist = document.getElementById('trackArtist');
    const albumArt = document.getElementById('albumArt');
    const progressFill = document.getElementById('progressFill');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const musicFileInput = document.getElementById('musicFileInput');
    const loadedTrackInfo = document.getElementById('loadedTrackInfo');
    
    let audio = new Audio();
    let isPlaying = false;
    let currentFile = null;

    // Format time helper
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // File input handler
    if (musicFileInput) {
        musicFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            currentFile = file;
            const url = URL.createObjectURL(file);
            audio.src = url;
            
            // Update UI
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            trackTitle.textContent = fileName;
            trackArtist.textContent = 'Local File';
            albumArt.innerHTML = '<i class="fa-solid fa-compact-disc fa-spin-slow"></i>';
            
            if (loadedTrackInfo) {
                loadedTrackInfo.innerHTML = `<i class="fa-solid fa-music"></i><span>${file.name}</span>`;
            }
            
            showToast('Music', `Loaded: ${fileName}`, 'success');
        });
    }

    // Audio time update
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
            if (totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
        }
    });

    // Audio ended
    audio.addEventListener('ended', () => {
        isPlaying = false;
        if (playBtn) playBtn.querySelector('i').className = 'fa-solid fa-play';
        if (visualizer) visualizer.style.opacity = '0';
        if (progressFill) progressFill.style.width = '0%';
    });

    // Progress bar click to seek
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (!audio.duration) return;
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        });
    }

    // Play/Pause button
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (!audio.src) {
                showToast('Music', 'No track loaded. Go to Config to select a file.', 'warn');
                return;
            }
            
            isPlaying = !isPlaying;
            const icon = playBtn.querySelector('i');
            
            if (isPlaying) {
                audio.play();
                icon.className = 'fa-solid fa-pause';
                if (visualizer) visualizer.style.opacity = '1';
            } else {
                audio.pause();
                icon.className = 'fa-solid fa-play';
                if (visualizer) visualizer.style.opacity = '0';
            }
        });
    }

    // === FEATURES TAB LOGIC ===
    initFeatures();
}

function initFeatures() {
    // --- User Lookup ---
    const userLookupInput = document.getElementById('userLookupInput');
    const userLookupBtn = document.getElementById('userLookupBtn');
    const userLookupResult = document.getElementById('userLookupResult');

    if (userLookupBtn && userLookupInput && userLookupResult) {
        userLookupBtn.addEventListener('click', () => performUserLookup());
        userLookupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performUserLookup();
        });
    }

    async function performUserLookup() {
        const userId = userLookupInput.value.trim();
        if (!userId) {
            showToast('User Lookup', 'Please enter a user ID', 'warn');
            return;
        }

        if (userId.length < 17 || !/^\d+$/.test(userId)) {
            showToast('User Lookup', 'Invalid Discord user ID format', 'error');
            return;
        }

        userLookupResult.innerHTML = '<div class="lookup-empty"><i class="fa-solid fa-spinner fa-spin"></i><p>Searching...</p></div>';

        try {
            const result = await fetchJson(`/api/user-lookup/${userId}`);
            
            if (!result.found) {
                userLookupResult.innerHTML = `
                    <div class="user-not-found">
                        <i class="fa-solid fa-user-xmark"></i>
                        <p>User not found in database</p>
                        <small>ID: ${userId}</small>
                    </div>
                `;
                showToast('User Lookup', 'User not found', 'warn');
                return;
            }

            const user = result.data;
            const badgesHtml = user.badges.length > 0 
                ? user.badges.map(b => `<span class="user-badge">${b}</span>`).join('')
                : '<span class="user-badge" style="opacity:0.5">No badges</span>';

            userLookupResult.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div class="user-info">
                        <h4>${user.username}</h4>
                        <div class="user-id">${user.userId}</div>
                        <div class="user-stats-grid">
                            <div class="user-stat">
                                <div class="stat-value">${user.level}</div>
                                <div class="stat-label">Level</div>
                            </div>
                            <div class="user-stat">
                                <div class="stat-value">${formatNumber(user.xp)}</div>
                                <div class="stat-label">XP</div>
                            </div>
                            <div class="user-stat">
                                <div class="stat-value">$${formatNumber(user.money)}</div>
                                <div class="stat-label">Balance</div>
                            </div>
                        </div>
                        <div class="user-badges">${badgesHtml}</div>
                    </div>
                </div>
            `;
            showToast('User Lookup', `Found: ${user.username}`, 'success');
        } catch (error) {
            userLookupResult.innerHTML = `
                <div class="user-not-found">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Error fetching user data</p>
                </div>
            `;
            showToast('User Lookup', 'Failed to fetch user', 'error');
        }
    }

    // --- Announcement Panel ---
    const announcementChannel = document.getElementById('announcementChannel');
    const announcementMessage = document.getElementById('announcementMessage');
    const announcementEmbed = document.getElementById('announcementEmbed');
    const announcementMention = document.getElementById('announcementMention');
    const sendAnnouncementBtn = document.getElementById('sendAnnouncementBtn');
    const announcementStatus = document.getElementById('announcementStatus');

    if (sendAnnouncementBtn) {
        sendAnnouncementBtn.addEventListener('click', async () => {
            const channelId = announcementChannel.value.trim();
            const message = announcementMessage.value.trim();
            const embed = announcementEmbed.checked;
            const mention = announcementMention.checked;

            if (!channelId || !message) {
                showToast('Announcement', 'Channel ID and message required', 'warn');
                announcementStatus.textContent = 'Please fill in all required fields.';
                announcementStatus.style.color = 'var(--warning)';
                return;
            }

            if (channelId.length < 17 || !/^\d+$/.test(channelId)) {
                showToast('Announcement', 'Invalid channel ID format', 'error');
                return;
            }

            sendAnnouncementBtn.disabled = true;
            announcementStatus.textContent = 'Sending...';
            announcementStatus.style.color = 'var(--muted)';

            try {
                await fetchJson('/api/announcement', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channelId, message, embed, mention })
                });

                showToast('Announcement', 'Message sent successfully!', 'success');
                announcementStatus.textContent = 'Announcement sent successfully!';
                announcementStatus.style.color = 'var(--success)';
                announcementMessage.value = '';
                loadAuditLog(); // Refresh audit log
            } catch (error) {
                showToast('Announcement', 'Failed to send message', 'error');
                announcementStatus.textContent = 'Failed to send. Check API key and bot status.';
                announcementStatus.style.color = 'var(--danger)';
            } finally {
                sendAnnouncementBtn.disabled = false;
            }
        });
    }

    // --- Audit Log ---
    const auditLogList = document.getElementById('auditLogList');
    const auditEmpty = document.getElementById('auditEmpty');
    const refreshAuditLog = document.getElementById('refreshAuditLog');
    let currentAuditFilter = 'all';

    // Filter buttons
    document.querySelectorAll('[data-audit-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-audit-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAuditFilter = btn.dataset.auditFilter;
            loadAuditLog();
        });
    });

    if (refreshAuditLog) {
        refreshAuditLog.addEventListener('click', () => loadAuditLog());
    }

    // Load audit log on init
    loadAuditLog();

    async function loadAuditLog() {
        if (!auditLogList) return;

        try {
            const query = currentAuditFilter !== 'all' ? `?filter=${currentAuditFilter}` : '';
            const result = await fetchJson(`/api/dashboard-audit${query}`);
            const logs = result.data || [];

            if (logs.length === 0) {
                auditLogList.innerHTML = `
                    <div class="audit-empty" id="auditEmpty">
                        <i class="fa-solid fa-scroll"></i>
                        <p>No audit logs yet</p>
                    </div>
                `;
                return;
            }

            auditLogList.innerHTML = logs.map(log => {
                const icon = getAuditIcon(log.action);
                const time = new Date(log.timestamp).toLocaleString();
                const statusClass = log.status === 'failed' ? 'failed' : '';
                
                return `
                    <div class="audit-item ${statusClass}">
                        <div class="audit-icon">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div class="audit-content">
                            <div class="audit-action">${formatAuditAction(log.action)}</div>
                            <div class="audit-details">${log.details || 'No details'}</div>
                        </div>
                        <div class="audit-time">${time}</div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            auditLogList.innerHTML = `
                <div class="audit-empty">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Failed to load audit logs</p>
                </div>
            `;
        }
    }

    function getAuditIcon(action) {
        const icons = {
            'USER_LOOKUP': 'fa-user-magnifying-glass',
            'ANNOUNCEMENT': 'fa-bullhorn',
            'MODULE_TOGGLE': 'fa-toggle-on',
            'BOT_CONTROL': 'fa-robot'
        };
        return icons[action] || 'fa-circle-info';
    }

    function formatAuditAction(action) {
        const labels = {
            'USER_LOOKUP': 'User Lookup',
            'ANNOUNCEMENT': 'Announcement Sent',
            'MODULE_TOGGLE': 'Module Toggled',
            'BOT_CONTROL': 'Bot Control'
        };
        return labels[action] || action;
    }

    // Expose loadAuditLog globally for refresh after other actions
    window.loadAuditLog = loadAuditLog;
}
