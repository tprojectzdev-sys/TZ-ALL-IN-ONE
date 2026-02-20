
require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const SecurityManager = require('./security');
const { connectDB, ScriptModel } = require('./db');
const {
    LevelingSystem,
    EconomySystem,
    AchievementSystem,
    TicketSystem,
    GiveawaySystem,
    FiveMMeta,
    ActivityTracker,
    ReportSystem,
    CustomCommandSystem,
    GuildConfigSystem,
    AppealSystem,
    ApplicationSystem,
    NoteSystem,
    NotificationSystem,
    AuditLogger
} = require('./features_new');
const MusicSystem = require('./music');
const fivemSync = require('./fivem_sync');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ]
});

global.isPaused = false;
global.commandCounter = 0;
global.commandCounterResetTime = Date.now() + 86400000;
global.autoMessageLastSent = new Map();
global.commandUsage = new Map();
global.triviaSessions = new Map();
global.hangmanGames = new Map();
global.enabledModules = {
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

// Initialize systems
const security = new SecurityManager();
const leveling = new LevelingSystem();
const economy = new EconomySystem();
const achievements = new AchievementSystem();
const tickets = new TicketSystem();
const giveaways = new GiveawaySystem();
const fivem = new FiveMMeta();
const activity = new ActivityTracker();
const reports = new ReportSystem();
const customCommands = new CustomCommandSystem();
const guildConfig = new GuildConfigSystem();
const appeals = new AppealSystem();
const applications = new ApplicationSystem();
const notes = new NoteSystem();
const notifications = new NotificationSystem();
const music = new MusicSystem();
const audit = new AuditLogger();


if (!process.env.DISCORD_TOKEN) {
    console.error("âŒ ERROR: DISCORD_TOKEN not found in .env!");
    process.exit(1);
}

const CONFIG = {
    PREFIX: process.env.BOT_PREFIX || "!",
    TOKEN: process.env.DISCORD_TOKEN,
    OWNER_IDS: process.env.BOT_OWNERS ? process.env.BOT_OWNERS.split(',').map(id => id.trim()).filter(Boolean) : [],
    OWNER_ONLY_BY_ID: true,
    
    ROLES: {
        OWNER: "Bot Owner",
        ADMIN: "Head Staff",
        MODERATOR: "Moderator",
        TRIAL_MOD: "Trial Moderator",
        MUTED: "Muted",
        WHITELISTED: "Whitelisted"
    },
    
    PERMISSION_LEVELS: {
        OWNER: 4,
        ADMIN: 3,
        MODERATOR: 2,
        TRIAL_MOD: 1,
        USER: 0
    },
    
    AUTO_MOD: {
        ANTI_SPAM: true,
        ANTI_RAID: true,
        LINK_FILTER: true,
        WORD_FILTER: true,
        SCAM_DETECTION: true,
        INVITE_FILTER: true,
        AD_FILTER: true,
        USERNAME_FILTER: true,
        MENTION_LIMIT: 5,
        SPAM_THRESHOLD: 5,
        SPAM_TIMEFRAME: 5000,
        RAID_THRESHOLD: 5,
        RAID_LOCK_DURATION: 10 * 60 * 1000,
        WORD_FILTER_LIST: ['nword', 'rword', 'fword', 'slur1', 'slur2']
    }
};

// Handle dashboard messages
process.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.action === 'pause') {
        global.isPaused = true;
        console.log('📴 Bot PAUSED via dashboard');
        client.user?.setPresence({
            status: 'idle',
            activities: [{ name: 'PAUSED', type: 3 }]
        });
        return;
    }

    if (msg.action === 'resume') {
        global.isPaused = false;
        console.log('▶️ Bot RESUMED via dashboard');
        client.user?.setPresence({
            status: 'online',
            activities: [{ name: `${CONFIG.PREFIX}help | FiveM Bot`, type: 3 }]
        });
        return;
    }

    if (msg.type === 'moduleToggle' && msg.module) {
        global.enabledModules[msg.module] = Boolean(msg.enabled);
        console.log(`🔌 Module ${msg.module}: ${msg.enabled ? 'ENABLED' : 'DISABLED'}`);
        return;
    }

    if (msg.type === 'executeCommand' && msg.command) {
        // Security: dashboard commands are logged only (no direct execution)
        console.log(`📡 Dashboard requested command: ${msg.command}`);
        return;
    }

    // Handle announcement from dashboard
    if (msg.type === 'announcement' && msg.channelId && msg.message) {
        (async () => {
            try {
                // Try to get from cache first, then fetch
                let channel = client.channels.cache.get(msg.channelId);
                if (!channel) {
                    console.log(`Channel not in cache, fetching ${msg.channelId}...`);
                    channel = await client.channels.fetch(msg.channelId).catch(() => null);
                }
                
                if (!channel) {
                    console.log(`âŒ Announcement failed: Channel ${msg.channelId} not found`);
                    return;
                }

                if (!channel.isTextBased || !channel.isTextBased()) {
                    console.log(`âŒ Announcement failed: Channel is not a text channel`);
                    return;
                }

                const content = msg.mention ? `@everyone\n${msg.message}` : msg.message;
                
                if (msg.embed) {
                    const embed = {
                        color: 0x38e8ff,
                        title: '📢 Announcement',
                        description: msg.message,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'Sent from Dashboard' }
                    };
                    await channel.send({ 
                        content: msg.mention ? '@everyone' : undefined,
                        embeds: [embed] 
                    });
                } else {
                    await channel.send(content);
                }
                console.log(`📢 Announcement sent to #${channel.name || msg.channelId}`);
            } catch (err) {
                console.error('âŒ Announcement error:', err.message);
            }
        })();
        return;
    }
});

console.clear();
console.log(`
.----------------.  .----------------. 
| .--------------. || .--------------. |
| |  _________   | || |   ________   | |
| | |  _   _  |  | || |  |  __   _|  | |
| | |_/ | | \\_|  | || |  |_/  / /    | |
| |     | |      | || |     .'.' _   | |
| |    _| |_     | || |   _/ /__/ |  | |
| |   |_____|    | || |  |________|  | |
| |              | || |              | |
| '--------------' || '--------------' |
 '----------------'  '----------------' 
`);

console.log("\n" + "=".repeat(70));
console.log("TIME: " + new Date().toLocaleString());
console.log("=".repeat(70));

class PermissionSystem {
    static getPermissionLevel(member) {
        if (!member) return 0;
        
        // Check OWNER_IDS first (from .env file)
        if (CONFIG.OWNER_IDS.includes(member.id)) {
            return CONFIG.PERMISSION_LEVELS.OWNER;
        }
        
        const roles = member.roles.cache;
        
        // Check role hierarchy
        if (!CONFIG.OWNER_ONLY_BY_ID && roles.some(r => r.name === CONFIG.ROLES.OWNER)) {
            return CONFIG.PERMISSION_LEVELS.OWNER;
        }
        if (roles.some(r => r.name === CONFIG.ROLES.ADMIN)) return CONFIG.PERMISSION_LEVELS.ADMIN;
        if (roles.some(r => r.name === CONFIG.ROLES.MODERATOR)) return CONFIG.PERMISSION_LEVELS.MODERATOR;
        if (roles.some(r => r.name === CONFIG.ROLES.TRIAL_MOD)) return CONFIG.PERMISSION_LEVELS.TRIAL_MOD;
        
        return CONFIG.PERMISSION_LEVELS.USER;
    }
    
    static hasPermission(member, requiredLevel) {
        const userLevel = this.getPermissionLevel(member);
        return userLevel >= requiredLevel;
    }
    
    static canModerate(moderator, target) {
        // Hierarchy check - can't moderate someone with equal/higher role
            const modLevel = this.getPermissionLevel(moderator); 
        const targetLevel = this.getPermissionLevel(target);
        
        if (modLevel <= targetLevel) return false;
        if (CONFIG.OWNER_IDS.includes(target.id)) return false; // Can't moderate owners
        
        return true;
    }
}

class MessageHelper {
    // Send message and auto-delete after time
    static async sendAndDelete(message, content, deleteTime = 180000, isEmbed = false) {
        try {
            let sentMessage;
            
            if (isEmbed) {
                sentMessage = await message.reply({ embeds: [content] });
            } else {
                sentMessage = await message.reply({ content });
            }
            
            // Auto-delete the bot's response
            setTimeout(() => {
                sentMessage.delete().catch(() => {});
            }, deleteTime);
            
            // Also delete user's command after 30 seconds
            setTimeout(() => {
                message.delete().catch(() => {});
            }, 30000);
            
            return sentMessage;
        } catch (error) {
            console.error("Send and delete error:", error);
            return null;
        }
    }
    
    // Log to both console and Discord
    static log(guild, data) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Console log with colors
        console.log(`\n\x1b[36m📋 [DISCORD LOG - ${timestamp}]\x1b[0m`);
        console.log(`\x1b[33mAction:\x1b[0m ${data.action}`);
        for (const [key, value] of Object.entries(data)) {
            if (key !== "action") {
                console.log(`\x1b[90m${key}:\x1b[0m ${value}`);
            }
        }
        console.log('\x1b[90m' + '-'.repeat(50) + '\x1b[0m');
        
        // Discord channel log
        const logChannel = guild.channels.cache.find(ch => 
            ch.name.includes('mod-log') || ch.name.includes('audit')
        );
        
