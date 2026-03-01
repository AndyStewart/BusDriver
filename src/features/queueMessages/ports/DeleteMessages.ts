import type { MessageOperationResult, MessageWithSource } from './MessageOperationTypes';

export interface DeleteMessagesRequest {
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}

export interface DeleteMessages {
    delete(request: DeleteMessagesRequest): Promise<MessageOperationResult<MessageWithSource>>;
}
