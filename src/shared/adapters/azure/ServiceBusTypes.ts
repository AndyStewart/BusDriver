export interface SenderLike {
    sendMessages(message: unknown): Promise<void>;
    close(): Promise<void>;
}

export interface ReceiverLike {
    receiveMessages(maxMessages: number, options: { maxWaitTimeInMs: number }): Promise<ReceivedMessageLike[]>;
    completeMessage(message: ReceivedMessageLike): Promise<void>;
    abandonMessage(message: ReceivedMessageLike): Promise<void>;
    peekMessages(
        maxMessages: number,
        options?: { fromSequenceNumber?: { toString(): string } }
    ): Promise<ReceivedMessageLike[]>;
    close(): Promise<void>;
}

export interface ReceivedMessageLike {
    sequenceNumber?: number | string | { toString(): string };
    messageId?: string | { toString(): string };
    body?: unknown;
    applicationProperties?: Record<string, unknown>;
    enqueuedTimeUtc?: Date;
    deliveryCount?: number;
}

export interface ServiceBusReceiverOptions {
    receiveMode?: 'peekLock' | 'receiveAndDelete';
}

export interface ServiceBusClientLike {
    createSender(queueName: string): SenderLike;
    createReceiver(queueName: string, options?: ServiceBusReceiverOptions): ReceiverLike;
    close(): Promise<void>;
}

export type ServiceBusClientFactory = (connectionString: string) => ServiceBusClientLike;
