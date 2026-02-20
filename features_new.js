
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const Parser = require('rss-parser');
const {
    UserModel,
    TicketModel,
    GiveawayModel,
    WhitelistModel,
    ReportModel,
    CustomCommandModel,
    GuildConfigModel,
    AppealModel,
    AuditLogModel,
    DailyActivityModel,
    NotificationModel,
    ApplicationModel,
    UserNoteModel
} = require('./db');

class LevelingSystem {
    constructor() {
        this.xpCooldowns = new Map();
        this.XP_PER_MESSAGE = 10;
        this.XP_PER_LEVEL = 100;
        this.COOLDOWN_MS = 60000;
    }

    async getUser(userId, username = '') {
        let user = await UserModel.findOne({ userId });
        if (!user) {
            user = await UserModel.create({ userId, username });
        } else if (username && user.username !== username) {
            user.username = username;
            await user.save();
        }
        return user;
    }

    async addXP(userId, username) {
        const now = Date.now();
        const lastXP = this.xpCooldowns.get(userId) || 0;
        if (now - lastXP < this.COOLDOWN_MS) return null;

        const user = await this.getUser(userId, username);
        user.xp += this.XP_PER_MESSAGE;
        user.lastMessageAt = new Date(now);
        this.xpCooldowns.set(userId, now);

        const newLevel = Math.floor(user.xp / this.XP_PER_LEVEL) + 1;
        const leveledUp = newLevel > user.level;
        if (leveledUp) user.level = newLevel;

        await user.save();
        return leveledUp ? { leveledUp: true, level: newLevel } : { leveledUp: false };
    }

    async getLevel(userId) {
        const user = await this.getUser(userId);
        return {
            level: user.level,
            xp: user.xp,
            nextLevelXP: user.level * this.XP_PER_LEVEL,
            progress: ((user.xp % this.XP_PER_LEVEL) / this.XP_PER_LEVEL) * 100
        };
    }

    async getLeaderboard(limit = 15) {
        const users = await UserModel.find().sort({ xp: -1 }).limit(limit).lean();
        return users.map((data, index) => ({
            rank: index + 1,
            userId: data.userId,
            level: data.level,
            xp: data.xp
        }));
    }
}

class EconomySystem {
    constructor() {
        this.dailyAmount = 500;
        this.workAmount = 250;
        this.dailyCooldown = 24 * 60 * 60 * 1000;
        this.workCooldown = 60 * 60 * 1000;
        this.items = [
            { id: 'vip', name: 'VIP Pass', price: 5000, description: 'VIP perks' },
            { id: 'nitro', name: 'Discord Nitro', price: 20000, description: 'Shiny reward' },
            { id: 'car', name: 'Custom Car', price: 15000, description: 'Roleplay vehicle' }
        ];
    }

    async getBalance(userId, username = '') {
        const user = await this.getUser(userId, username);
        return user.money;
    }

    async getUser(userId, username = '') {
        let user = await UserModel.findOne({ userId });
        if (!user) user = await UserModel.create({ userId, username });
        else if (username && user.username !== username) {
            user.username = username;
            await user.save();
        }
        return user;
    }

    async addMoney(userId, amount) {
        const user = await this.getUser(userId);
        user.money += amount;
        await user.save();
        return user.money;
    }

    async pay(fromId, toId, amount) {
        if (amount <= 0) return { success: false, error: 'Amount must be positive' };
        const fromUser = await this.getUser(fromId);
        const toUser = await this.getUser(toId);
        if (fromUser.money < amount) return { success: false, error: 'Insufficient funds' };
        fromUser.money -= amount;
        toUser.money += amount;
        await fromUser.save();
        await toUser.save();
        return { success: true };
    }

    async daily(userId) {
        const user = await this.getUser(userId);
        const now = Date.now();
        if (user.lastDaily && now - user.lastDaily.getTime() < this.dailyCooldown) {
            const remaining = this.dailyCooldown - (now - user.lastDaily.getTime());
            return { success: false, remaining };
        }
        user.money += this.dailyAmount;
        user.lastDaily = new Date(now);
        await user.save();
        return { success: true, amount: this.dailyAmount, balance: user.money };
    }

    async work(userId) {
        const user = await this.getUser(userId);
        const now = Date.now();
        const lastWork = user.lastWorkAt ? user.lastWorkAt.getTime() : 0;
        if (lastWork && now - lastWork < this.workCooldown) {
            const remaining = this.workCooldown - (now - lastWork);
            return { success: false, remaining };
        }
        user.money += this.workAmount;
        user.lastWorkAt = new Date(now);
        await user.save();
        return { success: true, amount: this.workAmount, balance: user.money };
    }

