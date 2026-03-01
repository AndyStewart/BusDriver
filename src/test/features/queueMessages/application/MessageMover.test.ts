import * as assert from 'assert';
import { MessageMover } from '../../../../features/queueMessages/MessageMover';
import { MessageSender } from '../../../../features/queueMessages/MessageSender';
import type { MessageWithSource } from '../../../../features/queueMessages/MessageTypes';
import { FakeMessageOperations } from '../../common/fakes/FakeMessageOperations';

describe('MessageMover', () => {
    it('moves messages and deletes from source when provided', async () => {
        const operations = new FakeMessageOperations();
        const sender = new MessageSender(operations);
        const mover = new MessageMover(sender, operations);
        const messages: MessageWithSource[] = [
            {
                body: 'payload-a',
                messageId: 'a',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '10',
                source: {
                    queueName: 'source-a',
                    connectionString: 'Endpoint=sb://source-a/'
                }
            },
            {
                body: 'payload-b',
                messageId: 'b',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '20',
                source: {
                    queueName: 'source-b',
                    connectionString: 'Endpoint=sb://source-b/'
                }
            }
        ];

        const result = await mover.moveMessages('target', 'Endpoint=sb://target/', messages);

        assert.strictEqual(result.successful.length, 2);
        assert.strictEqual(result.failed.length, 0);
        assert.strictEqual(operations.sent.length, 2);
        assert.deepStrictEqual(operations.deleted, [
            {
                queueName: 'source-a',
                connectionString: 'Endpoint=sb://source-a/',
                sequenceNumber: '10'
            },
            {
                queueName: 'source-b',
                connectionString: 'Endpoint=sb://source-b/',
                sequenceNumber: '20'
            }
        ]);
        assert.deepStrictEqual(operations.released, [
            {
                queueName: 'target',
                connectionString: 'Endpoint=sb://target/'
            },
            {
                queueName: 'source-a',
                connectionString: 'Endpoint=sb://source-a/'
            },
            {
                queueName: 'source-b',
                connectionString: 'Endpoint=sb://source-b/'
            }
        ]);
    });

    it('records failures and skips deletes when send fails', async () => {
        const operations = new FakeMessageOperations();
        operations.sendFailures.add('b');
        const sender = new MessageSender(operations);
        const mover = new MessageMover(sender, operations);
        const messages: MessageWithSource[] = [
            {
                body: 'payload-a',
                messageId: 'a',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '10',
                source: {
                    queueName: 'source-a',
                    connectionString: 'Endpoint=sb://source-a/'
                }
            },
            {
                body: 'payload-b',
                messageId: 'b',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '20',
                source: {
                    queueName: 'source-b',
                    connectionString: 'Endpoint=sb://source-b/'
                }
            }
        ];

        const result = await mover.moveMessages('target', 'Endpoint=sb://target/', messages);

        assert.strictEqual(result.successful.length, 1);
        assert.strictEqual(result.failed.length, 1);
        assert.strictEqual(result.failed[0].message.messageId, 'b');
        assert.strictEqual(operations.deleted.length, 1);
        assert.deepStrictEqual(operations.deleted[0], {
            queueName: 'source-a',
            connectionString: 'Endpoint=sb://source-a/',
            sequenceNumber: '10'
        });
        assert.deepStrictEqual(operations.released, [
            {
                queueName: 'target',
                connectionString: 'Endpoint=sb://target/'
            },
            {
                queueName: 'source-a',
                connectionString: 'Endpoint=sb://source-a/'
            }
        ]);
    });

    it('treats messages without source as successful and skips delete', async () => {
        const operations = new FakeMessageOperations();
        const sender = new MessageSender(operations);
        const mover = new MessageMover(sender, operations);
        const messages: MessageWithSource[] = [
            {
                body: 'payload-a',
                messageId: 'a',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '10'
            }
        ];

        const result = await mover.moveMessages('target', 'Endpoint=sb://target/', messages);

        assert.strictEqual(result.successful.length, 1);
        assert.strictEqual(result.failed.length, 0);
        assert.strictEqual(operations.deleted.length, 0);
        assert.deepStrictEqual(operations.released, [
            {
                queueName: 'target',
                connectionString: 'Endpoint=sb://target/'
            }
        ]);
    });
});
