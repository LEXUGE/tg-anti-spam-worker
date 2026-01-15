import { Env, TelegramUpdate, Config, MsgType } from './types';
import { sendMessage } from './telegram';
import { handleCommand } from './commands';
import { checkSpam } from './detect';
import { processSpam } from './spam';
import { handleCallbackQuery } from './callbacks';
import * as state from './state';

/**
 * Check if a message is a command (starts with /)
 */
function isCommand(text: string | undefined): boolean {
    return !!text && text.startsWith('/');
}

/**
 * Build configuration from environment
 */
function buildConfig(env: Env): Config {
    const threshold = env.CHECK_THRESHOLD ? parseInt(env.CHECK_THRESHOLD, 10) : 20;
    const contextMessages = env.CONTEXT_MESSAGES ? parseInt(env.CONTEXT_MESSAGES, 10) : 5;

    return {
        botToken: env.TELEGRAM_BOT_TOKEN,
        checkThreshold: threshold,
        contextMessages: contextMessages,
        botUsername: env.BOT_USERNAME,
    };
}

/**
 * Main worker handler
 */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Only accept POST requests
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            const update: TelegramUpdate = await request.json();
            const config = buildConfig(env);

            // Handle callback queries (button clicks)
            if (update.callback_query) {
                await handleCallbackQuery(env, config, update.callback_query);
                return new Response('OK', { status: 200 });
            }

            // Ignore updates without messages
            if (!update.message) {
                return new Response('OK', { status: 200 });
            }

            const message = update.message;

            // Ignore messages without a sender
            if (!message.from) {
                return new Response('OK', { status: 200 });
            }

            // Handle commands first (commands should not increment the counter)
            if (isCommand(message.text)) {
                await handleCommand(env, config, message);
                return new Response('OK', { status: 200 });
            }

            // Check if we should process this message based on logic:
            // 1. Is user trusted? If yes, skip check.
            // 2. If not trusted, check spam.
            // 3. If safe, increment counter.
            if (message.text) {
                const [isTrusted, context] = await Promise.all([
                    state.isTrusted(
                        env,
                        config,
                        message.chat.id,
                        message.from.id,
                        config.checkThreshold
                    ),
                    state.getContext(env, message.chat.id)
                ]);

                if (isTrusted) {
                    // User is trusted, skip spam check
                    return new Response('OK', { status: 200 });
                }

                // Perform spam check with context
                const result = await checkSpam(env, message.text, context, message.from.id);

                // Process spam if detected
                if (result.msg_type !== MsgType.NotSpam) {
                    await processSpam(env, config, message, result);
                    // Do NOT increment counter for spam
                    // Do NOT add spam to context (saves 1 write)
                } else {
                    // Message is safe, increment counter (fire-and-forget)
                    ctx.waitUntil(
                        state.increment(env, message.chat.id, message.from.id)
                    );

                    // Store message in history after processing (fire-and-forget)
                    ctx.waitUntil(
                        state.addMessage(env, message.chat.id, message, config.contextMessages)
                    );
                }
            }

            return new Response('OK', { status: 200 });
        } catch (error) {
            console.error('Error processing update:', error);
            return new Response('Internal server error', { status: 500 });
        }
    },
};
