import { Env, Config } from './types';
import { isAdmin } from './telegram';

/**
 * Generate a unique key for a user in a chat
 */
export function makeKey(chatId: number, userId: number): string {
    return `${userId}:${chatId}`;
}

/**
 * Get the message count for a user in a chat
 */
export async function getCount(
    env: Env,
    chatId: number,
    userId: number
): Promise<number> {
    const key = makeKey(chatId, userId);
    const value = await env.SPAM_STATE.get(key);
    return value ? parseInt(value, 10) : 0;
}

/**
 * Increment the message count for a user in a chat
 * Returns the updated count
 */
export async function increment(
    env: Env,
    chatId: number,
    userId: number
): Promise<number> {
    const key = makeKey(chatId, userId);
    const currentCount = await getCount(env, chatId, userId);
    const newCount = currentCount + 1;
    await env.SPAM_STATE.put(key, newCount.toString());
    return newCount;
}

/**
 * Reset the message count for a user in a chat
 */
export async function reset(
    env: Env,
    chatId: number,
    userId: number
): Promise<void> {
    const key = makeKey(chatId, userId);
    await env.SPAM_STATE.delete(key);
}

/**
 * Check if a user is trusted (message count > threshold)
 * Does NOT increment changes
 */
export async function isTrusted(
    env: Env,
    config: Config,
    chatId: number,
    userId: number,
    threshold: number
): Promise<boolean> {
    // Check if user is an admin first
    const isAdminUser = await isAdmin(config, chatId, userId);
    if (isAdminUser) {
        return true;
    }

    // Fall back to message count check
    const count = await getCount(env, chatId, userId);
    return count > threshold;
}

/**
 * Add a message to chat's history, maintaining maximum size
 */
export async function addMessage(
    env: Env,
    chatId: number,
    message: any,
    maxSize: number
): Promise<void> {
    const key = `context:${chatId}`;
    const contextStr = await env.SPAM_STATE.get(key);
    const context: any[] = contextStr ? JSON.parse(contextStr) : [];

    context.push(message);

    // Remove oldest messages if we exceed the limit
    while (context.length > maxSize) {
        context.shift();
    }

    await env.SPAM_STATE.put(key, JSON.stringify(context));
}

/**
 * Get message history for a chat
 */
export async function getContext(
    env: Env,
    chatId: number
): Promise<any[]> {
    const key = `context:${chatId}`;
    const contextStr = await env.SPAM_STATE.get(key);
    return contextStr ? JSON.parse(contextStr) : [];
}

/**
 * Clear message context for a chat
 */
export async function clearContext(
    env: Env,
    chatId: number
): Promise<void> {
    const key = `context:${chatId}`;
    await env.SPAM_STATE.delete(key);
}

/**
 * Store a notification message ID for a user in a chat
 */
export async function storeNotification(
    env: Env,
    chatId: number,
    userId: number,
    messageId: number
): Promise<void> {
    const key = `notification:${chatId}:${userId}`;
    await env.SPAM_STATE.put(key, messageId.toString());
}

/**
 * Get the notification message ID for a user in a chat without removing it
 * Returns the message ID if it exists, otherwise null
 */
export async function getNotification(
    env: Env,
    chatId: number,
    userId: number
): Promise<number | null> {
    const key = `notification:${chatId}:${userId}`;
    const value = await env.SPAM_STATE.get(key);
    return value ? parseInt(value, 10) : null;
}

/**
 * Get and remove the notification message ID for a user in a chat
 * Returns the message ID if it exists, otherwise null
 */
export async function getAndRemoveNotification(
    env: Env,
    chatId: number,
    userId: number
): Promise<number | null> {
    const key = `notification:${chatId}:${userId}`;
    const value = await env.SPAM_STATE.get(key);

    if (value) {
        await env.SPAM_STATE.delete(key);
        return parseInt(value, 10);
    }

    return null;
}