        if (logChannel && logChannel.isTextBased()) {
            const embed = {
                color: data.action.includes("BAN") ? 0xff0000 : 
                       data.action.includes("KICK") ? 0xff6600 : 
                       data.action.includes("WARN") ? 0xffff00 : 
                       data.action.includes("AUTO") ? 0x9900ff : 0x5865F2,
                title: `📋 ${data.action}`,
                fields: [],
                timestamp: new Date(),
                footer: { text: "Moderation Log" }
            };
            
            for (const [key, value] of Object.entries(data)) {
                if (key !== "action") {
                    embed.fields.push({ 
                        name: key.charAt(0).toUpperCase() + key.slice(1), 
                        value: String(value).substring(0, 1024),
                        inline: true 
                    });
                }
            }
            
            logChannel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

class BotControl {
    static async restart(message) {
        console.log("\n" + "=".repeat(70));
        console.log("🔄 BOT RESTART INITIATED BY:", message.author.tag);
        console.log("=".repeat(70));
        
        await MessageHelper.sendAndDelete(message, "🔄 **Restarting bot...**\n*Please wait 10 seconds*", 10000);
        
        MessageHelper.log(message.guild, {
            action: "BOT_RESTART",
            moderator: message.author.tag,
            time: new Date().toLocaleString()
        });
        
        // Graceful restart
        setTimeout(() => {
            console.log("\n🚀 Restarting bot process...");
            process.exit(0); // Will be restarted by PM2 or whatever
        }, 2000);
    }
    
    static async shutdown(message) {
        console.log("\n" + "=".repeat(70));
        console.log("🛑 BOT SHUTDOWN INITIATED BY:", message.author.tag);
        console.log("=".repeat(70));
        
        await MessageHelper.sendAndDelete(message, "🛑 **Shutting down bot...**\n*Goodbye!*", 10000);
        
        MessageHelper.log(message.guild, {
            action: "BOT_SHUTDOWN",
            moderator: message.author.tag,
            time: new Date().toLocaleString()
        });
        
        // Graceful shutdown
        setTimeout(() => {
            console.log("\n👋 Bot shutting down gracefully...");
            client.destroy();
            process.exit(0);
        }, 2000);
    }
    
    static status(message) {
        const memory = process.memoryUsage();
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const embed = {
            color: 0x00FF00,
            title: "🤖 BOT STATUS",
            fields: [
                { name: "Bot Name", value: client.user.tag, inline: true },
                { name: "Servers", value: client.guilds.cache.size.toString(), inline: true },
                { name: "Users", value: client.users.cache.size.toString(), inline: true },
                { name: "Uptime", value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
                { name: "Memory", value: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`, inline: true },
                { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
                { name: "Owner", value: `<@${CONFIG.OWNER_IDS[0]}>`, inline: true },
                { name: "Prefix", value: CONFIG.PREFIX, inline: true },
                { name: "Version", value: "v3.0 Professional", inline: true }
            ],
            timestamp: new Date(),
            footer: { text: "FiveM RP Bot - System Status" }
        };
        
        return MessageHelper.sendAndDelete(message, embed, 30000, true);
    }
}

const moderationCommands = {
    admin: {
        description: "Bot administration",
        permission: CONFIG.PERMISSION_LEVELS.OWNER,
        execute: async (message, args) => {
            const sub = args[0]?.toLowerCase();
            
            switch(sub) {
                case "restart":
                    return BotControl.restart(message);
                    
                case "shutdown":
                    return BotControl.shutdown(message);
                    
                case "status":
                    return BotControl.status(message);
                    
                  case "max":
                      // !admin max @user OR !admin maxme
                      const targetUser = message.mentions.users.first() || message.author;
                      try {
                          const user = await economy.getUser(targetUser.id, targetUser.username);
                          user.money = 1000000; // Max money
                          user.xp = 999999;
                          user.level = 100;
                          user.badges = ['Legend', 'Legendary', 'Rich', 'Max', 'Admin'];
                          user.achievements = ['gaming_master', 'economy_god', 'level_100', 'ultra_legend'];
                          await user.save();
                          
                          const embed = {
                              color: 0xFFD700,
                              title: "✨ MAXED OUT ✨",
                              description: `<@${targetUser.id}> has been MAXED OUT!`,
                              fields: [
                                  { name: "💰 Money", value: "$1,000,000", inline: true },
                                  { name: "⚡ XP", value: "999,999 XP", inline: true },
                                  { name: "🏆 Level", value: "100", inline: true },
                                  { name: "🎖️ Badges", value: user.badges.join(", "), inline: false },
                                  { name: "🌟 Achievements", value: user.achievements.join(", "), inline: false }
                              ],
                              footer: { text: "Owner Command Executed" }
                          };
                          return MessageHelper.sendAndDelete(message, embed, 30000, true);
                      } catch (error) {
                          return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
                      }

                default:
                    const helpEmbed = {
                        color: 0xFFD700,
                        title: "👑 OWNER CONTROL PANEL",
                        description: `**Owner:** <@${CONFIG.OWNER_IDS[0]}>\n*Commands auto-delete after 30 seconds*`,
                        fields: [
                            { name: "Bot Control", value: "`!admin restart` - Restart bot\n`!admin shutdown` - Stop bot\n`!admin status` - Bot stats", inline: true },
                            { name: "Stats Control", value: "`!admin max` - Max stats\n`!setmoney @user <amount>`\n`!setlevel @user <level>`", inline: true },
                            { name: "Danger Zone", value: "⚠️ Use with caution\nThese affect the entire bot", inline: true }
                        ],
                        footer: { text: "TZ PRO - Owner Commands" }
                    };
                    return MessageHelper.sendAndDelete(message, helpEmbed, 30000, true);
            }
        }
    },

    setmoney: {
        description: "Set user's money (Owner)",
        permission: CONFIG.PERMISSION_LEVELS.OWNER,
        execute: async (message, args) => {
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[1], 10);
            
            if (!targetUser || isNaN(amount)) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setmoney @user <amount>`", 30000);
            }
            
            try {
                const user = await economy.getUser(targetUser.id, targetUser.username);
                user.money = amount;
                await user.save();
                
                return MessageHelper.sendAndDelete(message, `✅ Set ${targetUser.tag}'s money to $${amount.toLocaleString()}`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },

    setlevel: {
        description: "Set user's level (Owner)",
        permission: CONFIG.PERMISSION_LEVELS.OWNER,
        execute: async (message, args) => {
            const targetUser = message.mentions.users.first();
            const level = parseInt(args[1], 10);
            
            if (!targetUser || isNaN(level) || level < 0 || level > 100) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setlevel @user <0-100>`", 30000);
            }
            
            try {
                const user = await economy.getUser(targetUser.id, targetUser.username);
                user.level = level;
                user.xp = level * 1000; // Approximate XP for level
                await user.save();
                
                return MessageHelper.sendAndDelete(message, `✅ Set ${targetUser.tag}'s level to ${level}`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },

    setxp: {
        description: "Set user's XP (Owner)",
        permission: CONFIG.PERMISSION_LEVELS.OWNER,
        execute: async (message, args) => {
            const targetUser = message.mentions.users.first();
            const xp = parseInt(args[1], 10);
            
            if (!targetUser || isNaN(xp)) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setxp @user <amount>`", 30000);
            }
            
            try {
                const user = await economy.getUser(targetUser.id, targetUser.username);
                user.xp = xp;
                user.level = Math.floor(xp / 1000); // Auto-calculate level
                await user.save();
                
                return MessageHelper.sendAndDelete(message, `✅ Set ${targetUser.tag}'s XP to ${xp.toLocaleString()} (Level ${user.level})`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },

    maxme: {
        description: "Max your own stats (Owner shortcut)",
        permission: CONFIG.PERMISSION_LEVELS.OWNER,
        execute: async (message) => {
            try {
                const user = await economy.getUser(message.author.id, message.author.username);
                user.money = 1000000;
                user.xp = 999999;
                user.level = 100;
                user.badges = ['Legend', 'Legendary', 'Rich', 'Max', 'Owner', 'God'];
                user.achievements = ['gaming_master', 'economy_god', 'level_100', 'ultra_legend', 'max_achieved'];
                await user.save();
                
                const embed = {
                    color: 0xFFD700,
                    title: "⚡ MAXED OUT ⚡",
                    description: `You are now **GOD TIER**!`,
                    fields: [
                        { name: "💰 Money", value: "$1,000,000", inline: true },
                        { name: "⚡ XP", value: "999,999 XP", inline: true },
                        { name: "🏆 Level", value: "100", inline: true }
                    ],
                    footer: { text: "TZ PRO - Owner Privileges" },
                    timestamp: new Date()
                };
                return MessageHelper.sendAndDelete(message, embed, 30000, true);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },
    
    
    ban: {
        description: "Ban a user",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            if (!user) {
                return MessageHelper.sendAndDelete(message, "âŒ Mention user!\n`!ban @user [reason]`", 30000);
            }
            
            const targetMember = await message.guild.members.fetch(user.id).catch(() => null);
            if (!targetMember) return MessageHelper.sendAndDelete(message, "âŒ User not in server", 30000);
            
            if (!PermissionSystem.canModerate(message.member, targetMember)) {
                return MessageHelper.sendAndDelete(message, "âŒ Cannot moderate this user (hierarchy)", 30000);
            }
            
            const reason = args.slice(1).join(" ").trim() || "No reason provided";
            
            try {
                await message.guild.members.ban(user.id, { reason: `${message.author.tag}: ${reason}` });
                
                MessageHelper.log(message.guild, {
                    action: "BAN",
                    moderator: message.author.tag,
                    target: user.tag,
                    reason: reason,
                    duration: "PERMANENT"
                });
                
                return MessageHelper.sendAndDelete(message, `✅ ${user.tag} permanently banned\n**Reason:** ${reason}`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    unban: {
        description: "Unban a user",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const userId = args[0];
            if (!userId) return MessageHelper.sendAndDelete(message, "âŒ Provide user ID\n`!unban <ID> [reason]`", 30000);
            
            try {
                await message.guild.members.unban(userId);
                
                MessageHelper.log(message.guild, {
                    action: "UNBAN",
                    moderator: message.author.tag,
                    target: userId,
                    reason: args.slice(1).join(" ") || "Appeal accepted"
                });
                
                return MessageHelper.sendAndDelete(message, `✅ User ${userId} unbanned`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    kick: {
        description: "Kick a user",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            if (!user) return MessageHelper.sendAndDelete(message, "âŒ Mention user!\n`!kick @user [reason]`", 30000);
            
            const targetMember = await message.guild.members.fetch(user.id).catch(() => null);
            if (!targetMember) return MessageHelper.sendAndDelete(message, "âŒ User not found", 30000);
            
            if (!PermissionSystem.canModerate(message.member, targetMember)) {
                return MessageHelper.sendAndDelete(message, "âŒ Cannot moderate this user", 30000);
            }
            
            const reason = args.slice(1).join(" ") || "No reason provided";
            
            try {
                await targetMember.kick(`${message.author.tag}: ${reason}`);
                
                MessageHelper.log(message.guild, {
                    action: "KICK",
                    moderator: message.author.tag,
                    target: user.tag,
                    reason: reason
                });
                
                return MessageHelper.sendAndDelete(message, `✅ ${user.tag} kicked\n**Reason:** ${reason}`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    purge: {
        description: "Delete messages (1-100)",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message, args) => {
            const amount = parseInt(args[0], 10);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return MessageHelper.sendAndDelete(message, "âŒ Specify 1-100\n`!purge 50`", 30000);
            }
            
            try {
                const messages = await message.channel.messages.fetch({ limit: amount + 1 });
                const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
                
                if (deletable.size === 0) {
                    return MessageHelper.sendAndDelete(message, "âŒ No deletable messages", 30000);
                }
                
                await message.channel.bulkDelete(deletable, true);
                
                MessageHelper.log(message.guild, {
                    action: "PURGE",
                    moderator: message.author.tag,
                    channel: message.channel.name,
                    amount: deletable.size
                });
                
                const reply = await message.channel.send(`✅ Cleared ${deletable.size} messages`);
                setTimeout(() => reply.delete(), 5000);
                
                return MessageHelper.sendAndDelete(message, `✅ Purged ${deletable.size} messages`, 10000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    lock: {
        description: "Lock channel",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message) => {
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
                
                MessageHelper.log(message.guild, {
                    action: "LOCK",
                    moderator: message.author.tag,
                    channel: message.channel.name
                });
                
                return MessageHelper.sendAndDelete(message, `🔒 #${message.channel.name} locked`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    unlock: {
        description: "Unlock channel",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message) => {
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: null
                });
                
                MessageHelper.log(message.guild, {
                    action: "UNLOCK",
                    moderator: message.author.tag,
                    channel: message.channel.name
                });
                
                return MessageHelper.sendAndDelete(message, `🔓 #${message.channel.name} unlocked`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    warn: {
        description: "Warn a user",
        permission: CONFIG.PERMISSION_LEVELS.TRIAL_MOD,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            if (!user) return MessageHelper.sendAndDelete(message, "âŒ Mention user!\n`!warn @user [reason]`", 30000);
            
            const targetMember = await message.guild.members.fetch(user.id).catch(() => null);
            if (!targetMember) return MessageHelper.sendAndDelete(message, "âŒ User not found", 30000);
            
            if (PermissionSystem.getPermissionLevel(targetMember) > 0) {
                return MessageHelper.sendAndDelete(message, "âŒ Can only warn regular users", 30000);
            }
            
            const reason = args.slice(1).join(" ") || "No reason provided";
              
              // Get user and track warns
              const userDoc = await economy.getUser(user.id, user.username);
              if (!userDoc.warns) userDoc.warns = 0;
              userDoc.warns += 1;
              await userDoc.save();

              MessageHelper.log(message.guild, {
                  action: "WARN",
                  moderator: message.author.tag,
                  target: user.tag,
                  reason: reason,
                  warnCount: userDoc.warns
              });

              let escalationAction = "";
              
              // Auto-escalation system
              if (userDoc.warns === 2) {
                  // Mute on 2nd warn
                  await targetMember.timeout(3600000, `Auto-mute after 2 warns`).catch(() => {});
                  escalationAction = "\n⚠️ **AUTO-MUTED for 1 hour** (2 warns)";
              } else if (userDoc.warns === 3) {
                  // Kick on 3rd warn
                  await targetMember.kick(`Auto-kick after 3 warns`).catch(() => {});
                  escalationAction = "\nâŒ **AUTO-KICKED** (3 warns)";
              } else if (userDoc.warns >= 5) {
                  // Ban on 5th warn
                  await message.guild.members.ban(user.id, { reason: `Auto-ban after 5 warns` }).catch(() => {});
                  escalationAction = "\n🚫 **AUTO-BANNED** (5 warns)";
              }

              return MessageHelper.sendAndDelete(message, `⚠️ ${user.tag} warned (${userDoc.warns}/5)\n**Reason:** ${reason}${escalationAction}`, 30000);
            }
    },

    timeout: {
        description: "Timeout a user",
        permission: CONFIG.PERMISSION_LEVELS.TRIAL_MOD,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            if (!user) return MessageHelper.sendAndDelete(message, "âŒ Mention user!\n`!timeout @user <time> [reason]`", 30000);

            const targetMember = await message.guild.members.fetch(user.id).catch(() => null);
            if (!targetMember) return MessageHelper.sendAndDelete(message, "âŒ User not found", 30000);

            if (PermissionSystem.getPermissionLevel(targetMember) > 0) {
                return MessageHelper.sendAndDelete(message, "âŒ Can only timeout regular users", 30000);
            }

            const timeString = args[1];
            if (!timeString) return MessageHelper.sendAndDelete(message, "âŒ Specify time (e.g., 10m, 1h)", 30000);
            
            const match = timeString.match(/^(\d+)([mhd])$/);
            if (!match) return MessageHelper.sendAndDelete(message, "âŒ Invalid format (10m, 1h, 1d)", 30000);
            
            let amount = parseInt(match[1]);
            const unit = match[2];
            
            let ms;
            switch(unit) {
                case 'd': ms = amount * 24 * 60 * 60 * 1000; break;
                case 'h': ms = amount * 60 * 60 * 1000; break;
                case 'm': ms = amount * 60 * 1000; break;
            }
            
            const isTrialMod = PermissionSystem.getPermissionLevel(message.member) === CONFIG.PERMISSION_LEVELS.TRIAL_MOD;
            if (isTrialMod && ms > 60 * 60 * 1000) {
                return MessageHelper.sendAndDelete(message, "âŒ Trial mods: 1 hour max timeout", 30000);
            }
            
            const reason = args.slice(2).join(" ") || "No reason provided";
            
            try {
                await targetMember.timeout(ms, `${message.author.tag}: ${reason}`);
                
                MessageHelper.log(message.guild, {
                    action: "TIMEOUT",
                    moderator: message.author.tag,
                    target: user.tag,
                    duration: timeString,
                    reason: reason
                });
                
                return MessageHelper.sendAndDelete(message, `â° ${user.tag} timed out for ${timeString}\n**Reason:** ${reason}`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },
    
    modhelp: {
        description: "Show available commands",
        permission: 0,
        execute: async (message) => {
            const userLevel = PermissionSystem.getPermissionLevel(message.member);
            const levelName = getLevelName(userLevel);
            let commands = "";
            
            if (userLevel >= CONFIG.PERMISSION_LEVELS.OWNER) {
                commands += `👑 **OWNER**\n\`${CONFIG.PREFIX}admin\` - Bot control panel\n`;
            }
            
            if (userLevel >= CONFIG.PERMISSION_LEVELS.ADMIN) {
                commands += `🛡️ **ADMIN**\n\`${CONFIG.PREFIX}ban @user [reason]\` - Ban\n\`${CONFIG.PREFIX}unban <ID> [reason]\` - Unban\n`;
            }
            
            if (userLevel >= CONFIG.PERMISSION_LEVELS.MODERATOR) {
                commands += `🔨 **MODERATOR**\n\`${CONFIG.PREFIX}kick @user [reason]\` - Kick\n\`${CONFIG.PREFIX}purge [1-100]\` - Clear\n\`${CONFIG.PREFIX}lock/unlock\` - Channel\n`;
            }
            
            if (userLevel >= CONFIG.PERMISSION_LEVELS.TRIAL_MOD) {
                commands += `🟡 **TRIAL MOD**\n\`${CONFIG.PREFIX}warn @user [reason]\` - Warn\n\`${CONFIG.PREFIX}timeout @user [time] [reason]\` - Timeout\n`;
            }
            
            commands += `\n📋 **INFO**\n\`${CONFIG.PREFIX}modhelp\` - This menu\n\`${CONFIG.PREFIX}myperms\` - Check level`;
            
            const embed = {
                color: 0x5865F2,
                title: "🔨 MODERATION COMMANDS",
                description: `**Prefix:** \`${CONFIG.PREFIX}\`\n**Your Level:** ${levelName} (Tier ${userLevel})\n\n*Auto-deletes in 3 minutes*`,
                fields: [{
                    name: "Available Commands",
                    value: commands
                }],
                footer: { text: `FiveM RP Bot • ${levelName} Access` }
            };
            
            return MessageHelper.sendAndDelete(message, embed, 180000, true);
        }
    },
    
    myperms: {
        description: "Check your permission level",
        permission: 0,
        execute: async (message) => {
            const level = PermissionSystem.getPermissionLevel(message.member);
            const levelName = getLevelName(level);
            
            const embed = {
                color: 0x00FF00,
                title: "🔐 PERMISSION STATUS",
                fields: [
                    { name: "User", value: message.author.tag, inline: true },
                    { name: "Level", value: levelName, inline: true },
                    { name: "Access Tier", value: `Tier ${level}`, inline: true }
                ],
                description: `You have **${levelName}** access to moderation commands.`,
                footer: { text: "FiveM RP Bot - Permission Check" }
            };
            
            return MessageHelper.sendAndDelete(message, embed, 30000, true);
        }
    },
    
    level: {
        description: "Check your level and XP",
        permission: 0,
        execute: async (message) => {
            const data = await leveling.getLevel(message.author.id);
            
            const embed = {
                color: 0x00FF00,
                title: `📊 ${message.author.username}'s Level`,
                fields: [
                    { name: "Level", value: data.level.toString(), inline: true },
                    { name: "Total XP", value: data.xp.toString(), inline: true },
                    { name: "Next Level", value: data.nextLevelXP.toString(), inline: true }
                ],
                description: `Progress: ${Math.floor(data.progress)}%`,
                footer: { text: "+10 XP per message (1min cooldown)" }
            };
            
            return MessageHelper.sendAndDelete(message, embed, 60000, true);
        }
    },
    
    leaderboard: {
        description: "Show top 15 members by level",
        permission: 0,
        execute: async (message) => {
            const top = await leveling.getLeaderboard();
            
            if (top.length === 0) {
                return MessageHelper.sendAndDelete(message, "📊 No leaderboard data yet!", 30000);
            }
            
            let leaderboardText = "";
            for (const entry of top) {
                const user = await client.users.fetch(entry.userId).catch(() => null);
                const username = user ? user.username : "Unknown User";
                leaderboardText += `**${entry.rank}.** ${username} - Level ${entry.level} (${entry.xp} XP)\n`;
            }
            
            const embed = {
                color: 0xFFD700,
                title: "🏆 TOP 15 LEADERBOARD",
                description: leaderboardText || "No data",
                footer: { text: "Keep chatting to gain XP!" }
            };
            
            return MessageHelper.sendAndDelete(message, embed, 120000, true);
        }
    },
    
    ticket: {
        description: "Create a support ticket",
        permission: 0,
        execute: async (message, args) => {
            const reason = args.join(" ") || "No reason provided";
            const result = await tickets.createTicket(message.member, reason);
            
            if (!result.success) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${result.error}`, 30000);
            }
            
            await activity.logActivity('TICKET_CREATE', message.author, `Created ticket: ${result.ticketId}`);
            
            return MessageHelper.sendAndDelete(message, 
                `✅ Ticket created: ${result.channel}\n**ID:** ${result.ticketId}`, 
                30000
            );
        }
    },
    
    giveaway: {
        description: "Create a giveaway (Admin)",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            if (args.length < 3) {
                return MessageHelper.sendAndDelete(message, 
                    'âŒ Usage: `!giveaway "prize" duration_seconds winners`\nExample: `!giveaway "Discord Nitro" 120 1`', 
                    30000
                );
            }
            
            const prize = args[0].replace(/"/g, '');
            const duration = parseInt(args[1]);
            const winners = parseInt(args[2]);
            
            if (!duration || !winners) {
                return MessageHelper.sendAndDelete(message, "âŒ Invalid duration or winner count", 30000);
            }
            
            const result = await giveaways.createGiveaway(message.channel, prize, duration, winners, message.author);
            
            if (result.success) {
                await activity.logActivity('GIVEAWAY_CREATE', message.author, `Prize: ${prize}, Duration: ${duration}s`);
                return MessageHelper.sendAndDelete(message, `✅ Giveaway started! Ends in ${duration}s`, 10000);
            }
            
            return MessageHelper.sendAndDelete(message, "âŒ Failed to create giveaway", 30000);
        }
    },
    
    fivem: {
        description: "Check FiveM server status",
        permission: 0,
        execute: async (message) => {
            const status = fivem.getServerStatus();
            
            const embed = {
                color: status.online ? 0x00FF00 : 0xFF0000,
                title: "🎮 FiveM Server Status",
                fields: [
                    { name: "Status", value: status.online ? "🟢 Online" : "🔴 Offline", inline: true },
                    { name: "Players", value: `${status.players}/${status.maxPlayers}`, inline: true },
                    { name: "Server Name", value: status.name, inline: false },
                    { name: "Gamemode", value: status.gamemode, inline: true }
                ],
                footer: { text: "FiveM Server Monitor" },
                timestamp: new Date()
            };
            
            return MessageHelper.sendAndDelete(message, embed, 60000, true);
        }
    },
    
    whitelist: {
        description: "Submit whitelist application",
        permission: 0,
        execute: async (message, args) => {
            const steamId = args[0];
            
            if (!steamId) {
                return MessageHelper.sendAndDelete(message, 
                    "âŒ Usage: `!whitelist <steam_id_64>`\nExample: `!whitelist 76561198012345678`", 
                    30000
                );
            }
            
            if (steamId.length !== 17 || !steamId.match(/^[0-9]+$/)) {
                return MessageHelper.sendAndDelete(message, "âŒ Invalid Steam ID (must be 17 digits)", 30000);
            }
            
            const result = await fivem.submitWhitelistApp(message.author.id, message.author.tag, steamId);
            
            if (result.success) {
                const whitelistChannel = message.guild.channels.cache.find(ch => 
                    ch.name.includes('whitelist') || ch.name.includes('applications')
                );
                
                if (whitelistChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(`✅ Whitelist Application: ${result.appId}`)
                        .setDescription(`**User:** ${message.author}\n**Steam ID:** ${steamId}`)
                        .addFields(
                            { name: 'Status', value: '🟡 Pending Review', inline: true },
                            { name: 'App ID', value: result.appId, inline: true }
                        )
                        .setTimestamp();
                    
                    const buttons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`approve_wl_${result.appId}`)
                                .setLabel('Approve')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('✅'),
                            new ButtonBuilder()
                                .setCustomId(`deny_wl_${result.appId}`)
                                .setLabel('Deny')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('âŒ')
                        );
                    
                    await whitelistChannel.send({ embeds: [embed], components: [buttons] });
                }
                
                await activity.logActivity('WHITELIST_APP', message.author, `Steam ID: ${steamId}`);
                
                return MessageHelper.sendAndDelete(message, 
                    `✅ Whitelist application submitted!\n**ID:** ${result.appId}\n**Steam:** ${steamId}\n\nWait for admin review.`, 
                    60000
                );
            }
            
            return MessageHelper.sendAndDelete(message, "âŒ Failed to submit application", 30000);
        }
    },
    
    report: {
        description: "Report a user to moderators",
        permission: 0,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            
            if (!user) {
                return MessageHelper.sendAndDelete(message, 
                    "âŒ Usage: `!report @user reason`\nExample: `!report @BadUser Spamming chat`", 
                    30000
                );
            }
            
            const reason = args.slice(1).join(" ");
            if (!reason) {
                return MessageHelper.sendAndDelete(message, "âŒ Please provide a reason for the report", 30000);
            }
            
            const reportChannel = message.guild.channels.cache.find(ch => 
                ch.name.includes('report') || ch.name.includes('mod-log')
            );
            
            if (!reportChannel) {
                return MessageHelper.sendAndDelete(message, "âŒ No report channel found", 30000);
            }
            
            const result = await reports.createReport(message.author, user, reason, reportChannel);
            
            if (result.success) {
                await activity.logActivity('REPORT', message.author, `Reported ${user.tag}: ${reason}`);
                return MessageHelper.sendAndDelete(message, 
                    `✅ Report submitted!\n**ID:** ${result.reportId}\n**User:** ${user}\n**Reason:** ${reason}\n\nModerators will review soon.`, 
                    60000
                );
            }
            
            return MessageHelper.sendAndDelete(message, "âŒ Failed to create report", 30000);
        }
    },
    
    slowmode: {
        description: "Set channel slowmode",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message, args) => {
            const seconds = parseInt(args[0]);
            
            if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
                return MessageHelper.sendAndDelete(message, 
                    "âŒ Usage: `!slowmode <0-21600>`\nExample: `!slowmode 10` (10 seconds)\n`!slowmode 0` (disable)", 
                    30000
                );
            }
            
            try {
                await message.channel.setRateLimitPerUser(seconds);
                
                await activity.logActivity('SLOWMODE', message.author, `Set to ${seconds}s in ${message.channel.name}`);
                
                MessageHelper.log(message.guild, {
                    action: "SLOWMODE",
                    moderator: message.author.tag,
                    channel: message.channel.name,
                    duration: `${seconds}s`
                });
                
                return MessageHelper.sendAndDelete(message, 
                    seconds === 0 ? "⚡ Slowmode disabled" : `â±️ Slowmode set to ${seconds} seconds`, 
                    30000
                );
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Failed: ${error.message}`, 30000);
            }
        }
    },

    balance: {
        description: "Check your balance",
        permission: 0,
        execute: async (message) => {
            const balance = await economy.getBalance(message.author.id, message.author.username);
            return MessageHelper.sendAndDelete(message, `💰 **Balance:** $${balance}`, 30000);
        }
    },

    pay: {
        description: "Pay another user",
        permission: 0,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            const amount = parseInt(args[1], 10);
            if (!user || isNaN(amount)) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!pay @user 100`", 30000);
            }
            const result = await economy.pay(message.author.id, user.id, amount);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `✅ Sent $${amount} to ${user.tag}`, 30000);
        }
    },

    daily: {
        description: "Claim daily reward",
        permission: 0,
        execute: async (message) => {
            const result = await economy.daily(message.author.id);
            if (!result.success) {
                return MessageHelper.sendAndDelete(message, `â³ Daily already claimed. Try again later.`, 30000);
            }
            return MessageHelper.sendAndDelete(message, `✅ You claimed $${result.amount}. New balance: $${result.balance}`, 30000);
        }
    },

    work: {
        description: "Work for money",
        permission: 0,
        execute: async (message) => {
            const result = await economy.work(message.author.id);
            if (!result.success) {
                return MessageHelper.sendAndDelete(message, `â³ You already worked recently.`, 30000);
            }
            return MessageHelper.sendAndDelete(message, `✅ You earned $${result.amount}. New balance: $${result.balance}`, 30000);
        }
    },

    shop: {
        description: "View shop items",
        permission: 0,
        execute: async (message) => {
            const items = economy.getItems();
            const text = items.map(i => `**${i.id}** - ${i.name} ($${i.price})`).join("\n");
            return MessageHelper.sendAndDelete(message, `🛒 **Shop Items:**\n${text}`, 60000);
        }
    },

    buy: {
        description: "Buy an item",
        permission: 0,
        execute: async (message, args) => {
            const itemId = args[0];
            if (!itemId) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!buy <itemId>`", 30000);
            const result = await economy.buyItem(message.author.id, itemId);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `✅ Purchased ${result.item.name}. Balance: $${result.balance}`, 30000);
        }
    },

    slots: {
        description: "Play slots",
        permission: 0,
        execute: async (message, args) => {
            const bet = parseInt(args[0], 10);
            if (isNaN(bet)) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!slots 100`", 30000);
            const result = await economy.gambleSlots(message.author.id, bet);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `🎰 ${result.result.join(' ')} | Won: $${result.winnings} | Balance: $${result.balance}`, 30000);
        }
    },

    dice: {
        description: "Roll dice",
        permission: 0,
        execute: async (message, args) => {
            const bet = parseInt(args[0], 10);
            if (isNaN(bet)) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!dice 100`", 30000);
            const result = await economy.gambleDice(message.author.id, bet);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `🎲 Rolled ${result.roll} | ${result.win ? 'Won' : 'Lost'} | Balance: $${result.balance}`, 30000);
        }
    },

    roulette: {
        description: "Play roulette",
        permission: 0,
        execute: async (message, args) => {
            const bet = parseInt(args[0], 10);
            const color = (args[1] || '').toLowerCase();
            if (isNaN(bet) || !['red', 'black'].includes(color)) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!roulette 100 red|black`", 30000);
            }
            const result = await economy.gambleRoulette(message.author.id, bet, color);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `🎡 Result: ${result.result} | ${result.win ? 'Won' : 'Lost'} | Balance: $${result.balance}`, 30000);
        }
    },

    blackjack: {
        description: "Play blackjack",
        permission: 0,
        execute: async (message, args) => {
            const bet = parseInt(args[0], 10);
            if (isNaN(bet)) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!blackjack 100`", 30000);
            const result = await economy.gambleBlackjack(message.author.id, bet);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `🃏 You: ${result.player} | Dealer: ${result.dealer} | ${result.win ? 'Won' : 'Lost'} | Balance: $${result.balance}`, 30000);
        }
    },

    profile: {
        description: "Show your profile",
        permission: 0,
        execute: async (message) => {
              const targetUser = message.mentions.users.first() || message.author;
              try {
                  const userDoc = await economy.getUser(targetUser.id, targetUser.username);
                  const level = await leveling.getLevel(targetUser.id);
                  const balance = await economy.getBalance(targetUser.id, targetUser.username);
                  
                  // Calculate rank (simplified - top 100)
                  const leaderboard = await leveling.getLeaderboard();
                  const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1 || '—';
                  
                  const embed = {
                      color: 0x5865F2,
                      title: `👤 ${targetUser.username}'s Profile`,
                      thumbnail: { url: targetUser.displayAvatarURL() },
                      fields: [
                          { name: "💰 Balance", value: `$${balance}`, inline: true },
                          { name: "⚡ Level", value: level.level.toString(), inline: true },
                          { name: "🏆 Rank", value: rank.toString(), inline: true },
                          { name: "✨ XP", value: `${level.xp}/${level.xp + 100}`, inline: true },
                          { name: "📊 Total Messages", value: userDoc.totalMessages.toString(), inline: true },
                          { name: "🎖️ Badges", value: userDoc.badges.length > 0 ? userDoc.badges.join(", ") : "None yet", inline: false },
                          { name: "🌟 Achievements", value: userDoc.achievements.length > 0 ? userDoc.achievements.join(", ") : "None yet", inline: false }
                      ],
                      footer: { text: `User ID: ${targetUser.id}` },
                      timestamp: new Date()
                  };
                  return MessageHelper.sendAndDelete(message, embed, 60000, true);
              } catch (error) {
                  return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
              }
          }
      },

      achievements: {
          description: "Show achievements",
          permission: 0,
        execute: async (message) => {
            const unlocked = await achievements.checkAchievements(message.author.id);
            const text = unlocked.length > 0 ? unlocked.join(', ') : 'No new achievements yet.';
            return MessageHelper.sendAndDelete(message, `🏆 Achievements: ${text}`, 60000);
        }
    },

    setcommand: {
        description: "Create a custom command",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const trigger = args.shift();
            const response = args.join(' ');
            if (!trigger || !response) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setcommand hello Hello {{user}}`", 30000);
            await customCommands.setCommand(message.guild.id, trigger.toLowerCase(), response, message.author.id);
            return MessageHelper.sendAndDelete(message, `✅ Custom command set: ${trigger}`, 30000);
        }
    },

    delcommand: {
        description: "Delete a custom command",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const trigger = args[0];
            if (!trigger) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!delcommand <name>`", 30000);
            const ok = await customCommands.deleteCommand(message.guild.id, trigger.toLowerCase());
            return MessageHelper.sendAndDelete(message, ok ? `✅ Deleted ${trigger}` : `âŒ Command not found`, 30000);
        }
    },

    customcommands: {
        description: "List custom commands",
        permission: 0,
        execute: async (message) => {
            const list = await customCommands.listCommands(message.guild.id);
            const text = list.length ? list.map(c => c.trigger).join(', ') : 'None';
            return MessageHelper.sendAndDelete(message, `📜 Custom Commands: ${text}`, 60000);
        }
    },

    commands: {
        description: "List all commands",
        permission: 0,
        execute: async (message) => {
            const config = await guildConfig.getConfig(message.guild.id);
            const lang = config.language || 'en';
            const categories = {
                Owner: [],
                Admin: [],
                Moderator: [],
                'Trial Mod': [],
                User: []
            };

            for (const [name, cmd] of Object.entries(moderationCommands)) {
                const level = cmd.permission ?? 0;
                const label = `${CONFIG.PREFIX}${name} - ${cmd.description || ''}`.trim();
                if (level >= CONFIG.PERMISSION_LEVELS.OWNER) categories.Owner.push(label);
                else if (level >= CONFIG.PERMISSION_LEVELS.ADMIN) categories.Admin.push(label);
                else if (level >= CONFIG.PERMISSION_LEVELS.MODERATOR) categories.Moderator.push(label);
                else if (level >= CONFIG.PERMISSION_LEVELS.TRIAL_MOD) categories['Trial Mod'].push(label);
                else categories.User.push(label);
            }

            const embed = {
                color: 0x5865F2,
                title: t(lang, 'commands_title'),
                description: t(lang, 'commands_desc', { prefix: CONFIG.PREFIX }),
                fields: []
            };

            for (const [category, cmds] of Object.entries(categories)) {
                if (cmds.length === 0) continue;
                embed.fields.push({
                    name: category,
                    value: cmds.join('\n').substring(0, 1024)
                });
            }

            return MessageHelper.sendAndDelete(message, embed, 120000, true);
        }
    },

    setwelcome: {
        description: "Set welcome channel/message",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const channel = message.mentions.channels.first();
            const msg = args.slice(1).join(' ') || 'Welcome {{user}} to {{server}}!';
            if (!channel) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setwelcome #channel Welcome {{user}}`", 30000);
            await guildConfig.setWelcome(message.guild.id, channel.id, msg);
            return MessageHelper.sendAndDelete(message, `✅ Welcome message set for ${channel}`, 30000);
        }
    },

    setgoodbye: {
        description: "Set goodbye channel/message",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const channel = message.mentions.channels.first();
            const msg = args.slice(1).join(' ') || 'Goodbye {{user}}!';
            if (!channel) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setgoodbye #channel Goodbye {{user}}`", 30000);
            await guildConfig.setGoodbye(message.guild.id, channel.id, msg);
            return MessageHelper.sendAndDelete(message, `✅ Goodbye message set for ${channel}`, 30000);
        }
    },

    setautorole: {
        description: "Set autorole(s)",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            const roles = message.mentions.roles.map(r => r.id);
            if (roles.length === 0) return MessageHelper.sendAndDelete(message, "âŒ Mention roles: `!setautorole @Member @Citizen`", 30000);
            await guildConfig.setAutorole(message.guild.id, roles);
            return MessageHelper.sendAndDelete(message, "✅ Autoroles updated.", 30000);
        }
    },

    setverify: {
        description: "Set verification role",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            const role = message.mentions.roles.first();
            if (!role) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setverify @Verified`", 30000);
            await guildConfig.setVerificationRole(message.guild.id, role.id);
            return MessageHelper.sendAndDelete(message, `✅ Verification role set to ${role.name}`, 30000);
        }
    },

    verify: {
        description: "Verify yourself",
        permission: 0,
        execute: async (message) => {
            const config = await guildConfig.getConfig(message.guild.id);
            if (!config.verificationRoleId) return MessageHelper.sendAndDelete(message, "âŒ Verification not configured", 30000);
            await message.member.roles.add(config.verificationRoleId).catch(() => {});
            return MessageHelper.sendAndDelete(message, "✅ You are verified.", 30000);
        }
    },

    reactionrole: {
        description: "Add a reaction role",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const messageId = args[0];
            const emoji = args[1];
            const role = message.mentions.roles.first();
            if (!messageId || !emoji || !role) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!reactionrole <messageId> <emoji> @Role`", 30000);
            await guildConfig.addReactionRole(message.guild.id, messageId, emoji, role.id);
            const targetMessage = await message.channel.messages.fetch(messageId).catch(() => null);
            if (targetMessage) await targetMessage.react(emoji).catch(() => {});
            return MessageHelper.sendAndDelete(message, "✅ Reaction role added.", 30000);
        }
    },

    setadschannel: {
        description: "Set ads channel",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            const channel = message.mentions.channels.first();
            if (!channel) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setadschannel #ads`", 30000);
            await guildConfig.setAdsChannel(message.guild.id, channel.id);
            return MessageHelper.sendAndDelete(message, `✅ Ads channel set to ${channel}`, 30000);
        }
    },

    whitelistmode: {
        description: "Toggle whitelist mode",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const state = (args[0] || '').toLowerCase();
            const enabled = state === 'on' || state === 'true';
            await guildConfig.setWhitelistMode(message.guild.id, enabled);
            return MessageHelper.sendAndDelete(message, `✅ Whitelist mode ${enabled ? 'enabled' : 'disabled'}`, 30000);
        }
    },

    raidmode: {
        description: "Toggle raid mode",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const state = (args[0] || '').toLowerCase();
            const enabled = state === 'on' || state === 'true';
            await guildConfig.setRaidMode(message.guild.id, enabled);
            return MessageHelper.sendAndDelete(message, `✅ Raid mode ${enabled ? 'enabled' : 'disabled'}`, 30000);
        }
    },

    lockdown: {
        description: "Lock all channels",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            message.guild.channels.cache.forEach(channel => {
                if (channel.isTextBased()) {
                    channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => {});
                }
            });
            return MessageHelper.sendAndDelete(message, "🔒 Server locked down.", 30000);
        }
    },

    announce: {
        description: "Send an announcement",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const channel = message.mentions.channels.first();
            const msg = args.slice(1).join(' ');
            if (!channel || !msg) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!announce #channel message`", 30000);
            await channel.send(msg);
            return MessageHelper.sendAndDelete(message, "✅ Announcement sent.", 30000);
        }
    },

    appeal: {
        description: "Submit an appeal",
        permission: 0,
        execute: async (message, args) => {
            const type = (args[0] || 'ban').toLowerCase();
            const reason = args.slice(1).join(' ');
            if (!reason) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!appeal ban reason`", 30000);
            const result = await appeals.createAppeal(message.guild.id, message.author.id, type, reason);
            return MessageHelper.sendAndDelete(message, `✅ Appeal submitted (ID: ${result.appealId})`, 30000);
        }
    },

    reviewappeal: {
        description: "Review an appeal",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const appealId = args[0];
            const decision = (args[1] || '').toLowerCase();
            if (!appealId || !['approved', 'denied'].includes(decision)) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!reviewappeal APPEAL-1 approved|denied`", 30000);
            }
            const result = await appeals.reviewAppeal(appealId, decision, message.author.tag);
            if (!result.success) return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
            return MessageHelper.sendAndDelete(message, `✅ Appeal ${appealId} ${decision}`, 30000);
        }
    },

    apply: {
        description: "Submit an application",
        permission: 0,
        execute: async (message, args) => {
            const type = (args[0] || 'staff').toLowerCase();
            const content = args.slice(1).join(' ');
            if (!content) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!apply staff your application`", 30000);
            const result = await applications.submitApplication(message.guild.id, message.author.id, type, content);
            return MessageHelper.sendAndDelete(message, `✅ Application submitted (ID: ${result.appId})`, 30000);
        }
    },

    note: {
        description: "Add a moderation note",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message, args) => {
            const user = message.mentions.users.first();
            const noteText = args.slice(1).join(' ');
            if (!user || !noteText) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!note @user reason`", 30000);
            await notes.addNote(message.guild.id, user.id, message.author.id, noteText);
            return MessageHelper.sendAndDelete(message, `✅ Note added for ${user.tag}`, 30000);
        }
    },

    notes: {
        description: "View moderation notes",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message) => {
            const user = message.mentions.users.first();
            if (!user) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!notes @user`", 30000);
            const list = await notes.listNotes(message.guild.id, user.id, 5);
            const text = list.length
                ? list.map(n => `• ${n.note} (by ${n.moderatorId})`).join('\n')
                : 'No notes found.';
            return MessageHelper.sendAndDelete(message, `📝 Notes for ${user.tag}:\n${text}`, 60000);
        }
    },

    activity: {
        description: "Show most active members",
        permission: 0,
        execute: async (message) => {
            const top = await activity.getMostActive(10);
            const text = top.map(u => `**${u.rank}.** ${u.username} - ${u.messages} msgs`).join('\n');
            return MessageHelper.sendAndDelete(message, `📈 Most Active:\n${text}`, 60000);
        }
    },

    cmdstats: {
        description: "Command usage stats",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            const stats = Array.from(global.commandUsage.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([cmd, count]) => `${cmd}: ${count}`)
                .join('\n') || 'No data.';
            return MessageHelper.sendAndDelete(message, `📊 Command Usage:\n${stats}`, 60000);
        }
    },

    setautomessage: {
        description: "Set auto message",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const channel = message.mentions.channels.first();
            const interval = parseInt(args[1], 10);
            const msg = args.slice(2).join(' ');
            if (!channel || isNaN(interval) || !msg) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!setautomessage #channel 60 Message`", 30000);
            }
            await guildConfig.setAutoMessage(message.guild.id, channel.id, msg, interval);
            return MessageHelper.sendAndDelete(message, "✅ Auto message configured.", 30000);
        }
    },

    setlang: {
        description: "Set bot language (en/es/fr)",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const lang = (args[0] || '').toLowerCase();
            const allowed = Object.keys(I18N);
            if (!allowed.includes(lang)) {
                return MessageHelper.sendAndDelete(message, t('en', 'lang_invalid', { langs: allowed.join(', ') }), 30000);
            }
            await guildConfig.setLanguage(message.guild.id, lang);
            return MessageHelper.sendAndDelete(message, t(lang, 'lang_set', { lang }), 30000);
        }
    },

    lang: {
        description: "Show current bot language",
        permission: 0,
        execute: async (message) => {
            const config = await guildConfig.getConfig(message.guild.id);
            const lang = config.language || 'en';
            return MessageHelper.sendAndDelete(message, t(lang, 'lang_current', { lang }), 30000);
        }
    },

    notify: {
        description: "Send update notification",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const role = message.mentions.roles.first();
            const msg = args.slice(1).join(' ');
            if (!role || !msg) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!notify @Role message`", 30000);
            await message.channel.send(`${role} ${msg}`);
            return MessageHelper.sendAndDelete(message, "✅ Notification sent.", 30000);
        }
    },

    notifyadd: {
        description: "Add a feed notification (rss/youtube/twitch/twitter)",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const channel = message.mentions.channels.first() || message.channel;
            const cleaned = args.filter(a => !a.startsWith('<#'));
            const type = (cleaned[0] || 'rss').toLowerCase();
            const url = cleaned[1];
            if (!url) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!notifyadd youtube <rss_url> #channel`", 30000);
            }
            const result = await notifications.addSubscription(message.guild.id, channel.id, type, url);
            return MessageHelper.sendAndDelete(message, `✅ Added feed (${type}). ID: ${result.subscription._id}`, 30000);
        }
    },

    notifyremove: {
        description: "Remove a feed notification by ID",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message, args) => {
            const id = args[0];
            if (!id) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!notifyremove <id>`", 30000);
            const result = await notifications.removeSubscription(message.guild.id, id);
            return MessageHelper.sendAndDelete(message, result.success ? "✅ Removed subscription" : "âŒ Not found", 30000);
        }
    },

    notifylist: {
        description: "List feed notifications",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            const list = await notifications.listSubscriptions(message.guild.id);
            if (!list.length) return MessageHelper.sendAndDelete(message, "📭 No subscriptions", 30000);
            const text = list
                .map(sub => `${sub._id} • ${sub.type} • ${sub.url}`)
                .join('\n')
                .substring(0, 1900);
            return MessageHelper.sendAndDelete(message, `📡 Subscriptions:\n${text}`, 60000);
        }
    },

    notifytest: {
        description: "Force notification poll",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            await notifications.pollSubscriptions(client);
            return MessageHelper.sendAndDelete(message, "✅ Notification poll complete", 30000);
        }
    },

    music: {
        description: "Show music commands",
        permission: 0,
        execute: async (message) => {
            const embed = {
                color: 0x1DB954,
                title: "🎵 MUSIC COMMANDS",
                description: "Control music playback in voice channels",
                fields: [
                    { name: `${CONFIG.PREFIX}play <url or search>`, value: "Play a song from YouTube", inline: false },
                    { name: `${CONFIG.PREFIX}skip`, value: "Skip current track", inline: true },
                    { name: `${CONFIG.PREFIX}stop`, value: "Stop music & clear queue", inline: true },
                    { name: `${CONFIG.PREFIX}pause`, value: "Pause playback", inline: true },
                    { name: `${CONFIG.PREFIX}resume`, value: "Resume playback", inline: true },
                    { name: `${CONFIG.PREFIX}queue`, value: "Show upcoming tracks", inline: true },
                    { name: `${CONFIG.PREFIX}nowplaying`, value: "Show current track", inline: true }
                ],
                footer: { text: "Join a voice channel before using music commands" },
                timestamp: new Date()
            };
            const msg = await message.channel.send({ embeds: [embed] });
            await msg.pin().catch(() => {});
            return msg;
        }
    },

    play: {
        description: "Play music (URL or search)",
        permission: 0,
        execute: async (message, args) => {
            const voice = message.member.voice.channel;
            if (!voice) return MessageHelper.sendAndDelete(message, "âŒ Join a voice channel first", 30000);
            
            const permissions = voice.permissionsFor(message.guild.members.me);
            if (!permissions.has('Connect')) {
                return MessageHelper.sendAndDelete(message, "âŒ I don't have permission to join your voice channel", 30000);
            }
            if (!permissions.has('Speak')) {
                return MessageHelper.sendAndDelete(message, "âŒ I don't have permission to speak in your voice channel", 30000);
            }
            
            const query = args.join(' ');
            if (!query) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!play <url or search>`\nExample: `!play never gonna give you up`", 30000);
            
            const loadMsg = await message.channel.send("🔍 Searching...");
            
            try {
                const result = await music.enqueue(message.guild, voice, message.channel, query, message.author.tag);
                await loadMsg.delete().catch(() => {});
                
                if (!result.success) {
                    console.error(`[MUSIC] Failed to play: ${result.error}`);
                    return MessageHelper.sendAndDelete(message, `âŒ ${result.error}`, 30000);
                }
                
                console.log(`[MUSIC] Queued: ${result.track.title}`);
                return MessageHelper.sendAndDelete(message, `🎵 Queued: **${result.track.title}**\nRequested by ${message.author}`, 30000);
            } catch (error) {
                await loadMsg.delete().catch(() => {});
                console.error('[MUSIC] Play command error:', error);
                return MessageHelper.sendAndDelete(message, `âŒ ${error.message || 'Failed to play music. Check console for details.'}`, 30000);
            }
        }
    },

    skip: {
        description: "Skip current track",
        permission: 0,
        execute: async (message) => {
            const ok = music.skip(message.guild.id);
            return MessageHelper.sendAndDelete(message, ok ? "â­️ Skipped" : "âŒ Nothing to skip", 30000);
        }
    },

    stop: {
        description: "Stop music and clear queue",
        permission: 0,
        execute: async (message) => {
            const ok = music.stop(message.guild.id);
            return MessageHelper.sendAndDelete(message, ok ? "⏹️ Stopped" : "âŒ Nothing playing", 30000);
        }
    },

    pause: {
        description: "Pause music",
        permission: 0,
        execute: async (message) => {
            const ok = music.pause(message.guild.id);
            return MessageHelper.sendAndDelete(message, ok ? "â¸️ Paused" : "âŒ Nothing playing", 30000);
        }
    },

    resume: {
        description: "Resume music",
        permission: 0,
        execute: async (message) => {
            const ok = music.resume(message.guild.id);
            return MessageHelper.sendAndDelete(message, ok ? "▶️ Resumed" : "âŒ Nothing paused", 30000);
        }
    },

    queue: {
        description: "Show music queue",
        permission: 0,
        execute: async (message) => {
            const summary = music.getQueueSummary(message.guild.id);
            if (!summary) return MessageHelper.sendAndDelete(message, "📭 Queue is empty", 30000);
            const now = summary.current ? `Now: **${summary.current.title}**` : 'Now: None';
            const upcoming = summary.upcoming.length
                ? summary.upcoming.map((t, i) => `${i + 1}. ${t.title}`).join('\n')
                : 'No upcoming tracks.';
            return MessageHelper.sendAndDelete(message, `${now}\n${upcoming}`.substring(0, 1900), 60000);
        }
    },

    nowplaying: {
        description: "Show current track",
        permission: 0,
        execute: async (message) => {
            const summary = music.getQueueSummary(message.guild.id);
            if (!summary || !summary.current) return MessageHelper.sendAndDelete(message, "🎧 Nothing playing", 30000);
            return MessageHelper.sendAndDelete(message, `🎧 Now playing: **${summary.current.title}**`, 30000);
        }
    },

    trivia: {
        description: "Trivia game",
        permission: 0,
        execute: async (message, args) => {
            const triviaBank = [
                { q: 'What year was Discord released?', a: '2015' },
                { q: 'What is the capital of France?', a: 'paris' },
                { q: 'How many bits are in a byte?', a: '8' },
                { q: 'Which planet is known as the Red Planet?', a: 'mars' },
                { q: 'Who created JavaScript?', a: 'brendan eich' }
            ];

            const current = global.triviaSessions.get(message.author.id);
            if (!args.length) {
                const pick = triviaBank[Math.floor(Math.random() * triviaBank.length)];
                global.triviaSessions.set(message.author.id, { answer: pick.a.toLowerCase(), startedAt: Date.now() });
                return MessageHelper.sendAndDelete(message, `🧠 Trivia: ${pick.q}\nReply with \`!trivia <answer>\``, 60000);
            }

            if (!current) return MessageHelper.sendAndDelete(message, "âŒ Start a trivia with `!trivia` first", 30000);
            const answer = args.join(' ').toLowerCase();
            const ok = answer === current.answer;
            global.triviaSessions.delete(message.author.id);
            return MessageHelper.sendAndDelete(message, ok ? "✅ Correct!" : `âŒ Wrong. Answer: **${current.answer}**`, 30000);
        }
    },

    hangman: {
        description: "Play hangman",
        permission: 0,
        execute: async (message, args) => {
            const action = (args[0] || 'start').toLowerCase();
            const words = ['fivem', 'discord', 'moderation', 'economy', 'giveaway', 'whitelist'];

            if (action === 'start') {
                const word = words[Math.floor(Math.random() * words.length)];
                const masked = word.replace(/./g, '_');
                global.hangmanGames.set(message.guild.id, {
                    word,
                    masked,
                    guesses: [],
                    lives: 6
                });
                return MessageHelper.sendAndDelete(message, `🪢 Hangman started: ${masked}\nGuess with \`!hangman guess <letter>\``, 60000);
            }

            if (action === 'guess') {
                const game = global.hangmanGames.get(message.guild.id);
                if (!game) return MessageHelper.sendAndDelete(message, "âŒ Start a game with `!hangman start`", 30000);
                const guess = (args[1] || '').toLowerCase();
                if (!guess) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!hangman guess <letter|word>`", 30000);

                if (guess.length > 1) {
                    if (guess === game.word) {
                        global.hangmanGames.delete(message.guild.id);
                        return MessageHelper.sendAndDelete(message, `✅ You solved it! Word: **${game.word}**`, 30000);
                    }
                    game.lives--;
                } else {
                    if (!game.guesses.includes(guess)) game.guesses.push(guess);
                    let newMasked = '';
                    for (const ch of game.word) {
                        newMasked += game.guesses.includes(ch) ? ch : '_';
                    }
                    game.masked = newMasked;
                    if (!game.word.includes(guess)) game.lives--;
                }

                if (game.lives <= 0) {
                    global.hangmanGames.delete(message.guild.id);
                    return MessageHelper.sendAndDelete(message, `💀 Game over. Word: **${game.word}**`, 30000);
                }

                if (game.masked === game.word) {
                    global.hangmanGames.delete(message.guild.id);
                    return MessageHelper.sendAndDelete(message, `✅ You solved it! Word: **${game.word}**`, 30000);
                }

                return MessageHelper.sendAndDelete(message, `🪢 ${game.masked} | Lives: ${game.lives}`, 30000);
            }

            return MessageHelper.sendAndDelete(message, "âŒ Usage: `!hangman start` or `!hangman guess <letter>`", 30000);
        }
    },

    retention: {
        description: "Show retention stats",
        permission: CONFIG.PERMISSION_LEVELS.ADMIN,
        execute: async (message) => {
            const stats = await activity.getRetentionStats(message.guild.id);
            const daily = stats.dailyCounts.map(d => `${d.date}: ${d.count}`).join('\n');
            const embed = {
                color: 0x00B0F4,
                title: "📊 Retention Analytics",
                fields: [
                    { name: "DAU", value: stats.dau.toString(), inline: true },
                    { name: "WAU", value: stats.wau.toString(), inline: true },
                    { name: "MAU", value: stats.mau.toString(), inline: true },
                    { name: "7d Retention", value: `${stats.retentionRate}%`, inline: true },
                    { name: "Last 7 Days", value: daily.substring(0, 1024) }
                ]
            };
            return MessageHelper.sendAndDelete(message, embed, 60000, true);
        }
    },

    rps: {
        description: "Rock Paper Scissors",
        permission: 0,
        execute: async (message, args) => {
            const choice = (args[0] || '').toLowerCase();
            const options = ['rock', 'paper', 'scissors'];
            if (!options.includes(choice)) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!rps rock|paper|scissors`", 30000);
            const botChoice = options[Math.floor(Math.random() * options.length)];
            const win = (choice === 'rock' && botChoice === 'scissors') || (choice === 'paper' && botChoice === 'rock') || (choice === 'scissors' && botChoice === 'paper');
            const result = choice === botChoice ? 'Draw' : (win ? 'You win!' : 'You lose!');
            return MessageHelper.sendAndDelete(message, `🤖 I chose **${botChoice}**. ${result}`, 30000);
        }
    },

    guess: {
        description: "Guess the number",
        permission: 0,
        execute: async (message, args) => {
            const guess = parseInt(args[0], 10);
            if (isNaN(guess)) return MessageHelper.sendAndDelete(message, "âŒ Usage: `!guess 1-10`", 30000);
            const num = Math.floor(Math.random() * 10) + 1;
            return MessageHelper.sendAndDelete(message, guess === num ? `🎯 Correct! It was ${num}` : `âŒ Wrong. It was ${num}`, 30000);
        }
    },

    scriptadd: {
        description: "Add a script to showcase",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message, args) => {
            // !scriptadd <name> | <description> | <category> | <link>
            const input = args.join(' ');
            const parts = input.split('|').map(p => p.trim());
            
            if (parts.length < 4) {
                return MessageHelper.sendAndDelete(message, 
                    "âŒ Usage: `!scriptadd <name> | <description> | <category> | <link>`\n" +
                    "**Categories:** Vehicle, Job, Housing, Map, UI, Weapon, Util, Other\n" +
                    "**Example:** `!scriptadd Car Dealership | Buy and sell vehicles | Vehicle | https://github.com/user/script`", 
                    60000
                );
            }

            const [name, description, category, downloadLink] = parts;
            const scriptId = `${message.guild.id}-${Date.now()}`;

            try {
                const script = new ScriptModel({
                    guildId: message.guild.id,
                    scriptId,
                    name,
                    description,
                    category,
                    downloadLink,
                    author: message.author.tag,
                    authorId: message.author.id,
                    version: '1.0.0',
                    price: 0,
                    tags: category.toLowerCase().split(/\s+/)
                });

                await script.save();

                const embed = {
                    color: 0x10B981,
                    title: "✅ Script Added to Showcase",
                    fields: [
                        { name: "📦 Name", value: name, inline: true },
                        { name: "🗂️ Category", value: category, inline: true },
                        { name: "🆔 Script ID", value: scriptId, inline: true },
                        { name: "📝 Description", value: description },
                        { name: "🔗 Download", value: downloadLink },
                        { name: "👤 Author", value: message.author.tag }
                    ],
                    footer: { text: "TZ PRO Script Showcase" },
                    timestamp: new Date()
                };

                return MessageHelper.sendAndDelete(message, embed, 60000, true);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error adding script: ${error.message}`, 30000);
            }
        }
    },

    scriptlist: {
        description: "List all scripts in showcase",
        permission: 0,
        execute: async (message, args) => {
            const category = args[0] ? args[0].toLowerCase() : null;

            try {
                const query = category 
                    ? { guildId: message.guild.id, category: new RegExp(category, 'i') }
                    : { guildId: message.guild.id };

                const scripts = await ScriptModel.find(query).sort({ createdAt: -1 }).limit(10);

                if (scripts.length === 0) {
                    return MessageHelper.sendAndDelete(message, 
                        `📦 No scripts found${category ? ` in category: ${category}` : ''}`, 
                        30000
                    );
                }

                const scriptList = scripts.map((s, i) => 
                    `**${i + 1}. ${s.name}** (${s.category})\n` +
                    `   📝 ${s.description.substring(0, 60)}...\n` +
                    `   👤 By ${s.author} | ⬇️ ${s.downloads} downloads | ⭐ ${s.rating}/5\n` +
                    `   🆔 \`${s.scriptId}\``
                ).join('\n\n');

                const embed = {
                    color: 0x7C3AED,
                    title: `📦 Script Showcase${category ? ` - ${category}` : ''}`,
                    description: scriptList.substring(0, 1900),
                    fields: [{
                        name: "ℹ️ How to Download",
                        value: "Use `!scriptinfo <scriptID>` to view download link and details"
                    }],
                    footer: { text: `Showing ${scripts.length} scripts | Use !scriptlist <category> to filter` }
                };

                return MessageHelper.sendAndDelete(message, embed, 120000, true);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },

    scriptinfo: {
        description: "View detailed script information",
        permission: 0,
        execute: async (message, args) => {
            const scriptId = args[0];

            if (!scriptId) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!scriptinfo <scriptID>`", 30000);
            }

            try {
                const script = await ScriptModel.findOne({ scriptId });

                if (!script) {
                    return MessageHelper.sendAndDelete(message, `âŒ Script not found with ID: ${scriptId}`, 30000);
                }

                // Increment download count
                script.downloads += 1;
                await script.save();

                const embed = {
                    color: 0x7C3AED,
                    title: `📦 ${script.name}`,
                    description: script.description,
                    fields: [
                        { name: "🗂️ Category", value: script.category, inline: true },
                        { name: "📌 Version", value: script.version, inline: true },
                        { name: "⭐ Rating", value: `${script.rating}/5`, inline: true },
                        { name: "⬇️ Downloads", value: script.downloads.toString(), inline: true },
                        { name: "💰 Price", value: script.price === 0 ? 'FREE' : `$${script.price}`, inline: true },
                        { name: "✅ Verified", value: script.verified ? 'Yes' : 'No', inline: true },
                        { name: "👤 Author", value: script.author },
                        { name: "🔗 Download Link", value: script.downloadLink },
                        { name: "🏷️ Tags", value: script.tags.join(', ') || 'None' }
                    ],
                    footer: { text: `Script ID: ${script.scriptId} | Added ${script.createdAt.toLocaleDateString()}` }
                };

                return MessageHelper.sendAndDelete(message, embed, 180000, true);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },

    scriptdelete: {
        description: "Delete a script from showcase (Owner/Mod)",
        permission: CONFIG.PERMISSION_LEVELS.MODERATOR,
        execute: async (message, args) => {
            const scriptId = args[0];

            if (!scriptId) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!scriptdelete <scriptID>`", 30000);
            }

            try {
                const script = await ScriptModel.findOne({ scriptId });

                if (!script) {
                    return MessageHelper.sendAndDelete(message, `âŒ Script not found`, 30000);
                }

                // Only allow author or moderator to delete
                const userLevel = PermissionSystem.getPermissionLevel(message.member);
                if (script.authorId !== message.author.id && userLevel < CONFIG.PERMISSION_LEVELS.MODERATOR) {
                    return MessageHelper.sendAndDelete(message, "âŒ You can only delete your own scripts", 30000);
                }

                await ScriptModel.deleteOne({ scriptId });

                return MessageHelper.sendAndDelete(message, `✅ Deleted script: **${script.name}**`, 30000);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    },

    scriptsearch: {
        description: "Search scripts by keyword",
        permission: 0,
        execute: async (message, args) => {
            const keyword = args.join(' ').toLowerCase();

            if (!keyword) {
                return MessageHelper.sendAndDelete(message, "âŒ Usage: `!scriptsearch <keyword>`", 30000);
            }

            try {
                const scripts = await ScriptModel.find({
                    guildId: message.guild.id,
                    $or: [
                        { name: new RegExp(keyword, 'i') },
                        { description: new RegExp(keyword, 'i') },
                        { tags: new RegExp(keyword, 'i') }
                    ]
                }).limit(10);

                if (scripts.length === 0) {
                    return MessageHelper.sendAndDelete(message, `📦 No scripts found for: **${keyword}**`, 30000);
                }

                const results = scripts.map((s, i) => 
                    `**${i + 1}. ${s.name}**\n   ${s.description.substring(0, 50)}...\n   🆔 \`${s.scriptId}\``
                ).join('\n\n');

                const embed = {
                    color: 0x7C3AED,
                    title: `🔍 Search Results: "${keyword}"`,
                    description: results.substring(0, 1900),
                    footer: { text: `Found ${scripts.length} scripts` }
                };

                return MessageHelper.sendAndDelete(message, embed, 120000, true);
            } catch (error) {
                return MessageHelper.sendAndDelete(message, `âŒ Error: ${error.message}`, 30000);
            }
        }
    }
};

class AutoModeration {
    constructor() {
        this.userMessageCache = new Map();
        this.joinTimestamps = [];
        this.warningCounts = new Map();
        this.raidLockChannels = new Map();
        this.raidUnlockTimer = null;

        // Periodic cleanup for inactive users
        setInterval(() => {
            const now = Date.now();
            for (const [userId, messages] of this.userMessageCache.entries()) {
                const last = messages[messages.length - 1];
                if (!last || now - last > CONFIG.AUTO_MOD.SPAM_TIMEFRAME * 2) {
                    this.userMessageCache.delete(userId);
                }
            }
        }, 60000);
    }
    
    checkSpam(message) {
        if (!CONFIG.AUTO_MOD.ANTI_SPAM) return false;
        
        const userId = message.author.id;
        const now = Date.now();
        
        if (!this.userMessageCache.has(userId)) {
            this.userMessageCache.set(userId, []);
        }
        
        const messages = this.userMessageCache.get(userId);
        messages.push(now);
        
        while (messages.length > 0 && now - messages[0] > CONFIG.AUTO_MOD.SPAM_TIMEFRAME) {
            messages.shift();
        }
        
        if (messages.length > CONFIG.AUTO_MOD.SPAM_THRESHOLD) {
            message.delete().catch(() => {});
            message.channel.send(`${message.author}, slow down! (Anti-spam)`)
                .then(m => setTimeout(() => m.delete(), 3000));
            
            MessageHelper.log(message.guild, {
                action: "AUTO_SPAM",
                target: message.author.tag,
                details: `${messages.length} messages in 5s`
            });
            
            this.userMessageCache.set(userId, []);
            return true;
        }
        
        return false;
    }
    
    checkRaid(member) {
        if (!CONFIG.AUTO_MOD.ANTI_RAID) return false;
        
        const now = Date.now();
        this.joinTimestamps.push(now);
        
        while (this.joinTimestamps.length > 0 && now - this.joinTimestamps[0] > 60000) {
            this.joinTimestamps.shift();
        }
        
        if (this.joinTimestamps.length > CONFIG.AUTO_MOD.RAID_THRESHOLD) {
            MessageHelper.log(member.guild, {
                action: "RAID_DETECTED",
                details: `${this.joinTimestamps.length} joins in 60s`
            });
            
            member.guild.channels.cache.forEach(channel => {
                if (channel.isTextBased()) {
                    const everyoneId = member.guild.roles.everyone.id;
                    const overwrite = channel.permissionOverwrites.cache.get(everyoneId);
                    let previous = null;
                    if (overwrite) {
                        if (overwrite.allow.has(PermissionsBitField.Flags.SendMessages)) previous = true;
                        else if (overwrite.deny.has(PermissionsBitField.Flags.SendMessages)) previous = false;
                        else previous = null;
                    }
                    this.raidLockChannels.set(channel.id, previous);

                    channel.permissionOverwrites.edit(member.guild.roles.everyone, {
                        SendMessages: false
                    }).catch(() => {});
                }
            });
            
            const adminChannel = member.guild.channels.cache.find(ch => 
                ch.name.includes('admin') || ch.name.includes('mod-log')
            );
            if (adminChannel) {
                adminChannel.send(`🚨 **RAID PROTECTION ACTIVATED**\n${this.joinTimestamps.length} joins in 60 seconds!\nServer locked down.`);
            }

            if (this.raidUnlockTimer) {
                clearTimeout(this.raidUnlockTimer);
            }

            this.raidUnlockTimer = setTimeout(() => {
                for (const [channelId, previous] of this.raidLockChannels.entries()) {
                    const channel = member.guild.channels.cache.get(channelId);
                    if (!channel || !channel.isTextBased()) continue;
                    const value = previous === true ? true : previous === false ? false : null;
                    channel.permissionOverwrites.edit(member.guild.roles.everyone, {
                        SendMessages: value
                    }).catch(() => {});
                }
                this.raidLockChannels.clear();
            }, CONFIG.AUTO_MOD.RAID_LOCK_DURATION);
            
            return true;
        }
        
        return false;
    }
    
    checkWordFilter(message) {
        if (!CONFIG.AUTO_MOD.WORD_FILTER) return false;
        
        const content = message.content.toLowerCase();
        
        for (const word of CONFIG.AUTO_MOD.WORD_FILTER_LIST) {
            if (content.includes(word)) {
                message.delete().catch(() => {});
                
                const userId = message.author.id;
                const warnings = (this.warningCounts.get(userId) || 0) + 1;
                this.warningCounts.set(userId, warnings);
                
                MessageHelper.log(message.guild, {
                    action: "WORD_FILTER",
                    target: message.author.tag,
                    word: word,
                    warningCount: warnings
                });
                
                if (warnings >= 3) {
                    message.member.timeout(60 * 60 * 1000, "Word filter violations")
                        .catch(() => {});
                    this.warningCounts.delete(userId);
                    message.channel.send(`â° ${message.author} timed out for 1 hour (word filter violations)`)
                        .then(m => setTimeout(() => m.delete(), 5000));
                } else if (warnings >= 2) {
                    message.channel.send(`⚠️ ${message.author}, watch your language! (Warning ${warnings}/3)`)
                        .then(m => setTimeout(() => m.delete(), 5000));
                }
                
                return true;
            }
        }
        
        return false;
    }
    
    checkMentionSpam(message) {
        if (message.mentions.users.size > CONFIG.AUTO_MOD.MENTION_LIMIT) {
            message.delete().catch(() => {});
            
            MessageHelper.log(message.guild, {
                action: "MENTION_SPAM",
                target: message.author.tag,
                mentions: message.mentions.users.size
            });
            
            message.channel.send(`${message.author}, no mass mentions!`)
                .then(m => setTimeout(() => m.delete(), 3000));
            return true;
        }
        
        return false;
    }
    
    checkLinkFilter(message) {
        if (!CONFIG.AUTO_MOD.LINK_FILTER) return false;
        
        const content = message.content.toLowerCase();
        const blockedDomains = [
            'discord.gg/',
            'bit.ly',
            'tinyurl.com',
            'short.link',
            'grabify.link',
            'iplogger.org'
        ];
        
        const allowedDomains = [
            'discord.com',
            'discordapp.com',
            'youtube.com',
            'youtu.be',
            'twitch.tv'
        ];
        
        // Check for URLs
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlPattern);
        
        if (!urls) return false;
        
        for (const url of urls) {
            let hostname;
            try {
                hostname = new URL(url).hostname.toLowerCase();
            } catch (e) {
                continue;
            }

            // Check if it's an allowed domain
            const isAllowed = allowedDomains.some(domain =>
                hostname === domain || hostname.endsWith(`.${domain}`)
            );
            if (isAllowed) continue;
            
            // Check if it's a blocked domain
            const isBlocked = blockedDomains.some(domain =>
                hostname === domain || hostname.endsWith(`.${domain}`)
            );
            if (isBlocked) {
                message.delete().catch(() => {});
                
                MessageHelper.log(message.guild, {
                    action: "LINK_FILTER",
                    target: message.author.tag,
                    link: url.substring(0, 50)
                });
                
                message.channel.send(`${message.author}, that link is not allowed here!`)
                    .then(m => setTimeout(() => m.delete(), 5000));
                
                activity.logActivity('AUTO_MOD', message.author, 'Blocked link detected');
                return true;
            }
        }
        
        return false;
    }
    
    checkScam(message) {
        if (!CONFIG.AUTO_MOD.SCAM_DETECTION) return false;
        
        const content = message.content.toLowerCase();
        const scamPatterns = [
            /free\s+(nitro|robux|money|vbucks|gift)/i,
            /click\s+here\s+to\s+(win|claim|get)/i,
            /verify\s+(account|identity)/i,
            /confirm\s+identity/i,
            /suspicious\s+activity/i,
            /unusual\s+login/i,
            /@everyone.*free.*nitro/i,
            /discord\.gift\/fake/i,
            /won\s+a\s+giveaway/i,
            /claim\s+your\s+prize/i
        ];
        
        for (const pattern of scamPatterns) {
            if (pattern.test(content)) {
                message.delete().catch(() => {});
                
                // Timeout for 1 hour
                message.member.timeout(60 * 60 * 1000, "Potential scam message")
                    .catch(() => {});
                
                MessageHelper.log(message.guild, {
                    action: "SCAM_DETECTED",
                    target: message.author.tag,
                    content: content.substring(0, 100),
                    pattern: pattern.toString()
                });
                
                const modChannel = message.guild.channels.cache.find(ch => 
                    ch.name.includes('mod-log') || ch.name.includes('alerts')
                );
                
                if (modChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🚨 SCAM DETECTED')
                        .setDescription(`**User:** ${message.author}\n**Channel:** ${message.channel}\n**Message:** ${content.substring(0, 200)}`)
                        .addFields({ name: 'Action', value: 'User timed out for 1 hour' })
                        .setTimestamp();
                    
                    modChannel.send({ embeds: [embed] });
                }
                
                activity.logActivity('AUTO_MOD', message.author, 'Scam message detected');
                
                message.channel.send(`🚨 ${message.author} Potential scam detected! Message deleted and user timed out.`)
                    .then(m => setTimeout(() => m.delete(), 10000));
                
                return true;
            }
        }
        
        return false;
    }
}

// Send live stats to dashboard every 3 seconds
setInterval(async () => {
    if (process.send && client.isReady()) {
        try {
            const memory = process.memoryUsage();
            const uptime = process.uptime();
            const fivemStatus = fivem.getServerStatus();

            process.send({
                type: 'stats',
                data: {
                    servers: client.guilds.cache.size,
                    onlineUsers: client.users.cache.filter(u => !u.bot && (u.presence?.status ?? 'offline') !== 'offline').size,
                    commands24h: global.commandCounter,
                    memoryMB: Math.round(memory.heapUsed / 1024 / 1024),
                    ping: client.ws.ping,
                    uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                    fivemPlayers: fivemStatus.players,
                    maxPlayers: fivemStatus.maxPlayers || 32,
                    fivemStatus: fivemStatus.online ? 'online' : 'offline',
                    pendingWhitelist: await fivem.getPendingCount(),
                    openTickets: await tickets.getPendingCount()
                }
            });

            process.send({
                type: 'activity',
                data: activity.getRecentActivities(100)
            });

            process.send({
                type: 'leaderboard',
                data: await leveling.getLeaderboard()
            });
        } catch (error) {
            console.error('[STATS] Error sending stats to dashboard:', error.message);
        }
    }
}, 3000);

// Auto messages
setInterval(async () => {
    if (!client.isReady()) return;
    for (const guild of client.guilds.cache.values()) {
        const config = await guildConfig.getConfig(guild.id);
        if (!config.autoMessageChannelId || !config.autoMessageText || !config.autoMessageInterval) continue;
        const last = global.autoMessageLastSent.get(guild.id) || 0;
        const intervalMs = config.autoMessageInterval * 60 * 1000;
        if (Date.now() - last < intervalMs) continue;
        const channel = guild.channels.cache.get(config.autoMessageChannelId);
        if (channel && channel.isTextBased()) {
            channel.send(config.autoMessageText).catch(() => {});
            global.autoMessageLastSent.set(guild.id, Date.now());
        }
    }
}, 60000);

// Notifications (RSS polling)
setInterval(async () => {
    if (!client.isReady()) return;
    await notifications.pollSubscriptions(client);
}, 300000);

// Initialize auto-mod
const autoMod = new AutoModeration();

const I18N = {
    en: {
        commands_title: '📜 ALL COMMANDS',
        commands_desc: 'Prefix: {{prefix}}',
        lang_set: '✅ Language set to {{lang}}',
        lang_current: '🌐 Current language: {{lang}}',
        lang_invalid: 'âŒ Invalid language. Use: {{langs}}'
    },
    es: {
        commands_title: '📜 TODOS LOS COMANDOS',
        commands_desc: 'Prefijo: {{prefix}}',
        lang_set: '✅ Idioma cambiado a {{lang}}',
        lang_current: '🌐 Idioma actual: {{lang}}',
        lang_invalid: 'âŒ Idioma invÃ¡lido. Usa: {{langs}}'
    },
    fr: {
        commands_title: '📜 TOUTES LES COMMANDES',
        commands_desc: 'PrÃ©fixe : {{prefix}}',
        lang_set: '✅ Langue dÃ©finie sur {{lang}}',
        lang_current: '🌐 Langue actuelle : {{lang}}',
        lang_invalid: 'âŒ Langue invalide. Utilise : {{langs}}'
    }
};

function t(lang, key, vars = {}) {
    const set = I18N[lang] || I18N.en;
    let text = set[key] || I18N.en[key] || key;
    for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
    return text;
}

function getLevelName(level) {
    switch(level) {
        case 4: return "Owner";
        case 3: return "Admin";
        case 2: return "Moderator";
        case 1: return "Trial Mod";
        default: return "User";
    }
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const userLevel = PermissionSystem.getPermissionLevel(message.member);
    const config = await guildConfig.getConfig(message.guild.id);

    // Always allow owner !admin restart / shutdown / status even when paused
    const isOwnerAdminCommand = 
        message.content.startsWith(CONFIG.PREFIX + "admin") &&
        ["restart", "shutdown", "status"].some(sub => message.content.toLowerCase().includes(sub));

    if (global.isPaused && !isOwnerAdminCommand) {
        return;  // â† Bot ignores everything except owner admin commands
    }

    // Whitelist mode (only whitelisted role + staff can chat)
    if (config.whitelistMode && userLevel < CONFIG.PERMISSION_LEVELS.MODERATOR) {
        const hasWhitelistRole = message.member.roles.cache.some(r => r.name === CONFIG.ROLES.WHITELISTED);
        if (!hasWhitelistRole) {
            message.delete().catch(() => {});
            return MessageHelper.sendAndDelete(message, "🚫 Whitelist mode is active. You cannot chat yet.", 5000);
        }
    }

    // Raid mode: lock down non-staff messages
    if (config.raidMode && userLevel < CONFIG.PERMISSION_LEVELS.MODERATOR) {
        message.delete().catch(() => {});
        return MessageHelper.sendAndDelete(message, "🚨 Raid mode active. Chat locked for non-staff.", 5000);
    }

    // Token/IP logger protection
    if (security.containsToken(message.content) || security.containsIPLogger(message.content)) {
        message.delete().catch(() => {});
        message.member.timeout(60 * 60 * 1000, "Security: token/IP logger detected").catch(() => {});
        MessageHelper.log(message.guild, {
            action: "SECURITY_BLOCK",
            target: message.author.tag,
            details: "Token/IP logger detected"
        });
        return;
    }
    
    // Run auto-mod checks ONLY for regular users (level 0)
    if (userLevel === 0 && global.enabledModules['auto-mod']) {
        if (autoMod.checkSpam(message)) return;
        if (autoMod.checkScam(message)) return;
        if (autoMod.checkLinkFilter(message)) return;
        if (CONFIG.AUTO_MOD.INVITE_FILTER && security.containsInvite(message.content)) {
            message.delete().catch(() => {});
            return MessageHelper.sendAndDelete(message, "âŒ Invite links are not allowed here.", 5000);
        }
        if (CONFIG.AUTO_MOD.AD_FILTER && config.adsChannelId && message.channel.id !== config.adsChannelId) {
            if (security.containsInvite(message.content)) {
                message.delete().catch(() => {});
                return MessageHelper.sendAndDelete(message, "âŒ Ads are only allowed in the ads channel.", 5000);
            }
        }
        if (autoMod.checkWordFilter(message)) return;
        if (autoMod.checkMentionSpam(message)) return;
    }
    
    // XP tracking for all users
    if (!message.content.startsWith(CONFIG.PREFIX)) {
        const xpResult = await leveling.addXP(message.author.id, message.author.username);
        
        if (xpResult && xpResult.leveledUp) {
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🎉 LEVEL UP!')
                .setDescription(`${message.author} reached **Level ${xpResult.level}**!`)
                .setFooter({ text: `Keep chatting to gain more XP!` });
            
            message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete(), 10000));
        }
        
        // Track message for activity
        await activity.trackMessage(message.author.id, message.author.username, message.guild.id);

        const unlocked = await achievements.checkAchievements(message.author.id);
        if (unlocked.length > 0) {
            message.channel.send(`🏆 ${message.author} unlocked achievements: ${unlocked.join(', ')}`)
                .then(m => setTimeout(() => m.delete(), 10000))
                .catch(() => {});
        }
    }
    
    // Command handler
    if (message.content.startsWith(CONFIG.PREFIX)) {
        // Try FiveM Sync commands first
        const handled = await fivemSync.handleMessage(message, CONFIG.PREFIX);
        if (handled) return;
        
        const args = message.content.slice(CONFIG.PREFIX.length).split(/ +/);
        const commandName = args.shift().toLowerCase();

        const moduleMap = {
            balance: 'economy',
            pay: 'economy',
            daily: 'economy',
            work: 'economy',
            shop: 'economy',
            buy: 'economy',
            slots: 'economy',
            dice: 'economy',
            roulette: 'economy',
            blackjack: 'economy',
            level: 'leveling',
            leaderboard: 'leveling',
            ticket: 'tickets',
            giveaway: 'giveaways',
            fivem: 'fivem',
            whitelist: 'fivem',
            report: 'reports',
            play: 'music',
            skip: 'music',
            stop: 'music',
            pause: 'music',
            resume: 'music',
            queue: 'music',
            nowplaying: 'music',
            notifyadd: 'notifications',
            notifyremove: 'notifications',
            notifylist: 'notifications',
            notifytest: 'notifications',
            trivia: 'games',
            hangman: 'games',
            retention: 'analytics'
        };

        const moduleName = moduleMap[commandName];
        if (moduleName && global.enabledModules[moduleName] === false) {
            return MessageHelper.sendAndDelete(message, `âŒ ${moduleName} module is disabled`, 15000);
        }
        
        // Rate limiting check
        if (!security.checkRateLimit(message.author.id, userLevel)) {
            return MessageHelper.sendAndDelete(message, 
                "â±️ Slow down! You're using commands too quickly (5 per minute limit)", 
                15000
            );
        }
        
        // Input validation
        if (!security.validateInput(message.content)) {
            return MessageHelper.sendAndDelete(message, 
                "âŒ Invalid input detected", 
                15000
            );
        }
        
        if (moderationCommands[commandName]) {
            const command = moderationCommands[commandName];
            
            if (!PermissionSystem.hasPermission(message.member, command.permission)) {
                return MessageHelper.sendAndDelete(message, 
                    `âŒ Insufficient permissions (Required: ${getLevelName(command.permission)})`, 
                    30000
                );
            }
            
            try {
                // Increment command counter
                global.commandCounter++;
                global.commandUsage.set(commandName, (global.commandUsage.get(commandName) || 0) + 1);
                
                // Reset counter every 24 hours
                if (Date.now() > global.commandCounterResetTime) {
                    global.commandCounter = 0;
                    global.commandCounterResetTime = Date.now() + 86400000;
                }
                
                await command.execute(message, args);
                
                await activity.logActivity('COMMAND', message.author, `Executed: ${CONFIG.PREFIX}${commandName}`);
            } catch (error) {
                console.error(`Command error (${commandName}):`, error);
                MessageHelper.sendAndDelete(message, "âŒ Command error", 30000);
            }
        } else {
            // Custom commands
            const custom = await customCommands.getCommand(message.guild.id, commandName);
            if (custom) {
                const response = custom.response
                    .replace(/\{\{user\}\}/g, `<@${message.author.id}>`)
                    .replace(/\{\{server\}\}/g, message.guild.name);
                return MessageHelper.sendAndDelete(message, response, 30000);
            }
        }
    }
});

client.on("guildMemberAdd", async (member) => {
    autoMod.checkRaid(member);

    if (CONFIG.AUTO_MOD.USERNAME_FILTER && security.containsBannedUsername(member.user.username)) {
        await member.kick('Username policy violation').catch(() => {});
        MessageHelper.log(member.guild, {
            action: "USERNAME_BLOCK",
            target: member.user.tag,
            reason: "Banned words in username"
        });
        return;
    }

    await activity.logActivity('JOIN', member.user, `Joined server`);

    const config = await guildConfig.getConfig(member.guild.id);
    if (config.autoroleIds && config.autoroleIds.length > 0) {
        for (const roleId of config.autoroleIds) {
            await member.roles.add(roleId).catch(() => {});
        }
    }

    if (config.welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        if (welcomeChannel && welcomeChannel.isTextBased()) {
            const message = (config.welcomeMessage || 'Welcome {{user}} to {{server}}!')
                .replace('{{user}}', `<@${member.id}>`)
                .replace('{{server}}', member.guild.name);
            welcomeChannel.send(message).catch(() => {});
        }
    }
    
    MessageHelper.log(member.guild, {
        action: "MEMBER_JOIN",
        target: member.user.tag,
        accountCreated: member.user.createdAt.toDateString()
    });
});

client.on("guildMemberRemove", async (member) => {
    await activity.logActivity('LEAVE', member.user, `Left server`);

    const config = await guildConfig.getConfig(member.guild.id);
    if (config.goodbyeChannelId) {
        const goodbyeChannel = member.guild.channels.cache.get(config.goodbyeChannelId);
        if (goodbyeChannel && goodbyeChannel.isTextBased()) {
            const message = (config.goodbyeMessage || 'Goodbye {{user}}!')
                .replace('{{user}}', member.user.tag)
                .replace('{{server}}', member.guild.name);
            goodbyeChannel.send(message).catch(() => {});
        }
    }
    
    MessageHelper.log(member.guild, {
        action: "MEMBER_LEAVE",
        target: member.user.tag
    });
});

// Button interaction handler
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    // Close ticket
    if (customId === 'close_ticket') {
        const channel = interaction.channel;
        const ticketMatch = channel.topic?.match(/ID: (TICKET-\d+)/);
        
        if (!ticketMatch) {
            return interaction.reply({ content: "âŒ Could not find ticket ID", ephemeral: true });
        }
        
        const ticketId = ticketMatch[1];
        const result = await tickets.closeTicket(ticketId, interaction.user.tag);
        
        if (result.success) {
            await activity.logActivity('TICKET_CLOSE', interaction.user, `Closed ticket: ${ticketId}`);
            
            await interaction.reply({ content: `✅ Closing ticket ${ticketId}...`, ephemeral: false });
            
            setTimeout(async () => {
                await channel.delete().catch(console.error);
            }, 5000);
        } else {
            await interaction.reply({ content: `âŒ ${result.error}`, ephemeral: true });
        }
    }
    
