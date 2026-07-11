const { EmbedBuilder } = require("discord.js");
const { resolveUsername } = require("./resolveUsername");

module.exports = {
  name: "streak",
  description: "Show top current streaks in this server",
  async execute(interaction, { store }) {
    // Member fetches below can exceed Discord's 3-second interaction window.
    await interaction.deferReply();

    const topStreaks = store.getGuildCurrentStreaks(interaction.guildId, 10);
    const requesterStats = store.getUserStats(interaction.guildId, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("67 Streaks")
      .setFooter({ text: "Consecutive UTC days with at least one trigger" });

    if (!topStreaks.length) {
      embed.setDescription("No active streaks right now. Start a fresh ⁶🤷⁷ run today.");
    } else {
      const usernames = await Promise.all(
        topStreaks.map((entry) => resolveUsername(interaction, entry.userId))
      );

      const lines = topStreaks.map(
        (entry, i) => `**${i + 1}.** ${usernames[i]} - **${entry.currentStreak}** day(s)`
      );
      embed.setDescription(lines.join("\n"));
    }

    embed.addFields({
      name: "Your Current Streak",
      value: `**${requesterStats.currentStreak}** day(s)`
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
