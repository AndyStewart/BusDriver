export interface DeleteMessagesOptions {
    maxWaitTimeMs?: number;
    maxBatchSize?: number;
}

export interface DeleteMessagesResult {
    deletedSequenceNumbers: string[];
    notFoundSequenceNumbers: string[];
    failureReason?: string;
}

export interface PeekMessagesOptions {
    fromSequenceNumber?: string;
}

export interface QueueMessage {
    body: unknown;
    messageId: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sequenceNumber: string;
}
