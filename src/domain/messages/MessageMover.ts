import type { MessageOperations } from '../../ports/MessageOperations';
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

        for (const message of messages) {
            try {
                await this.messageSender.send(targetQueueName, targetConnectionString, message);

                if (message.source) {
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

        return result;
    }
}
