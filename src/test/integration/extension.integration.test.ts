import * as assert from 'assert';
import * as vscode from 'vscode';
import { deactivate } from '../../extension';

suite('Extension Test Suite', () => {
    void vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('busdriver.busdriver'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('busdriver.busdriver');
        assert.ok(ext);
        await ext.activate();
        assert.strictEqual(ext.isActive, true);
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

    test('purgeQueue command exits when queue payload is missing', async () => {
        await vscode.commands.executeCommand('busdriver.purgeQueue', undefined);
    });

    test('deactivate is safe to call repeatedly', () => {
        deactivate();
        deactivate();
    });
});
