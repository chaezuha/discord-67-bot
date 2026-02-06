const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const ALL_TRIGGER_TYPES = [
  "explicit",
  "sequence",
  "charcount",
  "wordcount",
  "every67th",
  "syllable67",
  "syllable67pair",
  "timestamp67",
  "wordlen67"
];

function toDayStringUtc(date) {
  return date.toISOString().slice(0, 10);
}

function parseDayString(day) {
  return new Date(`${day}T00:00:00.000Z`);
}

function dayDiff(leftDay, rightDay) {
  const ms = parseDayString(rightDay) - parseDayString(leftDay);
  return Math.round(ms / 86400000);
}

function calculateStreaks(days) {
  if (!days.length) {
    return { current: 0, longest: 0 };
  }

  const ordered = [...new Set(days)].sort();

  let longest = 1;
  let running = 1;

  for (let i = 1; i < ordered.length; i += 1) {
    if (dayDiff(ordered[i - 1], ordered[i]) === 1) {
      running += 1;
      if (running > longest) {
        longest = running;
      }
    } else {
      running = 1;
    }
  }

  const today = toDayStringUtc(new Date());
  const yesterday = toDayStringUtc(new Date(Date.now() - 86400000));
  const latest = ordered[ordered.length - 1];

  if (latest !== today && latest !== yesterday) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let i = ordered.length - 1; i > 0; i -= 1) {
    if (dayDiff(ordered[i - 1], ordered[i]) === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

function initDb(dbPath) {
  const absoluteDbPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(absoluteDbPath), { recursive: true });

  const db = new Database(absoluteDbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS triggers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      message_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channel_counters (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE INDEX IF NOT EXISTS idx_triggers_user ON triggers(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_triggers_date ON triggers(guild_id, created_at);
  `);

  const statements = {
    upsertChannelCounter: db.prepare(`
      INSERT INTO channel_counters (guild_id, channel_id, message_count)
      VALUES (?, ?, 0)
      ON CONFLICT(guild_id, channel_id) DO NOTHING
    `),
    incrementChannelCounter: db.prepare(`
      UPDATE channel_counters
      SET message_count = message_count + 1
      WHERE guild_id = ? AND channel_id = ?
    `),
    getChannelCounter: db.prepare(`
      SELECT message_count
      FROM channel_counters
      WHERE guild_id = ? AND channel_id = ?
    `),
    resetChannelCounter: db.prepare(`
      UPDATE channel_counters
      SET message_count = 0
      WHERE guild_id = ? AND channel_id = ?
    `),
    insertTrigger: db.prepare(`
      INSERT INTO triggers (guild_id, channel_id, user_id, trigger_type, message_content)
      VALUES (?, ?, ?, ?, ?)
    `),
    getUserTotal: db.prepare(`
      SELECT COUNT(*) AS total
      FROM triggers
      WHERE guild_id = ? AND user_id = ?
    `),
    getUserBreakdown: db.prepare(`
      SELECT trigger_type, COUNT(*) AS total
      FROM triggers
      WHERE guild_id = ? AND user_id = ?
      GROUP BY trigger_type
    `),
    getUserDays: db.prepare(`
      SELECT DATE(created_at) AS day
      FROM triggers
      WHERE guild_id = ? AND user_id = ?
      GROUP BY day
      ORDER BY day ASC
    `),
    getLeaderboard: db.prepare(`
      SELECT user_id, COUNT(*) AS total
      FROM triggers
      WHERE guild_id = ?
      GROUP BY user_id
      ORDER BY total DESC, user_id ASC
      LIMIT ?
    `),
    getAllGuildTotals: db.prepare(`
      SELECT user_id, COUNT(*) AS total
      FROM triggers
      WHERE guild_id = ?
      GROUP BY user_id
      ORDER BY total DESC, user_id ASC
    `),
    getGuildDaysByUser: db.prepare(`
      SELECT user_id, DATE(created_at) AS day
      FROM triggers
      WHERE guild_id = ?
      GROUP BY user_id, day
      ORDER BY user_id ASC, day ASC
    `)
  };

  function incrementChannelCounterAndCheck(guildId, channelId) {
    statements.upsertChannelCounter.run(guildId, channelId);
    statements.incrementChannelCounter.run(guildId, channelId);

    const row = statements.getChannelCounter.get(guildId, channelId);
    const count = row?.message_count ?? 0;

    if (count >= 67) {
      statements.resetChannelCounter.run(guildId, channelId);
      return { triggered: true, count };
    }

    return { triggered: false, count };
  }

  const recordTriggersTx = db.transaction((guildId, channelId, userId, triggerTypes, messageContent) => {
    for (const triggerType of triggerTypes) {
      statements.insertTrigger.run(guildId, channelId, userId, triggerType, messageContent);
    }
  });

  function recordTriggers({ guildId, channelId, userId, triggerTypes, messageContent, milestoneStep }) {
    const safeStep = Number.isFinite(milestoneStep) && milestoneStep > 0 ? milestoneStep : 67;
    const previousTotal = statements.getUserTotal.get(guildId, userId)?.total ?? 0;

    recordTriggersTx(guildId, channelId, userId, triggerTypes, messageContent);

    const newTotal = statements.getUserTotal.get(guildId, userId)?.total ?? previousTotal;
    const milestones = [];

    for (let value = previousTotal + 1; value <= newTotal; value += 1) {
      if (value % safeStep === 0) {
        milestones.push(value);
      }
    }

    return { previousTotal, newTotal, milestones };
  }

  function getUserStats(guildId, userId) {
    const total = statements.getUserTotal.get(guildId, userId)?.total ?? 0;
    const breakdownRows = statements.getUserBreakdown.all(guildId, userId);
    const breakdown = Object.fromEntries(ALL_TRIGGER_TYPES.map((type) => [type, 0]));

    for (const row of breakdownRows) {
      if (typeof breakdown[row.trigger_type] === "number") {
        breakdown[row.trigger_type] = row.total;
      }
    }

    const dayRows = statements.getUserDays.all(guildId, userId);
    const streaks = calculateStreaks(dayRows.map((row) => row.day));

    return {
      total,
      breakdown,
      currentStreak: streaks.current,
      longestStreak: streaks.longest
    };
  }

  function getGuildLeaderboard(guildId, limit = 10) {
    return statements.getLeaderboard.all(guildId, limit).map((row) => ({
      userId: row.user_id,
      total: row.total
    }));
  }

  function getUserRank(guildId, userId) {
    const rows = statements.getAllGuildTotals.all(guildId);
    let rank = 0;
    let lastTotal = null;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];

      if (lastTotal === null || row.total < lastTotal) {
        rank = i + 1;
        lastTotal = row.total;
      }

      if (row.user_id === userId) {
        return { rank, total: row.total };
      }
    }

    return null;
  }

  function getGuildCurrentStreaks(guildId, limit = 10) {
    const rows = statements.getGuildDaysByUser.all(guildId);
    const daysByUser = new Map();

    for (const row of rows) {
      if (!daysByUser.has(row.user_id)) {
        daysByUser.set(row.user_id, []);
      }
      daysByUser.get(row.user_id).push(row.day);
    }

    const streaks = [];
    for (const [userId, userDays] of daysByUser.entries()) {
      const { current, longest } = calculateStreaks(userDays);
      if (current > 0) {
        streaks.push({ userId, currentStreak: current, longestStreak: longest });
      }
    }

    streaks.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      return a.userId.localeCompare(b.userId);
    });

    return streaks.slice(0, limit);
  }

  return {
    db,
    incrementChannelCounterAndCheck,
    recordTriggers,
    getUserStats,
    getGuildLeaderboard,
    getUserRank,
    getGuildCurrentStreaks,
    allTriggerTypes: ALL_TRIGGER_TYPES
  };
}

module.exports = {
  initDb,
  calculateStreaks,
  ALL_TRIGGER_TYPES
};
