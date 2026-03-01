import * as vscode from 'vscode';
import { VsCodeConnectionRepository } from './adapters/secondary/VsCodeConnectionRepositoryAdapter';
import { ConnectionService } from './features/connections/ConnectionService';
import { ConnectionsProvider, type ConnectionsProviderUi } from './adapters/primary/TreeConnectionsAdapter';
import type { ConnectionTreeItem } from './adapters/primary/TreeConnectionItemAdapter';
import { AzureMessageOperations } from './adapters/secondary/AzureMessageOperationsAdapter';
import { VsCodeMessageGridColumnsRepository } from './adapters/secondary/VsCodeMessageGridColumnsRepositoryAdapter';
import { VsCodeQueueMessagesPanelGateway } from './adapters/secondary/VsCodeQueueMessagesPanelGatewayAdapter';
import { DeleteMessagesUseCase } from './features/deleteMessages/DeleteMessagesUseCase';
import { LoadQueueMessagesUseCase } from './features/listMessages/LoadQueueMessagesUseCase';
import { MoveMessagesUseCase } from './features/moveMessages/MoveMessagesUseCase';
import { OpenQueueMessagesUseCase } from './features/openQueueMessages/OpenQueueMessagesUseCase';
import { PurgeQueueUseCase } from './features/purgeMessages/PurgeQueueUseCase';
import { MessageGridColumnsService } from './features/messageGrid/MessageGridColumnsService';
import { MessageDeleter } from './features/deleteMessages/MessageDeleter';
import { MessageMover } from './features/moveMessages/MessageMover';
import { MessageSender } from './features/moveMessages/MessageSender';
import { mapMoveMessageToDomain } from './adapters/primary/TreeMessageDropAdapter';
import { summarizeDeleteResult, summarizeMoveResult } from './adapters/primary/CommandMessageOperationSummaryAdapter';
import { QueueMessagesPanel, QueueMessage } from './adapters/primary/WebviewQueueMessagesPanelAdapter';
import { AzureQueueRegistry } from './adapters/secondary/AzureQueueRegistryAdapter';
import { ListQueuesUseCase } from './features/queues/ListQueuesUseCase';
import { QueueRegistryService } from './features/queues/QueueRegistryService';
import { Queue, QueueTreeItem } from './adapters/primary/TreeQueueItemAdapter';
import { VsCodeLogger } from './adapters/secondary/VsCodeLoggerAdapter';
import { VsCodeTelemetry } from './adapters/secondary/VsCodeTelemetryAdapter';

let messageOperationsForDispose: AzureMessageOperations | undefined;

interface AcceptanceQueueEntry {
    queue: { name: string; connectionId: string };
    connection: { id: string; name: string };
}

interface AcceptanceCommandOverrides {
    inputBoxValues?: string[];
    warningResponses?: string[];
    warningResponse?: string;
    quickPickLabel?: string;
    quickPickIndex?: number;
}

interface AcceptanceRuntimeState {
    queueCatalog?: AcceptanceQueueEntry[];
    commandOverridesByScope: Map<string, AcceptanceCommandOverrides>;
}

const ACCEPTANCE_MODE = process.env.BUSDRIVER_ACCEPTANCE_MODE === '1';

