import type { Queue } from '../../../shared/ports/Queue';

export interface MessageWithOptionalSource {
    sourceQueue?: Queue;
    sourceConnectionString?: string;
}

export function withSourceContext<T extends MessageWithOptionalSource>(
    messageData: T | T[],
    queue: Queue,
    connectionString: string
): T[] {
    const messages = Array.isArray(messageData) ? messageData : [messageData];
    return messages.map(message => ({
        ...message,
        sourceQueue: queue,
        sourceConnectionString: connectionString
    }));
}