    getItems() {
        return this.items;
    }

    async buyItem(userId, itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return { success: false, error: 'Item not found' };
        const user = await this.getUser(userId);
        if (user.money < item.price) return { success: false, error: 'Insufficient funds' };
        user.money -= item.price;
        await user.save();
        return { success: true, item, balance: user.money };
    }

    async gambleDice(userId, bet) {
        if (bet <= 0) return { success: false, error: 'Bet must be positive' };
        const user = await this.getUser(userId);
        if (user.money < bet) return { success: false, error: 'Insufficient funds' };
        const roll = Math.floor(Math.random() * 6) + 1;
        const win = roll >= 4;
        user.money += win ? bet : -bet;
        await user.save();
        return { success: true, roll, win, balance: user.money };
    }

    async gambleSlots(userId, bet) {
        if (bet <= 0) return { success: false, error: 'Bet must be positive' };
        const user = await this.getUser(userId);
        if (user.money < bet) return { success: false, error: 'Insufficient funds' };
        const symbols = ['ðŸ’', 'ðŸ‹', 'ðŸ‡', 'ðŸ’Ž', '7ï¸âƒ£'];
        const spin = () => symbols[Math.floor(Math.random() * symbols.length)];
        const a = spin();
        const b = spin();
        const c = spin();
        let multiplier = 0;
        if (a === b && b === c) multiplier = 5;
        else if (a === b || b === c || a === c) multiplier = 2;
        const winnings = bet * multiplier;
        user.money += winnings - bet;
        await user.save();
        return { success: true, result: [a, b, c], winnings, balance: user.money };
    }

    async gambleRoulette(userId, bet, color) {
        if (!['red', 'black'].includes(color)) return { success: false, error: 'Color must be red or black' };
        const user = await this.getUser(userId);
        if (user.money < bet) return { success: false, error: 'Insufficient funds' };
        const result = Math.random() < 0.5 ? 'red' : 'black';
        const win = result === color;
        user.money += win ? bet : -bet;
        await user.save();
        return { success: true, result, win, balance: user.money };
    }

    async gambleBlackjack(userId, bet) {
        const user = await this.getUser(userId);
        if (user.money < bet) return { success: false, error: 'Insufficient funds' };
        const draw = () => Math.min(10, Math.floor(Math.random() * 13) + 1);
        const player = draw() + draw();
        const dealer = draw() + draw();
        const win = player <= 21 && (dealer > 21 || player > dealer);
        user.money += win ? bet : -bet;
        await user.save();
        return { success: true, player, dealer, win, balance: user.money };
    }
}

class AchievementSystem {
    constructor() {
        this.levelMilestones = [5, 10, 25, 50];
        this.messageMilestones = [100, 500, 1000];
        this.moneyMilestones = [1000, 10000, 50000];
    }

    async checkAchievements(userId) {
        const user = await UserModel.findOne({ userId });
        if (!user) return [];

        const unlocked = [];
        this.levelMilestones.forEach(lvl => {
            const key = `LEVEL_${lvl}`;
            if (user.level >= lvl && !user.achievements.includes(key)) {
                user.achievements.push(key);
                unlocked.push(key);
            }
        });

        this.messageMilestones.forEach(msg => {
            const key = `MESSAGES_${msg}`;
            if (user.totalMessages >= msg && !user.achievements.includes(key)) {
                user.achievements.push(key);
                unlocked.push(key);
            }
        });

        this.moneyMilestones.forEach(money => {
            const key = `MONEY_${money}`;
            if (user.money >= money && !user.achievements.includes(key)) {
                user.achievements.push(key);
                unlocked.push(key);
            }
        });

        if (unlocked.length > 0) await user.save();
        return unlocked;
    }
}

class TicketSystem {
    constructor() {
        this.ticketCounter = 1000;
    }

