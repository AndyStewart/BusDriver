export interface QueueMessageView {
    sequenceNumber: string;
    messageId: string;
    body: string;
    rawBody: unknown;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
}

export interface QueueMessagesPage {
    headers: string[];
    rows: string[][];
    messages: QueueMessageView[];
    hasMore: boolean;
}

export interface LoadQueueMessagesRequest {
    queueName: string;
    connectionString: string;
    pageSize: number;
}

export interface LoadMoreQueueMessagesRequest extends LoadQueueMessagesRequest {
    fromSequenceNumber?: string;
}
