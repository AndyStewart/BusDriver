import * as vscode from 'vscode';
import { ConnectionsProvider } from './providers/ConnectionsProvider';
import { QueueMessagesPanel } from './providers/QueueMessagesPanel';
import { QueueTreeItem } from './models/Queue';

export function activate(context: vscode.ExtensionContext) {
    console.log('BusDriver extension is now active');

    // Create the connections provider
    const connectionsProvider = new ConnectionsProvider(context);
    // Register the tree view
    const treeView = vscode.window.createTreeView('busdriver.connections', {
        treeDataProvider: connectionsProvider,
        showCollapseAll: false
    });

    // Register commands
    const addConnectionCommand = vscode.commands.registerCommand(
        'busdriver.addConnection',
        async () => {

            await connectionsProvider.addConnection();
        }
    );

    const refreshCommand = vscode.commands.registerCommand(
        'busdriver.refresh',
        () => {
            connectionsProvider.refresh();
        }
    );

    const deleteConnectionCommand = vscode.commands.registerCommand(
        'busdriver.deleteConnection',
        async (item) => {
            await connectionsProvider.deleteConnection(item);
        }
    );

    const showQueueMessagesCommand = vscode.commands.registerCommand(
        'busdriver.showQueueMessages',
        async (item: QueueTreeItem) => {
            const connectionString = await connectionsProvider.getConnectionString(item.queue.connectionId);
            if (connectionString) {
                await QueueMessagesPanel.createOrShow(
                    context.extensionUri,
                    item.queue,
                    connectionString
                );
            } else {
                vscode.window.showErrorMessage('Connection string not found');
            }
        }
    );

    // Handle double-click on queue items
    treeView.onDidChangeSelection(async (e) => {
        if (e.selection.length > 0) {
            const selected = e.selection[0];
            if (selected instanceof QueueTreeItem) {
                const connectionString = await connectionsProvider.getConnectionString(selected.queue.connectionId);
                if (connectionString) {
                    await QueueMessagesPanel.createOrShow(
                        context.extensionUri,
                        selected.queue,
                        connectionString
                    );
                }
            }
        }
    });

    // Add disposables to context
    context.subscriptions.push(
        treeView,
        addConnectionCommand,
        refreshCommand,
        deleteConnectionCommand,
        showQueueMessagesCommand
    );
}

export function deactivate() {
    console.log('BusDriver extension is now deactivated');
}