    async createTicket(member, reason) {
        const ticketId = `TICKET-${this.ticketCounter++}`;
        const guild = member.guild;
        const staffRoles = guild.roles.cache.filter(r => ['Head Staff', 'Moderator', 'Trial Moderator', 'Admin', 'Staff'].includes(r.name));

        try {
            const channel = await guild.channels.create({
                name: `ticket-${this.ticketCounter}`,
                topic: `Ticket by ${member.user.tag} | ID: ${ticketId}`,
                permissionOverwrites: [
                    { id: guild.id, deny: ['ViewChannel'] },
                    { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ...staffRoles.map(r => ({ id: r.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }))
                ]
            });

            await TicketModel.create({
                ticketId,
                guildId: guild.id,
                channelId: channel.id,
                userId: member.id,
                username: member.user.tag,
                reason: reason || 'No reason provided',
                status: 'open'
            });

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`ðŸŽ« Ticket Created: ${ticketId}`)
                .setDescription(`**Opened by:** ${member}\n**Reason:** ${reason || 'No reason provided'}`)
                .addFields(
                    { name: 'Status', value: 'ðŸŸ¢ Open', inline: true },
                    { name: 'Ticket ID', value: ticketId, inline: true }
                )
                .setFooter({ text: 'Support will be with you shortly' })
                .setTimestamp();

            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('ðŸ”’')
                );

            await channel.send({ embeds: [embed], components: [closeButton] });
            return { success: true, ticketId, channel };
        } catch (error) {
            console.error('Ticket creation error:', error);
            return { success: false, error: error.message };
        }
    }

    async closeTicket(ticketId, closedBy) {
        const ticket = await TicketModel.findOne({ ticketId });
        if (!ticket) return { success: false, error: 'Ticket not found' };

        ticket.status = 'closed';
        ticket.closedAt = new Date();
        ticket.closedBy = closedBy;
        await ticket.save();
        return { success: true, ticket };
    }

    async getPendingCount() {
        return TicketModel.countDocuments({ status: 'open' });
    }

    async getTicketList() {
        return TicketModel.find().sort({ createdAt: -1 }).limit(10).lean();
    }
}

class GiveawaySystem {
    constructor() {
        this.giveaways = new Map();
    }

    async createGiveaway(channel, prize, durationSeconds, winners, host) {
        const endTime = Date.now() + (durationSeconds * 1000);
        const giveawayId = `giveaway-${Date.now()}`;

        const embed = new EmbedBuilder()
            .setColor(0xFF00FF)
            .setTitle('ðŸŽ‰ GIVEAWAY!')
            .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\nReact with ðŸŽ‰ to enter!`)
            .setFooter({ text: `Hosted by ${host.tag}` })
            .setTimestamp(new Date(endTime));

        const message = await channel.send({ embeds: [embed] });
        await message.react('ðŸŽ‰');

        await GiveawayModel.create({
            giveawayId,
            guildId: channel.guild.id,
            channelId: channel.id,
            messageId: message.id,
            prize,
            winners,
            endTime: new Date(endTime),
            hostId: host.id,
            ended: false
        });

        setTimeout(() => this.endGiveaway(giveawayId, channel.guild), durationSeconds * 1000);
        return { success: true, giveawayId, message };
    }

    async endGiveaway(giveawayId, guild) {
        const giveaway = await GiveawayModel.findOne({ giveawayId });
        if (!giveaway || giveaway.ended) return;

        giveaway.ended = true;
        await giveaway.save();

        try {
            const channel = guild.channels.cache.get(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);
            const reaction = message.reactions.cache.get('ðŸŽ‰');
            const users = await reaction.users.fetch();
            const participants = users.filter(u => !u.bot);

            if (participants.size === 0) {
                return channel.send('ðŸŽ‰ Giveaway ended - No valid participants!');
            }

            const participantArray = Array.from(participants.values());
            const winnersArray = [];
            const winnerCount = Math.min(giveaway.winners, participantArray.length);

            for (let i = 0; i < winnerCount; i++) {
                const idx = Math.floor(Math.random() * participantArray.length);
                winnersArray.push(participantArray.splice(idx, 1)[0]);
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('ðŸŽŠ GIVEAWAY ENDED!')
                .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${winnersArray.map(w => `<@${w.id}>`).join(', ')}`)
                .setFooter({ text: 'Congratulations!' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            for (const winner of winnersArray) {
                try {
                    await winner.send(`ðŸŽŠ Congratulations! You won **${giveaway.prize}** in the giveaway!`);
                } catch (e) {
                    console.log(`Could not DM winner ${winner.tag}`);
                }
            }
        } catch (error) {
            console.error('Giveaway end error:', error);
        }
    }
}

