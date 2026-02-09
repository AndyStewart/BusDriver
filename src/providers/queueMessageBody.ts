import type { QueueMessage as PortQueueMessage } from '../ports/MessageOperations';

export interface MessageBodyPayload {
    displayBody: string;
    rawBody: unknown;
}

export function formatMessageBody(message: PortQueueMessage): MessageBodyPayload {
    if (typeof message.body === 'string') {
        return {
            displayBody: message.body,
            rawBody: message.body
        };
    }

    if (Buffer.isBuffer(message.body)) {
        const textBody = message.body.toString();
        try {
            const parsed = JSON.parse(textBody.trim());
            return {
                displayBody: JSON.stringify(parsed, null, 2),
                rawBody: parsed
            };
        } catch {
            return {
                displayBody: textBody,
                rawBody: textBody
            };
        }
    }

    return {
        displayBody: JSON.stringify(message.body, null, 2),
        rawBody: message.body
    };
}
