import * as assert from 'assert';
import { AzureMessageOperations, ReceiverLike, SenderLike, ServiceBusClientLike } from '../../adapters/azure/AzureMessageOperations';
import type { QueueMessage } from '../../ports/MessageOperations';

describe('AzureMessageOperations', () => {
    it('sends messages with original metadata', async () => {
        let sentMessage: unknown | undefined;
        let senderClosed = false;
        let clientClosed = false;

        const sender: SenderLike = {
            sendMessages: async (message: unknown) => {
                sentMessage = message;
            },
            close: async () => {
                senderClosed = true;
            }
        };

        const client: ServiceBusClientLike = {
            createSender: () => sender,
            createReceiver: () => {
                throw new Error('receiver not needed');
            },
            close: async () => {
                clientClosed = true;
            }
        };

        const operations = new AzureMessageOperations(() => client);
        const payload: QueueMessage = {
            body: 'hello',
            messageId: 'msg-1',
            properties: { correlationId: 'abc' },
            enqueuedTime: '2024-01-02T03:04:05.000Z',
            deliveryCount: 2,
            sequenceNumber: '42'
        };

        await operations.sendMessage('queue-a', 'Endpoint=sb://fake/', payload);

        assert.strictEqual(senderClosed, true);
        assert.strictEqual(clientClosed, true);
        assert.deepStrictEqual(sentMessage, {
            body: 'hello',
            messageId: 'msg-1',
            applicationProperties: {
                correlationId: 'abc',
                originalEnqueuedTime: '2024-01-02T03:04:05.000Z',
                originalDeliveryCount: 2,
                originalSequenceNumber: '42'
            }
        });
    });

    it('deletes messages by sequence number', async () => {
        const completed: string[] = [];
        const abandoned: string[] = [];
        let receiverClosed = false;
        let clientClosed = false;

        const receiver: ReceiverLike = {
            receiveMessages: async () => {
                return [
                    { sequenceNumber: '41' },
                    { sequenceNumber: '42' }
                ];
            },
            completeMessage: async (message) => {
                completed.push(String(message.sequenceNumber));
            },
            abandonMessage: async (message) => {
                abandoned.push(String(message.sequenceNumber));
            },
            close: async () => {
                receiverClosed = true;
            }
        };

        const client: ServiceBusClientLike = {
            createSender: () => {
                throw new Error('sender not needed');
            },
            createReceiver: () => receiver,
            close: async () => {
                clientClosed = true;
            }
        };

        const operations = new AzureMessageOperations(() => client);

        await operations.deleteMessage('queue-a', 'Endpoint=sb://fake/', '42');

        assert.deepStrictEqual(completed, ['42']);
        assert.deepStrictEqual(abandoned, ['41']);
        assert.strictEqual(receiverClosed, true);
        assert.strictEqual(clientClosed, true);
    });
});
