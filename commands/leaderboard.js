const { EmbedBuilder } = require("discord.js");
const { resolveUsername } = require("./resolveUsername");

module.exports = {
  name: "leaderboard",
  description: "Show the server's top 67 trigger users",
  async execute(interaction, { store }) {
    // Member fetches below can exceed Discord's 3-second interaction window.
    await interaction.deferReply();

    const leaderboard = store.getGuildLeaderboard(interaction.guildId, 10);

    if (!leaderboard.length) {
      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("67 Leaderboard")
        .setDescription("No one has triggered ⁶🤷⁷ yet in this server.");

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const usernames = await Promise.all(
      leaderboard.map((entry) => resolveUsername(interaction, entry.userId))
    );

    const lines = leaderboard.map((entry, i) => {
      const crown = i === 0 ? " 👑" : "";
      return `**${i + 1}.** ${usernames[i]}${crown} - **${entry.total}**`;
    });

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

    await interaction.editReply({ embeds: [embed] });
  }
};
