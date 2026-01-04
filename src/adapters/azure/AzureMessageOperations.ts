import { ServiceBusClient } from '@azure/service-bus';
import type { MessageOperations, QueueMessage } from '../../ports/MessageOperations';

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
    constructor(private readonly clientFactory: ServiceBusClientFactory = (connectionString) => {
        return new ServiceBusClient(connectionString);
    }) {}

    async sendMessage(queueName: string, connectionString: string, messageData: QueueMessage): Promise<void> {
        const client = this.clientFactory(connectionString);
        const sender = client.createSender(queueName);

        try {
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
        } finally {
            await sender.close();
            await client.close();
        }
    }

    async deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void> {
        const client = this.clientFactory(connectionString);
        const receiver = client.createReceiver(queueName);

        try {
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
        } finally {
            await receiver.close();
            await client.close();
        }
    }

    async peekMessages(queueName: string, connectionString: string, maxMessages: number): Promise<QueueMessage[]> {
        const client = this.clientFactory(connectionString);
        const receiver = client.createReceiver(queueName);

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
            await receiver.close();
            await client.close();
        }
    }
}
