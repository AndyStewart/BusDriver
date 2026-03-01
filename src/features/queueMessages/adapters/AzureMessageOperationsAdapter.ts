import { ServiceBusClient } from '@azure/service-bus';
import Long from 'long';
import type { ServiceBusClientFactory } from '../../../shared/adapters/azure/ServiceBusTypes';
import type {
    MessageOperations,
} from '../ports/MessageOperations';
import type {
    DeleteMessagesOptions,
    DeleteMessagesResult,
    PeekMessagesOptions as PortPeekMessagesOptions,
    QueueMessage
} from '../application/MessageOperationsTypes';
import { AzureClientFactory } from '../../../shared/adapters/azure/AzureClientFactory';
export type {
    ReceivedMessageLike,
    ServiceBusClientFactory,
    ServiceBusClientLike,
    ServiceBusReceiverOptions,
    SenderLike,
    ReceiverLike
} from '../../../shared/adapters/azure/ServiceBusTypes';

const DEFAULT_DELETE_MAX_WAIT_TIME_MS = 500;
const DEFAULT_DELETE_BATCH_SIZE = 100;

export class AzureMessageOperations implements MessageOperations {
    private readonly clientPool: AzureClientFactory;

    constructor(private readonly clientFactory: ServiceBusClientFactory = (connectionString) => {
        return new ServiceBusClient(connectionString);
    }) {
        this.clientPool = new AzureClientFactory(clientFactory);
    }

    async sendMessage(queueName: string, connectionString: string, messageData: QueueMessage): Promise<void> {
        const sender = this.clientPool.getSender(connectionString, queueName);

        const message = {
            body: messageData.body,
            messageId: messageData.messageId,
            applicationProperties: {
                ...messageData.properties,
                originalEnqueuedTime: messageData.enqueuedTime,
                originalDeliveryCount: messageData.deliveryCount,
                originalSequenceNumber: messageData.sequenceNumber
            }
        };

        await sender.sendMessages(message);
    }

    async deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void> {
        const result = await this.deleteMessages(queueName, connectionString, [sequenceNumber]);
        if (result.notFoundSequenceNumbers.length > 0) {
            const reason = result.failureReason ?? 'Message not found in queue';
            throw new Error(`${reason} (deleted ${result.deletedSequenceNumbers.length} of 1)`);
        }
    }

    async deleteMessages(
        queueName: string,
        connectionString: string,
        sequenceNumbers: string[],
        options?: DeleteMessagesOptions
    ): Promise<DeleteMessagesResult> {
        const receiver = this.clientPool.getReceiver(connectionString, queueName);

        const maxWaitTimeMs = Math.max(0, options?.maxWaitTimeMs ?? DEFAULT_DELETE_MAX_WAIT_TIME_MS);
        const maxBatchSize = Math.max(1, options?.maxBatchSize ?? DEFAULT_DELETE_BATCH_SIZE);
        const targetSequenceNumbers = new Set(sequenceNumbers);
        const deletedSequenceNumbers = new Set<string>();

        while (deletedSequenceNumbers.size < targetSequenceNumbers.size) {
            const messages = await receiver.receiveMessages(maxBatchSize, { maxWaitTimeInMs: maxWaitTimeMs });

            for (const message of messages) {
                const currentSequenceNumber = message.sequenceNumber?.toString();
                if (
                    currentSequenceNumber &&
                    targetSequenceNumbers.has(currentSequenceNumber) &&
                    !deletedSequenceNumbers.has(currentSequenceNumber)
                ) {
                    await receiver.completeMessage(message);
                    deletedSequenceNumbers.add(currentSequenceNumber);
                    continue;
                }

                await receiver.abandonMessage(message);
            }

            if (messages.length === 0) {
                break;
            }
        }

        const notFoundSequenceNumbers = sequenceNumbers.filter(
            (sequenceNumber) => !deletedSequenceNumbers.has(sequenceNumber)
        );
        const failureReason =
            notFoundSequenceNumbers.length > 0 ? 'Message(s) not found in queue' : undefined;

        if (notFoundSequenceNumbers.length > 0) {
            console.warn(
                `Delete incomplete for ${queueName}: ${notFoundSequenceNumbers.length} of ${sequenceNumbers.length} not found`
            );
        }

        return {
            deletedSequenceNumbers: Array.from(deletedSequenceNumbers),
            notFoundSequenceNumbers,
            failureReason
        };
    }

    async peekMessages(
        queueName: string,
        connectionString: string,
        maxMessages: number,
        options?: PortPeekMessagesOptions
    ): Promise<QueueMessage[]> {
        const receiver = this.clientPool.getTemporaryReceiver(connectionString, queueName);
        try {
            const startSequence = options?.fromSequenceNumber ?? '1';
            const messages = await receiver.peekMessages(maxMessages, {
                fromSequenceNumber: Long.fromString(startSequence)
            });
            return messages.map((message) => {
                return {
                    body: message.body,
                    messageId: message.messageId?.toString() ?? '',
                    properties: message.applicationProperties ?? {},
                    enqueuedTime: message.enqueuedTimeUtc
                        ? message.enqueuedTimeUtc.toLocaleString()
                        : 'N/A',
                    deliveryCount: message.deliveryCount ?? 0,
                    sequenceNumber: message.sequenceNumber?.toString() ?? 'N/A'
                };
            });
        } finally {
            await receiver.close();
        }
    }

    async purgeQueue(queueName: string, connectionString: string): Promise<number> {
        const receiver = this.clientPool.getTemporaryReceiver(connectionString, queueName, {
            receiveMode: 'receiveAndDelete'
        });
        let purgedCount = 0;
        let hasMoreMessages = true;

        try {
            while (hasMoreMessages) {
                const messages = await receiver.receiveMessages(DEFAULT_DELETE_BATCH_SIZE, {
                    maxWaitTimeInMs: DEFAULT_DELETE_MAX_WAIT_TIME_MS
                });

                if (messages.length === 0) {
                    hasMoreMessages = false;
                    continue;
                }

                purgedCount += messages.length;
            }

            return purgedCount;
        } finally {
            await receiver.close();
        }
    }

    async releaseQueueResources(queueName: string, connectionString: string): Promise<void> {
        await this.clientPool.releaseQueueResources(connectionString, queueName);
    }

    async dispose(): Promise<void> {
        await this.clientPool.disposeAll();
    }
}
