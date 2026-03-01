import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import type { Queue } from '../../features/common/Queue';
import type { LoadQueueMessages } from '../../ports/primary/LoadQueueMessages';
import type { QueueMessageView } from '../../features/queueMessages/LoadQueueMessagesTypes';
import { withSourceContext } from './WebviewQueueMessageCommandAdapter';
import {
    buildAppendMessagesCommand,
    buildEmptyAppendMessagesCommand
} from './WebviewQueueMessagesLoadMoreAdapter';
import { resolveQueuePanelContext } from './WebviewQueuePanelContextAdapter';
import { serializeForInlineScript } from './WebviewScriptDataAdapter';

export interface QueueMessage extends QueueMessageView {
    sourceQueue?: Queue;
    sourceConnectionString?: string;
}

interface WebviewCommandMessage {
    command?: unknown;
    data?: unknown;
}

export class QueueMessagesPanel {
    public static currentPanel: QueueMessagesPanel | undefined;
    public static pendingDragMessage: QueueMessage | QueueMessage[] | undefined;
    private static readonly pageSize = 50;
    private static htmlTemplate: string | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _isLoadingMore = false;
    private _isDisposed = false;

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly queue: Queue,
        private connectionString: string,
        private readonly loadQueueMessages: LoadQueueMessages
    ) {
        this._panel = panel;

        // Set the webview's initial html content
        void this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message: WebviewCommandMessage) => {
                const command = getCommand(message);
                switch (command) {
                    case 'refresh':
                        void this._update();
                        return;
                    case 'loadMore':
                        await this._loadMoreMessages(getFromSequenceNumber(message.data));
                        return;
                    case 'configureColumns':
                        await vscode.commands.executeCommand('busdriver.configureMessageGridColumns');
                        return;
                    case 'removeMessage':
                        // Message was successfully moved, refresh the view
                        void this._update();
                        return;
                    case 'startDrag':
                        // Store the message data for drag operation
                        QueueMessagesPanel.pendingDragMessage = asQueueMessagePayload(message.data);
                        return;
                    case 'moveToQueue': {
                        const payload = asQueueMessagePayload(message.data);
                        if (!payload) {
                            return;
                        }

                        // User wants to move message(s) to another queue
                        const messages = withSourceContext<QueueMessage>(
                            payload,
                            this.queue,
                            this.connectionString
                        );
                        await vscode.commands.executeCommand('busdriver.moveMessageToQueue', messages);
                        return;
                    }
                    case 'deleteMessages': {
                        const payload = asQueueMessagePayload(message.data);
                        if (!payload) {
                            return;
                        }

                        // User wants to delete message(s)
                        const messages = withSourceContext<QueueMessage>(
                            payload,
                            this.queue,
                            this.connectionString
                        );
                        await vscode.commands.executeCommand('busdriver.deleteMessages', messages);
                        return;
                    }
                    case 'purgeQueue': {
                        await vscode.commands.executeCommand('busdriver.purgeQueue', {
                            queue: this.queue,
                            connectionString: this.connectionString
                        });
                        return;
                    }
                }
            },
            null,
            this._disposables
        );

        this._disposables.push(
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('busdriver.messageGrid.propertyColumns')) {
                    void this.refreshView();
                }
            })
        );
    }

    public static async createOrShow(
        extensionUri: vscode.Uri,
        queue: Queue,
        connectionString: string,
        loadQueueMessages: LoadQueueMessages
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (QueueMessagesPanel.currentPanel) {
            const currentPanel = QueueMessagesPanel.currentPanel;
            currentPanel._panel.reveal(column);
            const resolvedContext = resolveQueuePanelContext(queue, connectionString);
            currentPanel.queue.name = resolvedContext.queue.name;
            currentPanel.queue.connectionId = resolvedContext.queue.connectionId;
            currentPanel.connectionString = resolvedContext.connectionString;
            await currentPanel._update();
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'queueMessages',
            `Queue: ${queue.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        QueueMessagesPanel.currentPanel = new QueueMessagesPanel(
            panel,
            extensionUri,
            queue,
            connectionString,
            loadQueueMessages
        );
    }

    public static getCurrentPanelQueue(): Queue | undefined {
        if (!QueueMessagesPanel.currentPanel) {
            return undefined;
        }

        return {
            name: QueueMessagesPanel.currentPanel.queue.name,
            connectionId: QueueMessagesPanel.currentPanel.queue.connectionId
        };
    }

    public dispose() {
        if (this._isDisposed) {
            return;
        }

        this._isDisposed = true;
        QueueMessagesPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public notifyMessageRemoved(sequenceNumber: string): void {
        void this._panel.webview.postMessage({
            command: 'removeMessage',
            sequenceNumber: sequenceNumber
        });
    }

    public async refreshView(): Promise<void> {
        await this._update();
    }

    private async _update() {
        if (this._isDisposed) {
            return;
        }

        this._panel.title = `Queue: ${this.queue.name}`;
        const html = await this._getHtmlForWebview();

        if (this._isDisposed) {
            return;
        }

        try {
            this._panel.webview.html = html;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('Webview is disposed')) {
                return;
            }

            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    private async _getHtmlForWebview(): Promise<string> {
        try {
            const page = await this.loadQueueMessages.loadInitial({
                queueName: this.queue.name,
                connectionString: this.connectionString,
                pageSize: QueueMessagesPanel.pageSize
            });
            const stylesheetUri = this._getWebviewAssetUri('media', 'queueMessagesPanel.css');
            const scriptUri = this._getWebviewAssetUri('media', 'queueMessagesPanel.js');
            const initialDataJson = serializeForInlineScript({
                queueName: this.queue.name,
                headers: page.headers,
                rows: page.rows,
                messages: page.messages,
                pageSize: QueueMessagesPanel.pageSize
            });
            const template = await this._getHtmlTemplate();

            return this._applyTemplate(template, {
                __STYLESHEET_URI__: stylesheetUri,
                __SCRIPT_URI__: scriptUri,
                __INITIAL_DATA_JSON__: initialDataJson
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <style>
                    body {
                        padding: 20px;
                        color: var(--vscode-errorForeground);
                        font-family: var(--vscode-font-family);
                    }
                </style>
            </head>
            <body>
                <h1>Error loading messages</h1>
                <p>${errorMessage}</p>
            </body>
            </html>`;
        }
    }

    private _getWebviewAssetUri(...pathSegments: string[]): string {
        const assetUri = vscode.Uri.joinPath(this.extensionUri, ...pathSegments);
        return this._panel.webview.asWebviewUri(assetUri).toString();
    }

    private async _getHtmlTemplate(): Promise<string> {
        if (QueueMessagesPanel.htmlTemplate !== undefined) {
            return QueueMessagesPanel.htmlTemplate;
        }

        const templatePath = vscode.Uri.joinPath(
            this.extensionUri,
            'media',
            'queueMessagesPanel.html'
        );
        const template = await fs.readFile(templatePath.fsPath, 'utf8');
        QueueMessagesPanel.htmlTemplate = template;
        return template;
    }

    private _applyTemplate(template: string, replacements: Record<string, string>): string {
        let rendered = template;
        for (const [token, value] of Object.entries(replacements)) {
            rendered = rendered.split(token).join(value);
        }
        return rendered;
    }

    private async _loadMoreMessages(fromSequenceNumber?: string): Promise<void> {
        if (this._isLoadingMore) {
            return;
        }

        this._isLoadingMore = true;
        try {
            const page = await this.loadQueueMessages.loadMore({
                queueName: this.queue.name,
                connectionString: this.connectionString,
                pageSize: QueueMessagesPanel.pageSize,
                fromSequenceNumber
            });
            void this._panel.webview.postMessage(buildAppendMessagesCommand(
                page.rows,
                page.messages,
                QueueMessagesPanel.pageSize
            ));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Failed to load more messages: ${errorMessage}`);
            void this._panel.webview.postMessage(buildEmptyAppendMessagesCommand());
        } finally {
            this._isLoadingMore = false;
        }
    }

}

function getCommand(message: WebviewCommandMessage): string | undefined {
    return typeof message.command === 'string' ? message.command : undefined;
}

function getFromSequenceNumber(data: unknown): string | undefined {
    if (!isRecord(data)) {
        return undefined;
    }

    return typeof data.fromSequenceNumber === 'string' ? data.fromSequenceNumber : undefined;
}

function asQueueMessagePayload(data: unknown): QueueMessage | QueueMessage[] | undefined {
    if (Array.isArray(data)) {
        const messages = data.filter(isQueueMessage);
        return messages.length > 0 ? messages : undefined;
    }

    return isQueueMessage(data) ? data : undefined;
}

function isQueueMessage(value: unknown): value is QueueMessage {
    return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
