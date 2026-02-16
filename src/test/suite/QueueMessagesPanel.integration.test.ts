import * as assert from 'assert';
import * as vscode from 'vscode';
import type { LoadQueueMessages, QueueMessagesPage } from '../../ports/primary/LoadQueueMessages';
import { QueueMessagesPanel } from '../../providers/QueueMessagesPanel';

suite('QueueMessagesPanel integration', () => {
    teardown(() => {
        QueueMessagesPanel.currentPanel?.dispose();
    });

    test('createOrShow creates a panel and stores it as currentPanel', async () => {
        const loadQueueMessages = new FakeLoadQueueMessages();

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-a', connectionId: 'conn-a' },
            'Endpoint=sb://conn-a',
            loadQueueMessages
        );

        assert.ok(QueueMessagesPanel.currentPanel);
    });

    test('createOrShow reuses current panel and updates queue context', async () => {
        const loadQueueMessages = new FakeLoadQueueMessages();

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-a', connectionId: 'conn-a' },
            'Endpoint=sb://conn-a',
            loadQueueMessages
        );
        const initialPanel = QueueMessagesPanel.currentPanel;
        assert.ok(initialPanel);

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-b', connectionId: 'conn-b' },
            'Endpoint=sb://conn-b',
            loadQueueMessages
        );
        const reusedPanel = QueueMessagesPanel.currentPanel;

        assert.strictEqual(reusedPanel, initialPanel);

        const panelState = reusedPanel as unknown as {
            queue: { name: string; connectionId: string };
            connectionString: string;
        };
        assert.strictEqual(panelState.queue.name, 'queue-b');
        assert.strictEqual(panelState.queue.connectionId, 'conn-b');
        assert.strictEqual(panelState.connectionString, 'Endpoint=sb://conn-b');
    });

    test('dispose clears currentPanel', async () => {
        const loadQueueMessages = new FakeLoadQueueMessages();

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-a', connectionId: 'conn-a' },
            'Endpoint=sb://conn-a',
            loadQueueMessages
        );

        QueueMessagesPanel.currentPanel?.dispose();
        assert.strictEqual(QueueMessagesPanel.currentPanel, undefined);
    });
});

class FakeLoadQueueMessages implements LoadQueueMessages {
    async loadInitial(): Promise<QueueMessagesPage> {
        return {
            headers: [],
            rows: [],
            messages: [],
            hasMore: false
        };
    }

    async loadMore(): Promise<QueueMessagesPage> {
        return {
            headers: [],
            rows: [],
            messages: [],
            hasMore: false
        };
    }
}

function extensionUri(): vscode.Uri {
    const folderUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (folderUri) {
        return folderUri;
    }

    return vscode.Uri.file(process.cwd());
}
