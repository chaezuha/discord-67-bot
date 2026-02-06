const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Explain triggers and commands",
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle("67 Bot Help")
      .setDescription("I watch for 67 magic and reply with `AYYY ⁶🤷⁷`.")
      .addFields(
        {
          name: "Triggers",
          value: [
            "1) Explicit 67: `67`, `#67`, `no. 67`, `6-7`, `6 7`, `6, 7`, `six seven`",
            '2) Sequence: digit `6` followed by digit `7` in the same sentence (up to 10 words apart)',
            "3) Exact count: message is exactly 67 characters or exactly 67 words",
            "4) Every 67th message in a channel (counter resets after triggering)",
            "5) Syllables: message totals exactly 67 syllables (heuristic count)",
            "6) Sentence pair: sentence one has 6 syllables and sentence two has 7",
            "7) Timestamp: message created at X:06:07 (UTC minute/second)",
            "8) Word pair: a 6-letter word immediately followed by a 7-letter word"
          ].join("\n")
        },
        {
          name: "Commands",
          value: [
            "`/67 stats` - your totals, breakdown, and streaks",
            "`/67 leaderboard` - top 10 users by lifetime triggers",
            "`/67 streak` - top current streaks in this server",
            "`/67 help` - this guide"
          ].join("\n")
        },
        {
          name: "Behavior Notes",
          value: [
            "- Ignores bot messages",
            "- Per-channel cooldown is applied to responses",
            "- Trigger events are still counted during cooldown",
            "- Rare variant response has a configurable chance"
          ].join("\n")
        }
      )
      .setFooter({ text: "Dictionary.com's 2025 Word of the Year: 6-7" });

    await interaction.reply({ embeds: [embed] });
  }
};
