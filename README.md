# 67 Bot (Discord.js + SQLite)

A Discord bot that celebrates the 6-7 meme by replying with:

`AYYY ⁶🤷⁷`

It detects 67 in multiple ways, tracks persistent stats in SQLite, and provides slash commands for personal stats, leaderboards, and streaks.

## Features

- Trigger detection:
  - Explicit 67 forms: `67`, `#67`, `no. 67`, `6-7`, `6 7`, `6, 7`, `six seven`, `six-seven`, `sixseven`
  - Sequence detection: digit `6` followed by digit `7` in the same or adjacent sentence (up to 10 words between, no other digits in between)
  - Exact count detection: exactly 67 characters or exactly 67 words
  - Syllable detection: exactly 67 syllables in the full message (heuristic)
  - Sentence pair syllables: first sentence has 6 syllables and second sentence has 7 syllables
  - Timestamp detection: message sent at `X:06:07` (UTC minute/second)
  - Word-length pair: a 6-letter word immediately followed by a 7-letter word
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
  - Per-channel cooldown (default 1s) for bot responses
  - 1% rare response variant chance

## Requirements

- Docker with the Compose plugin (recommended), or Node.js 18+ for running without Docker
- A Discord bot/application with:
  - `MESSAGE CONTENT INTENT` enabled in the Developer Portal
  - Bot invited with permission to:
    - Read messages/view channels
    - Send messages
    - Use slash commands

## Running with Docker Compose (recommended)

No clone, no Node, no build — the image is published to GitHub Container Registry (`ghcr.io/chaezuha/discord-67-bot`). All you need on the server is `compose.yaml` and a `.env`.

1. Make a directory and download the compose file:

```bash
mkdir 67bot && cd 67bot
curl -O https://raw.githubusercontent.com/chaezuha/discord-67-bot/main/compose.yaml
```

2. Create a `.env` file with your bot token:

```env
DISCORD_TOKEN=your_bot_token_here
```

3. Start the bot:

```bash
sudo docker compose up -d
```

Useful commands:

```bash
sudo docker compose logs -f   # follow bot logs
sudo docker compose up -d     # update: pulls the newest image (pull_policy: always)
sudo docker compose restart   # restart without pulling
sudo docker compose down      # stop the bot (data is kept)
```

Because the compose file sets `pull_policy: always`, re-running `up -d` is also the update command — it checks the registry each time and pulls the new image if one was published.

On startup, the bot logs in and registers `/67` commands for every server it is in. When it is invited to a new server, commands register there automatically — no config changes or restarts needed.

> **One-time setup note:** GHCR packages are private by default the first time they're published. Make the package public (GitHub → your profile → Packages → `discord-67-bot` → Package settings → Change visibility) so servers can pull without credentials, or run `docker login ghcr.io` on the server with a personal access token that has `read:packages`.

To build the image from source instead (e.g. for local changes):

```bash
docker build -t ghcr.io/chaezuha/discord-67-bot:latest .
sudo docker compose up -d --pull never   # --pull never keeps your local build instead of pulling
```

### Data persistence

The SQLite database lives in a named Docker volume (`bot-data`), so stats survive restarts, rebuilds, and `docker compose down`. Only `docker compose down -v` deletes it.

If you prefer the database visible on the host, create a writable directory and swap the volume for a bind mount in `compose.yaml`:

```bash
mkdir -p data && sudo chown 1000:1000 data
```

```yaml
    volumes:
      - ./data:/app/data
```

## Running without Docker (for development)

1. Install dependencies:

```bash
npm install
```

2. Create your environment file and set `DISCORD_TOKEN`:

```bash
cp .env.example .env
```

3. Start the bot:

```bash
npm start
```

## Configuration

Optional `.env` settings:

- `CHANNEL_COOLDOWN_MS` (default `1000`)
- `RARE_VARIANT_CHANCE` (default `0.01`)
- `DB_PATH` (default `./data/67bot.sqlite`; the Docker image presets it to `/app/data/67bot.sqlite`)
- `CLIENT_ID` (auto-detected after login; set only to override)

## Multiple Servers

One bot process handles any number of Discord servers. Stats, leaderboards, streaks, and counters are all tracked per server, and `/67` commands are registered automatically for every server the bot joins. Just invite the bot with the invite link from the Developer Portal.

## How Triggers Are Counted

- The bot ignores:
  - Its own messages
  - All bot-authored messages
- If multiple triggers fire on one message, all trigger types are stored.
- During cooldown:
  - Bot reply is skipped
  - Trigger stats are still recorded in SQLite
- Syllable matching uses an English-friendly heuristic, so edge-case words may be approximate.

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
│   ├── every67th.js
│   ├── syllable67.js
│   ├── timestamp67.js
│   └── wordLength67.js
├── commands/
│   ├── stats.js
│   ├── leaderboard.js
│   ├── streak.js
│   └── help.js
├── db.js
├── config.js
├── Dockerfile
├── compose.yaml
├── package.json
└── .env.example
```

## Development Tips

- Use a test server first before inviting the bot to a busy server.
- Guild command registration is fast, so command changes appear quickly.
- Run syntax checks:

```bash
npm run check
```

- Run the unit tests (triggers and database logic):

```bash
npm test
```

Both also run automatically in GitHub Actions on pushes to `main` and on pull requests.

## Troubleshooting

- Commands do not appear:
  - Confirm the bot is in that server
  - Restart the bot to re-register (`sudo docker compose restart`)
- Bot sees messages but does not trigger:
  - Enable `MESSAGE CONTENT INTENT` in Discord Developer Portal
  - Ensure bot has permission to read/send messages in the channel
- SQLite file not created:
  - Ensure the process can write to the project `data/` directory