    // Report handling
    if (customId.startsWith('approve_report_') || customId.startsWith('deny_report_')) {
        const reportId = customId.split('_')[2];
        const action = customId.startsWith('approve') ? 'approved' : 'denied';
        
        await activity.logActivity('REPORT_ACTION', interaction.user, `${action} report ${reportId}`);
        
        await interaction.update({
            content: `Report ${reportId} ${action} by ${interaction.user}`,
            components: []
        });
    }
    
    // Whitelist handling
    if (customId.startsWith('approve_wl_') || customId.startsWith('deny_wl_')) {
        const appId = customId.split('_')[2];
        const isApproval = customId.startsWith('approve');
        
        const result = isApproval 
            ? await fivem.approveApp(appId, interaction.user.tag)
            : await fivem.denyApp(appId, interaction.user.tag);
        
        if (result.success) {
            await activity.logActivity('WHITELIST_ACTION', interaction.user, 
                `${isApproval ? 'Approved' : 'Denied'} application ${appId}`);
            
            await interaction.update({
                content: `✅ Application ${appId} ${isApproval ? 'APPROVED' : 'DENIED'} by ${interaction.user}`,
                components: []
            });
            
            // Try to notify the applicant
            try {
                const user = await client.users.fetch(result.app.userId);
                const status = isApproval ? '✅ APPROVED' : 'âŒ DENIED';
                await user.send(`${status} - Your whitelist application (ID: ${appId}) has been ${isApproval ? 'approved' : 'denied'}.`);
            } catch (e) {
                console.log('Could not DM applicant');
            }
        } else {
            await interaction.reply({ content: `âŒ ${result.error}`, ephemeral: true });
        }
    }
});

