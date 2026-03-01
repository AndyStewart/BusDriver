import * as assert from 'assert';
import * as vscode from 'vscode';
import { specScenario } from './dsl/AcceptanceSpecDsl';

suite('Acceptance: User-facing features', () => {
    const connectionString = process.env.BUSDRIVER_ACCEPTANCE_SERVICEBUS_CONNECTION_STRING;

    suiteSetup(async function setupSuite() {
        if (!connectionString) {
            this.skip();
            return;
        }

        const extension = vscode.extensions.getExtension('busdriver.busdriver');
        assert.ok(extension, 'Extension busdriver.busdriver should be installed in test host');
        await extension!.activate();
    });

    test('user sees an error when opening queue messages without a saved connection', async () => {
        await specScenario('Open queue messages without a saved connection')
            .whenOpenQueueMessagesForConnection('missing-connection-queue', 'missing-connection')
            .thenNoQueuePanelOpen()
            .run();
    });

    test('user can open messages for a queue', async () => {
        await specScenario('Open queue messages')
            .givenConnection('acceptance-open', connectionString!)
            .givenQueues(['orders'])
            .givenMessages('orders', [
                {
                    messageId: 'open-001',
                    body: { type: 'open' }
                }
            ])
            .whenOpenQueueMessages('orders')
            .thenPanelShowsQueue('orders')
            .run();
    });

    test('user sees the newly selected queue when switching between queues', async () => {
        await specScenario('Switch between queue message views')
            .givenConnection('acceptance-open-switch', connectionString!)
            .givenQueues(['orders', 'payments'])
            .whenOpenQueueMessages('orders')
            .whenOpenQueueMessages('payments')
            .thenPanelShowsQueue('payments')
            .run();
    });

    test('user can close the queue messages view', async () => {
        await specScenario('Close queue messages view')
            .givenConnection('acceptance-open-close', connectionString!)
            .givenQueues(['orders'])
            .whenOpenQueueMessages('orders')
            .whenCloseQueueMessagesPanel()
            .thenNoQueuePanelOpen()
            .run();
    });

    test('user can add, refresh, and remove a connection', async () => {
        const connectionName = `acceptance-add-delete-${Date.now()}`;

        await specScenario('Add, refresh, and delete a connection')
            .whenAddConnection(connectionName, connectionString!)
            .thenConnectionExists(connectionName)
            .whenRefreshConnections()
            .whenDeleteConnection(connectionName)
            .thenConnectionMissing(connectionName)
            .run();
    });

    test('user can choose which message fields appear as columns', async () => {
        await specScenario('Choose message columns')
            .whenConfigureMessageGridColumns(['traceId', 'tenant'])
            .thenConfiguredMessageGridColumns(['traceId', 'tenant'])
            .run();
    });

    test('user can move message between queues', async () => {
        await specScenario('Move a message to another queue')
            .givenConnection('acceptance-move', connectionString!)
            .givenQueues(['source', 'target'])
            .givenMessages('source', [
                {
                    messageId: 'move-001',
                    body: { type: 'move' }
                }
            ])
            .whenMoveMessages('source', 'target', ['move-001'])
            .thenQueueDoesNotContain('source', ['move-001'])
            .thenQueueContains('target', ['move-001'])
            .run();
    });

    test('user sees an error when there are no queues available to move a message to', async () => {
        await specScenario('Move message when no target queues are available')
            .givenConnection('acceptance-move-no-targets', connectionString!)
            .givenQueues(['source'])
            .givenMessages('source', [
                {
                    messageId: 'move-no-target-001',
                    body: { type: 'move' }
                }
            ])
            .whenMoveMessagesWithNoAvailableQueues('source', ['move-no-target-001'])
            .thenQueueContains('source', ['move-no-target-001'])
            .run();
    });

    test('user can delete selected messages', async () => {
        await specScenario('Delete selected messages')
            .givenConnection('acceptance-delete', connectionString!)
            .givenQueues(['source'])
            .givenMessages('source', [
                {
                    messageId: 'delete-001',
                    body: { type: 'delete' }
                }
            ])
            .whenDeleteMessages('source', ['delete-001'])
            .thenQueueDoesNotContain('source', ['delete-001'])
            .run();
    });

    test('user can clear all messages from a queue', async () => {
        await specScenario('Clear all messages from a queue')
            .givenConnection('acceptance-purge', connectionString!)
            .givenQueues(['source'])
            .givenMessages('source', [
                {
                    messageId: 'purge-001',
                    body: { type: 'purge' }
                },
                {
                    messageId: 'purge-002',
                    body: { type: 'purge' }
                }
            ])
            .whenPurgeQueue('source')
            .thenQueueDoesNotContain('source', ['purge-001', 'purge-002'])
            .run();
    });
});
