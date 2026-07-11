const { MessageFlags } = require("discord.js");

const statsCommand = require("./commands/stats");
const leaderboardCommand = require("./commands/leaderboard");
const streakCommand = require("./commands/streak");
const helpCommand = require("./commands/help");

const commandModules = [statsCommand, leaderboardCommand, streakCommand, helpCommand];
const commandHandlers = new Map(commandModules.map((cmd) => [cmd.name, cmd]));

async function handleChatInputInteraction(interaction, { store, config }) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "67") {
    return;
  }

  const subcommand = interaction.options.getSubcommand();
  const handler = commandHandlers.get(subcommand);

  if (!handler) {
    await interaction.reply({ content: "Unknown /67 subcommand.", flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await handler.execute(interaction, { store, config });
  } catch (error) {
    console.error(`Error handling /67 ${subcommand}`, error);

    try {
      const errorReply = {
        content: "Something went wrong while running that command.",
        flags: MessageFlags.Ephemeral
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    } catch (replyError) {
      console.error(`Failed to send error reply for /67 ${subcommand}`, replyError);
    }
  }
}

module.exports = {
  commandModules,
  handleChatInputInteraction
};
