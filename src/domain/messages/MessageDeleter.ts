import type { MessageOperations } from '../../ports/MessageOperations';
import type { MessageOperationResult, MessageWithSource } from './MessageTypes';

export class MessageDeleter {
    constructor(private readonly messageOperations: MessageOperations) {}

    async deleteMessages(
        messages: MessageWithSource[],
        onProgress?: (processed: number, total: number) => void
    ): Promise<MessageOperationResult<MessageWithSource>> {
        const result: MessageOperationResult<MessageWithSource> = {
            successful: [],
            failed: []
        };

        let processed = 0;
        const total = messages.length;

        for (const message of messages) {
            if (!message.source) {
                result.failed.push({ message, error: 'Source queue information missing' });
            } else {
                try {
                    await this.messageOperations.deleteMessage(
                        message.source.queueName,
                        message.source.connectionString,
                        message.sequenceNumber
                    );
                    result.successful.push(message);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.failed.push({ message, error: errorMessage });
                }
            }

            processed++;
            onProgress?.(processed, total);
        }

        return result;
    }
}
