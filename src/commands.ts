import { Env, TelegramMessage, Config } from './types';
import { sendMessage } from './telegram';
import * as state from './state';

/**
 * Handle the /start command
 */
export async function handleStart(
    config: Config,
    message: TelegramMessage
): Promise<void> {
    await sendMessage(
        config,
        message.chat.id,
        'Hello! I am the Anti-Spam Bot powered by Cloudflare Worker AI. 🤖\n\nI monitor messages and automatically detect spam, scams, and phishing attempts.'
    );
}

/**
 * Handle the /stats command
 */
export async function handleStats(
    env: Env,
    config: Config,
    message: TelegramMessage
): Promise<void> {
    if (!message.from) {
        return;
    }

    const count = await state.getCount(env, message.chat.id, message.from.id);
    await sendMessage(
        config,
        message.chat.id,
        `Your message count: ${count}`
    );
}

/**
 * Handle the /save command
 * Note: With Workers KV, state is automatically saved, so this is a no-op
 */
export async function handleSave(
    config: Config,
    message: TelegramMessage
): Promise<void> {
    await sendMessage(
        config,
        message.chat.id,
        'State is automatically saved to Workers KV.'
    );
}

/**
 * Handle the /reset command
 */
export async function handleReset(
    env: Env,
    config: Config,
    message: TelegramMessage
): Promise<void> {
    if (!message.from) {
        return;
    }

    await state.reset(env, message.chat.id, message.from.id);
    await sendMessage(
        config,
        message.chat.id,
        'Your message count has been reset to 0.'
    );
}

/**
 * Handle the /clearcontext command
 */
export async function handleClearContext(
    env: Env,
    config: Config,
    message: TelegramMessage
): Promise<void> {
    await state.clearContext(env, message.chat.id);
    await sendMessage(
        config,
        message.chat.id,
        'Message context has been cleared.'
    );
}

/**
 * Parse and route commands
 */
export async function handleCommand(
    env: Env,
    config: Config,
    message: TelegramMessage
): Promise<void> {
    if (!message.text) {
        return;
    }

    const command = message.text.split(' ')[0].toLowerCase();

    switch (command) {
        case '/start':
            await handleStart(config, message);
            break;
        case '/stats':
            await handleStats(env, config, message);
            break;
        case '/save':
            await handleSave(config, message);
            break;
        case '/reset':
            await handleReset(env, config, message);
            break;
        case '/clearcontext':
            await handleClearContext(env, config, message);
            break;
    }
}
