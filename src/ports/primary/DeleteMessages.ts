import type { MessageOperationResult, MessageWithSource } from '../../domain/messages/MessageTypes';

export interface DeleteMessagesRequest {
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}

export interface DeleteMessages {
    delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
