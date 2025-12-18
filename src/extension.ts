import * as vscode from 'vscode';
import { ConnectionsProvider } from './providers/ConnectionsProvider';
import { QueueMessagesPanel, MessageData } from './providers/QueueMessagesPanel';
import { QueueTreeItem } from './models/Queue';

export function activate(context: vscode.ExtensionContext) {
    console.log('BusDriver extension is now active');

    // Create the connections provider
    const connectionsProvider = new ConnectionsProvider(context);
    // Register the tree view
    const treeView = vscode.window.createTreeView('busdriver.connections', {
        treeDataProvider: connectionsProvider,
        showCollapseAll: false,
        dragAndDropController: connectionsProvider
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

    const moveMessageToQueueCommand = vscode.commands.registerCommand(
        'busdriver.moveMessageToQueue',
        async (messageData: MessageData) => {
            // Get all available queues
            const allQueues = await connectionsProvider.getAllQueues();

            if (allQueues.length === 0) {
                vscode.window.showErrorMessage('No queues available');
                return;
            }

            // Show quick pick to select target queue
            const items = allQueues.map(q => ({
                label: q.queue.name,
                description: q.connection.name,
                queue: q.queue
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select target queue to move message to'
            });

            if (selected) {
                await connectionsProvider.moveMessageToQueue(messageData, selected.queue);
            }
        }
    );

    const deleteMessagesCommand = vscode.commands.registerCommand(
        'busdriver.deleteMessages',
        async (messageData: MessageData | MessageData[]) => {
            const messages = Array.isArray(messageData) ? messageData : [messageData];
            const messageCount = messages.length;

            const confirmation = await vscode.window.showWarningMessage(
                messageCount === 1
                    ? `Delete this message? This cannot be undone.`
                    : `Delete ${messageCount} messages? This cannot be undone.`,
                { modal: true },
                'Delete'
            );

            if (confirmation === 'Delete') {
                await connectionsProvider.deleteMessages(messageData);
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
        showQueueMessagesCommand,
        moveMessageToQueueCommand,
        deleteMessagesCommand
    );
}

export function deactivate() {
    console.log('BusDriver extension is now deactivated');
}
