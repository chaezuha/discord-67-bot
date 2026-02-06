const { EmbedBuilder } = require("discord.js");

async function resolveUsername(interaction, userId) {
  try {
    const member = await interaction.guild.members.fetch(userId);
    return member.displayName;
  } catch {
    return `<@${userId}>`;
  }
}

module.exports = {
  name: "streak",
  description: "Show top current streaks in this server",
  async execute(interaction, { store }) {
    const topStreaks = store.getGuildCurrentStreaks(interaction.guildId, 10);
    const requesterStats = store.getUserStats(interaction.guildId, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("67 Streaks")
      .setFooter({ text: "Consecutive UTC days with at least one trigger" });

    if (!topStreaks.length) {
      embed.setDescription("No active streaks right now. Start a fresh ⁶🤷⁷ run today.");
    } else {
      const lines = [];
      for (let i = 0; i < topStreaks.length; i += 1) {
        const entry = topStreaks[i];
        const username = await resolveUsername(interaction, entry.userId);
        lines.push(`**${i + 1}.** ${username} - **${entry.currentStreak}** day(s)`);
      }
      embed.setDescription(lines.join("\n"));
    }

    embed.addFields({
      name: "Your Current Streak",
      value: `**${requesterStats.currentStreak}** day(s)`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
