export interface LoadMoreQueueMessage {
    sequenceNumber: string;
    messageId: string;
    body: string;
    rawBody: unknown;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
}

export interface AppendMessagesCommand {
    command: 'appendMessages';
    rows: string[][];
    messages: LoadMoreQueueMessage[];
    hasMore: boolean;
}

export function buildAppendMessagesCommand(
    rows: string[][],
    messages: LoadMoreQueueMessage[],
    pageSize: number
): AppendMessagesCommand {
    return {
        command: 'appendMessages',
        rows,
        messages,
        hasMore: messages.length === pageSize
    };
}

export function buildEmptyAppendMessagesCommand(): AppendMessagesCommand {
    return {
        command: 'appendMessages',
        rows: [],
        messages: [],
        hasMore: false
    };
}