export function activate(context: vscode.ExtensionContext) {
    console.log('BusDriver extension is now active');

    const acceptanceRuntime: AcceptanceRuntimeState = {
        commandOverridesByScope: new Map()
    };

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
    const openQueueMessages = new OpenQueueMessagesUseCase(
        {
            getAll: () => connectionService.listConnections(),
            getById: (id: string) => connectionService.getConnectionById(id)
        },
        queueMessagesPanelGateway
    );

    const acceptanceAwareUi: ConnectionsProviderUi = {
        showInputBox: async (options) => {
            const override = consumeInputBoxOverride(acceptanceRuntime);
            if (override !== undefined) {
                return override;
            }

            return vscode.window.showInputBox(options);
        },
        showWarningMessage: async (message, options, ...items) => {
            const override = consumeWarningOverride(acceptanceRuntime);
            if (override !== undefined) {
                const matchedItem = items.find(item => item === override);
                if (matchedItem) {
                    return matchedItem;
                }
            }

            if (options) {
                return vscode.window.showWarningMessage(message, options, ...items);
            }

            return vscode.window.showWarningMessage(message, ...items);
        },
        showInformationMessage: async (message) => {
            return vscode.window.showInformationMessage(message);
        },
        showErrorMessage: async (message) => {
            return vscode.window.showErrorMessage(message);
        },
        withProgress: async (options, task) => {
            return vscode.window.withProgress(options, task);
        }
    };

    // Create the connections provider
    const connectionsProvider = new ConnectionsProvider(
        connectionService,
        queueRegistryService,
        moveMessages,
        logger,
        telemetry,
        ACCEPTANCE_MODE ? acceptanceAwareUi : undefined,
        {
            consumePendingDragMessage: () => {
                const pendingDragMessage = QueueMessagesPanel.pendingDragMessage;
                QueueMessagesPanel.pendingDragMessage = undefined;
                return pendingDragMessage;
            },
            notifyMessageRemoved: (sequenceNumber: string) => {
                QueueMessagesPanel.currentPanel?.notifyMessageRemoved(sequenceNumber);
            }
        }
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
        async (item: ConnectionTreeItem) => {
            await connectionsProvider.deleteConnection(item);
        }
    );

    const configureMessageGridColumnsCommand = vscode.commands.registerCommand(
        'busdriver.configureMessageGridColumns',
        async () => {
            const currentColumns = await messageGridColumnsService.getPropertyColumns();
            const override = consumeInputBoxOverride(acceptanceRuntime);
            const input = override !== undefined
                ? override
                : await vscode.window.showInputBox({
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
                void vscode.window.showErrorMessage('Connection string not found');
            }
        }
    );

    const moveMessageToQueueCommand = vscode.commands.registerCommand(
        'busdriver.moveMessageToQueue',
        async (messageData: QueueMessage | QueueMessage[]) => {
            const allQueues = acceptanceRuntime.queueCatalog ?? await listQueues.list();

            if (allQueues.length === 0) {
                void vscode.window.showErrorMessage('No queues available');
                return;
            }

            const items = allQueues.map(q => ({
                label: q.queue.name,
                description: q.connection.name,
                queue: q.queue
            }));

            const selected = await selectQueueForMove(items, acceptanceRuntime);

            if (!selected) {
                return;
            }

            const targetConnection = await connectionService.getConnectionById(selected.queue.connectionId);
            const targetConnectionString = targetConnection?.connectionString?.trim();

            if (!targetConnectionString) {
                void vscode.window.showErrorMessage('Connection string not found for target queue');
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

            const confirmation = consumeWarningOverride(acceptanceRuntime) ?? await vscode.window.showWarningMessage(
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
                void vscode.window.showErrorMessage('Cannot delete message: source queue information missing');
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
                void vscode.window.showErrorMessage('Cannot purge queue: queue information missing');
                return;
            }

            const confirmation = consumeWarningOverride(acceptanceRuntime) ?? await vscode.window.showWarningMessage(
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

            void vscode.window.showInformationMessage(resultMessage);

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
                    void vscode.window.showErrorMessage('Connection string not found');
                }
            }
        }
    });

    const acceptanceCommands: vscode.Disposable[] = [];
    if (ACCEPTANCE_MODE) {
        acceptanceCommands.push(
            vscode.commands.registerCommand(
                'busdriver.__test.seedConnection',
                async (payload: { name: string; connectionString: string }) => {
                    const result = await connectionService.addConnection(payload.name, payload.connectionString);
                    if (!result.ok) {
                        throw new Error(result.error.message);
                    }

                    connectionsProvider.refresh();
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.clearConnections',
                async () => {
                    const connections = await connectionService.listConnections();
                    for (const connection of connections) {
                        await connectionService.deleteConnection(connection.id);
                    }

                    connectionsProvider.refresh();
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.listConnections',
                () => {
                    return connectionService.listConnections();
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.setQueueCatalog',
                (payload: { entries: AcceptanceQueueEntry[] | undefined }) => {
                    acceptanceRuntime.queueCatalog = payload.entries;
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.setCommandOverrides',
                (payload: { scopeId?: string; overrides?: AcceptanceCommandOverrides }) => {
                    const scopeId = payload.scopeId ?? getAcceptanceScopeId();
                    acceptanceRuntime.commandOverridesByScope.set(scopeId, payload.overrides ?? {});
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.getOpenQueuePanel',
                () => {
                    return QueueMessagesPanel.getCurrentPanelQueue();
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.closeQueuePanel',
                () => {
                    QueueMessagesPanel.currentPanel?.dispose();
                }
            ),
            vscode.commands.registerCommand(
                'busdriver.__test.resetCommandOverrides',
                (payload?: { scopeId?: string }) => {
                    const scopeId = payload?.scopeId ?? getAcceptanceScopeId();
                    acceptanceRuntime.commandOverridesByScope.delete(scopeId);
                }
            )
        );
    }

    context.subscriptions.push(
        treeView,
        addConnectionCommand,
        refreshCommand,
        deleteConnectionCommand,
        configureMessageGridColumnsCommand,
        showQueueMessagesCommand,
        moveMessageToQueueCommand,
        deleteMessagesCommand,
        purgeQueueCommand,
        ...acceptanceCommands
    );
}

function getAcceptanceScopeId(): string {
    return process.env.BUSDRIVER_ACCEPTANCE_WORKER_ID ?? 'default';
}

function getScopedOverrides(runtime: AcceptanceRuntimeState): AcceptanceCommandOverrides | undefined {
    if (!ACCEPTANCE_MODE) {
        return undefined;
    }

    return runtime.commandOverridesByScope.get(getAcceptanceScopeId());
}

function consumeInputBoxOverride(runtime: AcceptanceRuntimeState): string | undefined {
    const overrides = getScopedOverrides(runtime);
    if (!overrides?.inputBoxValues || overrides.inputBoxValues.length === 0) {
        return undefined;
    }

    return overrides.inputBoxValues.shift();
}

function consumeWarningOverride(runtime: AcceptanceRuntimeState): string | undefined {
    const overrides = getScopedOverrides(runtime);
    if (!overrides) {
        return undefined;
    }

    if (overrides.warningResponses && overrides.warningResponses.length > 0) {
        return overrides.warningResponses.shift();
    }

    return overrides.warningResponse;
}

async function selectQueueForMove(
    items: Array<{ label: string; description: string; queue: Queue }>,
    runtime: AcceptanceRuntimeState
): Promise<{ label: string; description: string; queue: Queue } | undefined> {
    const overrides = getScopedOverrides(runtime);
    if (overrides?.quickPickLabel) {
        return items.find(item => item.label === overrides.quickPickLabel);
    }

    if (typeof overrides?.quickPickIndex === 'number') {
        return items[overrides.quickPickIndex];
    }

    return vscode.window.showQuickPick(items, {
        placeHolder: 'Select target queue to move message to'
    });
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
        void vscode.window.showInformationMessage(summary.message);
        return;
    }

    if (summary.level === 'warning') {
        void vscode.window.showWarningMessage(summary.message);
        return;
    }

    void vscode.window.showErrorMessage(summary.message);
}

export function deactivate() {
    console.log('BusDriver extension is now deactivated');
    const operations = messageOperationsForDispose;
    messageOperationsForDispose = undefined;
    if (operations?.dispose) {
        void operations.dispose();
    }
}
