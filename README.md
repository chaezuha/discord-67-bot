# discord-67-bot

[![CI](https://github.com/chaezuha/discord-67-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/chaezuha/discord-67-bot/actions/workflows/ci.yml)

A self-hostable Discord bot that celebrates the 6-7 meme. Built on discord.js
and SQLite, it replies `AYYY ⁶🤷⁷` whenever a message triggers a 67 (and there
are a *lot* of ways to trigger a 67), then tracks it all so `/67` commands can
show stats, leaderboards, and streaks.

## Features

- **Lots of ways to 67:** Explicit mentions, a 6 followed by a 7, exact counts of 67, syllable and word-length patterns, timestamps, and every 67th message all count. See [Triggers](#triggers) for the full rules.
- **One reply per message:** If several triggers fire on the same message, you get a single reply that lists every reason.
- **Stats and leaderboards:** Every trigger is saved, so you can see lifetime totals, a per-type breakdown, server leaderboards, and daily streaks.
- **Milestones and surprises:** The bot celebrates every 67 lifetime triggers, and 1% of replies use a rare variant.
- **Won't flood your channels:** A per-channel cooldown (1 second by default) limits replies. Triggers during the cooldown still count toward stats.
- **Any number of servers:** One bot process serves every server it's invited to, with separate stats per server. Slash commands register on their own.
- **Easy to self-host:** A prebuilt Docker image for amd64 and arm64 starts with one command.

## Quick start

You need Docker with the Compose plugin and a Discord account.

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application**.
2. Under **Bot**, click **Reset Token** and copy the token.
3. Still under **Bot**, enable **Message Content Intent** (under Privileged Gateway Intents).
4. Invite the bot to your server with this URL. Replace `YOUR_CLIENT_ID` with the Application ID from **General Information**.

   ```text
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=274877926400
   ```

   This grants View Channels, Send Messages, Send Messages in Threads, and Embed Links. The `applications.commands` scope adds the slash commands.

5. Download the compose file, add your token, and start the bot:

   ```sh
   mkdir 67bot && cd 67bot                                                                  # make a folder for the bot
   curl -O https://raw.githubusercontent.com/chaezuha/discord-67-bot/main/compose.yaml     # download the compose file
   echo 'DISCORD_TOKEN=YOUR_BOT_TOKEN' > .env                                               # save your bot token
   docker compose up -d                                                                     # pull the prebuilt image and start the bot
   docker compose logs -f                                                                   # watch the logs (Ctrl+C to stop watching)
   ```

   If your Docker setup needs root, prefix the `docker` commands with `sudo` or add yourself to the `docker` group.

That's it. Send `67` in any channel the bot can see, then run `/67 stats`.

> **Bot is online but never replies?** Make sure **Message Content Intent** is enabled in the Developer Portal (step 3), and that the bot can read and send messages in that channel.

## Usage

### Commands

| Command           | What it does                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `/67 stats`       | Your lifetime triggers, breakdown by type, and current/longest streak.                   |
| `/67 leaderboard` | Top 10 users in the server (crown for #1). Shows your rank if you're outside the top 10. |
| `/67 streak`      | Top 10 current streaks in the server, plus your own.                                     |
| `/67 help`        | Trigger rules and command reference.                                                     |

Everyone in the server can use every command. Stats, leaderboards, and streaks are per server. A streak is the number of consecutive days (UTC) with at least one trigger.

The bot registers `/67` in every server it's in when it starts, and in a new server as soon as you invite it. Commands appear almost immediately. If they don't show up, confirm the bot is in that server and was invited with the `applications.commands` scope, then restart it (`docker compose restart`).

### Triggers

The bot ignores messages from itself and other bots. Everything else is checked against these rules:

| Trigger             | Fires when                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit 67         | The message contains a 67, such as `67`, `#67`, `no. 67`, `6-7`, `6 7`, `6, 7`, `six seven`, `six-seven`, `sixseven`, or `sixty-seven`. Fullwidth and Chinese numerals count too. |
| 6 ... 7 sequence    | A `6` (or "six") is followed by a `7` (or "seven") in the same or the next sentence, up to 10 words apart, with no other numbers in between.                       |
| 67 characters       | The message is exactly 67 characters long (an emoji counts as one).                                                                                                |
| 67 words            | The message is exactly 67 words long.                                                                                                                              |
| 67 syllables        | The message has exactly 67 syllables. Syllables are estimated for English, so some words may be off.                                                              |
| 6 then 7 syllables  | The first sentence has 6 syllables and the second has 7.                                                                                                          |
| Word pair           | A 6-letter word is immediately followed by a 7-letter word.                                                                                                       |
| Timestamp           | The message is sent at minute 06, second 07 of any hour (UTC).                                                                                                     |
| Every 67th message  | The message is the 67th in the channel since the last time this trigger fired.                                                                                     |

During a channel's cooldown the bot skips the reply but still records the trigger. Milestone announcements are always sent.

## Configuration

Set these in `.env` (see [`.env.example`](.env.example)).

| Variable              | Required | What it does                                                                                                   |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`       | Yes      | Bot token from the Developer Portal.                                                                           |
| `CHANNEL_COOLDOWN_MS` | No       | Minimum time between replies in one channel, in milliseconds. Default `1000`.                                  |
| `RARE_VARIANT_CHANCE` | No       | Chance that a reply uses a rare variant, from 0 to 1. Default `0.01`.                                          |
| `DB_PATH`             | No       | Where the SQLite database is stored. Default `./data/67bot.sqlite` (the Docker image uses `/app/data/67bot.sqlite`). |
| `CLIENT_ID`           | No       | Application ID used to register slash commands. Default: detected automatically after login.                   |

> [!WARNING]
> Your bot token gives full control of the bot. Keep `.env` private, never commit it, and reset the token in the Developer Portal if it leaks.

## Other ways to run

Each option below still needs a Discord application and invite (steps 1 to 4 of the [Quick start](#quick-start)).

### Plain Docker

Same image, without Compose. Put your token in `.env` first:

```sh
docker run -d --restart unless-stopped --env-file .env -v bot-data:/app/data ghcr.io/chaezuha/discord-67-bot:latest
```

### Node.js from source

You need Node.js 20.19 or newer.

```sh
git clone https://github.com/chaezuha/discord-67-bot.git   # download the source
cd discord-67-bot
npm install                                                # install dependencies
cp .env.example .env                                       # then edit .env and paste your bot token
npm start                                                  # start the bot
```

### Build the Docker image yourself

Useful if you've made local changes. Run this from a clone of the repo:

```sh
docker build -t ghcr.io/chaezuha/discord-67-bot:latest .   # build the image locally
docker compose up -d --pull never                          # start it without pulling over your build
```

## Running it long-term

### Updating

With Compose, re-run `up`. The compose file checks for a newer image every time:

```sh
docker compose up -d
```

If you run from source, pull the latest code and restart:

```sh
git pull && npm install && npm start
```

### Restarts

The compose file sets `restart: unless-stopped`, so the bot comes back on its own after crashes and reboots. To restart it by hand:

```sh
docker compose restart
```

### Logs

```sh
docker compose logs -f
```

### Data and backups

The SQLite database lives in a named Docker volume (`bot-data`). Stats survive restarts, updates, rebuilds, and `docker compose down`. Only `docker compose down -v` deletes them.

To back up the database while the bot is running:

```sh
docker compose exec bot node -e "require('better-sqlite3')('/app/data/67bot.sqlite').backup('/app/data/backup.sqlite')"   # take a safe snapshot
docker compose cp bot:/app/data/backup.sqlite ./67bot-backup.sqlite                                                           # copy it to the host
```

If you'd rather keep the database in a visible folder on the host, create a writable directory and swap the volume for a bind mount in `compose.yaml`:

```sh
mkdir -p data && sudo chown 1000:1000 data
```

```yaml
    volumes:
      - ./data:/app/data
```

If the database file is never created, make sure the bot can write to that folder (or wherever `DB_PATH` points).

### Security

- The container runs as the unprivileged `node` user, not root.
- The invite URL only asks for the four permissions the bot needs. Don't grant Administrator.
- Keep `.env` readable only by you: `chmod 600 .env`.

## Development

```sh
npm install       # install dependencies
npm run check     # syntax-check every module
npm test          # unit tests for triggers and database logic (no network needed)
```

CI runs the syntax check and tests on every push to `main` and every pull request. Pushes to `main` also publish the multi-arch (amd64 and arm64) Docker image to GHCR.

If you publish from a fork, note that GHCR packages are private the first time they're published. Make the package public (GitHub → your profile → Packages → `discord-67-bot` → Package settings → Change visibility) so servers can pull it without credentials, or run `docker login ghcr.io` with a token that has `read:packages`.

## License

MIT, as declared in `package.json`.
