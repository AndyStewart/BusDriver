export interface MessageOperations {
    sendMessage(queueName: string, connectionString: string, message: QueueMessage): Promise<void>;
    deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void>;
    peekMessages(queueName: string, connectionString: string, maxMessages: number): Promise<QueueMessage[]>;
    releaseQueueResources?(queueName: string, connectionString: string): Promise<void>;
    dispose?(): Promise<void>;
}

export interface QueueMessage {
    body: unknown;
    messageId: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sequenceNumber: string;
}
