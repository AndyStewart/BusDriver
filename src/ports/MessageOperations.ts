export interface MessageOperations {
    sendMessage(queueName: string, connectionString: string, message: QueueMessage): Promise<void>;
    deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void>;
    deleteMessages?(
        queueName: string,
        connectionString: string,
        sequenceNumbers: string[],
        options?: DeleteMessagesOptions
    ): Promise<DeleteMessagesResult>;
    peekMessages(queueName: string, connectionString: string, maxMessages: number): Promise<QueueMessage[]>;
    purgeQueue(queueName: string, connectionString: string): Promise<number>;
    releaseQueueResources?(queueName: string, connectionString: string): Promise<void>;
    dispose?(): Promise<void>;
}

export interface DeleteMessagesOptions {
    maxWaitTimeMs?: number;
    maxBatchSize?: number;
}

export interface DeleteMessagesResult {
    deletedSequenceNumbers: string[];
    notFoundSequenceNumbers: string[];
    failureReason?: string;
}

export interface QueueMessage {
    body: unknown;
    messageId: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sequenceNumber: string;
}
