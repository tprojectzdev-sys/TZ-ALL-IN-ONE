// Place this BEFORE the closing of client.on('messageCreate')

  // REACTION ROLE COMMANDS
  if (message.content.startsWith('!reactionrole')) {
    if (!message.member.permissions.has('ManageRoles')) {
      return message.reply(' You need **Manage Roles** permission!');
    }

    const args = message.content.split(' ').slice(1);
    const subCmd = args[0]?.toLowerCase();

    if (subCmd === 'add') {
      const [_, msgId, emoji, roleArg] = args;
      if (!msgId || !emoji || !roleArg) return message.reply(' Usage: \!reactionrole add <messageID> <emoji> <@role>\');

      const roleMatch = roleArg.match(/^<@&(\d+)>$|^(\d+)$/);
      if (!roleMatch) return message.reply(' Invalid role!');
      
      const roleId = roleMatch[1] || roleMatch[2];
      const role = message.guild.roles.cache.get(roleId);
      if (!role) return message.reply(' Role not found!');

      let targetMsg = null;
      for (const [, channel] of message.guild.channels.cache) {
        if (channel.isTextBased()) {
          try {
            targetMsg = await channel.messages.fetch(msgId);
            if (targetMsg) break;
          } catch {}
        }
      }

      if (!targetMsg) return message.reply(' Message not found!');

      try {
        const { ReactionRoleModel } = require('./db');
        await ReactionRoleModel.create({
          guildId: message.guild.id,
          channelId: targetMsg.channel.id,
          messageId: msgId,
          emoji: emoji,
          roleId: roleId,
          createdBy: message.author.id
        });
        await targetMsg.react(emoji);
        return message.reply(\ Reaction role added!   ****\);
      } catch (err) {
        console.error('Reaction role add:', err);
        return message.reply(' Failed! Emoji already in use or permission issue.');
      }
    }

    else if (subCmd === 'remove') {
      const [_, msgId, emoji] = args;
      if (!msgId || !emoji) return message.reply(' Usage: \!reactionrole remove <messageID> <emoji>\');

      try {
        const { ReactionRoleModel } = require('./db');
        const deleted = await ReactionRoleModel.findOneAndDelete({
          guildId: message.guild.id,
          messageId: msgId,
          emoji: emoji
        });
        if (!deleted) return message.reply(' No reaction role found!');
        return message.reply(\ Reaction role removed! \);
      } catch (err) {
        return message.reply(' Failed to remove.');
      }
    }

    else if (subCmd === 'list') {
      try {
        const { ReactionRoleModel } = require('./db');
        const rrs = await ReactionRoleModel.find({ guildId: message.guild.id });
        if (rrs.length === 0) return message.reply('ℹ No reaction roles configured.');

        const embed = {
          color: 0x7C3AED,
          title: ' Reaction Roles',
          fields: rrs.map(r => {
            const role = message.guild.roles.cache.get(r.roleId);
            return { name: \${r.emoji}  \, value: \Message: \\\${r.messageId}\\\\, inline: false };
          })
        };
        return message.reply({ embeds: [embed] });
      } catch (err) {
        return message.reply(' Failed to list.');
      }
    }

    else {
      return message.reply(' Usage: \!reactionrole <add|remove|list>\');
    }
  }

  // VERIFICATION SETUP
  if (message.content.startsWith('!verify-setup')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply(' Administrator permission required!');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 3) {
      return message.reply(' Usage: \!verify-setup #channel @verifiedRole @unverifiedRole [emoji]\');
    }

    const chMatch = args[0].match(/^<#(\d+)>$|^(\d+)$/);
    const vRoleMatch = args[1].match(/^<@&(\d+)>$|^(\d+)$/);
    const uvRoleMatch = args[2].match(/^<@&(\d+)>$|^(\d+)$/);
    const emoji = args[3] || '';

    if (!chMatch || !vRoleMatch || !uvRoleMatch) {
      return message.reply(' Invalid format!');
    }

    const channelId = chMatch[1] || chMatch[2];
    const vRoleId = vRoleMatch[1] || vRoleMatch[2];
    const uvRoleId = uvRoleMatch[1] || uvRoleMatch[2];

    const channel = message.guild.channels.cache.get(channelId);
    const vRole = message.guild.roles.cache.get(vRoleId);
    const uvRole = message.guild.roles.cache.get(uvRoleId);

    if (!channel?.isTextBased() || !vRole || !uvRole) {
      return message.reply(' Channel or roles not found!');
    }

    try {
      const { VerificationModel } = require('./db');
      
      const verifyMsg = await channel.send({
        embeds: [{
          color: 0x7C3AED,
          title: ' Verification Required',
          description: \Welcome to ****!\n\nReact with  to verify.\,
          footer: { text: 'By verifying, you agree to follow server rules.' }
        }]
      });

      await verifyMsg.react(emoji);

      await VerificationModel.findOneAndUpdate(
        { guildId: message.guild.id },
        {
          enabled: true,
          channelId: channelId,
          messageId: verifyMsg.id,
          verifiedRoleId: vRoleId,
          unverifiedRoleId: uvRoleId,
          emoji: emoji
        },
        { upsert: true }
      );

      return message.reply(\ Verification enabled!\n**Channel:** <#>\n**Verified Role:** \n**Unverified Role:** \n**Emoji:** \);
    } catch (err) {
      console.error('Verification setup:', err);
      return message.reply(' Failed to setup verification!');
    }
  }

  if (message.content.startsWith('!verify-disable')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply(' Administrator permission required!');
    }

    try {
      const { VerificationModel } = require('./db');
      await VerificationModel.findOneAndUpdate(
        { guildId: message.guild.id },
        { enabled: false }
      );
      return message.reply(' Verification disabled!');
    } catch (err) {
      return message.reply(' Failed to disable.');
    }
  }
