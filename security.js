
class SecurityManager {
    constructor() {
        this.userCooldowns = new Map();
        this.rateLimitMap = new Map();
        this.blockedPatterns = [
            /eval\s*\(/i,
            /exec\s*\(/i,
            /function\s*\(/i,
            /<script/i,
            /javascript:/i
        ];
        this.invitePattern = /(discord\.gg|discord\.com\/invite)\//i;
        this.tokenPattern = /[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g;
        this.ipLoggerDomains = [
            'grabify.link',
            'iplogger.org',
            '2no.co',
            'yip.su',
            'iplogger.com',
            'blasze.com'
        ];
    }

    // Rate limiting - 5 commands per minute per user
    checkRateLimit(userId, permissionLevel) {
        // Owner bypasses rate limits
        if (permissionLevel >= 4) return true;

        const now = Date.now();
        const userLimit = this.rateLimitMap.get(userId) || { count: 0, resetTime: now + 60000 };

        if (now > userLimit.resetTime) {
            this.rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
            return true;
        }

        if (userLimit.count >= 5) {
            return false;
        }

        userLimit.count++;
        this.rateLimitMap.set(userId, userLimit);
        return true;
    }

    // Input validation - prevent code injection
    validateInput(input) {
        if (!input || typeof input !== 'string') return true;

        for (const pattern of this.blockedPatterns) {
            if (pattern.test(input)) {
                return false;
            }
        }

        return true;
    }

    // Sanitize token and sensitive data
    sanitizeLog(message) {
        if (!message) return message;
        
        // Remove potential tokens
        return message.replace(/[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g, '[TOKEN_REDACTED]')
                     .replace(/mfa\.[a-z0-9_-]{84}/gi, '[MFA_TOKEN_REDACTED]');
    }

    containsToken(content) {
        if (!content || typeof content !== 'string') return false;
        return /[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/.test(content);
    }

    containsInvite(content) {
        if (!content || typeof content !== 'string') return false;
        return this.invitePattern.test(content);
    }

    containsIPLogger(content) {
        if (!content || typeof content !== 'string') return false;
        const lower = content.toLowerCase();
        return this.ipLoggerDomains.some(domain => lower.includes(domain));
    }

    containsBannedUsername(username) {
        if (!username || typeof username !== 'string') return false;
        const lower = username.toLowerCase();
        const banned = ['nword', 'rword', 'fword', 'slur1', 'slur2'];
        return banned.some(word => lower.includes(word));
    }

    // Check for scam patterns
    isScamMessage(content) {
        const scamPatterns = [
            /free\s+(nitro|robux|money|vbucks)/i,
            /click\s+here\s+to\s+(win|claim|get)/i,
            /verify\s+(account|identity)/i,
            /confirm\s+identity/i,
            /suspicious\s+activity/i,
            /unusual\s+login/i,
            /@everyone.*free.*nitro/i,
            /discord\.gift\/fake/i
        ];

        return scamPatterns.some(pattern => pattern.test(content));
    }

    // Link filtering
    isAllowedLink(content) {
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

        // Check if message contains URLs
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlPattern);

        if (!urls) return true;

        for (const url of urls) {
            // Check if it's an allowed domain
            const isAllowed = allowedDomains.some(domain => url.includes(domain));
            if (isAllowed) continue;

            // Check if it's a blocked domain
            const isBlocked = blockedDomains.some(domain => url.includes(domain));
            if (isBlocked) return false;
        }

        return true;
    }

    // Word filter
    containsBannedWords(content) {
        const bannedWords = [
            // Add custom banned words here
            'badword1',
            'badword2'
        ];

        const lowerContent = content.toLowerCase();
        return bannedWords.some(word => lowerContent.includes(word));
    }
}

module.exports = SecurityManager;
