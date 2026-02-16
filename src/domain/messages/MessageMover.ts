import type { MessageOperations } from '../../ports/secondary/MessageOperations';
import type { MessageOperationResult, MessageWithSource } from './MessageTypes';
import { MessageSender } from './MessageSender';

export class MessageMover {
    constructor(
        private readonly messageSender: MessageSender,
        private readonly messageOperations: MessageOperations
    ) {}

    async moveMessages(
        targetQueueName: string,
        targetConnectionString: string,
        messages: MessageWithSource[],
        onProgress?: (processed: number, total: number) => void
    ): Promise<MessageOperationResult<MessageWithSource>> {
        const result: MessageOperationResult<MessageWithSource> = {
            successful: [],
            failed: []
        };

        let processed = 0;
        const total = messages.length;
        const queueReferences = new Map<string, { queueName: string; connectionString: string }>();

        const trackQueue = (queueName: string, connectionString: string) => {
            const key = `${connectionString}::${queueName}`;
            if (!queueReferences.has(key)) {
                queueReferences.set(key, { queueName, connectionString });
            }
        };

        trackQueue(targetQueueName, targetConnectionString);

        try {
            for (const message of messages) {
                try {
                    await this.messageSender.send(targetQueueName, targetConnectionString, message);

                    if (message.source) {
                        trackQueue(message.source.queueName, message.source.connectionString);
                        await this.messageOperations.deleteMessage(
                            message.source.queueName,
                            message.source.connectionString,
                            message.sequenceNumber
                        );
                    }

                    result.successful.push(message);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.failed.push({ message, error: errorMessage });
                }

                processed++;
                onProgress?.(processed, total);
            }
        } finally {
            if (this.messageOperations.releaseQueueResources) {
                for (const queue of queueReferences.values()) {
                    await this.messageOperations.releaseQueueResources(
                        queue.queueName,
                        queue.connectionString
                    );
                }
            }
        }

        return result;
    }
}
