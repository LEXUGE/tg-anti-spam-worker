# Telegram Anti-Spam Worker

A Telegram anti-spam bot built with Cloudflare Workers and Worker AI. This bot automatically detects and removes spam, scams, phishing attempts, and unwanted promotional content from Telegram groups using the `llama-3.2-11b-vision-instruct` AI model.

## Features

- 🤖 **AI-Powered Detection**: Uses Cloudflare Worker AI with `llama-3.2-11b-vision-instruct` for spam classification
- 🔒 **Automatic Moderation**: Deletes spam messages and restricts spammers for 24 hours
- 📊 **Message Tracking**: Tracks message counts per user using Workers KV
- ⚡ **Threshold-Based Processing**: Only checks spam for users with ≤ 20 messages (configurable)
- 🛡️ **Fail-Safe Design**: Fails open (treats as not spam) if AI parsing errors occur
- 💬 **Bot Commands**: `/start`, `/stats`, `/save`, `/reset`

## Spam Categories

The bot classifies messages into:
- **Scam**: Messages attempting to defraud users
- **Phishing**: Credential or personal information theft attempts
- **Unsolicited Promotion**: Unwanted advertising or promotional content
- **Other Spam**: Other forms of spam
- **Not Spam**: Legitimate messages

## Setup

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (will be installed via bun)
- A Telegram Bot Token (get one from [@BotFather](https://t.me/botfather))
- Cloudflare account with Workers AI access

### Installation

1. **Clone the repository**:
   ```bash
   cd /home/ash/Documents/git/tg-anti-spam-worker
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Create a KV namespace**:
   ```bash
   bunx wrangler kv:namespace create SPAM_STATE
   ```
   
   Copy the returned namespace ID and update `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "SPAM_STATE"
   id = "YOUR_KV_NAMESPACE_ID_HERE"
   ```

4. **Set your Telegram bot token as a secret**:
   ```bash
   bunx wrangler secret put TELEGRAM_BOT_TOKEN
   ```
   
   Enter your bot token when prompted.

5. **(Optional) Configure the threshold**:
   
   By default, the bot checks spam for users with ≤ 20 messages. To change this, uncomment and modify the `CHECK_THRESHOLD` in `wrangler.toml`:
   ```toml
   [vars]
   CHECK_THRESHOLD = "50"  # Your desired threshold
   ```

### Deployment

1. **Deploy the worker**:
   ```bash
   bun run deploy
   ```

2. **Set the Telegram webhook**:
   
   After deployment, you'll get a worker URL like `https://tg-anti-spam-worker.YOUR_SUBDOMAIN.workers.dev`.
   
   Set the webhook:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://tg-anti-spam-worker.YOUR_SUBDOMAIN.workers.dev"
   ```

3. **Add the bot to your Telegram group**:
   - Add the bot to your group
   - **Important**: Promote the bot to admin with these permissions:
     - Delete messages
     - Ban users
     - Restrict members

## Bot Commands

- `/start` - Get a welcome message
- `/stats` - View your message count
- `/save` - Confirm state is saved (automatic with KV)
- `/reset` - Reset your message count to 0

## How It Works

1. **Message Received**: When a user sends a message to the group
2. **Command Check**: If it's a command, execute the command handler
3. **Threshold Check**: If not a command, check if user message count ≤ threshold
4. **Spam Detection**: If within threshold, analyze the message with Worker AI
5. **Action**: If spam is detected:
   - Delete the spam message
   - Restrict the user for 24 hours
   - Send a notification about the spam

## Development

Run the worker locally:
```bash
bun run dev
```

Build TypeScript files:
```bash
bun run build
```

## Architecture

```
src/
├── index.ts      # Main worker entry point and request handler
├── types.ts      # TypeScript type definitions
├── state.ts      # Workers KV state management
├── detect.ts     # AI-powered spam detection
├── telegram.ts   # Telegram Bot API helpers
├── commands.ts   # Command handlers
└── spam.ts       # Spam processing logic
```

## Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Secret | Required | Your Telegram bot token |
| `CHECK_THRESHOLD` | Var | 20 | Max message count to check for spam |

## License

MIT

## Credits

Ported from [LEXUGE/tg-anti-spam](https://github.com/LEXUGE/tg-anti-spam) - original Rust implementation using Gemini AI.
