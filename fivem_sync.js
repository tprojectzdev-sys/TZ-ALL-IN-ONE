// ████████████████████████████████████████████████████████████████
// ██   TZ PRO BOT - FIVEM SYNC MODULE
// ██   Commands: !kick, !ban, !unban, !players, !say, !warn
// ████████████████████████████████████████████████████████████████

const fs = require('fs');
const path = require('path');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const BRIDGE_DIR = process.env.FIVEM_BRIDGE_DIR || 'C:/Users/ddeni/OneDrive/Desktop/txData/ESXLegacy_92DC99.base/resources/ac_core';
const COMMAND_FILE = path.join(BRIDGE_DIR, 'discord_commands.json');
const RESPONSE_FILE = path.join(BRIDGE_DIR, 'discord_responses.json');
const ALERT_FILE = path.join(BRIDGE_DIR, 'discord_alerts.json');

// Required permission to use FiveM commands
const REQUIRED_PERMISSION = PermissionsBitField.Flags.Administrator;

// Will be set by init()
let discordClient = null;
let auditLogFn = null;

function ensureFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
    }
}

function readJson(filePath) {
    try {
        ensureFile(filePath);
        const raw = fs.readFileSync(filePath, 'utf8') || '[]';
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

function pushCommand(command) {
    const queue = readJson(COMMAND_FILE);
    queue.push(command);
    writeJson(COMMAND_FILE, queue);
}

async function waitForResponse(commandId, timeoutMs = 9000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const responses = readJson(RESPONSE_FILE);
        const idx = responses.findIndex(r => r.id === commandId);

        if (idx !== -1) {
            const response = responses[idx];
            responses.splice(idx, 1);
            writeJson(RESPONSE_FILE, responses);
            return response;
        }

        await new Promise(r => setTimeout(r, 400));
    }

    return { success: false, error: 'No response from FiveM bridge (timeout)' };
}

function makeCommand(action, payload = {}) {
    return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        action,
        ...payload,
        ts: Date.now()
    };
}

// Permission check helper
function hasPermission(member) {
    return member.permissions.has(REQUIRED_PERMISSION);
}

// Parse duration string (1h, 1d, 7d, perm)
function parseDuration(str) {
    if (!str || str === 'perm' || str === 'permanent') return 'perm';
    const match = str.match(/^(\d+)([hdwm])$/i);
    if (!match) return 'perm';
    return str.toLowerCase();
}

// ████████████████████████████████████████████████████████████████
// ██   COMMAND HANDLERS
// ████████████████████████████████████████████████████████████████

