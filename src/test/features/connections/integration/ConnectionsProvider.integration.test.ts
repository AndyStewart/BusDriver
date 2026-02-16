import * as assert from 'assert';
import * as vscode from 'vscode';
import { MoveMessagesUseCase } from '../../../../features/queueMessages/application/MoveMessagesUseCase';
import type { Connection } from '../../../../features/connections/application/Connection';
import { ConnectionService } from '../../../../features/connections/application/ConnectionService';
import { MessageMover } from '../../../../features/queueMessages/application/MessageMover';
import { MessageSender } from '../../../../features/queueMessages/application/MessageSender';
import { QueueRegistryService } from '../../../../features/queues/application/QueueRegistryService';
import { QueueTreeItem } from '../../../../features/queues/adapters/TreeQueueItemAdapter';
import type { ConnectionRepository } from '../../../../features/connections/ports/ConnectionRepository';
import type { Logger } from '../../../../shared/ports/Logger';
import type { MessageOperations, QueueMessage } from '../../../../features/queueMessages/ports/MessageOperations';
import type { QueueRegistry } from '../../../../features/queues/ports/QueueRegistry';
import type { Telemetry } from '../../../../shared/ports/Telemetry';
import { ConnectionsProvider } from '../../../../features/connections/adapters/TreeConnectionsAdapter';
import { QueueMessagesPanel } from '../../../../features/queueMessages/adapters/WebviewQueueMessagesPanelAdapter';

suite('ConnectionsProvider integration', () => {
    test('handleDrop uses pending drag messages and clears pending state', async () => {
        const { provider, operations, logger, target } = createFixture();
        const notifications: string[] = [];
        (QueueMessagesPanel as unknown as { currentPanel: { notifyMessageRemoved(sequenceNumber: string): void } | undefined }).currentPanel = {
            notifyMessageRemoved(sequenceNumber: string): void {
                notifications.push(sequenceNumber);
            }
        };

        QueueMessagesPanel.pendingDragMessage = {
            sequenceNumber: '1',
            messageId: 'pending-message',
            body: '{"type":"pending"}',
            rawBody: { type: 'pending' },
            properties: {},
            enqueuedTime: '2026-02-16T00:00:00Z',
            deliveryCount: 1,
            sourceQueue: { name: 'source-queue', connectionId: 'source-connection' },
            sourceConnectionString: 'Endpoint=sb://source'
        };

        await provider.handleDrop(target, new vscode.DataTransfer(), new vscode.CancellationTokenSource().token);

        assert.strictEqual(QueueMessagesPanel.pendingDragMessage, undefined);
        assert.strictEqual(operations.sendCalls.length, 1);
        assert.strictEqual(operations.sendCalls[0].queueName, 'target-queue');
        assert.deepStrictEqual(operations.sendCalls[0].message.body, { type: 'pending' });
        assert.strictEqual(operations.deleteCalls.length, 1);
        assert.strictEqual(operations.deleteCalls[0].queueName, 'source-queue');
        assert.deepStrictEqual(notifications, ['1']);
        assert.strictEqual(logger.warnCalls.length, 0);
        QueueMessagesPanel.currentPanel = undefined;
    });

    test('handleDrop falls back to dropped payload when pending state is absent', async () => {
        const { provider, operations, target } = createFixture();
        QueueMessagesPanel.pendingDragMessage = undefined;

        const transfer = new vscode.DataTransfer();
        transfer.set('text/plain', new vscode.DataTransferItem(JSON.stringify([{
            sequenceNumber: '2',
            messageId: 'dropped-message',
            body: '{"type":"dropped"}',
            properties: { traceId: 'abc' },
            enqueuedTime: '2026-02-16T00:00:00Z',
            deliveryCount: 2
        }])));

        await provider.handleDrop(target, transfer, new vscode.CancellationTokenSource().token);

        assert.strictEqual(operations.sendCalls.length, 1);
        assert.strictEqual(operations.sendCalls[0].message.messageId, 'dropped-message');
        assert.strictEqual(operations.deleteCalls.length, 0);
    });

    test('handleDrop warns and exits when payload is invalid', async () => {
        const { provider, operations, logger, target } = createFixture();
        QueueMessagesPanel.pendingDragMessage = undefined;

        const transfer = new vscode.DataTransfer();
        transfer.set('text/plain', new vscode.DataTransferItem('{not-json'));

        await provider.handleDrop(target, transfer, new vscode.CancellationTokenSource().token);

        assert.strictEqual(operations.sendCalls.length, 0);
        assert.strictEqual(logger.warnCalls.length, 1);
    });
});

