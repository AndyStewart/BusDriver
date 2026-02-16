import * as assert from 'assert';
import * as vscode from 'vscode';
import { MessageGridColumnsService } from '../../domain/messageGrid/MessageGridColumnsService';
import type { MessageGridColumnsRepository } from '../../ports/MessageGridColumnsRepository';
import type { MessageOperations, QueueMessage } from '../../ports/MessageOperations';
import { QueueMessagesPanel } from '../../providers/QueueMessagesPanel';

suite('QueueMessagesPanel integration', () => {
    teardown(() => {
        QueueMessagesPanel.currentPanel?.dispose();
    });

    test('createOrShow creates a panel and stores it as currentPanel', async () => {
        const operations = new FakeMessageOperations();
        const columnsService = new MessageGridColumnsService(new InMemoryColumnsRepository());

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-a', connectionId: 'conn-a' },
            'Endpoint=sb://conn-a',
            operations,
            columnsService
        );

        assert.ok(QueueMessagesPanel.currentPanel);
    });

    test('createOrShow reuses current panel and updates queue context', async () => {
        const operations = new FakeMessageOperations();
        const columnsService = new MessageGridColumnsService(new InMemoryColumnsRepository());

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-a', connectionId: 'conn-a' },
            'Endpoint=sb://conn-a',
            operations,
            columnsService
        );
        const initialPanel = QueueMessagesPanel.currentPanel;
        assert.ok(initialPanel);

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-b', connectionId: 'conn-b' },
            'Endpoint=sb://conn-b',
            operations,
            columnsService
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
        const operations = new FakeMessageOperations();
        const columnsService = new MessageGridColumnsService(new InMemoryColumnsRepository());

        await QueueMessagesPanel.createOrShow(
            extensionUri(),
            { name: 'queue-a', connectionId: 'conn-a' },
            'Endpoint=sb://conn-a',
            operations,
            columnsService
        );

        QueueMessagesPanel.currentPanel?.dispose();
        assert.strictEqual(QueueMessagesPanel.currentPanel, undefined);
    });
});

class FakeMessageOperations implements MessageOperations {
    async sendMessage(): Promise<void> {}
    async deleteMessage(): Promise<void> {}

    async peekMessages(): Promise<QueueMessage[]> {
        return [];
    }

    async purgeQueue(): Promise<number> {
        return 0;
    }
}

class InMemoryColumnsRepository implements MessageGridColumnsRepository {
    private columns: string[] = [];

    async getPropertyColumns(): Promise<unknown> {
        return this.columns;
    }

    async setPropertyColumns(columns: string[]): Promise<void> {
        this.columns = [...columns];
    }
}

function extensionUri(): vscode.Uri {
    const folderUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (folderUri) {
        return folderUri;
    }

    return vscode.Uri.file(process.cwd());
}
