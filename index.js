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
const { commandModules, handleChatInputInteraction } = require("./interactions");
const { hasExplicit67 } = require("./triggers/explicit67");
const { hasSixThenSevenSequence } = require("./triggers/sequence67");
const { countTriggers } = require("./triggers/count67");
const { checkEvery67thCounter } = require("./triggers/every67th");
const { detectSyllableTriggers } = require("./triggers/syllable67");
const { isTimestamp67 } = require("./triggers/timestamp67");
const { hasSixSevenWordPair } = require("./triggers/wordLength67");

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

async function registerGuildCommands(client, guildIds) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID || client.application?.id;

  if (!clientId || guildIds.length === 0) {
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

  // Entries only matter within the cooldown window; sweep expired ones so
  // the map doesn't grow with every channel ever seen.
  const cooldownSweep = setInterval(() => {
    const cutoff = Date.now() - config.cooldownMs;
    for (const [key, lastSent] of channelCooldowns) {
      if (lastSent <= cutoff) {
        channelCooldowns.delete(key);
      }
    }
  }, Math.max(config.cooldownMs, 10 * 60 * 1000));
  cooldownSweep.unref();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
      await registerGuildCommands(client, [...client.guilds.cache.keys()]);
    } catch (error) {
      console.error("Failed to register guild commands", error);
    }
  });

  client.on("guildCreate", async (guild) => {
    try {
      await registerGuildCommands(client, [guild.id]);
    } catch (error) {
      console.error(`Failed to register commands for new guild ${guild.id}`, error);
    }
  });

  client.on("interactionCreate", async (interaction) => {
    await handleChatInputInteraction(interaction, { store, config });
  });

  client.on("messageCreate", async (message) => {
    try {
      await handleMessageTriggers(message);
    } catch (error) {
      console.error("Failed to handle message triggers", error);
    }
  });

  async function handleMessageTriggers(message) {
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

    const syllableResult = detectSyllableTriggers(content);
    if (syllableResult.triggerTypes.length > 0) {
      reasons.push(...syllableResult.reasons);
      triggerTypes.push(...syllableResult.triggerTypes);
    }

    if (isTimestamp67(message.createdAt)) {
      reasons.push("your message timestamp landed at X:06:07");
      triggerTypes.push("timestamp67");
    }

    if (hasSixSevenWordPair(content)) {
      reasons.push("a 6-letter word was immediately followed by a 7-letter word");
      triggerTypes.push("wordlen67");
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
      milestoneStep: config.milestoneStep
    });

    // Milestones only fire on the message that crosses them, so announce them
    // even when the channel cooldown suppresses the regular response.
    for (const milestone of recordResult.milestones) {
      await message.channel.send(
        `🎉 <@${message.author.id}> just hit ${milestone} lifetime triggers! They are truly ⁶🤷⁷`
      );
    }

    const cooldownKey = `${message.guild.id}:${message.channel.id}`;
    const now = Date.now();
    const lastSent = channelCooldowns.get(cooldownKey) ?? 0;

    if (now - lastSent < config.cooldownMs) {
      return;
    }

    channelCooldowns.set(cooldownKey, now);

    const response = chooseResponseText();
    const hint = `*${reasons.join("; ")}*`;
    await message.channel.send(`${response}\n${hint}`);
  }

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    console.log(`Received ${signal}, shutting down`);
    clearInterval(cooldownSweep);

    try {
      await client.destroy();
    } catch (error) {
      console.error("Error while disconnecting from Discord", error);
    }

    try {
      store.db.close();
    } catch (error) {
      console.error("Error while closing the database", error);
    }

    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await client.login(token);
}

main().catch((error) => {
  console.error("Fatal startup error", error);
  process.exitCode = 1;
});
