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
  name: "leaderboard",
  description: "Show the server's top 67 trigger users",
  async execute(interaction, { store }) {
    const leaderboard = store.getGuildLeaderboard(interaction.guildId, 10);

    if (!leaderboard.length) {
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("67 Leaderboard")
        .setDescription("No one has triggered ⁶🤷⁷ yet in this server.");

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const lines = [];
    for (let i = 0; i < leaderboard.length; i += 1) {
      const entry = leaderboard[i];
      const username = await resolveUsername(interaction, entry.userId);
      const crown = i === 0 ? " 👑" : "";
      lines.push(`**${i + 1}.** ${username}${crown} - **${entry.total}**`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("67 Leaderboard")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Top 10 lifetime trigger counts" });

    const requesterInTop10 = leaderboard.some((entry) => entry.userId === interaction.user.id);
    if (!requesterInTop10) {
      const requesterRank = store.getUserRank(interaction.guildId, interaction.user.id);
      if (requesterRank) {
        embed.addFields({
          name: "Your Rank",
          value: `#${requesterRank.rank} with **${requesterRank.total}** trigger(s)`
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  }
};
