import * as vscode from 'vscode';
import type { Connection } from '../domain/models/Connection';
import { ConnectionService } from '../domain/connections/ConnectionService';
import { MessageMover } from '../domain/messages/MessageMover';
import type { MessageWithSource } from '../domain/messages/MessageTypes';
import { QueueRegistryService } from '../domain/queues/QueueRegistryService';
import { ConnectionTreeItem } from '../models/ConnectionTreeItem';
import { Queue, QueueStats, QueueTreeItem } from '../models/Queue';
import { Logger } from '../ports/Logger';
import { Telemetry } from '../ports/Telemetry';
import { parseDroppedMessages } from './dragDropMessageParser';
import { QueueMessagesPanel, QueueMessage as QueueMessageData } from './QueueMessagesPanel';


export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionTreeItem | QueueTreeItem>, vscode.TreeDragAndDropController<QueueTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    readonly dropMimeTypes = ['application/vnd.code.tree.busdriver-message', 'text/plain', 'text/uri-list'];
    readonly dragMimeTypes: string[] = [];

    private connections: Connection[] = [];

    constructor(
        private readonly connectionService: ConnectionService,
        private readonly queueRegistryService: QueueRegistryService,
        private readonly messageMover: MessageMover,
        private readonly logger: Logger,
        private readonly telemetry: Telemetry
    ) {
        void this.loadConnections();
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

        const result = await this.connectionService.addConnection(name, connectionString);
        if (!result.ok) {
            vscode.window.showErrorMessage(result.error.message);
            return;
        }

        const connection = result.value;
        this.connections.push(connection);
        this.telemetry.trackEvent('connections.added');
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
            await this.connectionService.deleteConnection(item.connection.id);
            this.telemetry.trackEvent('connections.deleted');
            this.refresh();
            vscode.window.showInformationMessage(`Connection '${item.connection.name}' deleted`);
        }
    }

    private async loadConnections(): Promise<void> {
        try {
            this.connections = await this.connectionService.listConnections();
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to load connections', { message: normalizedError.message });
            this.telemetry.trackError('connections.load_failed', normalizedError);
            this.connections = [];
        }
    }

    async getConnectionString(connectionId: string): Promise<string | undefined> {
        const connection = await this.connectionService.getConnectionById(connectionId);
        const connectionString = connection?.connectionString?.trim();

        return connectionString ? connectionString : undefined;
    }

    async getAllQueues(): Promise<Array<{ queue: Queue, connection: Connection }>> {
        const allQueues: Array<{ queue: Queue, connection: Connection }> = [];

        try {
            const queues = await this.queueRegistryService.listAllQueues();
            for (const entry of queues) {
                allQueues.push({
                    queue: {
                        name: entry.queue.name,
                        connectionId: entry.queue.connectionId
                    },
                    connection: entry.connection
                });
            }
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.logger.error('Failed to list queues', { message: normalizedError.message });
            this.telemetry.trackError('queues.list_failed', normalizedError);
        }

        return allQueues;
    }

    private async getQueues(connection: Connection): Promise<QueueTreeItem[]> {
        try {
            if (!connection.connectionString) {
                vscode.window.showErrorMessage(`Connection string not found for ${connection.name}`);
                return [];
            }

            const queueInfos = await this.queueRegistryService.listQueuesForConnection(connection);
            const queues: QueueTreeItem[] = [];

            for (const queueInfo of queueInfos) {
                const queue: Queue = {
                    name: queueInfo.name,
                    connectionId: connection.id
                };
                const stats: QueueStats = {
                    activeMessageCount: queueInfo.activeMessageCount
                };
                queues.push(new QueueTreeItem(queue, stats, vscode.TreeItemCollapsibleState.None));
            }

            return queues;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const normalizedError = error instanceof Error ? error : new Error(errorMessage);
            this.logger.error('Failed to list queues for connection', { connectionId: connection.id, message: errorMessage });
            this.telemetry.trackError('queues.connection_list_failed', normalizedError, { connectionId: connection.id });
            vscode.window.showErrorMessage(`Failed to list queues for ${connection.name}: ${errorMessage}`);
            return [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleDrop(target: QueueTreeItem | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): Promise<void> {
        if (!target || !(target instanceof QueueTreeItem)) {
            return;
        }

        // First, check if there's a pending drag message from the webview
        if (QueueMessagesPanel.pendingDragMessage) {
            const messages = QueueMessagesPanel.pendingDragMessage;
            QueueMessagesPanel.pendingDragMessage = undefined; // Clear it
            await this.processMessageMove(target, messages);
            return;
        }

        const messages = parseDroppedMessages(
            dataTransfer.get('text/uri-list')?.value,
            dataTransfer.get('text/plain')?.value
        );

        if (!messages) {
            this.logger.warn('Drop ignored because no valid BusDriver message payload was found');
            return;
        }

        await this.processMessageMove(target, messages);
    }

    private async processMessageMove(target: QueueTreeItem, messageData: QueueMessageData | QueueMessageData[]): Promise<void> {
        const connectionString = await this.getConnectionString(target.queue.connectionId);

        if (!connectionString) {
            vscode.window.showErrorMessage('Connection string not found for target queue');
            return;
        }

        const messages = Array.isArray(messageData) ? messageData : [messageData];
        const messageCount = messages.length;
        const isMultiple = messageCount > 1;
        const domainMessages = messages.map(message => this.toMessageWithSource(message));

        const results = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: isMultiple
                ? `Moving ${messageCount} messages to ${target.queue.name}...`
                : `Moving message to ${target.queue.name}...`,
            cancellable: false
        }, async (progress) => {
            return this.messageMover.moveMessages(
                target.queue.name,
                connectionString,
                domainMessages,
                (processed, total) => {
                    if (total >= 10) {
                        const percentage = Math.round((processed / total) * 100);
                        progress.report({
                            increment: (1 / total) * 100,
                            message: `${processed}/${total} (${percentage}%)`
                        });
                    }
                }
            );
        });

        if (results.failed.length === 0) {
            const msg = isMultiple
                ? `Successfully moved ${messageCount} messages to ${target.queue.name}`
                : `Message moved to ${target.queue.name}`;
            vscode.window.showInformationMessage(msg);
        } else if (results.successful.length === 0) {
            const failedIds = results.failed.map(f => f.message.messageId).join(', ');
            vscode.window.showErrorMessage(
                `Failed to move ${messageCount} message(s) to ${target.queue.name}. IDs: ${failedIds}`
            );
        } else {
            const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
            vscode.window.showWarningMessage(
                `Moved ${results.successful.length} of ${messageCount} messages to ${target.queue.name}. ` +
                `Failed: ${failedIds}`
            );
        }

        if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
            for (const msg of results.successful) {
                QueueMessagesPanel.currentPanel.notifyMessageRemoved(msg.sequenceNumber);
            }
        }

        this.refresh();
    }

    private toMessageWithSource(messageData: QueueMessageData): MessageWithSource {
        const source = messageData.sourceQueue && messageData.sourceConnectionString
            ? {
                queueName: messageData.sourceQueue.name,
                connectionString: messageData.sourceConnectionString
            }
            : undefined;

        return {
            body: messageData.rawBody ?? messageData.body,
            messageId: messageData.messageId,
            properties: messageData.properties,
            enqueuedTime: messageData.enqueuedTime,
            deliveryCount: messageData.deliveryCount,
            sequenceNumber: messageData.sequenceNumber,
            source
        };
    }
}