function createFixture(): {
    provider: ConnectionsProvider;
    operations: FakeMessageOperations;
    logger: FakeLogger;
    target: QueueTreeItem;
} {
    const targetConnection: Connection = {
        id: 'target-connection',
        name: 'Target',
        connectionString: 'Endpoint=sb://target',
        createdAt: new Date('2026-02-16T00:00:00Z')
    };
    const sourceConnection: Connection = {
        id: 'source-connection',
        name: 'Source',
        connectionString: 'Endpoint=sb://source',
        createdAt: new Date('2026-02-16T00:00:00Z')
    };

    const connectionRepository = new InMemoryConnectionRepository([targetConnection, sourceConnection]);
    const connectionService = new ConnectionService(connectionRepository);
    const queueRegistryService = new QueueRegistryService(new EmptyQueueRegistry(), connectionRepository);
    const operations = new FakeMessageOperations();
    const moveMessages = new MoveMessagesUseCase(new MessageMover(new MessageSender(operations), operations));
    const logger = new FakeLogger();
    const telemetry = new NoopTelemetry();

    const provider = new ConnectionsProvider(
        connectionService,
        queueRegistryService,
        moveMessages,
        logger,
        telemetry
    );

    const target = new QueueTreeItem(
        { name: 'target-queue', connectionId: 'target-connection' },
        { activeMessageCount: 0 },
        vscode.TreeItemCollapsibleState.None
    );

    return { provider, operations, logger, target };
}

class FakeMessageOperations implements MessageOperations {
    public readonly sendCalls: Array<{ queueName: string; connectionString: string; message: QueueMessage }> = [];
    public readonly deleteCalls: Array<{ queueName: string; connectionString: string; sequenceNumber: string }> = [];

    async sendMessage(queueName: string, connectionString: string, message: QueueMessage): Promise<void> {
        this.sendCalls.push({ queueName, connectionString, message });
    }

    async deleteMessage(queueName: string, connectionString: string, sequenceNumber: string): Promise<void> {
        this.deleteCalls.push({ queueName, connectionString, sequenceNumber });
    }

    async peekMessages(): Promise<QueueMessage[]> {
        return [];
    }

    async purgeQueue(): Promise<number> {
        return 0;
    }
}

class InMemoryConnectionRepository implements ConnectionRepository {
    constructor(private readonly connections: Connection[]) {}

    async getAll(): Promise<Connection[]> {
        return this.connections;
    }

    async getById(id: string): Promise<Connection | undefined> {
        return this.connections.find(connection => connection.id === id);
    }

    async save(connection: Connection): Promise<void> {
        this.connections.push(connection);
    }

    async remove(id: string): Promise<void> {
        const index = this.connections.findIndex(connection => connection.id === id);
        if (index >= 0) {
            this.connections.splice(index, 1);
        }
    }
}

class EmptyQueueRegistry implements QueueRegistry {
    async listQueues(): Promise<Array<{ name: string; connectionId: string; activeMessageCount: number }>> {
        return [];
    }
}

class FakeLogger implements Logger {
    public readonly warnCalls: Array<{ message: string; meta?: Record<string, unknown> }> = [];

    info(): void {}

    warn(message: string, meta?: Record<string, unknown>): void {
        this.warnCalls.push({ message, meta });
    }

    error(): void {}
}

class NoopTelemetry implements Telemetry {
    trackEvent(): void {}
    trackError(): void {}
}
