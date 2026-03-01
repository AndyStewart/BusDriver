import type {
    DeleteMessagesOptions,
    DeleteMessagesResult,
    PeekMessagesOptions,
    QueueMessage
} from '../application/MessageOperationsTypes';

export interface MessageOperations {
    sendMessage(queueName: string, connectionString: string, message: QueueMessage): Promise<void>;
    deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void>;
    deleteMessages?(
        queueName: string,
        connectionString: string,
        sequenceNumbers: string[],
        options?: DeleteMessagesOptions
    ): Promise<DeleteMessagesResult>;
    peekMessages(
        queueName: string,
        connectionString: string,
        maxMessages: number,
        options?: PeekMessagesOptions
    ): Promise<QueueMessage[]>;
    purgeQueue(queueName: string, connectionString: string): Promise<number>;
    releaseQueueResources?(queueName: string, connectionString: string): Promise<void>;
    dispose?(): Promise<void>;
}
