import * as vscode from 'vscode';
import { ConnectionsProvider } from './providers/ConnectionsProvider';

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

    // Add disposables to context
    context.subscriptions.push(
        treeView,
        addConnectionCommand,
        refreshCommand,
        deleteConnectionCommand
    );
}

export function deactivate() {
    console.log('BusDriver extension is now deactivated');
}
