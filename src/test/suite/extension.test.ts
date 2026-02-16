import * as assert from 'assert';
import * as vscode from 'vscode';
import { QueueTreeItem } from '../../models/Queue';
import type { QueueMessage } from '../../providers/QueueMessagesPanel';
import { QueueMessagesPanel } from '../../providers/QueueMessagesPanel';
import { deactivate } from '../../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('busdriver.busdriver'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('busdriver.busdriver');
        assert.ok(ext);
        await ext!.activate();
        assert.strictEqual(ext!.isActive, true);
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('busdriver.addConnection'));
        assert.ok(commands.includes('busdriver.refresh'));
        assert.ok(commands.includes('busdriver.deleteConnection'));
        assert.ok(commands.includes('busdriver.configureMessageGridColumns'));
        assert.ok(commands.includes('busdriver.showQueueMessages'));
        assert.ok(commands.includes('busdriver.moveMessageToQueue'));
        assert.ok(commands.includes('busdriver.deleteMessages'));
        assert.ok(commands.includes('busdriver.purgeQueue'));
    });

    test('showQueueMessages exits when connection string is missing', async () => {
        QueueMessagesPanel.currentPanel?.dispose();

        const item = new QueueTreeItem(
            { name: 'missing-connection-queue', connectionId: 'missing-connection' },
            { activeMessageCount: 0 },
            vscode.TreeItemCollapsibleState.None
        );

        await vscode.commands.executeCommand('busdriver.showQueueMessages', item);

        assert.strictEqual(QueueMessagesPanel.currentPanel, undefined);
    });

    test('purgeQueue command exits when queue payload is missing', async () => {
        await vscode.commands.executeCommand('busdriver.purgeQueue', undefined);
    });

    test('moveMessageToQueue exits when no target queues are available', async () => {
        const message: QueueMessage = {
            sequenceNumber: '1',
            messageId: 'message-1',
            body: '{"hello":"world"}',
            rawBody: '{"hello":"world"}',
            properties: {},
            enqueuedTime: '2026-02-16T00:00:00Z',
            deliveryCount: 1
        };

        await vscode.commands.executeCommand('busdriver.moveMessageToQueue', message);
    });

    test('deactivate is safe to call repeatedly', () => {
        deactivate();
        deactivate();
    });
});
