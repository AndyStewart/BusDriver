import * as vscode from 'vscode';
import { AzureMessageOperations } from './adapters/azure/AzureMessageOperations';
import { AzureQueueRegistry } from './adapters/azure/AzureQueueRegistry';
import { VsCodeConnectionRepository } from './adapters/vscode/VsCodeConnectionRepository';
import { VsCodeLogger } from './adapters/vscode/VsCodeLogger';
import { VsCodeMessageGridColumnsRepository } from './adapters/vscode/VsCodeMessageGridColumnsRepository';
import { VsCodeQueueMessagesPanelGateway } from './adapters/vscode/VsCodeQueueMessagesPanelGateway';
import { VsCodeTelemetry } from './adapters/vscode/VsCodeTelemetry';
import { DeleteMessagesUseCase } from './application/useCases/DeleteMessagesUseCase';
import { LoadQueueMessagesUseCase } from './application/useCases/LoadQueueMessagesUseCase';
import { ListQueuesUseCase } from './application/useCases/ListQueuesUseCase';
import { MoveMessagesUseCase } from './application/useCases/MoveMessagesUseCase';
import { OpenQueueMessagesUseCase } from './application/useCases/OpenQueueMessagesUseCase';
import { PurgeQueueUseCase } from './application/useCases/PurgeQueueUseCase';
import { ConnectionService } from './domain/connections/ConnectionService';
import { MessageGridColumnsService } from './domain/messageGrid/MessageGridColumnsService';
import { MessageDeleter } from './domain/messages/MessageDeleter';
import { MessageMover } from './domain/messages/MessageMover';
import { MessageSender } from './domain/messages/MessageSender';
import { QueueRegistryService } from './domain/queues/QueueRegistryService';
import { Queue, QueueTreeItem } from './models/Queue';
import { mapMoveMessageToDomain } from './providers/connectionsProviderDropResolution';
import { summarizeDeleteResult, summarizeMoveResult } from './providers/messageOperationSummary';
import { ConnectionsProvider } from './providers/ConnectionsProvider';
import { QueueMessagesPanel, QueueMessage } from './providers/QueueMessagesPanel';

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
    const messageGridColumnsRepository = new VsCodeMessageGridColumnsRepository(
        () => vscode.workspace.getConfiguration('busdriver'),
        vscode.ConfigurationTarget.Global
    );
    const messageGridColumnsService = new MessageGridColumnsService(messageGridColumnsRepository);

    const moveMessages = new MoveMessagesUseCase(messageMover);
    const deleteMessages = new DeleteMessagesUseCase(messageDeleter);
    const purgeQueue = new PurgeQueueUseCase(messageOperations);
    const listQueues = new ListQueuesUseCase(queueRegistryService);
    const loadQueueMessages = new LoadQueueMessagesUseCase(messageOperations, messageGridColumnsService);
    const queueMessagesPanelGateway = new VsCodeQueueMessagesPanelGateway(
        context.extensionUri,
        loadQueueMessages
    );
    const openQueueMessages = new OpenQueueMessagesUseCase(connectionService, queueMessagesPanelGateway);

    // Create the connections provider
    const connectionsProvider = new ConnectionsProvider(
        connectionService,
        queueRegistryService,
        moveMessages,
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
            try {
                await openQueueMessages.open(item.queue);
            } catch {
                vscode.window.showErrorMessage('Connection string not found');
            }
        }
    );

    const moveMessageToQueueCommand = vscode.commands.registerCommand(
        'busdriver.moveMessageToQueue',
        async (messageData: QueueMessage | QueueMessage[]) => {
            const allQueues = await listQueues.list();

            if (allQueues.length === 0) {
                vscode.window.showErrorMessage('No queues available');
                return;
            }

            const items = allQueues.map(q => ({
                label: q.queue.name,
                description: q.connection.name,
                queue: q.queue
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select target queue to move message to'
            });

            if (!selected) {
                return;
            }

            const targetConnection = await connectionService.getConnectionById(selected.queue.connectionId);
            const targetConnectionString = targetConnection?.connectionString?.trim();

            if (!targetConnectionString) {
                vscode.window.showErrorMessage('Connection string not found for target queue');
                return;
            }

            const messages = Array.isArray(messageData) ? messageData : [messageData];
            const messageCount = messages.length;
            const domainMessages = messages.map(message => mapMoveMessageToDomain(message));

            const results = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: messageCount > 1
                    ? `Moving ${messageCount} messages to ${selected.queue.name}...`
                    : `Moving message to ${selected.queue.name}...`,
                cancellable: false
            }, async (progress) => {
                return moveMessages.move({
                    targetQueueName: selected.queue.name,
                    targetConnectionString,
                    messages: domainMessages,
                    onProgress: (processed, total) => {
                        reportProgress(progress, processed, total);
                    }
                });
            });

            showOperationSummary(summarizeMoveResult(selected.queue.name, messageCount, results));

            if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
                for (const msg of results.successful) {
                    QueueMessagesPanel.currentPanel.notifyMessageRemoved(msg.sequenceNumber);
                }
            }

            connectionsProvider.refresh();
        }
    );

    const deleteMessagesCommand = vscode.commands.registerCommand(
        'busdriver.deleteMessages',
        async (messageData: QueueMessage | QueueMessage[]) => {
            const messages = Array.isArray(messageData) ? messageData : [messageData];
            const messageCount = messages.length;
            const domainMessages = messages.map(message => mapMoveMessageToDomain(message));
            const firstSource = domainMessages[0]?.source;

            const confirmation = await vscode.window.showWarningMessage(
                messageCount === 1
                    ? 'Delete this message? This cannot be undone.'
                    : `Delete ${messageCount} messages? This cannot be undone.`,
                { modal: true },
                'Delete'
            );

            if (confirmation !== 'Delete') {
                return;
            }

            if (!firstSource || domainMessages.some(message => !message.source)) {
                vscode.window.showErrorMessage('Cannot delete message: source queue information missing');
                return;
            }

            const results = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: messageCount > 1 ? `Deleting ${messageCount} messages...` : 'Deleting message...',
                cancellable: false
            }, async (progress) => {
                return deleteMessages.delete({
                    messages: domainMessages,
                    onProgress: (processed, total) => {
                        reportProgress(progress, processed, total);
                    }
                });
            });

            showOperationSummary(summarizeDeleteResult(firstSource.queueName, messageCount, results));

            if (QueueMessagesPanel.currentPanel && results.successful.length > 0) {
                await QueueMessagesPanel.currentPanel.refreshView();
            }

            connectionsProvider.refresh();
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
                return purgeQueue.purge({
                    queueName: queue.name,
                    connectionString
                });
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

    treeView.onDidChangeSelection(async (e) => {
        if (e.selection.length > 0) {
            const selected = e.selection[0];
            if (selected instanceof QueueTreeItem) {
                try {
                    await openQueueMessages.open(selected.queue);
                } catch {
                    vscode.window.showErrorMessage('Connection string not found');
                }
            }
        }
    });

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

function reportProgress(progress: vscode.Progress<{ message?: string; increment?: number }>, processed: number, total: number): void {
    if (total >= 10) {
        const percentage = Math.round((processed / total) * 100);
        progress.report({
            increment: (1 / total) * 100,
            message: `${processed}/${total} (${percentage}%)`
        });
    }
}

function showOperationSummary(summary: { level: 'info' | 'warning' | 'error'; message: string }): void {
    if (summary.level === 'info') {
        vscode.window.showInformationMessage(summary.message);
        return;
    }

    if (summary.level === 'warning') {
        vscode.window.showWarningMessage(summary.message);
        return;
    }

    vscode.window.showErrorMessage(summary.message);
}

export function deactivate() {
    console.log('BusDriver extension is now deactivated');
    const operations = messageOperationsForDispose;
    messageOperationsForDispose = undefined;
    if (operations?.dispose) {
        void operations.dispose();
    }
}
