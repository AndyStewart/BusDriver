import type { QueueMessage } from './MessageOperationsTypes';

export interface MessageSource {
    queueName: string;
    connectionString: string;
}

export interface MessageWithSource extends QueueMessage {
    source?: MessageSource;
}

export interface MessageOperationFailure<T> {
    message: T;
    error: string;
}

export interface MessageOperationResult<T> {
    successful: T[];
    failed: Array<MessageOperationFailure<T>>;
}