class FiveMMeta {
    constructor() {
        this.serverStatus = {
            online: false,
            players: 0,
            maxPlayers: 32,
            name: 'FiveM Server',
            gamemode: 'RP'
        };
        this.appCounter = 1;
        this.serverIP = process.env.FIVEM_SERVER_IP || '';
        this.serverPort = process.env.FIVEM_SERVER_PORT || '30120';
        
        // Only start polling if server IP is configured
        if (this.serverIP && this.serverIP !== '') {
            this.startStatusPolling();
        } else {
            this.serverStatus.error = 'FiveM server not configured';
        }
    }

    startStatusPolling() {
        this.updateServerStatusLive();
        setInterval(() => this.updateServerStatusLive(), 30000);
    }

    async updateServerStatusLive() {
        if (!this.serverIP || this.serverIP === '') {
            this.serverStatus = {
                online: false,
                players: 0,
                maxPlayers: 32,
                name: 'Not Configured',
                gamemode: 'RP',
                error: 'Add FIVEM_SERVER_IP to .env to enable FiveM integration'
            };
            return;
        }
        
        // Retry logic: attempt up to 2 times before marking offline
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const baseUrl = `http://${this.serverIP}:${this.serverPort}`;
                const infoResponse = await axios.get(`${baseUrl}/info.json`, { timeout: 10000 });
                const playersResponse = await axios.get(`${baseUrl}/players.json`, { timeout: 10000 });

                this.serverStatus = {
                    online: true,
                    players: playersResponse.data.length || 0,
                    maxPlayers: infoResponse.data.vars?.sv_maxClients || 32,
                    name: infoResponse.data.vars?.sv_projectName || infoResponse.data.server || 'FiveM Server',
                    gamemode: infoResponse.data.vars?.gametype || 'Roleplay',
                    version: infoResponse.data.version || 'Unknown',
                    resources: infoResponse.data.resources?.length || 0
                };
                return; // Success, exit retry loop
            } catch (error) {
                lastError = error;
                if (attempt < 1) {
                    // Wait 2 seconds before retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // All retries failed, preserve last known good name if we had one
        const lastKnownName = this.serverStatus.online ? this.serverStatus.name : this.serverIP;
        this.serverStatus = {
            online: false,
            players: 0,
            maxPlayers: this.serverStatus.maxPlayers || 32,
            name: lastKnownName,
            gamemode: 'RP',
            error: lastError?.code === 'ECONNABORTED'
                ? `Timeout (server slow to respond)`
                : `Server offline or unreachable`
        };
    }

    async submitWhitelistApp(userId, username, steamId) {
        const appId = `WL-${this.appCounter++}`;
        await WhitelistModel.create({
            appId,
            userId,
            username,
            steamId,
            status: 'pending'
        });
        return { success: true, appId };
    }

    async approveApp(appId, approvedBy) {
        const app = await WhitelistModel.findOne({ appId });
        if (!app) return { success: false, error: 'Application not found' };
        app.status = 'approved';
        app.approvedBy = approvedBy;
        app.reviewedAt = new Date();
        await app.save();
        return { success: true, app };
    }

    async denyApp(appId, deniedBy) {
        const app = await WhitelistModel.findOne({ appId });
        if (!app) return { success: false, error: 'Application not found' };
        app.status = 'denied';
        app.deniedBy = deniedBy;
        app.reviewedAt = new Date();
        await app.save();
        return { success: true, app };
    }

    async getPendingCount() {
        return WhitelistModel.countDocuments({ status: 'pending' });
    }

    getServerStatus() {
        return this.serverStatus;
    }

    updateServerStatus(data) {
        this.serverStatus = { ...this.serverStatus, ...data };
    }
}

class ActivityTracker {
    constructor() {
        this.activities = [];
        this.maxActivities = 100;
    }

    async logActivity(type, user, details) {
        const activity = {
            type,
            user: user.tag || user,
            userId: user.id || 'unknown',
            details,
            timestamp: Date.now(),
            color: this.getActivityColor(type)
        };

        this.activities.unshift(activity);
        if (this.activities.length > this.maxActivities) {
            this.activities = this.activities.slice(0, this.maxActivities);
        }

        try {
            await AuditLogModel.create({
                guildId: user.guild?.id || 'unknown',
                action: type,
                actorId: user.id || 'unknown',
                details
            });
        } catch {
            // ignore audit failures
        }

        return activity;
    }

