export interface MessageOperations {
    sendMessage(queueName: string, connectionString: string, message: QueueMessage): Promise<void>;
    deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void>;
}

export interface QueueMessage {
    body: string;
    messageId: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sequenceNumber: string;
}
