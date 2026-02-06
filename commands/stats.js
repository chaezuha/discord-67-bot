const { EmbedBuilder } = require("discord.js");

function formatBreakdown(breakdown) {
  return [
    `Explicit 67: **${breakdown.explicit}**`,
    `6 ... 7 sequence: **${breakdown.sequence}**`,
    `67 characters: **${breakdown.charcount}**`,
    `67 words: **${breakdown.wordcount}**`,
    `Every 67th message: **${breakdown.every67th}**`,
    `67 syllables total: **${breakdown.syllable67}**`,
    `6-syllable sentence then 7: **${breakdown.syllable67pair}**`,
    `Timestamp X:06:07: **${breakdown.timestamp67}**`,
    `6-letter then 7-letter word pair: **${breakdown.wordlen67}**`
  ].join("\n");
}

module.exports = {
  name: "stats",
  description: "Show your personal 67 stats",
  async execute(interaction, { store }) {
    const stats = store.getUserStats(interaction.guildId, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Your 67 Stats")
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "Total Triggers", value: `**${stats.total}**`, inline: true },
        { name: "Current Streak", value: `**${stats.currentStreak}** day(s)`, inline: true },
        { name: "Longest Streak", value: `**${stats.longestStreak}** day(s)`, inline: true },
        { name: "Breakdown", value: formatBreakdown(stats.breakdown) }
      )
      .setFooter({ text: "AYYY ⁶🤷⁷" });

    await interaction.reply({ embeds: [embed] });
  }
};
