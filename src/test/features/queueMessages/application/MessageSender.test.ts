import * as assert from 'assert';
import { MessageSender } from '../../../../features/queueMessages/MessageSender';
import type { QueueMessage } from '../../../../features/queueMessages/MessageOperationsTypes';
import { FakeMessageOperations } from '../../common/fakes/FakeMessageOperations';

describe('MessageSender', () => {
    it('forwards messages to the operations port', async () => {
        const operations = new FakeMessageOperations();
        const sender = new MessageSender(operations);
        const message: QueueMessage = {
            body: 'payload',
            messageId: 'msg-1',
            properties: { origin: 'test' },
            enqueuedTime: '2024-01-02T03:04:05Z',
            deliveryCount: 1,
            sequenceNumber: '10'
        };

        await sender.send('queue-a', 'Endpoint=sb://fake/', message);

        assert.strictEqual(operations.sent.length, 1);
        assert.deepStrictEqual(operations.sent[0], {
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://fake/',
            message
        });
    });
});
