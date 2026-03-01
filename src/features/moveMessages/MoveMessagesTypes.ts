import type { MessageWithSource } from '../queueMessageContracts/MessageOperationTypes';

export interface MoveMessagesRequest {
    targetQueueName: string;
    targetConnectionString: string;
    messages: MessageWithSource[];
    onProgress?: (processed: number, total: number) => void;
}
