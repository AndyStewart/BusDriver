import * as assert from 'assert';
import { MessageDeleter } from '../../../../features/queueMessages/application/MessageDeleter';
import type { MessageWithSource } from '../../../../features/queueMessages/application/MessageTypes';
import { FakeMessageOperations } from '../../../shared/fakes/FakeMessageOperations';

describe('MessageDeleter', () => {
    it('deletes messages with source information', async () => {
        const operations = new FakeMessageOperations();
        const deleter = new MessageDeleter(operations);
        const messages: MessageWithSource[] = [
            {
                body: 'payload-a',
                messageId: 'a',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '10',
                source: {
                    queueName: 'queue-a',
                    connectionString: 'Endpoint=sb://queue-a/'
                }
            }
        ];

        const result = await deleter.deleteMessages(messages);

        assert.strictEqual(result.successful.length, 1);
        assert.strictEqual(result.failed.length, 0);
        assert.deepStrictEqual(operations.deleted[0], {
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://queue-a/',
            sequenceNumber: '10'
        });
        assert.deepStrictEqual(operations.released, [
            {
                queueName: 'queue-a',
                connectionString: 'Endpoint=sb://queue-a/'
            }
        ]);
    });

    it('records failures when source is missing', async () => {
        const operations = new FakeMessageOperations();
        const deleter = new MessageDeleter(operations);
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

        const result = await deleter.deleteMessages(messages);

        assert.strictEqual(result.successful.length, 0);
        assert.strictEqual(result.failed.length, 1);
        assert.strictEqual(result.failed[0].error, 'Source queue information missing');
        assert.strictEqual(operations.deleted.length, 0);
        assert.deepStrictEqual(operations.released, []);
    });

    it('returns partial failures when deletes fail', async () => {
        const operations = new FakeMessageOperations();
        operations.deleteFailures.add('20');
        const deleter = new MessageDeleter(operations);
        const messages: MessageWithSource[] = [
            {
                body: 'payload-a',
                messageId: 'a',
                properties: {},
                enqueuedTime: '2024-01-02T03:04:05Z',
                deliveryCount: 1,
                sequenceNumber: '10',
                source: {
                    queueName: 'queue-a',
                    connectionString: 'Endpoint=sb://queue-a/'
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
                    queueName: 'queue-b',
                    connectionString: 'Endpoint=sb://queue-b/'
                }
            }
        ];

        const result = await deleter.deleteMessages(messages);

        assert.strictEqual(result.successful.length, 1);
        assert.strictEqual(result.failed.length, 1);
        assert.strictEqual(result.failed[0].message.messageId, 'b');
        assert.strictEqual(
            result.failed[0].error,
            'Message(s) not found in queue (deleted 0 of 1)'
        );
        assert.deepStrictEqual(operations.deleted[0], {
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://queue-a/',
            sequenceNumber: '10'
        });
        assert.deepStrictEqual(operations.released, [
            {
                queueName: 'queue-a',
                connectionString: 'Endpoint=sb://queue-a/'
            },
            {
                queueName: 'queue-b',
                connectionString: 'Endpoint=sb://queue-b/'
            }
        ]);
    });
});
