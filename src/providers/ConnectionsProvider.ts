import * as vscode from 'vscode';
import { Connection, ConnectionTreeItem } from '../models/Connection';
import { Queue, QueueTreeItem } from '../models/Queue';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { QueueMessagesPanel, MessageData } from './QueueMessagesPanel';


export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionTreeItem | QueueTreeItem>, vscode.TreeDragAndDropController<QueueTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    readonly dropMimeTypes = ['application/vnd.code.tree.busdriver-message', 'text/plain', 'text/uri-list'];
    readonly dragMimeTypes: string[] = [];

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

    async getAllQueues(): Promise<Array<{ queue: Queue, connection: Connection }>> {
        const allQueues: Array<{ queue: Queue, connection: Connection }> = [];

        for (const connection of this.connections) {
            try {
                const connectionString = await this.getConnectionString(connection.id);
                if (!connectionString) {
                    continue;
                }

                const adminClient = new ServiceBusAdministrationClient(connectionString);
                const queueIterator = adminClient.listQueues();

                for await (const queueProperties of queueIterator) {
                    allQueues.push({
                        queue: {
                            name: queueProperties.name,
                            connectionId: connection.id
                        },
                        connection: connection
                    });
                }
            } catch (error) {
                // Skip connections with errors
                console.error(`Failed to list queues for ${connection.name}:`, error);
            }
        }

        return allQueues;
    }

    async moveMessageToQueue(messageData: MessageData | MessageData[], targetQueue: Queue): Promise<void> {
        const connectionString = await this.getConnectionString(targetQueue.connectionId);

        if (!connectionString) {
            vscode.window.showErrorMessage('Connection string not found for target queue');
            return;
        }

        // Normalize to array for consistent processing
        const messages = Array.isArray(messageData) ? messageData : [messageData];
        const messageCount = messages.length;
        const isMultiple = messageCount > 1;

        const results = {
            successful: [] as MessageData[],
            failed: [] as { message: MessageData, error: string }[]
        };

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: isMultiple ? `Moving ${messageCount} messages to ${targetQueue.name}...` : `Moving message to ${targetQueue.name}...`,
            cancellable: false
        }, async (progress) => {
            let processed = 0;

            for (const msg of messages) {
                try {
                    // Send to target queue
                    await this.sendMessageToQueue(
                        targetQueue.name,
                        connectionString,
                        msg
                    );

                    // Delete from source queue if source info is available
                    if (msg.sourceQueue && msg.sourceConnectionString) {
                        await this.deleteMessageFromQueue(
                            msg.sourceQueue.name,
                            msg.sourceConnectionString,
                            msg.sequenceNumber
                        );
                    }

                    results.successful.push(msg);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    results.failed.push({ message: msg, error: errorMessage });
                }

                processed++;

                // Report progress for 10+ messages
                if (messageCount >= 10) {
                    const percentage = Math.round((processed / messageCount) * 100);
                    progress.report({
                        increment: (1 / messageCount) * 100,
                        message: `${processed}/${messageCount} (${percentage}%)`
                    });
                }
            }
        });

        // Show results notification
        if (results.failed.length === 0) {
            // All successful
            const msg = isMultiple
                ? `Successfully moved ${messageCount} messages to ${targetQueue.name}`
                : `Message moved to ${targetQueue.name}`;
            vscode.window.showInformationMessage(msg);
        } else if (results.successful.length === 0) {
            // All failed
            const failedIds = results.failed.map(f => f.message.messageId).join(', ');
            vscode.window.showErrorMessage(
                `Failed to move ${messageCount} message(s) to ${targetQueue.name}. IDs: ${failedIds}`
            );
        } else {
            // Partial success
            const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
            vscode.window.showWarningMessage(
                `Moved ${results.successful.length} of ${messageCount} messages to ${targetQueue.name}. ` +
                `Failed: ${failedIds}`
            );
        }

        // Notify webview to remove successfully moved messages
        if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
            for (const msg of results.successful) {
                QueueMessagesPanel.currentPanel.notifyMessageRemoved(msg.sequenceNumber);
            }
        }

        // Refresh tree to update message counts
        this.refresh();
    }

    async deleteMessages(messageData: MessageData | MessageData[]): Promise<void> {
        // Normalize to array for consistent processing
        const messages = Array.isArray(messageData) ? messageData : [messageData];
        const messageCount = messages.length;
        const isMultiple = messageCount > 1;

        // Verify all messages have source queue and connection string
        const firstMessage = messages[0];
        if (!firstMessage.sourceQueue || !firstMessage.sourceConnectionString) {
            vscode.window.showErrorMessage('Cannot delete message: source queue information missing');
            return;
        }

        const queueName = firstMessage.sourceQueue.name;

        const results = {
            successful: [] as MessageData[],
            failed: [] as { message: MessageData, error: string }[]
        };

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: isMultiple ? `Deleting ${messageCount} messages...` : `Deleting message...`,
            cancellable: false
        }, async (progress) => {
            let processed = 0;

            for (const msg of messages) {
                try {
                    if (!msg.sourceConnectionString) {
                        throw new Error('Connection string missing');
                    }

                    // Delete from source queue
                    await this.deleteMessageFromQueue(
                        queueName,
                        msg.sourceConnectionString,
                        msg.sequenceNumber
                    );

                    results.successful.push(msg);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    results.failed.push({ message: msg, error: errorMessage });
                }

                processed++;

                // Report progress for 10+ messages
                if (messageCount >= 10) {
                    const percentage = Math.round((processed / messageCount) * 100);
                    progress.report({
                        increment: (1 / messageCount) * 100,
                        message: `${processed}/${messageCount} (${percentage}%)`
                    });
                }
            }
        });

        // Show results notification
        if (results.failed.length === 0) {
            // All successful
            const msg = isMultiple
                ? `Successfully deleted ${messageCount} messages from ${queueName}`
                : `Message deleted from ${queueName}`;
            vscode.window.showInformationMessage(msg);
        } else if (results.successful.length === 0) {
            // All failed
            const failedIds = results.failed.map(f => f.message.messageId).join(', ');
            vscode.window.showErrorMessage(
                `Failed to delete ${messageCount} message(s) from ${queueName}. IDs: ${failedIds}`
            );
        } else {
            // Partial success
            const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
            vscode.window.showWarningMessage(
                `Deleted ${results.successful.length} of ${messageCount} messages from ${queueName}. ` +
                `Failed: ${failedIds}`
            );
        }

        // Notify webview to refresh and show updated message list
        if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
            await QueueMessagesPanel.currentPanel.refreshView();
        }

        // Refresh tree to update message counts
        this.refresh();
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleDrop(target: QueueTreeItem | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): Promise<void> {
        console.log('handleDrop called', target, dataTransfer);

        if (!target || !(target instanceof QueueTreeItem)) {
            console.log('Target is not a QueueTreeItem');
            return;
        }

        // First, check if there's a pending drag message from the webview
        if (QueueMessagesPanel.pendingDragMessage) {
            console.log('Using pending drag message(s)');
            const messages = QueueMessagesPanel.pendingDragMessage;
            QueueMessagesPanel.pendingDragMessage = undefined; // Clear it
            await this.processMessageMove(target, messages);
            return;
        }

        // Try to get data from dataTransfer
        const textUriData = dataTransfer.get('text/uri-list');
        console.log('text/uri-list data:', textUriData);

        if (textUriData) {
            try {
                const uri = textUriData.value;
                if (uri.startsWith('busdriver-message:')) {
                    const jsonData = decodeURIComponent(uri.substring('busdriver-message:'.length));
                    const messages = JSON.parse(jsonData);
                    console.log('Parsed message(s) from URI');
                    await this.processMessageMove(target, messages);
                    return;
                }
            } catch (e) {
                console.error('Failed to parse URI data:', e);
            }
        }

        // Try text/plain as fallback
        const textData = dataTransfer.get('text/plain');
        console.log('Trying text/plain:', textData);
        if (textData) {
            try {
                const messages = JSON.parse(textData.value);
                await this.processMessageMove(target, messages);
                return;
            } catch (e) {
                console.error('Failed to parse text/plain data:', e);
            }
        }

        console.log('No valid message data found in any format');
    }

    private async processMessageMove(target: QueueTreeItem, messageData: MessageData | MessageData[]): Promise<void> {
        try {
            const connectionString = await this.getConnectionString(target.queue.connectionId);

            if (!connectionString) {
                vscode.window.showErrorMessage(`Connection string not found for target queue`);
                return;
            }

            // Normalize to array
            const messages = Array.isArray(messageData) ? messageData : [messageData];
            const messageCount = messages.length;
            const isMultiple = messageCount > 1;

            // Send messages to target queue
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: isMultiple ? `Moving ${messageCount} messages to ${target.queue.name}...` : `Moving message to ${target.queue.name}...`,
                cancellable: false
            }, async () => {
                for (const msg of messages) {
                    await this.sendMessageToQueue(
                        target.queue.name,
                        connectionString,
                        msg
                    );
                }
            });

            const successMsg = isMultiple
                ? `${messageCount} messages moved to ${target.queue.name}`
                : `Message moved to ${target.queue.name}`;
            vscode.window.showInformationMessage(successMsg);

            // Notify webview to remove the messages
            if (QueueMessagesPanel.currentPanel) {
                for (const msg of messages) {
                    QueueMessagesPanel.currentPanel.notifyMessageRemoved(msg.sequenceNumber);
                }
            }

            // Refresh tree to update message counts
            this.refresh();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to move message(s): ${errorMessage}`);
        }
    }

    private async sendMessageToQueue(queueName: string, connectionString: string, messageData: MessageData): Promise<void> {
        const client = new ServiceBusClient(connectionString);
        const sender = client.createSender(queueName);

        try {
            // Prepare the message with all original properties preserved
            const message = {
                body: messageData.body,
                messageId: messageData.messageId,
                applicationProperties: {
                    ...messageData.properties,
                    // Add metadata about the original message
                    originalEnqueuedTime: messageData.enqueuedTime,
                    originalDeliveryCount: messageData.deliveryCount,
                    originalSequenceNumber: messageData.sequenceNumber
                }
            };

            await sender.sendMessages(message);
        } finally {
            await sender.close();
            await client.close();
        }
    }

    private async deleteMessageFromQueue(queueName: string, connectionString: string, sequenceNumber: string): Promise<void> {
        const client = new ServiceBusClient(connectionString);
        const receiver = client.createReceiver(queueName);

        try {
            const maxAttempts = 5;
            let found = false;

            for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
                // Receive messages and find the one with matching sequence number
                const messages = await receiver.receiveMessages(100, { maxWaitTimeInMs: 5000 });

                for (const message of messages) {
                    if (message.sequenceNumber?.toString() === sequenceNumber) {
                        // Complete (delete) the message
                        await receiver.completeMessage(message);
                        console.log(`Deleted message ${sequenceNumber} from ${queueName}`);
                        found = true;
                    } else {
                        // Abandon messages we don't want to delete
                        await receiver.abandonMessage(message);
                    }
                }

                if (!found && messages.length === 0) {
                    // No more messages to check
                    break;
                }
            }

            if (!found) {
                console.warn(`Message with sequence number ${sequenceNumber} not found in ${queueName} after ${maxAttempts} attempts`);
                throw new Error(`Message ${sequenceNumber} not found in queue`);
            }
        } finally {
            await receiver.close();
            await client.close();
        }
    }
}
