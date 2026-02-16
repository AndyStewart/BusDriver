import type { MessageOperationResult, MessageWithSource } from '../../domain/messages/MessageTypes';

export interface MoveMessagesRequest {
    targetQueueName: string;
    targetConnectionString: string;
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}

export interface MoveMessages {
    move(request: MoveMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
