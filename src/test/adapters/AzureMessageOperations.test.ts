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

        assert.strictEqual(senderClosed, false);
        assert.strictEqual(clientClosed, false);
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

        await operations.releaseQueueResources('queue-a', 'Endpoint=sb://fake/');
        assert.strictEqual(senderClosed, true);
        assert.strictEqual(clientClosed, false);

        await operations.dispose();
        assert.strictEqual(clientClosed, true);
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
            peekMessages: async () => {
                return [];
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
        assert.strictEqual(receiverClosed, false);
        assert.strictEqual(clientClosed, false);

        await operations.releaseQueueResources('queue-a', 'Endpoint=sb://fake/');
        assert.strictEqual(receiverClosed, true);
        assert.strictEqual(clientClosed, false);

        await operations.dispose();
        assert.strictEqual(clientClosed, true);
    });

    it('deletes multiple messages with batch matching', async () => {
        const completed: string[] = [];
        const abandoned: string[] = [];
        let receiveCalls = 0;

        const receiver: ReceiverLike = {
            receiveMessages: async () => {
                receiveCalls++;
                if (receiveCalls === 1) {
                    return [
                        { sequenceNumber: '1' },
                        { sequenceNumber: '2' },
                        { sequenceNumber: '3' }
                    ];
                }
                return [];
            },
            peekMessages: async () => {
                return [];
            },
            completeMessage: async (message) => {
                completed.push(String(message.sequenceNumber));
            },
            abandonMessage: async (message) => {
                abandoned.push(String(message.sequenceNumber));
            },
            close: async () => {
                return;
            }
        };

        const client: ServiceBusClientLike = {
            createSender: () => {
                throw new Error('sender not needed');
            },
            createReceiver: () => receiver,
            close: async () => {
                return;
            }
        };

        const operations = new AzureMessageOperations(() => client);

        const result = await operations.deleteMessages(
            'queue-a',
            'Endpoint=sb://fake/',
            ['1', '3', '5'],
            { maxWaitTimeMs: 0, maxBatchSize: 100 }
        );

        assert.deepStrictEqual(completed.sort(), ['1', '3']);
        assert.deepStrictEqual(abandoned, ['2']);
        assert.deepStrictEqual(result.deletedSequenceNumbers.sort(), ['1', '3']);
        assert.deepStrictEqual(result.notFoundSequenceNumbers, ['5']);
        assert.strictEqual(result.failureReason, 'Message(s) not found in queue');
    });

    it('purges all available messages in batches', async () => {
        const completed: string[] = [];
        let receiverClosed = false;
        let clientClosed = false;
        let receiveCalls = 0;

        const receiver: ReceiverLike = {
            receiveMessages: async () => {
                receiveCalls++;
                if (receiveCalls === 1) {
                    return [
                        { sequenceNumber: '1' },
                        { sequenceNumber: '2' }
                    ];
                }

                if (receiveCalls === 2) {
                    return [
                        { sequenceNumber: '3' }
                    ];
                }

                return [];
            },
            peekMessages: async () => {
                return [];
            },
            completeMessage: async (message) => {
                completed.push(String(message.sequenceNumber));
            },
            abandonMessage: async () => {
                return;
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
        const purged = await operations.purgeQueue('queue-a', 'Endpoint=sb://fake/');

        assert.strictEqual(purged, 3);
        assert.deepStrictEqual(completed, ['1', '2', '3']);
        assert.strictEqual(receiverClosed, true);
        assert.strictEqual(clientClosed, false);

        await operations.dispose();
        assert.strictEqual(clientClosed, true);
    });

    it('peeks messages and maps metadata', async () => {
        let receiverClosed = false;
        let clientClosed = false;
        let peekFromSequence: string | undefined;

        const receiver: ReceiverLike = {
            receiveMessages: async () => {
                return [];
            },
            completeMessage: async () => {
                return;
            },
            abandonMessage: async () => {
                return;
            },
            peekMessages: async (_maxMessages, options) => {
                peekFromSequence = options?.fromSequenceNumber?.toString();
                return [
                    {
                        sequenceNumber: 7,
                        messageId: 'msg-7',
                        body: { hello: 'world' },
                        applicationProperties: { correlationId: 'abc' },
                        enqueuedTimeUtc: new Date('2024-03-01T12:00:00.000Z'),
                        deliveryCount: 1
                    }
                ];
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
        const result = await operations.peekMessages('queue-a', 'Endpoint=sb://fake/', 50, { fromSequenceNumber: '42' });

        assert.deepStrictEqual(result, [
            {
                body: { hello: 'world' },
                messageId: 'msg-7',
                properties: { correlationId: 'abc' },
                enqueuedTime: new Date('2024-03-01T12:00:00.000Z').toLocaleString(),
                deliveryCount: 1,
                sequenceNumber: '7'
            }
        ]);
        assert.strictEqual(peekFromSequence, '42');
        assert.strictEqual(receiverClosed, true);
        assert.strictEqual(clientClosed, false);

        await operations.dispose();
        assert.strictEqual(clientClosed, true);
    });

    it('creates a fresh receiver for each peek', async () => {
        let receiverCreates = 0;
        const receivers: Array<{ closed: boolean }> = [];

        const client: ServiceBusClientLike = {
            createSender: () => {
                throw new Error('sender not needed');
            },
            createReceiver: () => {
                receiverCreates++;
                const receiverState = { closed: false };
                receivers.push(receiverState);
                const receiver: ReceiverLike = {
                    receiveMessages: async () => {
                        return [];
                    },
                    completeMessage: async () => {
                        return;
                    },
                    abandonMessage: async () => {
                        return;
                    },
                    peekMessages: async () => {
                        return [];
                    },
                    close: async () => {
                        receiverState.closed = true;
                    }
                };
                return receiver;
            },
            close: async () => {
                return;
            }
        };

        const operations = new AzureMessageOperations(() => client);
        await operations.peekMessages('queue-a', 'Endpoint=sb://fake/', 1);
        await operations.peekMessages('queue-a', 'Endpoint=sb://fake/', 1);

        assert.strictEqual(receiverCreates, 2);
        assert.strictEqual(receivers.length, 2);
        assert.deepStrictEqual(receivers.map(receiver => receiver.closed), [true, true]);
    });

    it('reuses senders per queue until released', async () => {
        let senderCreates = 0;
        const sender: SenderLike = {
            sendMessages: async () => {
                return;
            },
            close: async () => {
                return;
            }
        };

        const client: ServiceBusClientLike = {
            createSender: () => {
                senderCreates++;
                return sender;
            },
            createReceiver: () => {
                throw new Error('receiver not needed');
            },
            close: async () => {
                return;
            }
        };

        const operations = new AzureMessageOperations(() => client);
        const payload: QueueMessage = {
            body: 'hello',
            messageId: 'msg-1',
            properties: {},
            enqueuedTime: '2024-01-02T03:04:05.000Z',
            deliveryCount: 0,
            sequenceNumber: '1'
        };

        await operations.sendMessage('queue-a', 'Endpoint=sb://fake/', payload);
        await operations.sendMessage('queue-a', 'Endpoint=sb://fake/', payload);

        assert.strictEqual(senderCreates, 1);

        await operations.releaseQueueResources('queue-a', 'Endpoint=sb://fake/');
        await operations.sendMessage('queue-a', 'Endpoint=sb://fake/', payload);

        assert.strictEqual(senderCreates, 2);
    });

    it('throws when used after dispose', async () => {
        const sender: SenderLike = {
            sendMessages: async () => {
                return;
            },
            close: async () => {
                return;
            }
        };

        const client: ServiceBusClientLike = {
            createSender: () => sender,
            createReceiver: () => {
                throw new Error('receiver not needed');
            },
            close: async () => {
                return;
            }
        };

        const operations = new AzureMessageOperations(() => client);
        const payload: QueueMessage = {
            body: 'hello',
            messageId: 'msg-1',
            properties: {},
            enqueuedTime: '2024-01-02T03:04:05.000Z',
            deliveryCount: 0,
            sequenceNumber: '1'
        };

        await operations.dispose();

        await assert.rejects(
            () => operations.sendMessage('queue-a', 'Endpoint=sb://fake/', payload),
            /disposed/
        );
    });
});
