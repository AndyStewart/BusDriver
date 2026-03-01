import * as vscode from 'vscode';
import type { Connection } from '../../features/common/Connection';
import { ConnectionService } from '../../features/connections/ConnectionService';
import { ConnectionTreeItem } from './TreeConnectionItemAdapter';
import type { Queue, QueueStats } from '../../features/common/Queue';
import { QueueTreeItem } from './QueueTreeItemAdapter';
import type { Logger } from '../../ports/secondary/Logger';
import type { Telemetry } from '../../ports/secondary/Telemetry';
import {
    mapMoveMessageToDomain,
    parseDroppedMessages,
    type MoveMessageData,
    type MoveMessagesPort,
    selectDropMessages,
    summarizeMoveResult,
    type QueueMessageData
} from './MessageMoveAdapter';

export interface ConnectionsProviderUi {
    showInputBox(options?: vscode.InputBoxOptions): Thenable<string | undefined>;
    showWarningMessage<T extends string>(
        message: string,
        options?: vscode.MessageOptions,
        ...items: T[]
    ): Thenable<T | undefined>;
    showInformationMessage(message: string): Thenable<string | undefined>;
    showErrorMessage(message: string): Thenable<string | undefined>;
    withProgress<R>(
        options: vscode.ProgressOptions,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<R>
    ): Thenable<R>;
}

const defaultConnectionsProviderUi: ConnectionsProviderUi = {
    showInputBox: (options) => vscode.window.showInputBox(options),
    showWarningMessage: (message, options, ...items) => {
        if (options) {
            return vscode.window.showWarningMessage(message, options, ...items);
        }

        return vscode.window.showWarningMessage(message, ...items);
    },
    showInformationMessage: (message) => vscode.window.showInformationMessage(message),
    showErrorMessage: (message) => vscode.window.showErrorMessage(message),
    withProgress: (options, task) => vscode.window.withProgress(options, task)
};

export interface QueueRegistryPort {
    listQueuesForConnection(connection: Connection): Promise<Array<{ name: string; connectionId: string; activeMessageCount: number }>>;
    listAllQueues(): Promise<Array<{ queue: { name: string; connectionId: string; activeMessageCount: number }; connection: Connection }>>;
}

export interface QueueMessagesBridge {
    consumePendingDragMessage(): QueueMessageData | QueueMessageData[] | undefined;
    notifyMessageRemoved(sequenceNumber: string): void;
}

const defaultQueueMessagesBridge: QueueMessagesBridge = {
    consumePendingDragMessage: () => undefined,
    notifyMessageRemoved: () => undefined
};

export class ConnectionsProvider implements vscode.TreeDataProvider<ConnectionTreeItem | QueueTreeItem>, vscode.TreeDragAndDropController<QueueTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | QueueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | QueueTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    readonly dropMimeTypes = ['application/vnd.code.tree.busdriver-message', 'text/plain', 'text/uri-list'];
    readonly dragMimeTypes: string[] = [];

    private connections: Connection[] = [];

    constructor(
        private readonly connectionService: ConnectionService,
        private readonly queueRegistryService: QueueRegistryPort,
        private readonly moveMessages: MoveMessagesPort,
        private readonly logger: Logger,
        private readonly telemetry: Telemetry,
        private readonly ui: ConnectionsProviderUi = defaultConnectionsProviderUi,
        private readonly queueMessagesBridge: QueueMessagesBridge = defaultQueueMessagesBridge
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
        const name = await this.ui.showInputBox({
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

        const connectionString = await this.ui.showInputBox({
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
            void this.ui.showErrorMessage(result.error.message);
            return;
        }

        const connection = result.value;
        this.connections.push(connection);
        this.telemetry.trackEvent('connections.added');
        this.refresh();

        void this.ui.showInformationMessage(`Connection '${connection.name}' added successfully`);
    }

    async deleteConnection(item: ConnectionTreeItem): Promise<void> {
        const confirm = await this.ui.showWarningMessage(
            `Are you sure you want to delete connection '${item.connection.name}'?`,
            { modal: true },
            'Delete'
        );

        if (confirm === 'Delete') {
            this.connections = this.connections.filter(c => c.id !== item.connection.id);
            await this.connectionService.deleteConnection(item.connection.id);
            this.telemetry.trackEvent('connections.deleted');
            this.refresh();
            void this.ui.showInformationMessage(`Connection '${item.connection.name}' deleted`);
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
                void this.ui.showErrorMessage(`Connection string not found for ${connection.name}`);
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
            void this.ui.showErrorMessage(`Failed to list queues for ${connection.name}: ${errorMessage}`);
            return [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleDrop(target: QueueTreeItem | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): Promise<void> {
        if (!target || !(target instanceof QueueTreeItem)) {
            return;
        }

        const pendingDragMessages = this.queueMessagesBridge.consumePendingDragMessage();

        const parsedMessages = parseDroppedMessages(
            getDataTransferString(dataTransfer, 'text/uri-list'),
            getDataTransferString(dataTransfer, 'text/plain')
        );
        const messages = selectDropMessages(pendingDragMessages, parsedMessages);

        if (!messages) {
            this.logger.warn('Drop ignored because no valid BusDriver message payload was found');
            return;
        }

        await this.processMessageMove(target, messages);
    }

    private async processMessageMove(target: QueueTreeItem, messageData: MoveMessageData | MoveMessageData[]): Promise<void> {
        const connectionString = await this.getConnectionString(target.queue.connectionId);

        if (!connectionString) {
            void this.ui.showErrorMessage('Connection string not found for target queue');
            return;
        }

        const messages = Array.isArray(messageData) ? messageData : [messageData];
        const messageCount = messages.length;
        const isMultiple = messageCount > 1;
        const domainMessages = messages.map(message => mapMoveMessageToDomain(message));

        const results = await this.ui.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: isMultiple
                ? `Moving ${messageCount} messages to ${target.queue.name}...`
                : `Moving message to ${target.queue.name}...`,
            cancellable: false
        }, async (progress) => {
            return this.moveMessages.move({
                targetQueueName: target.queue.name,
                targetConnectionString: connectionString,
                messages: domainMessages,
                onProgress: (processed, total) => {
                    if (total >= 10) {
                        const percentage = Math.round((processed / total) * 100);
                        progress.report({
                            increment: (1 / total) * 100,
                            message: `${processed}/${total} (${percentage}%)`
                        });
                    }
                }
            });
        });

        const summary = summarizeMoveResult(target.queue.name, messageCount, results);
        if (summary.level === 'info') {
            void this.ui.showInformationMessage(summary.message);
        } else if (summary.level === 'warning') {
            void this.ui.showWarningMessage(summary.message);
        } else {
            void this.ui.showErrorMessage(summary.message);
        }

        for (const msg of results.successful) {
            this.queueMessagesBridge.notifyMessageRemoved(msg.sequenceNumber);
        }

        this.refresh();
    }
}

function getDataTransferString(dataTransfer: vscode.DataTransfer, mimeType: string): string | undefined {
    const item = dataTransfer.get(mimeType);
    if (!item) {
        return undefined;
    }

    const value = item.value as unknown;
    return typeof value === 'string' ? value : undefined;
}
