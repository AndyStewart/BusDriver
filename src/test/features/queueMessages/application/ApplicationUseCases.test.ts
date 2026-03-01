import * as assert from 'assert';
import { DeleteMessagesUseCase } from '../../../../features/queueMessages/DeleteMessagesUseCase';
import { ListQueuesUseCase } from '../../../../features/queues/ListQueuesUseCase';
import { MoveMessagesUseCase } from '../../../../features/queueMessages/MoveMessagesUseCase';
import { OpenQueueMessagesUseCase } from '../../../../features/queueMessages/OpenQueueMessagesUseCase';
import { PurgeQueueUseCase } from '../../../../features/queueMessages/PurgeQueueUseCase';
import { MessageDeleter } from '../../../../features/queueMessages/MessageDeleter';
import type { MessageOperationResult, MessageWithSource } from '../../../../features/queueMessages/MessageTypes';
import { MessageMover } from '../../../../features/queueMessages/MessageMover';
import { QueueRegistryService } from '../../../../features/queues/QueueRegistryService';
import type { QueueMessagesPanelGateway } from '../../../../ports/secondary/QueueMessagesPanelGateway';
import type { MessageOperations } from '../../../../ports/secondary/MessageOperations';
import type { ConnectionLookup } from '../../../../ports/secondary/ConnectionLookup';

describe('Application use cases', () => {
    it('MoveMessagesUseCase delegates to MessageMover', async () => {
        const expected: MessageOperationResult<MessageWithSource> = {
            successful: [],
            failed: []
        };
        const fakeMover = new FakeMessageMover(expected);
        const useCase = new MoveMessagesUseCase(fakeMover as unknown as MessageMover);

        const messages: MessageWithSource[] = [{
            sequenceNumber: '1',
            messageId: 'm1',
            body: '{}',
            properties: {},
            enqueuedTime: '2026-02-16T00:00:00Z',
            deliveryCount: 1
        }];

        const result = await useCase.move({
            targetQueueName: 'queue-a',
            targetConnectionString: 'Endpoint=sb://test',
            messages
        });

        assert.strictEqual(result, expected);
        assert.deepStrictEqual(fakeMover.lastCall, {
            targetQueueName: 'queue-a',
            targetConnectionString: 'Endpoint=sb://test',
            messages
        });
    });

    it('DeleteMessagesUseCase delegates to MessageDeleter', async () => {
        const expected: MessageOperationResult<MessageWithSource> = {
            successful: [],
            failed: []
        };
        const fakeDeleter = new FakeMessageDeleter(expected);
        const useCase = new DeleteMessagesUseCase(fakeDeleter as unknown as MessageDeleter);

        const messages: MessageWithSource[] = [{
            sequenceNumber: '2',
            messageId: 'm2',
            body: '{}',
            properties: {},
            enqueuedTime: '2026-02-16T00:00:00Z',
            deliveryCount: 1
        }];

        const result = await useCase.delete({ messages });

        assert.strictEqual(result, expected);
        assert.deepStrictEqual(fakeDeleter.lastMessages, messages);
    });

    it('PurgeQueueUseCase delegates to MessageOperations', async () => {
        const operations = new FakePurgeOperations(3);
        const useCase = new PurgeQueueUseCase(operations);

        const purgedCount = await useCase.purge({
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test'
        });

        assert.strictEqual(purgedCount, 3);
        assert.deepStrictEqual(operations.lastCall, {
            queueName: 'queue-a',
            connectionString: 'Endpoint=sb://test'
        });
    });

    it('ListQueuesUseCase maps queue and connection for selection', async () => {
        const queueRegistryService = new QueueRegistryService(
            {
                async listQueues(connection) {
                    return [{ name: 'queue-a', connectionId: connection.id, activeMessageCount: 10 }];
                }
            },
            {
                async getAll() {
                    return [{
                        id: 'conn-a',
                        name: 'Connection A',
                        connectionString: 'Endpoint=sb://a',
                        createdAt: new Date('2026-02-16T00:00:00Z')
                    }];
                },
                async getById() {
                    return undefined;
                }
            }
        );

        const useCase = new ListQueuesUseCase(queueRegistryService);
        const queues = await useCase.list();

        assert.deepStrictEqual(queues, [{
            queue: {
                name: 'queue-a',
                connectionId: 'conn-a'
            },
            connection: {
                id: 'conn-a',
                name: 'Connection A'
            }
        }]);
    });

    it('OpenQueueMessagesUseCase resolves connection string and opens panel', async () => {
        const panelGateway = new FakeQueueMessagesPanelGateway();
        const connectionLookup: ConnectionLookup = {
            async getAll() {
                return [];
            },
            async getById() {
                return {
                    id: 'conn-a',
                    name: 'Connection A',
                    connectionString: 'Endpoint=sb://a',
                    createdAt: new Date('2026-02-16T00:00:00Z')
                };
            }
        };

        const useCase = new OpenQueueMessagesUseCase(connectionLookup, panelGateway);

        await useCase.open({
            name: 'queue-a',
            connectionId: 'conn-a'
        });

        assert.deepStrictEqual(panelGateway.lastOpen, {
            queue: {
                name: 'queue-a',
                connectionId: 'conn-a'
            },
            connectionString: 'Endpoint=sb://a'
        });
    });

    it('OpenQueueMessagesUseCase throws when connection string is missing', async () => {
        const panelGateway = new FakeQueueMessagesPanelGateway();
        const connectionLookup: ConnectionLookup = {
            async getAll() {
                return [];
            },
            async getById() {
                return undefined;
            }
        };

        const useCase = new OpenQueueMessagesUseCase(connectionLookup, panelGateway);

        await assert.rejects(
            () => useCase.open({ name: 'queue-a', connectionId: 'conn-a' }),
            /Connection string not found/
        );
    });
});

class FakeMessageMover {
    public lastCall: {
        targetQueueName: string;
        targetConnectionString: string;
        messages: MessageWithSource[];
    } | undefined;

    constructor(private readonly result: MessageOperationResult<MessageWithSource>) {}

    async moveMessages(
        targetQueueName: string,
        targetConnectionString: string,
        messages: MessageWithSource[]
    ): Promise<MessageOperationResult<MessageWithSource>> {
        this.lastCall = {
            targetQueueName,
            targetConnectionString,
            messages
        };

        return this.result;
    }
}

class FakeMessageDeleter {
    public lastMessages: MessageWithSource[] | undefined;

    constructor(private readonly result: MessageOperationResult<MessageWithSource>) {}

    async deleteMessages(messages: MessageWithSource[]): Promise<MessageOperationResult<MessageWithSource>> {
        this.lastMessages = messages;
        return this.result;
    }
}

class FakePurgeOperations implements MessageOperations {
    public lastCall: { queueName: string; connectionString: string } | undefined;

    constructor(private readonly purgedCount: number) {}

    async sendMessage(): Promise<void> {}

    async deleteMessage(): Promise<void> {}

    async peekMessages() {
        return [];
    }

    async purgeQueue(queueName: string, connectionString: string): Promise<number> {
        this.lastCall = { queueName, connectionString };
        return this.purgedCount;
    }
}

class FakeQueueMessagesPanelGateway implements QueueMessagesPanelGateway {
    public lastOpen: { queue: { name: string; connectionId: string }; connectionString: string } | undefined;

    async open(queue: { name: string; connectionId: string }, connectionString: string): Promise<void> {
        this.lastOpen = {
            queue,
            connectionString
        };
    }
}