// Reaction roles
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
    if (!message || !message.guild) return;

    const config = await guildConfig.getConfig(message.guild.id);
    if (!Array.isArray(config.reactionRoles)) return;
    const match = config.reactionRoles.find(r => r.messageId === message.id && r.emoji === reaction.emoji.name);
    if (!match) return;

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) {
        member.roles.add(match.roleId).catch(() => {});
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
    if (!message || !message.guild) return;

    const config = await guildConfig.getConfig(message.guild.id);
    if (!Array.isArray(config.reactionRoles)) return;
    const match = config.reactionRoles.find(r => r.messageId === message.id && r.emoji === reaction.emoji.name);
    if (!match) return;

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) {
        member.roles.remove(match.roleId).catch(() => {});
    }
});

// Message logs
client.on('messageDelete', (message) => {
    if (!message.guild || message.author?.bot) return;
    MessageHelper.log(message.guild, {
        action: "MESSAGE_DELETE",
        author: message.author?.tag || 'Unknown',
        channel: message.channel?.name || 'Unknown',
        content: (message.content || '').substring(0, 200)
    });
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    MessageHelper.log(newMessage.guild, {
        action: "MESSAGE_EDIT",
        author: newMessage.author?.tag || 'Unknown',
        channel: newMessage.channel?.name || 'Unknown',
        before: (oldMessage.content || '').substring(0, 200),
        after: (newMessage.content || '').substring(0, 200)
    });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0) {
        MessageHelper.log(newMember.guild, {
            action: "ROLE_ADDED",
            target: newMember.user.tag,
            roles: added.map(r => r.name).join(', ')
        });
    }
    if (removed.size > 0) {
        MessageHelper.log(newMember.guild, {
            action: "ROLE_REMOVED",
            target: newMember.user.tag,
            roles: removed.map(r => r.name).join(', ')
        });
    }
});

