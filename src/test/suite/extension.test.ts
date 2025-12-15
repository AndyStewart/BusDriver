import * as assert from 'assert';
import * as vscode from 'vscode';

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
    });
});
