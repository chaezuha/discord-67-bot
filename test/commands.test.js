const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { initDb } = require("../db");
const { handleChatInputInteraction } = require("../interactions");
const { resolveUsername } = require("../commands/resolveUsername");
const leaderboardCommand = require("../commands/leaderboard");
const streakCommand = require("../commands/streak");

const config = require("../config");

function createStore(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "67bot-test-"));
  const store = initDb(path.join(dir, "test.sqlite"));

  t.after(() => {
    store.db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  return store;
}

function createMockInteraction({ subcommand = "stats", fetchMember } = {}) {
  const calls = [];
  const interaction = {
    guildId: "g1",
    user: { id: "u1", displayAvatarURL: () => "https://example.com/avatar.png" },
    guild: {
      members: {
        fetch: fetchMember ?? (async () => ({ displayName: "Someone" }))
      }
    },
    options: { getSubcommand: () => subcommand },
    commandName: "67",
    deferred: false,
    replied: false,
    isChatInputCommand: () => true,
    async deferReply(payload) {
      calls.push(["deferReply", payload]);
      interaction.deferred = true;
    },
    async reply(payload) {
      calls.push(["reply", payload]);
      interaction.replied = true;
    },
    async editReply(payload) {
      calls.push(["editReply", payload]);
    },
    async followUp(payload) {
      calls.push(["followUp", payload]);
    }
  };

  return { interaction, calls };
}

function record(store, userId, triggerTypes = ["explicit"]) {
  store.recordTriggers({
    guildId: "g1",
    channelId: "c1",
    userId,
    triggerTypes,
    milestoneStep: 67
  });
}

test("resolveUsername", async (t) => {
  await t.test("escapes Markdown in display names", async () => {
    const { interaction } = createMockInteraction({
      fetchMember: async () => ({ displayName: "**bold** _sneaky_" })
    });

    const name = await resolveUsername(interaction, "u1");
    assert.equal(name.includes("**"), false);
    assert.equal(name.includes("_sneaky_"), false);
    assert.ok(name.includes("bold"));
  });

  await t.test("falls back to a mention when the member fetch fails", async () => {
    const { interaction } = createMockInteraction({
      fetchMember: async () => {
        throw new Error("Unknown Member");
      }
    });

    assert.equal(await resolveUsername(interaction, "u2"), "<@u2>");
  });
});

test("leaderboard command", async (t) => {
  await t.test("defers before fetching members, then edits the reply", async () => {
    const store = createStore(t);
    record(store, "u1");
    record(store, "u2", ["explicit", "sequence"]);

    let deferredBeforeFetch = null;
    const { interaction, calls } = createMockInteraction({
      fetchMember: async () => {
        deferredBeforeFetch ??= interaction.deferred;
        return { displayName: "Someone" };
      }
    });

    await leaderboardCommand.execute(interaction, { store, config });

    assert.equal(calls[0][0], "deferReply");
    assert.equal(deferredBeforeFetch, true);
    assert.equal(calls.at(-1)[0], "editReply");
    assert.equal(calls.some(([name]) => name === "reply"), false);
  });

  await t.test("edits the deferred reply when the leaderboard is empty", async () => {
    const store = createStore(t);
    const { interaction, calls } = createMockInteraction();

    await leaderboardCommand.execute(interaction, { store, config });

    assert.deepEqual(calls.map(([name]) => name), ["deferReply", "editReply"]);
  });

  await t.test("still renders entries when member fetches fail", async () => {
    const store = createStore(t);
    record(store, "u1");

    const { interaction, calls } = createMockInteraction({
      fetchMember: async () => {
        throw new Error("Unknown Member");
      }
    });

    await leaderboardCommand.execute(interaction, { store, config });

    const [, payload] = calls.at(-1);
    assert.ok(payload.embeds[0].data.description.includes("<@u1>"));
  });
});

test("streak command", async (t) => {
  await t.test("defers first and edits the reply", async () => {
    const store = createStore(t);
    record(store, "u1");

    const { interaction, calls } = createMockInteraction();

    await streakCommand.execute(interaction, { store, config });

    assert.equal(calls[0][0], "deferReply");
    assert.equal(calls.at(-1)[0], "editReply");
  });
});

test("handleChatInputInteraction", async (t) => {
  await t.test("replies ephemerally to unknown subcommands", async () => {
    const store = createStore(t);
    const { interaction, calls } = createMockInteraction({ subcommand: "bogus" });

    await handleChatInputInteraction(interaction, { store, config });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "reply");
    assert.ok(calls[0][1].content.includes("Unknown"));
  });

  await t.test("ignores interactions for other commands", async () => {
    const store = createStore(t);
    const { interaction, calls } = createMockInteraction();
    interaction.commandName = "other";

    await handleChatInputInteraction(interaction, { store, config });

    assert.equal(calls.length, 0);
  });

  await t.test("sends an error reply when a command throws before replying", async () => {
    const store = createStore(t);
    const { interaction, calls } = createMockInteraction({ subcommand: "stats" });
    interaction.options.getSubcommand = () => "stats";
    // Make the stats query blow up by handing over a broken store.
    const brokenStore = { getUserStats: () => { throw new Error("boom"); } };

    await handleChatInputInteraction(interaction, { store: brokenStore, config });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "reply");
    assert.ok(calls[0][1].content.includes("went wrong"));
  });

  await t.test("uses followUp when a command throws after deferring", async () => {
    const { interaction, calls } = createMockInteraction({ subcommand: "leaderboard" });
    const brokenStore = {
      getGuildLeaderboard: () => {
        throw new Error("boom");
      }
    };

    await handleChatInputInteraction(interaction, { store: brokenStore, config });

    assert.equal(calls[0][0], "deferReply");
    assert.equal(calls.at(-1)[0], "followUp");
    assert.ok(calls.at(-1)[1].content.includes("went wrong"));
  });

  await t.test("survives the error reply itself failing", async () => {
    const { interaction } = createMockInteraction({ subcommand: "leaderboard" });
    const brokenStore = {
      getGuildLeaderboard: () => {
        throw new Error("boom");
      }
    };
    interaction.followUp = async () => {
      throw new Error("cannot send");
    };

    await assert.doesNotReject(
      handleChatInputInteraction(interaction, { store: brokenStore, config })
    );
  });
});
