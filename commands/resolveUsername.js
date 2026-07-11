const { escapeMarkdown } = require("discord.js");

async function resolveUsername(interaction, userId) {
  try {
    const member = await interaction.guild.members.fetch(userId);
    return escapeMarkdown(member.displayName);
  } catch {
    return `<@${userId}>`;
  }
}

module.exports = {
  resolveUsername
};
