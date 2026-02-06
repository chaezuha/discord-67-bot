require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const config = require("./config");
const { initDb } = require("./db");
const { hasExplicit67 } = require("./triggers/explicit67");
const { hasSixThenSevenSequence } = require("./triggers/sequence67");
const { countTriggers } = require("./triggers/count67");
const { checkEvery67thCounter } = require("./triggers/every67th");

const statsCommand = require("./commands/stats");
const leaderboardCommand = require("./commands/leaderboard");
const streakCommand = require("./commands/streak");
const helpCommand = require("./commands/help");

const commandModules = [statsCommand, leaderboardCommand, streakCommand, helpCommand];
const commandHandlers = new Map(commandModules.map((cmd) => [cmd.name, cmd]));

function buildCommandDefinition() {
  const root = new SlashCommandBuilder().setName("67").setDescription("67 bot commands");

  for (const command of commandModules) {
    root.addSubcommand((subcommand) =>
      subcommand.setName(command.name).setDescription(command.description)
    );
  }

  return root;
}

function chooseResponseText() {
  if (Math.random() < config.rareVariantChance) {
    const randomIndex = Math.floor(Math.random() * config.rareVariants.length);
    return config.rareVariants[randomIndex];
  }

  return config.standardResponse;
}

async function registerGuildCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildIdsRaw = process.env.GUILD_IDS || process.env.GUILD_ID || "";
  const guildIds = guildIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!token || !clientId || guildIds.length === 0) {
    console.warn(
      "Skipping command registration. Set DISCORD_TOKEN, CLIENT_ID, and GUILD_ID or GUILD_IDS."
    );
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const body = [buildCommandDefinition().toJSON()];

  for (const guildId of guildIds) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`Registered /67 commands for guild ${guildId}`);
  }
}

async function main() {
  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error("Missing DISCORD_TOKEN in environment");
  }

  const store = initDb(config.dbPath);
  const channelCooldowns = new Map();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
      await registerGuildCommands();
    } catch (error) {
      console.error("Failed to register guild commands", error);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "67") {
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const handler = commandHandlers.get(subcommand);

    if (!handler) {
      await interaction.reply({ content: "Unknown /67 subcommand.", ephemeral: true });
      return;
    }

    try {
      await handler.execute(interaction, { store, config });
    } catch (error) {
      console.error(`Error handling /67 ${subcommand}`, error);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "Something went wrong while running that command.",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "Something went wrong while running that command.",
          ephemeral: true
        });
      }
    }
  });

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) {
      return;
    }

    const reasons = [];
    const triggerTypes = [];
    const content = message.content ?? "";

    if (hasExplicit67(content)) {
      reasons.push("67 detected in your message");
      triggerTypes.push("explicit");
    }

    if (hasSixThenSevenSequence(content)) {
      reasons.push('"6" followed by "7" found in sequence');
      triggerTypes.push("sequence");
    }

    const countResult = countTriggers(content);
    if (countResult.triggerTypes.length > 0) {
      reasons.push(...countResult.reasons);
      triggerTypes.push(...countResult.triggerTypes);
    }

    const every67thResult = checkEvery67thCounter(store, message.guild.id, message.channel.id);
    if (every67thResult.triggered) {
      reasons.push(every67thResult.reason);
      triggerTypes.push(every67thResult.triggerType);
    }

    if (triggerTypes.length === 0) {
      return;
    }

    const uniqueTriggerTypes = [...new Set(triggerTypes)];
    const recordResult = store.recordTriggers({
      guildId: message.guild.id,
      channelId: message.channel.id,
      userId: message.author.id,
      triggerTypes: uniqueTriggerTypes,
      messageContent: content,
      milestoneStep: config.milestoneStep
    });

    const cooldownKey = `${message.guild.id}:${message.channel.id}`;
    const now = Date.now();
    const lastSent = channelCooldowns.get(cooldownKey) ?? 0;

    if (now - lastSent < config.cooldownMs) {
      return;
    }

    channelCooldowns.set(cooldownKey, now);

    try {
      const response = chooseResponseText();
      const hint = `*${reasons.join("; ")}*`;
      await message.channel.send(`${response}\n${hint}`);

      for (const milestone of recordResult.milestones) {
        await message.channel.send(
          `🎉 <@${message.author.id}> just hit ${milestone} lifetime triggers! They are truly ⁶🤷⁷`
        );
      }
    } catch (error) {
      console.error("Failed to send trigger response", error);
    }
  });

  await client.login(token);
}

main().catch((error) => {
  console.error("Fatal startup error", error);
  process.exitCode = 1;
});
