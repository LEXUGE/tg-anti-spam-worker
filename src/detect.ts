import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { Env, SpamCheckResult, MsgType } from './types';

const SYSTEM_PROMPT = `Content moderator for Telegram groups. Classify the current message into categories. Context provided when available helps reduce false positives. Do NOT rule on the context. Users may swear or trigger keywords normally. Avoid false positives.`;

/**
 * Check if a message is spam using Google Gemini API
 */
export async function checkSpam(
    env: Env,
    text: string,
    context: any[],
    userId?: number // Make optional for backward compatibility if needed, but we plan to pass it
): Promise<SpamCheckResult> {
    try {
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

        // Define the zod schema with descriptions for each message type
        const spamCheckSchema = z.object({
            msg_type: z.enum(MsgType).describe(
                'Message type classification:\n' +
                '- scam: Messages attempting to defraud users\n' +
                '- phishing: Messages explicitly trying to steal credentials or personal information\n' +
                '- not_suitable_for_work: Message that is explicit or sexually provoking\n' +
                '- unsolicited_promotion: Unwanted advertising or promotional content\n' +
                '- other_spam: Other annoying messages\n' +
                '- not_spam: Legitimate message'
            ),
        });

        // Build the prompt with context if available
        let prompt: string;
        if (context.length === 0) {
            // No context, just send the current message
            prompt = text;
        } else {
            // Build context section
            const promptParts = ['History:'];

            for (const ctxMsg of context) {
                // Filter: Only include messages from the current user
                if (userId && ctxMsg.from && ctxMsg.from.id !== userId) {
                    continue;
                }

                if (ctxMsg.text) {
                    promptParts.push(`- ${ctxMsg.text}`);
                }
            }

            promptParts.push(`\nAnalyze:\n${text}`);
            prompt = promptParts.join('\n');
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: spamCheckSchema.toJSONSchema({ target: "openapi-3.0" }),
                systemInstruction: SYSTEM_PROMPT,
                // thinkingConfig: {
                //     thinkingLevel: ThinkingLevel.LOW,
                // },
            },
        });

        const responseText = response.text;
        if (!responseText) {
            throw new Error('Empty response from Gemini API');
        }

        const result = spamCheckSchema.parse(JSON.parse(responseText));
        return result;
    } catch (error) {
        // Fail open: treat as not spam on errors
        console.error('Error checking spam, failing open (not spam):', error);
        return {
            msg_type: MsgType.NotSpam,
        };
    }
}
