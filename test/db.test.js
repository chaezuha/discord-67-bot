const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { initDb, calculateStreaks } = require("../db");
const { checkEvery67thCounter } = require("../triggers/every67th");

function toDayStringUtc(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n) {
  return toDayStringUtc(new Date(Date.now() - n * 86400000));
}

function createStore(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "67bot-test-"));
  const store = initDb(path.join(dir, "test.sqlite"));

  t.after(() => {
    store.db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  return store;
}

test("calculateStreaks", async (t) => {
  await t.test("returns zeros for no days", () => {
    assert.deepEqual(calculateStreaks([]), { current: 0, longest: 0 });
  });

  await t.test("counts a run ending today as the current streak", () => {
    const days = [daysAgo(2), daysAgo(1), daysAgo(0)];
    assert.deepEqual(calculateStreaks(days), { current: 3, longest: 3 });
  });

  await t.test("keeps the current streak alive if the last day was yesterday", () => {
    const days = [daysAgo(2), daysAgo(1)];
    assert.deepEqual(calculateStreaks(days), { current: 2, longest: 2 });
  });

  await t.test("resets the current streak when the last day is older than yesterday", () => {
    const days = [daysAgo(5), daysAgo(4), daysAgo(3)];
    assert.deepEqual(calculateStreaks(days), { current: 0, longest: 3 });
  });

  await t.test("tracks the longest streak across gaps", () => {
    const days = [daysAgo(10), daysAgo(9), daysAgo(8), daysAgo(7), daysAgo(1), daysAgo(0)];
    assert.deepEqual(calculateStreaks(days), { current: 2, longest: 4 });
  });

  await t.test("deduplicates repeated days", () => {
    const days = [daysAgo(1), daysAgo(1), daysAgo(0), daysAgo(0)];
    assert.deepEqual(calculateStreaks(days), { current: 2, longest: 2 });
  });
});

test("every67th channel counter", async (t) => {
  await t.test("triggers on the 67th message and resets", () => {
    const store = createStore(t);

    for (let i = 1; i <= 66; i += 1) {
      const result = store.incrementChannelCounterAndCheck("g1", "c1");
      assert.equal(result.triggered, false, `message ${i} should not trigger`);
    }

    const sixtySeventh = store.incrementChannelCounterAndCheck("g1", "c1");
    assert.equal(sixtySeventh.triggered, true);
    assert.equal(sixtySeventh.count, 67);

    const afterReset = store.incrementChannelCounterAndCheck("g1", "c1");
    assert.equal(afterReset.triggered, false);
    assert.equal(afterReset.count, 1);
  });

  await t.test("tracks channels independently", () => {
    const store = createStore(t);

    store.incrementChannelCounterAndCheck("g1", "c1");
    const other = store.incrementChannelCounterAndCheck("g1", "c2");

    assert.equal(other.count, 1);
  });

  await t.test("checkEvery67thCounter wraps the store result", () => {
    const store = createStore(t);

    const notYet = checkEvery67thCounter(store, "g1", "c1");
    assert.deepEqual(notYet, { triggered: false, reason: null, triggerType: null });

    for (let i = 2; i <= 66; i += 1) {
      store.incrementChannelCounterAndCheck("g1", "c1");
    }

    const triggered = checkEvery67thCounter(store, "g1", "c1");
    assert.equal(triggered.triggered, true);
    assert.equal(triggered.triggerType, "every67th");
  });
});

test("recordTriggers", async (t) => {
  await t.test("records totals and reports milestones", () => {
    const store = createStore(t);

    const first = store.recordTriggers({
      guildId: "g1",
      channelId: "c1",
      userId: "u1",
      triggerTypes: ["explicit", "sequence", "charcount"],
      messageContent: "67",
      milestoneStep: 2
    });

    assert.equal(first.previousTotal, 0);
    assert.equal(first.newTotal, 3);
    assert.deepEqual(first.milestones, [2]);

    const second = store.recordTriggers({
      guildId: "g1",
      channelId: "c1",
      userId: "u1",
      triggerTypes: ["explicit"],
      messageContent: "67 again",
      milestoneStep: 2
    });

    assert.equal(second.previousTotal, 3);
    assert.equal(second.newTotal, 4);
    assert.deepEqual(second.milestones, [4]);
  });

  await t.test("falls back to step 67 for invalid milestone steps", () => {
    const store = createStore(t);

    const result = store.recordTriggers({
      guildId: "g1",
      channelId: "c1",
      userId: "u1",
      triggerTypes: ["explicit"],
      messageContent: "67",
      milestoneStep: -5
    });

    assert.deepEqual(result.milestones, []);
  });
});

test("user stats and leaderboards", async (t) => {
  function record(store, userId, triggerTypes) {
    store.recordTriggers({
      guildId: "g1",
      channelId: "c1",
      userId,
      triggerTypes,
      messageContent: "67",
      milestoneStep: 67
    });
  }

  await t.test("getUserStats returns total and per-type breakdown", () => {
    const store = createStore(t);
    record(store, "u1", ["explicit", "explicit", "sequence"]);

    const stats = store.getUserStats("g1", "u1");

    assert.equal(stats.total, 3);
    assert.equal(stats.breakdown.explicit, 2);
    assert.equal(stats.breakdown.sequence, 1);
    assert.equal(stats.breakdown.charcount, 0);
    assert.equal(stats.currentStreak, 1);
    assert.equal(stats.longestStreak, 1);
  });

  await t.test("getUserStats returns zeros for unknown users", () => {
    const store = createStore(t);
    const stats = store.getUserStats("g1", "nobody");

    assert.equal(stats.total, 0);
    assert.equal(stats.currentStreak, 0);
    assert.equal(stats.longestStreak, 0);
  });

  await t.test("getGuildLeaderboard orders by total, then user id", () => {
    const store = createStore(t);
    record(store, "u1", ["explicit"]);
    record(store, "u2", ["explicit", "sequence", "charcount"]);
    record(store, "u3", ["explicit"]);

    const leaderboard = store.getGuildLeaderboard("g1");

    assert.deepEqual(leaderboard, [
      { userId: "u2", total: 3 },
      { userId: "u1", total: 1 },
      { userId: "u3", total: 1 }
    ]);
  });

  await t.test("getGuildLeaderboard respects the limit", () => {
    const store = createStore(t);
    record(store, "u1", ["explicit"]);
    record(store, "u2", ["explicit"]);

    assert.equal(store.getGuildLeaderboard("g1", 1).length, 1);
  });

  await t.test("getUserRank shares ranks between tied totals", () => {
    const store = createStore(t);
    record(store, "u1", ["explicit", "sequence"]);
    record(store, "u2", ["explicit"]);
    record(store, "u3", ["explicit"]);

    assert.deepEqual(store.getUserRank("g1", "u1"), { rank: 1, total: 2 });
    assert.deepEqual(store.getUserRank("g1", "u2"), { rank: 2, total: 1 });
    assert.deepEqual(store.getUserRank("g1", "u3"), { rank: 2, total: 1 });
    assert.equal(store.getUserRank("g1", "nobody"), null);
  });

  await t.test("getGuildCurrentStreaks lists users with active streaks", () => {
    const store = createStore(t);
    record(store, "u1", ["explicit"]);

    const streaks = store.getGuildCurrentStreaks("g1");

    assert.equal(streaks.length, 1);
    assert.equal(streaks[0].userId, "u1");
    assert.equal(streaks[0].currentStreak, 1);
  });
});