client.on('channelCreate', (channel) => {
    if (!channel.guild) return;
    MessageHelper.log(channel.guild, {
        action: "CHANNEL_CREATE",
        channel: channel.name
    });
});

client.on('channelDelete', (channel) => {
    if (!channel.guild) return;
    MessageHelper.log(channel.guild, {
        action: "CHANNEL_DELETE",
        channel: channel.name
    });
});

client.once("ready", () => {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 BOT SUCCESSFULLY STARTED!");
    console.log("=".repeat(70));
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log(`🔗 ID: ${client.user.id}`);
    console.log(`📡 Servers: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.users.cache.size}`);
    console.log(`🕒 Started: ${new Date().toLocaleTimeString()}`);
    console.log("=".repeat(70));
    console.log("\n🎯 **TIERED PERMISSION SYSTEM:**");
    console.log("  Tier 4: OWNER     - Full system control");
    console.log("  Tier 3: ADMIN     - Ban/Unban/Server config");
    console.log("  Tier 2: MODERATOR - Kick/Purge/Channel control");
    console.log("  Tier 1: TRIAL MOD - Warn/Timeout (1h max)");
    console.log("\n🔧 **AUTO-MOD FEATURES:**");
    console.log(`  Anti-Spam: ${CONFIG.AUTO_MOD.ANTI_SPAM ? "✅" : "âŒ"}`);
    console.log(`  Anti-Raid: ${CONFIG.AUTO_MOD.ANTI_RAID ? "✅" : "âŒ"}`);
    console.log(`  Word Filter: ${CONFIG.AUTO_MOD.WORD_FILTER ? "✅" : "âŒ"}`);
    console.log("=".repeat(70));
    console.log("\n📋 **OWNER COMMANDS:**");
    console.log(`  ${CONFIG.PREFIX}admin restart  - Restart bot`);
    console.log(`  ${CONFIG.PREFIX}admin shutdown - Stop bot`);
    console.log(`  ${CONFIG.PREFIX}admin status   - Check bot stats`);
    console.log("=".repeat(70));
    console.log("\n✅ Bot is ready! Type !modhelp in Discord for commands.\n");
    
    client.user.setPresence({
        activities: [{ 
            name: `${CONFIG.PREFIX}modhelp | Tiered System`, 
            type: 3 
        }],
        status: "online"
    });
    
    // Initialize FiveM Sync module (pass MessageHelper.log for audit channel)
    fivemSync.init(client, MessageHelper.log);
});