    getActivityColor(type) {
        const colors = {
            'BAN': '#ff0000',
            'KICK': '#ff6600',
            'WARN': '#ffff00',
            'TIMEOUT': '#ff9900',
            'PURGE': '#9900ff',
            'LOCK': '#0099ff',
            'UNLOCK': '#00ff00',
            'JOIN': '#00ff00',
            'LEAVE': '#ff0000',
            'AUTO_MOD': '#9900ff',
            'COMMAND': '#00b0f4'
        };
        return colors[type] || '#5865F2';
    }

    async trackMessage(userId, username, guildId = null) {
        await UserModel.updateOne(
            { userId },
            { $inc: { totalMessages: 1 }, $set: { username } },
            { upsert: true }
        );

        if (guildId) {
            const date = new Date().toISOString().slice(0, 10);
            await DailyActivityModel.updateOne(
                { guildId, date, userId },
                { $set: { username, lastSeenAt: new Date() } },
                { upsert: true }
            );
        }
    }

    async getMostActive(limit = 15) {
        const users = await UserModel.find().sort({ totalMessages: -1 }).limit(limit).lean();
        return users.map((data, index) => ({
            rank: index + 1,
            userId: data.userId,
            username: data.username,
            messages: data.totalMessages || 0
        }));
    }

    async getRetentionStats(guildId) {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const day7 = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
        const day30 = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        const day6 = new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10);

        const dauUsers = await DailyActivityModel.distinct('userId', { guildId, date: todayStr });
        const wauUsers = await DailyActivityModel.distinct('userId', { guildId, date: { $gte: day6, $lte: todayStr } });
        const mauUsers = await DailyActivityModel.distinct('userId', { guildId, date: { $gte: day30, $lte: todayStr } });

        const day7Users = await DailyActivityModel.distinct('userId', { guildId, date: day7 });
        const retained = day7Users.filter(id => dauUsers.includes(id)).length;
        const retentionRate = day7Users.length ? Math.round((retained / day7Users.length) * 100) : 0;

        const dailyCounts = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
            const count = await DailyActivityModel.countDocuments({ guildId, date });
            dailyCounts.push({ date, count });
        }

        return {
            dau: dauUsers.length,
            wau: wauUsers.length,
            mau: mauUsers.length,
            retentionRate,
            dailyCounts
        };
    }

    getRecentActivities(limit = 100) {
        return this.activities.slice(0, limit);
    }
}

class ReportSystem {
    constructor() {
        this.reportCounter = 1;
    }

