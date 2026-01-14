/// <reference types="@cloudflare/workers-types" />

// Telegram API Types
export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    entities?: TelegramMessageEntity[];
}

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
}

export interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
}

export interface TelegramMessageEntity {
    type: string;
    offset: number;
    length: number;
}

export interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
}

// Spam Detection Types
export enum MsgType {
    Scam = 'scam',
    Phishing = 'phishing',
    NotSuitableForWork = 'not_suitable_for_work',
    UnsolicitedPromotion = 'unsolicited_promotion',
    OtherSpam = 'other_spam',
    NotSpam = 'not_spam',
}

export interface SpamCheckResult {
    msg_type: MsgType;
}

// Worker Environment Bindings
export interface Env {
    // Workers KV namespace for state storage
    SPAM_STATE: KVNamespace;

    // Environment variables
    GEMINI_API_KEY: string;
    TELEGRAM_BOT_TOKEN: string;
    CHECK_THRESHOLD?: string;
    CONTEXT_MESSAGES?: string;
}

// Configuration
export interface Config {
    botToken: string;
    checkThreshold: number;
    contextMessages: number;
}
