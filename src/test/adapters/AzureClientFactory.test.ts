import * as assert from 'assert';
import {
    AzureClientFactory
} from '../../adapters/azure/AzureClientFactory';
import type {
    ReceiverLike,
    SenderLike,
    ServiceBusClientLike
} from '../../adapters/azure/AzureMessageOperations';

describe('AzureClientFactory', () => {
    it('caches senders and receivers per connection and queue', () => {
        const client = createClient();
        const factory = new AzureClientFactory(() => client);

        const senderA = factory.getSender('Endpoint=sb://a/', 'queue-1');
        const senderB = factory.getSender('Endpoint=sb://a/', 'queue-1');
        const receiverA = factory.getReceiver('Endpoint=sb://a/', 'queue-1');
        const receiverB = factory.getReceiver('Endpoint=sb://a/', 'queue-1');

        assert.strictEqual(senderA, senderB);
        assert.strictEqual(receiverA, receiverB);
    });

    it('creates temporary receivers without caching', () => {
        const client = createClient();
        const factory = new AzureClientFactory(() => client);

        const first = factory.getTemporaryReceiver('Endpoint=sb://a/', 'queue-1');
        const second = factory.getTemporaryReceiver('Endpoint=sb://a/', 'queue-1');

        assert.notStrictEqual(first, second);
    });

    it('rejects resource access after disposeAll', async () => {
        const client = createClient();
        const factory = new AzureClientFactory(() => client);

        factory.getSender('Endpoint=sb://a/', 'queue-1');
        await factory.disposeAll();

        assert.strictEqual(client.wasClosed, true);
        assert.throws(() => {
            factory.getSender('Endpoint=sb://a/', 'queue-1');
        }, /disposed/);
    });
});

function createClient(): ServiceBusClientLike & { wasClosed: boolean } {
    const senders = new Map<string, SenderLike>();
    const receivers = new Map<string, ReceiverLike>();

    return {
        wasClosed: false,
        createSender: (queueName: string) => {
            const sender: SenderLike = {
                sendMessages: async () => undefined,
                close: async () => undefined
            };
            senders.set(queueName, sender);
            return sender;
        },
        createReceiver: (queueName: string) => {
            const receiver: ReceiverLike = {
                receiveMessages: async () => [],
                peekMessages: async () => [],
                completeMessage: async () => undefined,
                abandonMessage: async () => undefined,
                close: async () => undefined
            };
            receivers.set(queueName, receiver);
            return receiver;
        },
        close: async function (): Promise<void> {
            this.wasClosed = true;
        }
    };
}
