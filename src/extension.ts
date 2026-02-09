import * as vscode from 'vscode';
import { AzureMessageOperations } from './adapters/azure/AzureMessageOperations';
import { AzureQueueRegistry } from './adapters/azure/AzureQueueRegistry';
import { VsCodeConnectionRepository } from './adapters/vscode/VsCodeConnectionRepository';
import { VsCodeLogger } from './adapters/vscode/VsCodeLogger';
import { VsCodeMessageGridColumnsRepository } from './adapters/vscode/VsCodeMessageGridColumnsRepository';
import { VsCodeTelemetry } from './adapters/vscode/VsCodeTelemetry';
import { ConnectionService } from './domain/connections/ConnectionService';
import { MessageGridColumnsService } from './domain/messageGrid/MessageGridColumnsService';
import { MessageDeleter } from './domain/messages/MessageDeleter';
import { MessageMover } from './domain/messages/MessageMover';
import { MessageSender } from './domain/messages/MessageSender';
import type { MessageWithSource } from './domain/messages/MessageTypes';
import { QueueRegistryService } from './domain/queues/QueueRegistryService';
import { ConnectionsProvider } from './providers/ConnectionsProvider';
import { QueueMessagesPanel, QueueMessage } from './providers/QueueMessagesPanel';
import { Queue, QueueTreeItem } from './models/Queue';

