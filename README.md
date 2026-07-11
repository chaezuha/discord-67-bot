# discord-67-bot

[![CI](https://github.com/chaezuha/discord-67-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/chaezuha/discord-67-bot/actions/workflows/ci.yml)

A self-hostable Discord bot that celebrates the 6-7 meme. Whenever a message
triggers a 67 (and there are a *lot* of ways to trigger a 67), it replies with:

`AYYY ⁶🤷⁷`

Every trigger is tracked in SQLite, so `/67` slash commands give you personal
stats, server leaderboards, and streaks.

## Features

- Trigger detection, all combined into a single reply per message:
  - Explicit forms: `67`, `#67`, `no. 67`, `6-7`, `6 7`, `6, 7`, `six seven`, `six-seven`, `sixseven`
  - A digit `6` followed by a digit `7` in the same or adjacent sentence (up to 10 words apart, no other digits between)
  - Exactly 67 characters, or exactly 67 words
  - Exactly 67 syllables (heuristic), or a 6-syllable sentence followed by a 7-syllable one
  - A 6-letter word immediately followed by a 7-letter word
  - Message sent at `X:06:07` (UTC minute/second)
  - Every 67th message per channel (persistent counter, resets after triggering)
- Persistent SQLite stats: lifetime totals, per-type breakdown, leaderboards, current and longest streaks
- Milestone celebration every 67 lifetime triggers, plus a 1% chance of a rare response variant
- Per-channel cooldown (default 1s) so it can't flood a busy channel
- One bot process can serve any number of servers. Stats and counters are tracked per server, and commands register automatically wherever it's invited

## Commands

| Command            | What it does                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `/67 stats`        | Your lifetime triggers, breakdown by type, and current/longest streak.                   |
| `/67 leaderboard`  | Top 10 users in the server (crown for #1). Shows your rank if you're outside the top 10. |
| `/67 streak`       | Top current streaks in the server, plus your own.                                        |
| `/67 help`         | Trigger rules and command reference.                                                     |

## Setup

### 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Under **Bot**, click **Reset Token** and copy the token (you'll need it for `.env`).
3. Still under **Bot**, enable **Message Content Intent** (Privileged Gateway Intents). The bot can't read messages without it.
4. Invite the bot to your server with this URL (replace `YOUR_CLIENT_ID` with the Application ID from **General Information**):

   ```text
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=274877926400
   ```

   (That permission set is: View Channels, Send Messages, Send Messages in
   Threads, and Embed Links. Slash commands come from the
   `applications.commands` scope.)

### 2. Run with Docker Compose (recommended)

The prebuilt image is published to GHCR, so you don't need to clone the repo
or install Node. Put
[`compose.yaml`](compose.yaml) and a `.env` (see [`.env.example`](.env.example))
in a folder, paste your bot token into `.env`, then:

```sh
mkdir 67bot && cd 67bot
curl -O https://raw.githubusercontent.com/chaezuha/discord-67-bot/main/compose.yaml
echo 'DISCORD_TOKEN=your_bot_token_here' > .env
docker compose up -d          # pulls the prebuilt GHCR image
docker compose logs -f        # follow logs
```

(If your Docker setup needs root, prefix the `docker` commands with `sudo` or
add yourself to the `docker` group.)

The compose file sets `restart: unless-stopped`, so the bot comes back on its
own after crashes and reboots. It also sets `pull_policy: always`, which makes
re-running `up -d` double as the update command:

```sh
docker compose up -d          # checks the registry and pulls a newer image if one exists
```

To build the image from source instead (e.g. for local changes):

```sh
docker build -t ghcr.io/chaezuha/discord-67-bot:latest .
docker compose up -d --pull never   # --pull never keeps your local build
```

**Data persistence:** the SQLite database lives in a named Docker volume
(`bot-data`), so stats survive restarts, rebuilds, and `docker compose down`.
Only `docker compose down -v` deletes it. If you'd rather keep the database
somewhere visible on the host, create a writable directory
(`mkdir -p data && sudo chown 1000:1000 data`) and swap the volume for a bind
mount in `compose.yaml`:

```yaml
    volumes:
      - ./data:/app/data
```

### Alternative: plain Docker

Same image, without Compose (again with your token in `.env`):

```sh
docker run --env-file .env -v bot-data:/app/data ghcr.io/chaezuha/discord-67-bot:latest
```

### Alternative: run directly with Node

You'll need Node.js 20+. Then install, configure, and run:

```sh
git clone <this repo>
cd discord-67-bot
npm install
cp .env.example .env        # then edit .env and paste your bot token
npm start
```

### Slash-command sync

Whichever way you run it, the bot registers `/67` commands for every server
it's in on startup, and registers them automatically when invited to a new
server, with no config changes or restarts needed. Guild registration is fast, so
commands appear almost immediately.

## Configuration (`.env`)

| Variable              | Required | Description                                                                                |
| --------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `DISCORD_TOKEN`       | yes      | Bot token from the Developer Portal.                                                       |
| `CHANNEL_COOLDOWN_MS` | no       | Per-channel reply cooldown in milliseconds (default `1000`).                               |
| `RARE_VARIANT_CHANCE` | no       | Chance of a rare response variant, 0 to 1 (default `0.01`).                                |
| `DB_PATH`             | no       | SQLite file path (default `./data/67bot.sqlite`; Docker presets `/app/data/67bot.sqlite`). |
| `CLIENT_ID`           | no       | Application client ID. Auto-detected after login; only set this to override it.            |

## Development

```sh
npm install
npm run check     # syntax-check every module
npm test          # unit tests for triggers and database logic (no network needed)
```

CI runs both on every push to `main` and every PR. Pushes to `main` also
publish the multi-arch Docker image to GHCR.

## Notes

- The bot ignores its own messages and all other bot-authored messages.
- If multiple triggers fire on one message, they combine into a single reply,
  and every trigger type is recorded in the stats.
- During cooldown the reply is skipped, but trigger stats are still recorded.
- Syllable matching uses an English-friendly heuristic, so edge-case words may
  be approximate.
- GHCR packages are private the first time they're published. Make the package
  public (GitHub → your profile → Packages → `discord-67-bot` → Package
  settings → Change visibility) so servers can pull without credentials, or
  `docker login ghcr.io` with a token that has `read:packages`.

## Troubleshooting

- **Commands don't appear:** confirm the bot is actually in that server, then
  restart it to re-register (`docker compose restart`).
- **Bot sees messages but never triggers:** enable **Message Content Intent**
  in the Developer Portal, and make sure the bot can read and send messages in
  the channel.
- **SQLite file not created:** make sure the process can write to the `data/`
  directory (or wherever `DB_PATH` points).
