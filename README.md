# 67 Bot (Discord.js + SQLite)

A Discord bot that celebrates the 6-7 meme by replying with:

`AYYY ⁶🤷⁷`

It detects 67 in multiple ways, tracks persistent stats in SQLite, and provides slash commands for personal stats, leaderboards, and streaks.

## Features

- Trigger detection:
  - Explicit 67 forms: `67`, `#67`, `no. 67`, `6-7`, `6 7`, `6, 7`, `six seven`, `six-seven`, `sixseven`
  - Sequence detection: digit `6` followed by digit `7` in the same sentence (up to 10 words between, no other digits in between)
  - Exact count detection: exactly 67 characters or exactly 67 words
  - Every 67th message per channel (persistent counter, resets after trigger)
- Combines all reasons from one message into a single reply
- Persistent SQLite tracking for:
  - Total trigger events
  - Trigger type breakdown
  - Leaderboards
  - Current and longest streaks
- Slash commands:
  - `/67 stats`
  - `/67 leaderboard`
  - `/67 streak`
  - `/67 help`
- Bonus behavior included:
  - Milestone celebration every 67 lifetime triggers
  - Per-channel cooldown (default 30s) for bot responses
  - 1% rare response variant chance

## Requirements

- Node.js 18+
- A Discord bot/application with:
  - `MESSAGE CONTENT INTENT` enabled in the Developer Portal
  - Bot invited with permission to:
    - Read messages/view channels
    - Send messages
    - Use slash commands

## Installation

1. Clone and enter project:

```bash
git clone <your-repo-url>
cd discord-67-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
cp .env.example .env
```

4. Edit `.env`:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
GUILD_ID=your_development_guild_id_here
```

Notes:
- Use `GUILD_ID` for a single server in development.
- Use `GUILD_IDS` (comma-separated) if you want to register commands in multiple guilds.

5. Start the bot:

```bash
npm start
```

On startup, the bot logs in and registers `/67` guild commands automatically.

## Configuration

Optional `.env` settings:

- `CHANNEL_COOLDOWN_MS` (default `30000`)
- `RARE_VARIANT_CHANCE` (default `0.01`)
- `DB_PATH` (default `./data/67bot.sqlite`)

## How Triggers Are Counted

- The bot ignores:
  - Its own messages
  - All bot-authored messages
- If multiple triggers fire on one message, all trigger types are stored.
- During cooldown:
  - Bot reply is skipped
  - Trigger stats are still recorded in SQLite

## Database

The SQLite DB is created automatically at `./data/67bot.sqlite` (unless `DB_PATH` is set).

Schema:

- `triggers`
  - `guild_id`, `channel_id`, `user_id`, `trigger_type`, `message_content`, `created_at`
- `channel_counters`
  - per-guild/channel rolling count for every-67th trigger

Indexes:

- `idx_triggers_user (guild_id, user_id)`
- `idx_triggers_date (guild_id, created_at)`

## Slash Commands

- `/67 stats`
  - Your total triggers
  - Breakdown by type
  - Current streak
  - Longest streak
- `/67 leaderboard`
  - Top 10 users in the server by lifetime trigger count
  - Crown for #1
  - Your rank shown if outside top 10
- `/67 streak`
  - Top current streaks in the server
  - Your current streak
- `/67 help`
  - Trigger rules and command reference

## Project Structure

```text
67-bot/
├── index.js
├── triggers/
│   ├── explicit67.js
│   ├── sequence67.js
│   ├── count67.js
│   └── every67th.js
├── commands/
│   ├── stats.js
│   ├── leaderboard.js
│   ├── streak.js
│   └── help.js
├── db.js
├── config.js
├── package.json
└── .env.example
```

## Development Tips

- Use a test server first and set `GUILD_ID` to that server.
- Guild command registration is fast, so command changes appear quickly.
- Run syntax checks:

```bash
npm run check
```

## Troubleshooting

- Commands do not appear:
  - Confirm `CLIENT_ID` and `GUILD_ID`/`GUILD_IDS`
  - Confirm bot is in that server
  - Restart bot to re-register
- Bot sees messages but does not trigger:
  - Enable `MESSAGE CONTENT INTENT` in Discord Developer Portal
  - Ensure bot has permission to read/send messages in the channel
- SQLite file not created:
  - Ensure the process can write to the project `data/` directory
