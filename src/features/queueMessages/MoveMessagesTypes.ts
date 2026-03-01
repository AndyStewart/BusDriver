import type { MessageWithSource } from './MessageOperationTypes';

export interface MoveMessagesRequest {
    targetQueueName: string;
    targetConnectionString: string;
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}
