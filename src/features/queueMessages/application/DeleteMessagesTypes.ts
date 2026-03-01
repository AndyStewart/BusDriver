import type { MessageWithSource } from './MessageOperationTypes';

export interface DeleteMessagesRequest {
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}
