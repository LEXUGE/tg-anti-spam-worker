import { Config } from './types';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Send a message via Telegram Bot API
 */
export async function sendMessage(
    config: Config,
    chatId: number,
    text: string,
    replyToMessageId?: number,
    replyMarkup?: any
): Promise<any> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/sendMessage`;

    const body: Record<string, unknown> = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
    };

    if (replyToMessageId) {
        body.reply_parameters = {
            message_id: replyToMessageId
        };
    }

    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send message: ${error}`);
    }

    const data = await response.json() as { result: any };
    return data.result;
}

/**
 * Delete a message via Telegram Bot API
 */
export async function deleteMessage(
    config: Config,
    chatId: number,
    messageId: number
): Promise<void> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/deleteMessage`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete message: ${error}`);
    }
}

/**
 * Restrict a chat member (mute/ban) via Telegram Bot API
 */
export async function restrictChatMember(
    config: Config,
    chatId: number,
    userId: number,
    untilDate: number
): Promise<void> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/restrictChatMember`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            user_id: userId,
            permissions: {
                can_send_messages: false,
                can_send_audios: false,
                can_send_documents: false,
                can_send_photos: false,
                can_send_videos: false,
                can_send_video_notes: false,
                can_send_voice_notes: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false,
                can_manage_topics: false,
            },
            until_date: untilDate,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to restrict user: ${error}`);
    }
}

/**
 * Answer a callback query
 */
export async function answerCallbackQuery(
    config: Config,
    queryId: string,
    text?: string,
    showAlert?: boolean
): Promise<void> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/answerCallbackQuery`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            callback_query_id: queryId,
            text: text,
            show_alert: showAlert,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to answer callback query: ${error}`);
    }
}

/**
 * Get chat administrators
 */
export async function getChatAdministrators(
    config: Config,
    chatId: number
): Promise<any[]> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/getChatAdministrators`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get chat administrators: ${error}`);
    }

    const data = await response.json() as { result: any[] };
    return data.result;
}

/**
 * Check if a user is an admin in a chat
 */
export async function isAdmin(
    config: Config,
    chatId: number,
    userId: number
): Promise<boolean> {
    const admins = await getChatAdministrators(config, chatId);
    return admins.some((admin: any) => admin.user.id === userId);
}


/**
 * Ban a chat member permanently
 */
export async function banChatMember(
    config: Config,
    chatId: number,
    userId: number
): Promise<void> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/banChatMember`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            user_id: userId,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to ban user: ${error}`);
    }
}

/**
 * Unban a chat member (restore full permissions)
 */
export async function unbanChatMember(
    config: Config,
    chatId: number,
    userId: number
): Promise<void> {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/restrictChatMember`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            user_id: userId,
            permissions: {
                can_send_messages: true,
                can_send_audios: true,
                can_send_documents: true,
                can_send_photos: true,
                can_send_videos: true,
                can_send_video_notes: true,
                can_send_voice_notes: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
                can_change_info: true,
                can_invite_users: true,
                can_pin_messages: true,
                can_manage_topics: true,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to unban user: ${error}`);
    }
}
