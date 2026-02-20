const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

async function connectDB() {
    if (isConnected) return mongoose.connection;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not set in .env');
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
    });

    isConnected = true;
    console.log('âœ… MongoDB connected');
    return mongoose.connection;
}

const userSchema = new mongoose.Schema({
    userId: { type: String, index: true, unique: true },
    username: { type: String, default: '' },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    money: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    lastDaily: { type: Date, default: null },
    lastMessageAt: { type: Date, default: null },
    lastWorkAt: { type: Date, default: null }
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, index: true, unique: true },
    guildId: { type: String, index: true },
    channelId: { type: String },
    userId: { type: String },
    username: { type: String },
    reason: { type: String },
    status: { type: String, default: 'open' },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedBy: { type: String, default: null }
});

const giveawaySchema = new mongoose.Schema({
    giveawayId: { type: String, index: true, unique: true },
    guildId: { type: String, index: true },
    channelId: { type: String },
    messageId: { type: String },
    prize: { type: String },
    winners: { type: Number, default: 1 },
    endTime: { type: Date },
    hostId: { type: String },
    ended: { type: Boolean, default: false }
}, { timestamps: true });

const whitelistSchema = new mongoose.Schema({
    appId: { type: String, index: true, unique: true },
    userId: { type: String },
    username: { type: String },
    steamId: { type: String },
    status: { type: String, default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    approvedBy: { type: String, default: null },
    deniedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null }
});

const reportSchema = new mongoose.Schema({
    reportId: { type: String, index: true, unique: true },
    guildId: { type: String, index: true },
    reporterId: { type: String },
    reportedId: { type: String },
    reason: { type: String },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null }
});

const customCommandSchema = new mongoose.Schema({
    guildId: { type: String, index: true },
    trigger: { type: String, index: true },
    response: { type: String },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, index: true, unique: true },
    welcomeChannelId: { type: String, default: null },
    welcomeMessage: { type: String, default: 'Welcome {{user}} to {{server}}!' },
    goodbyeChannelId: { type: String, default: null },
    goodbyeMessage: { type: String, default: 'Goodbye {{user}}!' },
    autoroleIds: { type: [String], default: [] },
    verificationRoleId: { type: String, default: null },
    reactionRoles: { type: [Object], default: [] },
    adsChannelId: { type: String, default: null },
    autoMessageChannelId: { type: String, default: null },
    autoMessageText: { type: String, default: null },
    autoMessageInterval: { type: Number, default: 0 },
    whitelistMode: { type: Boolean, default: false },
    raidMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    logChannelId: { type: String, default: null }
});

const appealSchema = new mongoose.Schema({
    appealId: { type: String, index: true, unique: true },
    guildId: { type: String, index: true },
    userId: { type: String },
    type: { type: String, default: 'ban' },
    reason: { type: String },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null }
});

const applicationSchema = new mongoose.Schema({
    appId: { type: String, index: true, unique: true },
    guildId: { type: String, index: true },
    userId: { type: String },
    type: { type: String, default: 'staff' },
    content: { type: String },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const userNoteSchema = new mongoose.Schema({
    guildId: { type: String, index: true },
    userId: { type: String, index: true },
    moderatorId: { type: String },
    note: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const auditLogSchema = new mongoose.Schema({
    guildId: { type: String, index: true },
    action: { type: String },
    actorId: { type: String },
    targetId: { type: String, default: null },
    details: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const dailyActivitySchema = new mongoose.Schema({
    guildId: { type: String, index: true },
    date: { type: String, index: true },
    userId: { type: String, index: true },
    username: { type: String, default: '' },
    lastSeenAt: { type: Date, default: Date.now }
});

dailyActivitySchema.index({ guildId: 1, date: 1, userId: 1 }, { unique: true });

const notificationSchema = new mongoose.Schema({
    guildId: { type: String, index: true },
    channelId: { type: String },
    type: { type: String, default: 'rss' },
    url: { type: String },
    lastGuid: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});


// Role Reaction Schema - stores emoji->role mappings for messages
const reactionRoleSchema = new mongoose.Schema({
    guildId: { type: String, index: true },
    channelId: { type: String },
    messageId: { type: String, index: true },
    emoji: { type: String },
    roleId: { type: String },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

reactionRoleSchema.index({ guildId: 1, messageId: 1, emoji: 1 }, { unique: true });

// Verification Schema - stores verification settings per guild
const verificationSchema = new mongoose.Schema({
    guildId: { type: String, index: true, unique: true },
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    verifiedRoleId: { type: String, default: null },
    unverifiedRoleId: { type: String, default: null },
    emoji: { type: String, default: 'ï¿½' },
    createdAt: { type: Date, default: Date.now }
});
// Script Schema
const scriptSchema = new mongoose.Schema({
    guildId: String,
    scriptId: { type: String, unique: true },
    name: String,
    description: String,
    category: String,
    downloadLink: String,
    author: String,
    authorId: String,
    version: { type: String, default: '1.0.0' },
    price: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    tags: [String],
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const ScriptModel = mongoose.model('Script', scriptSchema);

const ReactionRoleModel = mongoose.model('ReactionRole', reactionRoleSchema);
const VerificationModel = mongoose.model('Verification', verificationSchema);

const UserModel = mongoose.model('User', userSchema);
const TicketModel = mongoose.model('Ticket', ticketSchema);
const GiveawayModel = mongoose.model('Giveaway', giveawaySchema);
const WhitelistModel = mongoose.model('WhitelistApp', whitelistSchema);
const ReportModel = mongoose.model('Report', reportSchema);
const CustomCommandModel = mongoose.model('CustomCommand', customCommandSchema);
const GuildConfigModel = mongoose.model('GuildConfig', guildConfigSchema);
const AppealModel = mongoose.model('Appeal', appealSchema);
const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
const DailyActivityModel = mongoose.model('DailyActivity', dailyActivitySchema);
const NotificationModel = mongoose.model('Notification', notificationSchema);
const ApplicationModel = mongoose.model('Application', applicationSchema);
const UserNoteModel = mongoose.model('UserNote', userNoteSchema);

// Dashboard Audit Log - tracks actions from the dashboard (user lookups, announcements, etc.)
const dashboardAuditSchema = new mongoose.Schema({
    action: { type: String, required: true }, // USER_LOOKUP, ANNOUNCEMENT, MODULE_TOGGLE, BOT_CONTROL
    actor: { type: String, default: 'admin' }, // Who performed the action
    targetId: { type: String, default: null }, // Target user/channel ID if applicable
    details: { type: String, default: '' }, // Additional details
    status: { type: String, default: 'success' }, // success, failed
    timestamp: { type: Date, default: Date.now }
});

const DashboardAuditModel = mongoose.model('DashboardAudit', dashboardAuditSchema);




module.exports = {
    connectDB,
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
    UserNoteModel,
    ScriptModel,
    ReactionRoleModel,
    VerificationModel,
    DashboardAuditModel
};
