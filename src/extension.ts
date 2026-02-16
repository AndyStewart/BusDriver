import * as vscode from 'vscode';
import { VsCodeConnectionRepository } from './features/connections/adapters/VsCodeConnectionRepositoryAdapter';
import { ConnectionService } from './features/connections/application/ConnectionService';
import { ConnectionsProvider } from './features/connections/adapters/TreeConnectionsAdapter';
import { AzureMessageOperations } from './features/queueMessages/adapters/AzureMessageOperationsAdapter';
import { VsCodeMessageGridColumnsRepository } from './features/queueMessages/adapters/VsCodeMessageGridColumnsRepositoryAdapter';
import { VsCodeQueueMessagesPanelGateway } from './features/queueMessages/adapters/VsCodeQueueMessagesPanelGatewayAdapter';
import { DeleteMessagesUseCase } from './features/queueMessages/application/DeleteMessagesUseCase';
import { LoadQueueMessagesUseCase } from './features/queueMessages/application/LoadQueueMessagesUseCase';
import { MoveMessagesUseCase } from './features/queueMessages/application/MoveMessagesUseCase';
import { OpenQueueMessagesUseCase } from './features/queueMessages/application/OpenQueueMessagesUseCase';
import { PurgeQueueUseCase } from './features/queueMessages/application/PurgeQueueUseCase';
import { MessageGridColumnsService } from './features/queueMessages/application/MessageGridColumnsService';
import { MessageDeleter } from './features/queueMessages/application/MessageDeleter';
import { MessageMover } from './features/queueMessages/application/MessageMover';
import { MessageSender } from './features/queueMessages/application/MessageSender';
import { mapMoveMessageToDomain } from './features/queueMessages/adapters/TreeMessageDropAdapter';
import { summarizeDeleteResult, summarizeMoveResult } from './features/queueMessages/adapters/CommandMessageOperationSummaryAdapter';
import { QueueMessagesPanel, QueueMessage } from './features/queueMessages/adapters/WebviewQueueMessagesPanelAdapter';
import { AzureQueueRegistry } from './features/queues/adapters/AzureQueueRegistryAdapter';
import { ListQueuesUseCase } from './features/queues/application/ListQueuesUseCase';
import { QueueRegistryService } from './features/queues/application/QueueRegistryService';
import { Queue, QueueTreeItem } from './features/queues/adapters/TreeQueueItemAdapter';
import { VsCodeLogger } from './shared/adapters/vscode/VsCodeLoggerAdapter';
import { VsCodeTelemetry } from './shared/adapters/vscode/VsCodeTelemetryAdapter';

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
                    onProgress: (processed: number, total: number) => {
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
                    onProgress: (processed: number, total: number) => {
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