let messageOperationsForDispose: AzureMessageOperations | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('BusDriver extension is now active');

    const connectionRepository = new VsCodeConnectionRepository(context);
    const connectionService = new ConnectionService(connectionRepository);
    const queueRegistry = new AzureQueueRegistry();
    const messageOperations = new AzureMessageOperations();
    messageOperationsForDispose = messageOperations;
    const messageSender = new MessageSender(messageOperations);
    const messageMover = new MessageMover(messageSender, messageOperations);
    const messageDeleter = new MessageDeleter(messageOperations);
    const queueRegistryService = new QueueRegistryService(queueRegistry, connectionRepository);
    const logger = new VsCodeLogger();
    const telemetry = new VsCodeTelemetry();
    const messageGridColumnsRepository = new VsCodeMessageGridColumnsRepository();
    const messageGridColumnsService = new MessageGridColumnsService(messageGridColumnsRepository);

    // Create the connections provider
    const connectionsProvider = new ConnectionsProvider(
        connectionService,
        queueRegistryService,
        messageMover,
        logger,
        telemetry
    );
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

    const configureMessageGridColumnsCommand = vscode.commands.registerCommand(
        'busdriver.configureMessageGridColumns',
        async () => {
            const currentColumns = await messageGridColumnsService.getPropertyColumns();
            const input = await vscode.window.showInputBox({
                prompt: 'Enter comma-separated application property keys to show as columns',
                value: currentColumns.join(', '),
                placeHolder: 'traceId, correlationId, tenant'
            });

            if (input === undefined) {
                return;
            }

            await messageGridColumnsService.updatePropertyColumnsFromInput(input);
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
                    connectionString,
                    messageOperations,
                    messageGridColumnsService
                );
            } else {
                vscode.window.showErrorMessage('Connection string not found');
            }
        }
    );

    const moveMessageToQueueCommand = vscode.commands.registerCommand(
        'busdriver.moveMessageToQueue',
        async (messageData: QueueMessage | QueueMessage[]) => {
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
                const targetConnection = await connectionService.getConnectionById(selected.queue.connectionId);
                const targetConnectionString = targetConnection?.connectionString?.trim();

                if (!targetConnectionString) {
                    vscode.window.showErrorMessage('Connection string not found for target queue');
                    return;
                }

                const messages = Array.isArray(messageData) ? messageData : [messageData];
                const messageCount = messages.length;
                const isMultiple = messageCount > 1;
                const domainMessages = messages.map(toMessageWithSource);

                const results = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: isMultiple
                        ? `Moving ${messageCount} messages to ${selected.queue.name}...`
                        : `Moving message to ${selected.queue.name}...`,
                    cancellable: false
                }, async (progress) => {
                    return messageMover.moveMessages(
                        selected.queue.name,
                        targetConnectionString,
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
                        ? `Successfully moved ${messageCount} messages to ${selected.queue.name}`
                        : `Message moved to ${selected.queue.name}`;
                    vscode.window.showInformationMessage(msg);
                } else if (results.successful.length === 0) {
                    const failedIds = results.failed.map(f => f.message.messageId).join(', ');
                    vscode.window.showErrorMessage(
                        `Failed to move ${messageCount} message(s) to ${selected.queue.name}. IDs: ${failedIds}`
                    );
                } else {
                    const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
                    vscode.window.showWarningMessage(
                        `Moved ${results.successful.length} of ${messageCount} messages to ${selected.queue.name}. ` +
                        `Failed: ${failedIds}`
                    );
                }

                if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
                    for (const msg of results.successful) {
                        QueueMessagesPanel.currentPanel.notifyMessageRemoved(msg.sequenceNumber);
                    }
                }

                connectionsProvider.refresh();
            }
        }
    );

    const deleteMessagesCommand = vscode.commands.registerCommand(
        'busdriver.deleteMessages',
        async (messageData: QueueMessage | QueueMessage[]) => {
            const messages = Array.isArray(messageData) ? messageData : [messageData];
            const messageCount = messages.length;
            const domainMessages = messages.map(toMessageWithSource);
            const firstSource = domainMessages[0]?.source;

            const confirmation = await vscode.window.showWarningMessage(
                messageCount === 1
                    ? `Delete this message? This cannot be undone.`
                    : `Delete ${messageCount} messages? This cannot be undone.`,
                { modal: true },
                'Delete'
            );

            if (confirmation === 'Delete') {
                if (!firstSource || domainMessages.some(message => !message.source)) {
                    vscode.window.showErrorMessage('Cannot delete message: source queue information missing');
                    return;
                }

                const results = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: messageCount > 1 ? `Deleting ${messageCount} messages...` : 'Deleting message...',
                    cancellable: false
                }, async (progress) => {
                    return messageDeleter.deleteMessages(
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
                    const msg = messageCount > 1
                        ? `Successfully deleted ${messageCount} messages from ${firstSource.queueName}`
                        : `Message deleted from ${firstSource.queueName}`;
                    vscode.window.showInformationMessage(msg);
                } else if (results.successful.length === 0) {
                    const failedIds = results.failed.map(f => f.message.messageId).join(', ');
                    vscode.window.showErrorMessage(
                        `Failed to delete ${messageCount} message(s) from ${firstSource.queueName}. IDs: ${failedIds}`
                    );
                } else {
                    const failedIds = results.failed.map(f => `${f.message.messageId} (${f.error})`).join(', ');
                    vscode.window.showWarningMessage(
                        `Deleted ${results.successful.length} of ${messageCount} messages from ${firstSource.queueName}. ` +
                        `Failed: ${failedIds}`
                    );
                }

                if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
                    await QueueMessagesPanel.currentPanel.refreshView();
                }

                connectionsProvider.refresh();
            }
        }
    );

    const purgeQueueCommand = vscode.commands.registerCommand(
        'busdriver.purgeQueue',
        async (payload: { queue: Queue; connectionString: string }) => {
            const queue = payload?.queue;
            const connectionString = payload?.connectionString?.trim();

            if (!queue || !connectionString) {
                vscode.window.showErrorMessage('Cannot purge queue: queue information missing');
                return;
            }

            const confirmation = await vscode.window.showWarningMessage(
                `Purge all messages from ${queue.name}? This cannot be undone.`,
                { modal: true },
                'Purge'
            );

            if (confirmation !== 'Purge') {
                return;
            }

            const purgedCount = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Purging ${queue.name}...`,
                cancellable: false
            }, async () => {
                return messageOperations.purgeQueue(queue.name, connectionString);
            });

            const resultMessage = purgedCount === 0
                ? `No messages found in ${queue.name} to purge.`
                : `Purged ${purgedCount} message${purgedCount === 1 ? '' : 's'} from ${queue.name}.`;

            vscode.window.showInformationMessage(resultMessage);

            if (QueueMessagesPanel.currentPanel) {
                await QueueMessagesPanel.currentPanel.refreshView();
            }

            connectionsProvider.refresh();
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
                        connectionString,
                        messageOperations,
                        messageGridColumnsService
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
        configureMessageGridColumnsCommand,
        showQueueMessagesCommand,
        moveMessageToQueueCommand,
        deleteMessagesCommand,
        purgeQueueCommand
    );
}

export function deactivate() {
    console.log('BusDriver extension is now deactivated');
    const operations = messageOperationsForDispose;
    messageOperationsForDispose = undefined;
    if (operations?.dispose) {
        void operations.dispose();
    }
}

function toMessageWithSource(message: QueueMessage): MessageWithSource {
    const source = message.sourceQueue && message.sourceConnectionString
        ? {
            queueName: message.sourceQueue.name,
            connectionString: message.sourceConnectionString
        }
        : undefined;

    return {
        body: message.rawBody ?? message.body,
        messageId: message.messageId,
        properties: message.properties,
        enqueuedTime: message.enqueuedTime,
        deliveryCount: message.deliveryCount,
        sequenceNumber: message.sequenceNumber,
        source
    };
}
