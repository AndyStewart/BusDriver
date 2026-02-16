import type { MessageOperations } from '../ports/MessageOperations';
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

        const total = messages.length;
        let processed = 0;
        const queueReferences = new Map<string, { queueName: string; connectionString: string }>();
        const queueGroups = new Map<
            string,
            { queueName: string; connectionString: string; messages: MessageWithSource[] }
        >();

        const trackQueue = (queueName: string, connectionString: string) => {
            const key = `${connectionString}::${queueName}`;
            if (!queueReferences.has(key)) {
                queueReferences.set(key, { queueName, connectionString });
            }
        };

        const advanceProgress = () => {
            processed += 1;
            onProgress?.(processed, total);
        };

        const recordSuccess = (message: MessageWithSource) => {
            result.successful.push(message);
            advanceProgress();
        };

        const recordFailure = (message: MessageWithSource, error: string) => {
            result.failed.push({ message, error });
            advanceProgress();
        };

        try {
            for (const message of messages) {
                if (!message.source) {
                    recordFailure(message, 'Source queue information missing');
                    continue;
                }

                const key = `${message.source.connectionString}::${message.source.queueName}`;
                const group = queueGroups.get(key) ?? {
                    queueName: message.source.queueName,
                    connectionString: message.source.connectionString,
                    messages: []
                };
                group.messages.push(message);
                queueGroups.set(key, group);
                trackQueue(message.source.queueName, message.source.connectionString);
            }

            for (const group of queueGroups.values()) {
                if (this.messageOperations.deleteMessages) {
                    try {
                        const deleteResult = await this.messageOperations.deleteMessages(
                            group.queueName,
                            group.connectionString,
                            group.messages.map((message) => message.sequenceNumber)
                        );
                        const deletedSequenceNumbers = new Set(deleteResult.deletedSequenceNumbers);
                        const totalGroupCount = group.messages.length;
                        const deletedCount = deleteResult.deletedSequenceNumbers.length;
                        const failureReason = deleteResult.failureReason ?? 'Message(s) not found in queue';
                        const failureSummary = `${failureReason} (deleted ${deletedCount} of ${totalGroupCount})`;

                        for (const message of group.messages) {
                            if (deletedSequenceNumbers.has(message.sequenceNumber)) {
                                recordSuccess(message);
                            } else {
                                recordFailure(message, failureSummary);
                            }
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        for (const message of group.messages) {
                            recordFailure(message, errorMessage);
                        }
                    }
                } else {
                    for (const message of group.messages) {
                        try {
                            await this.messageOperations.deleteMessage(
                                group.queueName,
                                group.connectionString,
                                message.sequenceNumber
                            );
                            recordSuccess(message);
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            recordFailure(message, errorMessage);
                        }
                    }
                }
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
