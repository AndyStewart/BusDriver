import type { MessageWithSource } from '../queueMessageContracts/MessageOperationTypes';

export interface DeleteMessagesRequest {
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}
