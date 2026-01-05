import { ServiceBusClient } from '@azure/service-bus';
import type { MessageOperations, QueueMessage } from '../../ports/MessageOperations';
import { AzureClientFactory } from './AzureClientFactory';

export interface SenderLike {
    sendMessages(message: unknown): Promise<void>;
    close(): Promise<void>;
}

export interface ReceiverLike {
    receiveMessages(maxMessages: number, options: { maxWaitTimeInMs: number }): Promise<ReceivedMessageLike[]>;
    completeMessage(message: ReceivedMessageLike): Promise<void>;
    abandonMessage(message: ReceivedMessageLike): Promise<void>;
    peekMessages(maxMessages: number): Promise<ReceivedMessageLike[]>;
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
    createReceiver(queueName: string): ReceiverLike;
    close(): Promise<void>;
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
        const receiver = this.clientPool.getReceiver(connectionString, queueName);

        const maxAttempts = 5;
        let found = false;

        for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
            const messages = await receiver.receiveMessages(100, { maxWaitTimeInMs: 5000 });

            for (const message of messages) {
                if (message.sequenceNumber?.toString() === sequenceNumber) {
                    await receiver.completeMessage(message);
                    found = true;
                } else {
                    await receiver.abandonMessage(message);
                }
            }

            if (!found && messages.length === 0) {
                break;
            }
        }

        if (!found) {
            console.warn(`Message with sequence number ${sequenceNumber} not found in ${queueName} after ${maxAttempts} attempts`);
            throw new Error(`Message ${sequenceNumber} not found in queue`);
        }
    }

    async peekMessages(queueName: string, connectionString: string, maxMessages: number): Promise<QueueMessage[]> {
        const receiver = this.clientPool.getReceiver(connectionString, queueName);

        try {
            const messages = await receiver.peekMessages(maxMessages);
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
            await this.clientPool.releaseQueueResources(connectionString, queueName);
        }
    }

    async releaseQueueResources(queueName: string, connectionString: string): Promise<void> {
        await this.clientPool.releaseQueueResources(connectionString, queueName);
    }

    async dispose(): Promise<void> {
        await this.clientPool.disposeAll();
    }
}
