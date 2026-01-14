import { Env, Config, TelegramCallbackQuery } from './types';
import { answerCallbackQuery, deleteMessage, getChatAdministrators, banChatMember, unbanChatMember } from './telegram';
import * as state from './state';

/**
 * Handle callback query from inline keyboard buttons
 */
export async function handleCallbackQuery(
    env: Env,
    config: Config,
    query: TelegramCallbackQuery
): Promise<void> {
    try {
        const result = await handleCallbackInner(env, config, query);
        await answerCallbackQuery(config, query.id, result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Callback error:', errorMessage);
        await answerCallbackQuery(config, query.id, errorMessage, true);
    }
}

/**
 * Inner handler for callback logic (uses throw for error handling)
 */
async function handleCallbackInner(
    env: Env,
    config: Config,
    query: TelegramCallbackQuery
): Promise<string> {
    if (!query.data) {
        throw new Error('No callback data');
    }

    if (!query.message) {
        throw new Error('Message not found');
    }

    const chatId = query.message.chat.id;
    const clicker = query.from.id;

    const [action, userIdStr] = query.data.split(':');
    if (!action || !userIdStr) {
        throw new Error('Invalid callback data');
    }

    const bannedUserId = parseInt(userIdStr, 10);
    if (isNaN(bannedUserId)) {
        throw new Error('Invalid user ID');
    }

    if (action === 'dismiss') {
        return await handleDismiss(env, config, chatId, clicker, bannedUserId, query);
    } else if (action === 'kick') {
        return await handleKick(env, config, chatId, clicker, bannedUserId, query);
    } else {
        throw new Error('Unknown action');
    }
}

/**
 * Handle dismiss action (unban user, requires trusted user)
 */
async function handleDismiss(
    env: Env,
    config: Config,
    chatId: number,
    clicker: number,
    bannedUserId: number,
    query: TelegramCallbackQuery
): Promise<string> {
    // Check if clicker is a trusted user
    const count = await state.getCount(env, chatId, clicker);
    if (count < config.checkThreshold) {
        throw new Error('You must be a trusted user to dismiss this action');
    }

    // Unban the user
    await unbanChatMember(config, chatId, bannedUserId);

    // Delete the notification message
    if (query.message) {
        await deleteMessage(config, chatId, query.message.message_id);
        // Clean up stored notification ID
        await state.getAndRemoveNotification(env, chatId, bannedUserId);
    }

    const clickerName = `${query.from.first_name}${query.from.last_name ? ' ' + query.from.last_name : ''}`.trim();
    const clickerUsername = query.from.username ? `@${query.from.username}` : 'no username';

    console.log(
        `User ${clickerName} (${clickerUsername}, ${clicker}) dismissed ban for user ${bannedUserId} in chat ${chatId}`
    );

    return 'User has been unbanned';
}

/**
 * Handle kick action (permanently ban user, requires admin)
 */
async function handleKick(
    env: Env,
    config: Config,
    chatId: number,
    clicker: number,
    bannedUserId: number,
    query: TelegramCallbackQuery
): Promise<string> {
    // Check if clicker is an admin
    const admins = await getChatAdministrators(config, chatId);
    const isAdmin = admins.some((admin: any) => admin.user.id === clicker);

    if (!isAdmin) {
        throw new Error('Only administrators can kick users');
    }

    // Permanently ban the user
    await banChatMember(config, chatId, bannedUserId);

    // Delete the notification message
    if (query.message) {
        await deleteMessage(config, chatId, query.message.message_id);
        // Clean up stored notification ID
        await state.getAndRemoveNotification(env, chatId, bannedUserId);
    }

    console.log(`User ${clicker} kicked user ${bannedUserId} from chat ${chatId}`);

    return 'User has been permanently kicked';
}
