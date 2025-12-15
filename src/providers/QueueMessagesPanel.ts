import * as vscode from 'vscode';
import { ServiceBusClient, ServiceBusReceivedMessage } from '@azure/service-bus';
import { Queue } from '../models/Queue';

export class QueueMessagesPanel {
    public static currentPanel: QueueMessagesPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly queue: Queue,
        private readonly connectionString: string,
        private readonly extensionUri: vscode.Uri
    ) {
        this._panel = panel;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        this._update();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static async createOrShow(
        extensionUri: vscode.Uri,
        queue: Queue,
        connectionString: string
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (QueueMessagesPanel.currentPanel) {
            QueueMessagesPanel.currentPanel._panel.reveal(column);
            QueueMessagesPanel.currentPanel.queue.name = queue.name;
            QueueMessagesPanel.currentPanel.queue.connectionId = queue.connectionId;
            await QueueMessagesPanel.currentPanel._update();
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
            queue,
            connectionString,
            extensionUri
        );
    }

    public dispose() {
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

    private async _update() {
        this._panel.title = `Queue: ${this.queue.name}`;
        this._panel.webview.html = await this._getHtmlForWebview();
    }

    private async _getHtmlForWebview(): Promise<string> {
        try {
            const messages = await this._peekMessages();
            const messagesJson = JSON.stringify(messages.map(msg => ({
                sequenceNumber: msg.sequenceNumber?.toString() || 'N/A',
                messageId: msg.messageId?.toString() || 'N/A',
                enqueuedTime: msg.enqueuedTimeUtc ? new Date(msg.enqueuedTimeUtc).toLocaleString() : 'N/A',
                deliveryCount: msg.deliveryCount || 0,
                body: typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body, null, 2),
                properties: msg.applicationProperties || {}
            })));

            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Queue Messages</title>
                <style>
                    * {
                        box-sizing: border-box;
                    }
                    html, body {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                    body {
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        display: flex;
                        flex-direction: column;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px 20px 10px 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        flex-shrink: 0;
                    }
                    h1 {
                        margin: 0;
                        font-size: 1.5em;
                    }
                    .message-count {
                        color: var(--vscode-descriptionForeground);
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 14px;
                        cursor: pointer;
                        font-size: 13px;
                        border-radius: 2px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .grid-container {
                        flex: 1;
                        overflow: auto;
                        padding: 20px;
                        min-height: 25vh;
                    }
                    .splitter {
                        height: 4px;
                        background-color: var(--vscode-panel-border);
                        cursor: ns-resize;
                        flex-shrink: 0;
                        position: relative;
                        display: none;
                    }
                    .splitter.visible {
                        display: block;
                    }
                    .splitter:hover {
                        background-color: var(--vscode-focusBorder);
                    }
                    .splitter::before {
                        content: '';
                        position: absolute;
                        top: -2px;
                        bottom: -2px;
                        left: 0;
                        right: 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background-color: var(--vscode-editor-background);
                    }
                    th {
                        background-color: var(--vscode-editorGroupHeader-tabsBackground);
                        color: var(--vscode-foreground);
                        padding: 12px 8px;
                        text-align: left;
                        font-weight: 600;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    td {
                        padding: 10px 8px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    tbody tr {
                        cursor: pointer;
                    }
                    tbody tr:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    tbody tr.selected {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    .message-id {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 0.9em;
                        color: var(--vscode-textLink-foreground);
                    }
                    tbody tr.selected .message-id {
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    .sequence-number {
                        font-family: var(--vscode-editor-font-family);
                        color: var(--vscode-descriptionForeground);
                    }
                    tbody tr.selected .sequence-number {
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                    .no-messages {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .details-container {
                        display: none;
                        flex-direction: column;
                        height: 40vh;
                        flex-shrink: 0;
                        min-height: 150px;
                    }
                    .details-container.visible {
                        display: flex;
                    }

                    .tabs {
                        display: flex;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        flex-shrink: 0;
                    }
                    .tab {
                        padding: 10px 20px;
                        cursor: pointer;
                        border-bottom: 2px solid transparent;
                        color: var(--vscode-foreground);
                    }
                    .tab:hover {
                        background-color: var(--vscode-toolbar-hoverBackground);
                    }
                    .tab.active {
                        border-bottom: 2px solid var(--vscode-focusBorder);
                        background-color: var(--vscode-editor-background);
                    }
                    .tab-content {
                        display: none;
                        padding: 15px;
                        background-color: var(--vscode-editor-background);
                        overflow: auto;
                        flex: 1;
                        min-height: 0;
                    }
                    .tab-content.active {
                        display: flex;
                        flex-direction: column;
                    }
                    .message-body-content {
                        font-family: var(--vscode-editor-font-family);
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 10px;
                        border-radius: 4px;
                        overflow-x: auto;
                    }
                    .properties-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .properties-table td {
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    .properties-table td:first-child {
                        font-weight: 600;
                        width: 30%;
                        color: var(--vscode-symbolIcon-variableForeground);
                    }
                    .no-selection {
                        text-align: center;
                        padding: 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Queue: ${this.queue.name}</h1>
                        <span class="message-count">${messages.length} message(s) peeked</span>
                    </div>
                    <button onclick="refresh()">Refresh</button>
                </div>
                <div class="grid-container" id="gridContainer">
                    ${this._generateMessageTable(messages)}
                </div>
                <div class="splitter" id="splitter"></div>
                <div class="details-container" id="detailsContainer">
                    <div class="tabs">
                        <div class="tab active" onclick="switchTab('body')">Body</div>
                        <div class="tab" onclick="switchTab('properties')">Properties</div>
                    </div>
                    <div class="tab-content active" id="bodyTab">
                        <div class="message-body-content" id="bodyContent"></div>
                    </div>
                    <div class="tab-content" id="propertiesTab">
                        <div id="propertiesContent"></div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const messages = ${messagesJson};
                    let selectedRow = null;

                    function refresh() {
                        vscode.postMessage({ command: 'refresh' });
                    }

                    // Splitter functionality
                    const splitter = document.getElementById('splitter');
                    const detailsContainer = document.getElementById('detailsContainer');
                    let isResizing = false;

                    splitter.addEventListener('mousedown', (e) => {
                        isResizing = true;
                        document.body.style.cursor = 'ns-resize';
                        e.preventDefault();
                    });

                    document.addEventListener('mousemove', (e) => {
                        if (!isResizing) return;
                        
                        const windowHeight = window.innerHeight;
                        const headerHeight = document.querySelector('.header').offsetHeight;
                        const availableHeight = windowHeight - headerHeight;
                        
                        // Calculate new height based on mouse position
                        const mouseY = e.clientY - headerHeight;
                        const detailsHeight = availableHeight - mouseY - 4; // 4px for splitter
                        
                        // Set constraints
                        const minDetailsHeight = 150;
                        const minGridHeight = availableHeight * 0.25;
                        const maxDetailsHeight = availableHeight - minGridHeight - 4;
                        
                        if (detailsHeight >= minDetailsHeight && detailsHeight <= maxDetailsHeight) {
                            detailsContainer.style.height = detailsHeight + 'px';
                        }
                    });

                    document.addEventListener('mouseup', () => {
                        if (isResizing) {
                            isResizing = false;
                            document.body.style.cursor = '';
                        }
                    });

                    function switchTab(tabName) {
                        // Update tab buttons
                        document.querySelectorAll('.tab').forEach(tab => {
                            tab.classList.remove('active');
                        });
                        event.target.classList.add('active');

                        // Update tab content
                        document.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        document.getElementById(tabName + 'Tab').classList.add('active');
                    }

                    function selectMessage(index) {
                        const message = messages[index];
                        
                        // Update selected row
                        if (selectedRow !== null) {
                            document.querySelectorAll('tbody tr')[selectedRow].classList.remove('selected');
                        }
                        selectedRow = index;
                        document.querySelectorAll('tbody tr')[index].classList.add('selected');

                        // Show details container and splitter
                        document.getElementById('detailsContainer').classList.add('visible');
                        document.getElementById('splitter').classList.add('visible');

                        // Update body content
                        document.getElementById('bodyContent').textContent = message.body;

                        // Update properties content
                        const propertiesContent = document.getElementById('propertiesContent');
                        const propEntries = Object.entries(message.properties);
                        
                        if (propEntries.length === 0) {
                            propertiesContent.innerHTML = '<div class="no-selection">No application properties</div>';
                        } else {
                            let html = '<table class="properties-table">';
                            propEntries.forEach(([key, value]) => {
                                html += '<tr><td>' + escapeHtml(key) + '</td><td>' + escapeHtml(String(value)) + '</td></tr>';
                            });
                            html += '</table>';
                            propertiesContent.innerHTML = html;
                        }
                    }

                    function escapeHtml(unsafe) {
                        return unsafe
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }

                    // Add click handlers to table rows
                    document.addEventListener('DOMContentLoaded', () => {
                        const rows = document.querySelectorAll('tbody tr');
                        rows.forEach((row, index) => {
                            row.addEventListener('click', () => selectMessage(index));
                        });
                    });
                </script>
            </body>
            </html>`;
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

    private _generateMessageTable(messages: ServiceBusReceivedMessage[]): string {
        if (messages.length === 0) {
            return '<div class="no-messages">No messages in queue</div>';
        }

        const rows = messages.map(msg => {
            const enqueuedTime = msg.enqueuedTimeUtc
                ? new Date(msg.enqueuedTimeUtc).toLocaleString()
                : 'N/A';

            return `
                <tr>
                    <td class="sequence-number">${msg.sequenceNumber?.toString() || 'N/A'}</td>
                    <td class="message-id">${this._escapeHtml(msg.messageId?.toString() || 'N/A')}</td>
                    <td>${enqueuedTime}</td>
                    <td>${msg.deliveryCount || 0}</td>
                </tr>
            `;
        }).join('');

        return `
            <table>
                <thead>
                    <tr>
                        <th>Sequence #</th>
                        <th>Message ID</th>
                        <th>Enqueued Time</th>
                        <th>Delivery Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    private async _peekMessages(): Promise<ServiceBusReceivedMessage[]> {
        const client = new ServiceBusClient(this.connectionString);
        const receiver = client.createReceiver(this.queue.name);

        try {
            // Peek up to 50 messages
            const messages = await receiver.peekMessages(50);
            return messages;
        } finally {
            await receiver.close();
            await client.close();
        }
    }

    private _escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
