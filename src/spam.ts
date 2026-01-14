import { TelegramMessage, SpamCheckResult, Config, Env } from './types';
import { sendMessage, deleteMessage, restrictChatMember } from './telegram';
import * as state from './state';

/**
 * Process a detected spam message
 * - Delete old notification if exists
 * - Send notification with inline buttons
 * - Delete the spam message
 * - Restrict the user for 24 hours
 */
export async function processSpam(
    env: Env,
    config: Config,
    message: TelegramMessage,
    result: SpamCheckResult
): Promise<void> {
    const user = message.from;
    const chat = message.chat;

    const userDisplay = user
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''} (${user.id})`
        : 'Unknown';

    const userInfo = user
        ? `id=${user.id}, username=${user.username || 'N/A'}`
        : 'unknown';

    console.log(
        `Chat: ${chat.title || ''} (${chat.id}) | User: ${userInfo} | Type: ${result.msg_type}`
    );

    // Get first 50 characters of the message
    const messagePreview = (message.text || '<no text>').slice(0, 50);

    // Delete the spam message first
    try {
        await deleteMessage(config, chat.id, message.message_id);
        console.log(`Deleted spam message ${message.message_id}`);
    } catch (error) {
        console.error('Failed to delete spam message:', error);
    }

    // Restrict the user for 24 hours
    if (user) {
        try {
            const now = Math.floor(Date.now() / 1000);
            const untilDate = now + 24 * 60 * 60; // 24 hours from now

            await restrictChatMember(config, chat.id, user.id, untilDate);
            console.log(`User ${user.id} restricted until ${new Date(untilDate * 1000).toISOString()}`);
        } catch (error) {
            console.error(`Failed to restrict user ${user.id}:`, error);
        }
    }

    // Delete old notification if it exists
    if (user) {
        const oldNotificationId = await state.getAndRemoveNotification(env, chat.id, user.id);
        if (oldNotificationId) {
            try {
                await deleteMessage(config, chat.id, oldNotificationId);
                console.log(`Deleted old notification ${oldNotificationId} for user ${user.id}`);
            } catch (error) {
                console.error(`Failed to delete old notification ${oldNotificationId}:`, error);
            }
        }
    }

    // Send notification with inline keyboard buttons
    const replyText = `Spam detected!\n\nType: ${result.msg_type}\nUser: ${userDisplay}\nMessage (first 50 chars): <tg-spoiler>${messagePreview}</tg-spoiler>\n\nUser has been banned for 24 hours.`;

    const inlineKeyboard = user ? {
        inline_keyboard: [[
            { text: 'Dismiss (TU Only)', callback_data: `dismiss:${user.id}` },
            { text: 'Kick (Admin Only)', callback_data: `kick:${user.id}` }
        ]]
    } : undefined;

    try {
        const sentMessage = await sendMessage(config, chat.id, replyText, undefined, inlineKeyboard);

        // Store the notification message ID
        if (user && sentMessage?.message_id) {
            await state.storeNotification(env, chat.id, user.id, sentMessage.message_id);
            console.log(`Stored notification ${sentMessage.message_id} for user ${user.id}`);
        }
    } catch (error) {
        console.error('Failed to send spam notification:', error);
    }
}