client.on("error", (error) => {
    console.log("\n" + "=".repeat(70));
    console.log("âŒ DISCORD CLIENT ERROR");
    console.log("=".repeat(70));
    console.error("Error:", security.sanitizeLog(error.message || String(error)));
    console.log("=".repeat(70) + "\n");
});

client.on("warn", (warning) => {
    console.log("\n" + "=".repeat(70));
    console.log("⚠️ DISCORD WARNING");
    console.log("=".repeat(70));
    console.warn("Warning:", warning);
    console.log("=".repeat(70) + "\n");
});

process.on("unhandledRejection", (error) => {
    console.log("\n" + "=".repeat(70));
    console.log("🚨 UNHANDLED PROMISE REJECTION");
    console.log("=".repeat(70));
    console.error("Error:", security.sanitizeLog(error?.message || String(error)));
    console.log("=".repeat(70) + "\n");
});

process.on("SIGINT", () => {
    console.log("\n" + "=".repeat(70));
    console.log("👋 SHUTTING DOWN BOT...");
    console.log("=".repeat(70));
    console.log("Time:", new Date().toLocaleTimeString());
    console.log("Goodbye! 👋");
    console.log("=".repeat(70));
    
    if (client && client.destroy) {
        client.destroy();
    }
    
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

console.log("\n" + "=".repeat(70));
console.log("🔄 STARTING BOT...");
console.log("=".repeat(70));
console.log("Time:", new Date().toLocaleTimeString());
console.log("Please wait for connection...");
console.log("=".repeat(70) + "\n");

connectDB()
    .then(() => client.login(CONFIG.TOKEN))
    .catch(error => {
    console.log("\n" + "=".repeat(70));
    console.log("âŒ FAILED TO LOGIN");
    console.log("=".repeat(70));
    console.error("Error:", security.sanitizeLog(error.message));
    console.log("\n🔧 TROUBLESHOOTING:");
    console.log("1. Check .env file has correct DISCORD_TOKEN");
    console.log("2. Enable MESSAGE CONTENT INTENT in Discord Developer Portal");
    console.log("3. Bot might be rate limited - wait 5 minutes");
    console.log("=".repeat(70));
    process.exit(1);
    });
