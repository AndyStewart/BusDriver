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

    test('user can open queue messages for a seeded queue', async () => {
        await specScenario('Open queue messages panel')
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

    test('user can add, refresh, and delete a connection', async () => {
        const connectionName = `acceptance-add-delete-${Date.now()}`;

        await specScenario('Add refresh and delete connection')
            .whenAddConnection(connectionName, connectionString!)
            .thenConnectionExists(connectionName)
            .whenRefreshConnections()
            .whenDeleteConnection(connectionName)
            .thenConnectionMissing(connectionName)
            .run();
    });

    test('user can configure message grid columns', async () => {
        await specScenario('Configure message grid columns')
            .whenConfigureMessageGridColumns(['traceId', 'tenant'])
            .thenConfiguredMessageGridColumns(['traceId', 'tenant'])
            .run();
    });

    test('user can move message between queues', async () => {
        await specScenario('Move message to another queue')
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

    test('user can delete selected messages', async () => {
        await specScenario('Delete selected message')
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

    test('user can purge a queue', async () => {
        await specScenario('Purge queue messages')
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