const fivemCommands = {
    
    // !players - List online players
    async players(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        try {
            const cmd = makeCommand('players', { adminName: message.author.username });
            pushCommand(cmd);
            const result = await waitForResponse(cmd.id);
            
            if (!result.success) {
                return message.reply(`❌ Error: ${result.error}`);
            }
            
            if (result.count === 0) {
                return message.reply('📭 No players online.');
            }
            
            const playerList = result.players.map(p => 
                `**[${p.id}]** ${p.name} ${p.discord ? `(<@${p.discord}>)` : ''} - ${p.ping}ms`
            ).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle('🎮 Online Players')
                .setDescription(playerList.substring(0, 4000))
                .setColor(0x00FF00)
                .setFooter({ text: `Total: ${result.count} players` })
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            message.reply(`❌ Bridge error: ${error.message}`);
        }
    },
    
    // !kick <@user or ID> [reason]
    async kick(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        if (args.length < 1) {
            return message.reply('Usage: `!kick <@user or serverID> [reason]`');
        }
        
        const target = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'Kicked by Discord admin';
        
        try {
            const cmd = makeCommand('kick', {
                target,
                reason,
                adminName: message.author.username
            });
            pushCommand(cmd);
            const result = await waitForResponse(cmd.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('👢 Player Kicked')
                    .setDescription(result.message)
                    .addFields(
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Admin', value: message.author.username, inline: true }
                    )
                    .setColor(0xFFA500)
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
                
                // Audit log
                if (auditLogFn && message.guild) {
                    auditLogFn(message.guild, {
                        action: 'FIVEM KICK',
                        moderator: message.author.tag,
                        target: result.message || target,
                        reason: reason,
                        source: 'Discord Bridge'
                    });
                }
            } else {
                message.reply(`❌ ${result.error}`);
            }
            
        } catch (error) {
            message.reply(`❌ Bridge error: ${error.message}`);
        }
    },
    
    // !ban <@user or ID> [duration] [reason]
    async ban(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        if (args.length < 1) {
            return message.reply('Usage: `!ban <@user or serverID> [duration: 1h/1d/7d/perm] [reason]`');
        }
        
        const target = args[0].replace(/[<@!>]/g, '');
        let duration = 'perm';
        let reason = 'Banned by Discord admin';
        
        // Check if second arg is a duration
        if (args[1] && /^\d+[hdwm]$/i.test(args[1])) {
            duration = parseDuration(args[1]);
            reason = args.slice(2).join(' ') || reason;
        } else if (args[1] === 'perm' || args[1] === 'permanent') {
            duration = 'perm';
            reason = args.slice(2).join(' ') || reason;
        } else {
            reason = args.slice(1).join(' ') || reason;
        }
        
        try {
            const cmd = makeCommand('ban', {
                target,
                reason,
                duration,
                adminName: message.author.username
            });
            pushCommand(cmd);
            const result = await waitForResponse(cmd.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🔨 Player Banned')
                    .setDescription(result.message)
                    .addFields(
                        { name: 'Duration', value: duration, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Admin', value: message.author.username, inline: true }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
                
                // Audit log
                if (auditLogFn && message.guild) {
                    auditLogFn(message.guild, {
                        action: 'FIVEM BAN',
                        moderator: message.author.tag,
                        target: result.message || target,
                        duration: duration,
                        reason: reason,
                        source: 'Discord Bridge'
                    });
                }
            } else {
                message.reply(`❌ ${result.error}`);
            }
            
        } catch (error) {
            message.reply(`❌ Bridge error: ${error.message}`);
        }
    },
    
    // !unban <identifier>
    async unban(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        if (args.length < 1) {
            return message.reply('Usage: `!unban <identifier>` (e.g., `!unban license:abc123` or `!unban steam:110000xxx`)');
        }
        
        const identifier = args[0];
        
        try {
            const cmd = makeCommand('unban', {
                identifier,
                adminName: message.author.username
            });
            pushCommand(cmd);
            const result = await waitForResponse(cmd.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Player Unbanned')
                    .setDescription(`Removed ${result.removed} ban record(s) matching \`${identifier}\``)
                    .setColor(0x00FF00)
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
                
                // Audit log
                if (auditLogFn && message.guild) {
                    auditLogFn(message.guild, {
                        action: 'FIVEM UNBAN',
                        moderator: message.author.tag,
                        target: identifier,
                        removed: String(result.removed),
                        source: 'Discord Bridge'
                    });
                }
            } else {
                message.reply(`❌ ${result.error}`);
            }
            
        } catch (error) {
            message.reply(`❌ Bridge error: ${error.message}`);
        }
    },
    
    // !bans - List all bans
    async bans(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        return message.reply('ℹ️ `!bans` is temporarily disabled in bridge mode. Use the in-game dashboard for full ban list.');
    },
    
    // !say <message> - Send message to all players in-game
    async say(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        if (args.length < 1) {
            return message.reply('Usage: `!say <message>`');
        }
        
        const text = args.join(' ');
        
        try {
            const cmd = makeCommand('say', {
                message: text,
                adminName: message.author.username
            });
            pushCommand(cmd);
            const result = await waitForResponse(cmd.id);
            
            if (result.success) {
                message.reply(`📢 Message sent to all players!`);
                
                // Audit log
                if (auditLogFn && message.guild) {
                    auditLogFn(message.guild, {
                        action: 'FIVEM SAY',
                        moderator: message.author.tag,
                        message: text,
                        source: 'Discord Bridge'
                    });
                }
            } else {
                message.reply(`❌ ${result.error}`);
            }
            
        } catch (error) {
            message.reply(`❌ Bridge error: ${error.message}`);
        }
    },
    
    // !warn <@user or ID> <reason>
    async warn(message, args) {
        if (!hasPermission(message.member)) {
            return message.reply('❌ You need Administrator permission to use this command.');
        }
        
        if (args.length < 2) {
            return message.reply('Usage: `!warn <@user or serverID> <reason>`');
        }
        
        const target = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ');
        
        try {
            const cmd = makeCommand('warn', {
                target,
                reason,
                adminName: message.author.username
            });
            pushCommand(cmd);
            const result = await waitForResponse(cmd.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Player Warned')
                    .setDescription(result.message)
                    .addFields(
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Admin', value: message.author.username, inline: true }
                    )
                    .setColor(0xFFFF00)
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
                
                // Audit log
                if (auditLogFn && message.guild) {
                    auditLogFn(message.guild, {
                        action: 'FIVEM WARN',
                        moderator: message.author.tag,
                        target: result.message || target,
                        reason: reason,
                        source: 'Discord Bridge'
                    });
                }
            } else {
                message.reply(`❌ ${result.error}`);
            }
            
        } catch (error) {
            message.reply(`❌ Bridge error: ${error.message}`);
        }
    },
    
    // !fivem - Help for FiveM commands
    async fivem(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('🎮 FiveM Server Commands')
            .setDescription('Control your FiveM server from Discord!')
            .addFields(
                { name: '!players', value: 'List all online players', inline: true },
                { name: '!kick <target> [reason]', value: 'Kick a player', inline: true },
                { name: '!ban <target> [duration] [reason]', value: 'Ban a player (1h/1d/7d/perm)', inline: true },
                { name: '!unban <identifier>', value: 'Unban by license/steam', inline: true },
                { name: '!bans', value: 'List all active bans', inline: true },
                { name: '!warn <target> <reason>', value: 'Warn a player in-game', inline: true },
                { name: '!say <message>', value: 'Send message to all players', inline: true }
            )
            .setColor(0x8A2BE2)
            .setFooter({ text: 'Target can be @mention or server ID (e.g., 1, 2, 3)' });
        
        message.reply({ embeds: [embed] });
    }
};

// ████████████████████████████████████████████████████████████████
// ██   ALERT POLLER - Reads AC detections/bans from FiveM
// ████████████████████████████████████████████████████████████████

function startAlertPoller(client) {
    const POLL_INTERVAL = 5000; // 5 seconds
    const MAX_ALERTS_PER_CYCLE = 3; // Max embeds to send per poll cycle
    
    setInterval(() => {
        try {
            const alerts = readJson(ALERT_FILE);
            if (!alerts || alerts.length === 0) return;
            
            // Clear alerts file immediately
            writeJson(ALERT_FILE, []);
            
            // Find audit/alert channel
            const guild = client.guilds.cache.first();
            if (!guild) return;
            
            const alertChannel = guild.channels.cache.find(ch => 
                ch.name.includes('ac-alerts') || ch.name.includes('anticheat') || 
                ch.name.includes('mod-log') || ch.name.includes('audit')
            );
            
            if (!alertChannel || !alertChannel.isTextBased()) return;
            
            // Deduplicate: group by player+detection, keep only the latest
            const deduped = new Map();
            const bans = [];
            for (const alert of alerts) {
                if (alert.type === 'ban') {
                    bans.push(alert);
                } else if (alert.type === 'detection') {
                    const key = `${alert.playerId}:${alert.detection}`;
                    deduped.set(key, alert); // overwrites earlier, keeps latest
                }
            }
            
            // Combine: bans first (always send), then deduped detections (capped)
            const toSend = [];
            for (const ban of bans) {
                toSend.push(ban);
            }
            for (const [, det] of deduped) {
                toSend.push(det);
            }
            
            // Cap total messages per cycle
            const capped = toSend.slice(0, MAX_ALERTS_PER_CYCLE);
            const skipped = toSend.length - capped.length;
            
            for (const alert of capped) {
                if (alert.type === 'detection') {
                    const embed = new EmbedBuilder()
                        .setTitle('\u26a0\ufe0f AntiCheat Detection')
                        .addFields(
                            { name: 'Player', value: `${alert.player} [${alert.playerId}]`, inline: true },
                            { name: 'Detection', value: alert.detection || 'Unknown', inline: true },
                            { name: 'Points', value: `+${alert.points} (Total: ${alert.totalScore})`, inline: true },
                            { name: 'Evidence', value: (alert.evidence || 'None').substring(0, 1024), inline: false }
                        )
                        .setColor(alert.totalScore >= 12 ? 0xFF0000 : alert.totalScore >= 5 ? 0xFFA500 : 0xFFFF00)
                        .setFooter({ text: 'AntiCheat System' })
                        .setTimestamp();
                    
                    alertChannel.send({ embeds: [embed] }).catch(() => {});
                    
                } else if (alert.type === 'ban') {
                    const embed = new EmbedBuilder()
                        .setTitle('\ud83d\udd28 AntiCheat Ban')
                        .addFields(
                            { name: 'Player', value: `${alert.player} [${alert.playerId}]`, inline: true },
                            { name: 'Duration', value: alert.duration || 'permanent', inline: true },
                            { name: 'Reason', value: (alert.reason || 'No reason').substring(0, 1024), inline: false }
                        )
                        .setColor(0xFF0000)
                        .setFooter({ text: 'AntiCheat System' })
                        .setTimestamp();
                    
                    alertChannel.send({ embeds: [embed] }).catch(() => {});
                    
                    // Also log to audit
                    if (auditLogFn) {
                        auditLogFn(guild, {
                            action: 'AC AUTO-BAN',
                            target: `${alert.player} [${alert.playerId}]`,
                            reason: alert.reason || 'AntiCheat violation',
                            duration: alert.duration || 'permanent',
                            source: 'AntiCheat System'
                        });
                    }
                }
            }
            
            if (skipped > 0) {
                alertChannel.send(`⚠️ *${skipped} additional detection(s) suppressed to prevent spam.*`).catch(() => {});
            }
        } catch (err) {
            // Silent fail - don't spam console
        }
    }, POLL_INTERVAL);
    
    console.log('[FiveM Sync] Alert poller started (5s interval, deduplication enabled)');
}

// ████████████████████████████████████████████████████████████████
// ██   MODULE EXPORT
// ████████████████████████████████████████████████████████████████

module.exports = {
    name: 'FiveM Sync',
    commands: fivemCommands,
    
    // Initialize (called when bot starts)
    init(client, logFn) {
        discordClient = client;
        auditLogFn = logFn || null;
        ensureFile(COMMAND_FILE);
        ensureFile(RESPONSE_FILE);
        ensureFile(ALERT_FILE);
        console.log('[FiveM Sync] File bridge loaded');
        console.log(`[FiveM Sync] Bridge dir: ${BRIDGE_DIR}`);
        if (auditLogFn) console.log('[FiveM Sync] Audit logging enabled');
        
        // Start alert poller - checks for AC detection/ban alerts from FiveM
        startAlertPoller(client);
    },
    
    // Handle messages (called from index.js)
    async handleMessage(message, prefix) {
        if (!message.content.startsWith(prefix)) return false;
        
        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        
        if (fivemCommands[command]) {
            await fivemCommands[command](message, args);
            return true;
        }
        
        return false;
    }
};