    async createReport(reporter, reported, reason, channel) {
        const reportId = `REPORT-${this.reportCounter++}`;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`âš ï¸ User Report: ${reportId}`)
            .setDescription(`**Reporter:** ${reporter}\n**Reported User:** ${reported}\n**Reason:** ${reason}`)
            .addFields(
                { name: 'Status', value: 'ðŸŸ¡ Pending Review', inline: true },
                { name: 'Report ID', value: reportId, inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_report_${reportId}`)
                    .setLabel('Take Action')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('âœ…'),
                new ButtonBuilder()
                    .setCustomId(`deny_report_${reportId}`)
                    .setLabel('Dismiss')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('âŒ')
            );

        const message = await channel.send({ embeds: [embed], components: [buttons] });

        await ReportModel.create({
            reportId,
            guildId: channel.guild.id,
            reporterId: reporter.id,
            reportedId: reported.id,
            reason,
            status: 'pending'
        });

        return { success: true, reportId, message };
    }
}

class CustomCommandSystem {
    async setCommand(guildId, trigger, response, createdBy) {
        await CustomCommandModel.findOneAndUpdate(
            { guildId, trigger },
            { response, createdBy, createdAt: new Date() },
            { upsert: true, new: true }
        );
        return true;
    }

    async deleteCommand(guildId, trigger) {
        const res = await CustomCommandModel.deleteOne({ guildId, trigger });
        return res.deletedCount > 0;
    }

    async getCommand(guildId, trigger) {
        return CustomCommandModel.findOne({ guildId, trigger }).lean();
    }

    async listCommands(guildId) {
        return CustomCommandModel.find({ guildId }).lean();
    }
}

class GuildConfigSystem {
    async getConfig(guildId) {
        let config = await GuildConfigModel.findOne({ guildId });
        if (!config) config = await GuildConfigModel.create({ guildId });
        return config;
    }

    async setWelcome(guildId, channelId, message) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { welcomeChannelId: channelId, welcomeMessage: message },
            { upsert: true, new: true }
        );
    }

    async setGoodbye(guildId, channelId, message) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { goodbyeChannelId: channelId, goodbyeMessage: message },
            { upsert: true, new: true }
        );
    }

    async setAutorole(guildId, roleIds) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { autoroleIds: roleIds },
            { upsert: true, new: true }
        );
    }

    async setVerificationRole(guildId, roleId) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { verificationRoleId: roleId },
            { upsert: true, new: true }
        );
    }

    async setAdsChannel(guildId, channelId) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { adsChannelId: channelId },
            { upsert: true, new: true }
        );
    }

    async setAutoMessage(guildId, channelId, message, intervalMinutes) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { autoMessageChannelId: channelId, autoMessageText: message, autoMessageInterval: intervalMinutes },
            { upsert: true, new: true }
        );
    }

    async addReactionRole(guildId, messageId, emoji, roleId) {
        const config = await this.getConfig(guildId);
        config.reactionRoles.push({ messageId, emoji, roleId });
        await config.save();
        return config;
    }

    async setWhitelistMode(guildId, enabled) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { whitelistMode: enabled },
            { upsert: true, new: true }
        );
    }

    async setRaidMode(guildId, enabled) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { raidMode: enabled },
            { upsert: true, new: true }
        );
    }

    async setLanguage(guildId, language) {
        return GuildConfigModel.findOneAndUpdate(
            { guildId },
            { language },
            { upsert: true, new: true }
        );
    }
}

class AppealSystem {
    constructor() {
        this.appealCounter = 1;
    }

    async createAppeal(guildId, userId, type, reason) {
        const appealId = `APPEAL-${this.appealCounter++}`;
        await AppealModel.create({ appealId, guildId, userId, type, reason, status: 'pending' });
        return { success: true, appealId };
    }

    async reviewAppeal(appealId, status, reviewedBy) {
        const appeal = await AppealModel.findOne({ appealId });
        if (!appeal) return { success: false, error: 'Appeal not found' };
        appeal.status = status;
        appeal.reviewedBy = reviewedBy;
        appeal.reviewedAt = new Date();
        await appeal.save();
        return { success: true, appeal };
    }
}

class ApplicationSystem {
    constructor() {
        this.appCounter = 1;
    }

    async submitApplication(guildId, userId, type, content) {
        const appId = `APP-${this.appCounter++}`;
        await ApplicationModel.create({ appId, guildId, userId, type, content });
        return { success: true, appId };
    }
}

class NoteSystem {
    async addNote(guildId, userId, moderatorId, note) {
        await UserNoteModel.create({ guildId, userId, moderatorId, note });
        return true;
    }

    async listNotes(guildId, userId, limit = 10) {
        return UserNoteModel.find({ guildId, userId }).sort({ createdAt: -1 }).limit(limit).lean();
    }
}

class NotificationSystem {
    constructor() {
        this.parser = new Parser();
    }

    async addSubscription(guildId, channelId, type, url) {
        const sub = await NotificationModel.create({ guildId, channelId, type, url });
        return { success: true, subscription: sub };
    }

    async removeSubscription(guildId, id) {
        const result = await NotificationModel.deleteOne({ guildId, _id: id });
        return { success: result.deletedCount > 0 };
    }

    async listSubscriptions(guildId) {
        return NotificationModel.find({ guildId }).lean();
    }

    async pollSubscriptions(client) {
        const subs = await NotificationModel.find().lean();
        for (const sub of subs) {
            try {
                const feed = await this.parser.parseURL(sub.url);
                if (!feed || !feed.items || feed.items.length === 0) continue;

                const latest = feed.items[0];
                const guid = latest.guid || latest.id || latest.link || latest.title;
                if (!guid || guid === sub.lastGuid) continue;

                const channel = await client.channels.fetch(sub.channelId).catch(() => null);
                if (!channel || !channel.isTextBased()) continue;

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(latest.title || 'New Update')
                    .setURL(latest.link || sub.url)
                    .setDescription(latest.contentSnippet || latest.content || 'New update posted.')
                    .setFooter({ text: `${sub.type.toUpperCase()} Notification` })
                    .setTimestamp(new Date(latest.isoDate || Date.now()));

                await channel.send({ embeds: [embed] });

                await NotificationModel.updateOne({ _id: sub._id }, { $set: { lastGuid: guid } });
            } catch {
                // ignore feed errors
            }
        }
    }
}

class AuditLogger {
    async log(guildId, action, actorId, targetId, details) {
        await AuditLogModel.create({ guildId, action, actorId, targetId, details });
    }
}

module.exports = {
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
};
