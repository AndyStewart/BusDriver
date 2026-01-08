import type { PeekMessagesOptions as AzurePeekMessagesOptions } from '@azure/service-bus';
import { ServiceBusClient } from '@azure/service-bus';
import Long from 'long';
import type {
    DeleteMessagesOptions,
    DeleteMessagesResult,
    MessageOperations,
    PeekMessagesOptions as PortPeekMessagesOptions,
    QueueMessage
} from '../../ports/MessageOperations';
import { AzureClientFactory } from './AzureClientFactory';

const DEFAULT_DELETE_MAX_WAIT_TIME_MS = 500;
const DEFAULT_DELETE_BATCH_SIZE = 100;

export interface SenderLike {
    sendMessages(message: unknown): Promise<void>;
    close(): Promise<void>;
}

export interface ReceiverLike {
    receiveMessages(maxMessages: number, options: { maxWaitTimeInMs: number }): Promise<ReceivedMessageLike[]>;
    completeMessage(message: ReceivedMessageLike): Promise<void>;
    abandonMessage(message: ReceivedMessageLike): Promise<void>;
    peekMessages(maxMessages: number, options?: AzurePeekMessagesOptions): Promise<ReceivedMessageLike[]>;
    close(): Promise<void>;
}

export interface ReceivedMessageLike {
    sequenceNumber?: number | string | { toString(): string };
    messageId?: string | { toString(): string };
    body?: unknown;
    applicationProperties?: Record<string, unknown>;
    enqueuedTimeUtc?: Date;
    deliveryCount?: number;
}

export interface ServiceBusClientLike {
    createSender(queueName: string): SenderLike;
    createReceiver(queueName: string, options?: ServiceBusReceiverOptions): ReceiverLike;
    close(): Promise<void>;
}

export interface ServiceBusReceiverOptions {
    receiveMode?: 'peekLock' | 'receiveAndDelete';
}

export type ServiceBusClientFactory = (connectionString: string) => ServiceBusClientLike;

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
