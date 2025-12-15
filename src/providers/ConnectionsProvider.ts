import * as vscode from 'vscode';
import { Connection, ConnectionTreeItem } from '../models/Connection';
import { Queue, QueueTreeItem } from '../models/Queue';
import { ServiceBusAdministrationClient } from '@azure/service-bus';

export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionTreeItem | QueueTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private connections: Connection[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadConnections();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConnectionTreeItem | QueueTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ConnectionTreeItem | QueueTreeItem): Thenable<ConnectionTreeItem[] | QueueTreeItem[]> {
        if (!element) {
            // Root level - show all connections
            if (this.connections.length === 0) {
                return Promise.resolve([]);
            }

            return Promise.resolve(
                this.connections.map(
                    conn => new ConnectionTreeItem(conn, vscode.TreeItemCollapsibleState.Collapsed)
                )
            );
        }

        // If element is a connection, show its queues
        if (element instanceof ConnectionTreeItem) {
            return this.getQueues(element.connection);
        }

        // Queues have no children
        return Promise.resolve([]);
    }

    async addConnection(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this connection',
            placeHolder: 'My Service Bus',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Connection name cannot be empty';
                }
                if (this.connections.some(c => c.name === value.trim())) {
                    return 'A connection with this name already exists';
                }
                return null;
            }
        });

        if (!name) {
            return;
        }

        const connectionString = await vscode.window.showInputBox({
            prompt: 'Enter the Service Bus connection string',
            placeHolder: 'Endpoint=sb://...',
            password: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Connection string cannot be empty';
                }
                if (!value.includes('Endpoint=sb://')) {
                    return 'Invalid connection string format';
                }
                return null;
            }
        });

        if (!connectionString) {
            return;
        }

        const connection: Connection = {
            id: this.generateId(),
            name: name.trim(),
            connectionString: connectionString.trim(),
            createdAt: new Date()
        };

        this.connections.push(connection);
        await this.saveConnections();
        this.refresh();

        vscode.window.showInformationMessage(`Connection '${connection.name}' added successfully`);
    }

    async deleteConnection(item: ConnectionTreeItem): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete connection '${item.connection.name}'?`,
            { modal: true },
            'Delete'
        );

        if (confirm === 'Delete') {
            this.connections = this.connections.filter(c => c.id !== item.connection.id);
            await this.saveConnections();
            this.refresh();
            vscode.window.showInformationMessage(`Connection '${item.connection.name}' deleted`);
        }
    }

    private async loadConnections(): Promise<void> {
        const stored = this.context.globalState.get<Connection[]>('connections', []);

        // Convert stored date strings back to Date objects
        this.connections = stored.map(c => ({
            ...c,
            createdAt: new Date(c.createdAt)
        }));
    }

    private async saveConnections(): Promise<void> {
        // Store connection strings in Secret Storage for security
        for (const conn of this.connections) {
            await this.context.secrets.store(`connection.${conn.id}`, conn.connectionString);
        }

        // Store connection metadata (without connection strings) in global state
        const connectionsToStore = this.connections.map(c => ({
            id: c.id,
            name: c.name,
            connectionString: '', // Don't store in plain state
            createdAt: c.createdAt
        }));

        await this.context.globalState.update('connections', connectionsToStore);
    }

    async getConnectionString(connectionId: string): Promise<string | undefined> {
        return await this.context.secrets.get(`connection.${connectionId}`);
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private async getQueues(connection: Connection): Promise<QueueTreeItem[]> {
        try {
            const connectionString = await this.getConnectionString(connection.id);
            if (!connectionString) {
                vscode.window.showErrorMessage(`Connection string not found for ${connection.name}`);
                return [];
            }

            const adminClient = new ServiceBusAdministrationClient(connectionString);
            const queues: QueueTreeItem[] = [];

            // List all queues
            const queueIterator = adminClient.listQueues();
            for await (const queueProperties of queueIterator) {
                const queue: Queue = {
                    name: queueProperties.name,
                    connectionId: connection.id
                };
                const stats = await adminClient.getQueueRuntimeProperties(queue.name); // Ensure queue exists
                queues.push(new QueueTreeItem(queue, stats, vscode.TreeItemCollapsibleState.None));
            }

            return queues;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to list queues for ${connection.name}: ${errorMessage}`);
            return [];
        }
    }
}
