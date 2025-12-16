import * as vscode from 'vscode';
import { ServiceBusClient, ServiceBusReceivedMessage } from '@azure/service-bus';
import { Queue } from '../models/Queue';

export interface MessageData {
    sequenceNumber: string;
    messageId: string;
    body: string;
    properties: Record<string, unknown>;
    enqueuedTime: string;
    deliveryCount: number;
    sourceQueue?: Queue;
    sourceConnectionString?: string;
}

export class QueueMessagesPanel {
    public static currentPanel: QueueMessagesPanel | undefined;
    public static pendingDragMessage: MessageData | MessageData[] | undefined;
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
            async message => {
                switch (message.command) {
                    case 'refresh':
                        this._update();
                        return;
                    case 'removeMessage':
                        // Message was successfully moved, refresh the view
                        this._update();
                        return;
                    case 'startDrag':
                        // Store the message data for drag operation
                        QueueMessagesPanel.pendingDragMessage = message.data;
                        console.log('Stored pending drag message:', message.data.messageId);
                        return;
                    case 'moveToQueue': {
                        // User wants to move message(s) to another queue
                        // Add source queue information to each message
                        const messages = Array.isArray(message.data) ? message.data : [message.data];
                        messages.forEach((msg: MessageData) => {
                            msg.sourceQueue = this.queue;
                            msg.sourceConnectionString = this.connectionString;
                        });
                        await vscode.commands.executeCommand('busdriver.moveMessageToQueue', messages);
                        return;
                    }
                    case 'deleteMessages': {
                        // User wants to delete message(s)
                        // Add source queue information to each message
                        const messages = Array.isArray(message.data) ? message.data : [message.data];
                        messages.forEach((msg: MessageData) => {
                            msg.sourceQueue = this.queue;
                            msg.sourceConnectionString = this.connectionString;
                        });
                        await vscode.commands.executeCommand('busdriver.deleteMessages', messages);
                        return;
                    }
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

    public notifyMessageRemoved(sequenceNumber: string): void {
        this._panel.webview.postMessage({
            command: 'removeMessage',
            sequenceNumber: sequenceNumber
        });
    }

    public async refreshView(): Promise<void> {
        await this._update();
    }

    private async _update() {
        this._panel.title = `Queue: ${this.queue.name}`;
        this._panel.webview.html = await this._getHtmlForWebview();
    }

    private async _getHtmlForWebview(): Promise<string> {
        try {
            const messages = await this._peekMessages();
            const messagesJson = JSON.stringify(messages.map(msg => {
                let bodyContent: string;
                if (typeof msg.body === 'string') {
                    bodyContent = msg.body;
                } else if (Buffer.isBuffer(msg.body)) {
                    try {
                        const parsed = JSON.parse(msg.body.toString().trim());
                        bodyContent = JSON.stringify(parsed, null, 2);
                    } catch {
                        bodyContent = msg.body.toString();
                    }
                } else {
                    bodyContent = JSON.stringify(msg.body, null, 2);
                }

                return {
                    sequenceNumber: msg.sequenceNumber?.toString() || 'N/A',
                    messageId: msg.messageId?.toString() || 'N/A',
                    enqueuedTime: msg.enqueuedTimeUtc ? new Date(msg.enqueuedTimeUtc).toLocaleString() : 'N/A',
                    deliveryCount: msg.deliveryCount || 0,
                    body: bodyContent,
                    properties: msg.applicationProperties || {}
                };
            }));

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
                    tbody tr[draggable="true"] {
                        cursor: grab;
                    }
                    tbody tr[draggable="true"]:active {
                        cursor: grabbing;
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
                    .move-button {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        margin-left: 8px;
                    }
                    .move-button:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                    .move-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .delete-button {
                        background-color: var(--vscode-errorForeground);
                        color: var(--vscode-editor-background);
                        margin-left: 8px;
                    }
                    .delete-button:hover {
                        opacity: 0.8;
                    }
                    .delete-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Queue: ${this.queue.name}</h1>
                        <span class="message-count">${messages.length} message(s) peeked</span>
                    </div>
                    <div>
                        <button id="deleteButton" class="delete-button" onclick="deleteSelectedMessages()" disabled>Delete Message...</button>
                        <button id="moveButton" class="move-button" onclick="moveSelectedMessage()" disabled>Move to Queue...</button>
                        <button onclick="refresh()">Refresh</button>
                    </div>
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
                    let selectedRows = new Set();
                    let lastSelectedIndex = null;

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

                    function selectMessage(index, event) {
                        const message = messages[index];
                        const rows = document.querySelectorAll('tbody tr');
                        
                        // Handle multi-selection with Ctrl/Cmd+click or Shift+click
                        if (event && (event.ctrlKey || event.metaKey)) {
                            // Ctrl/Cmd+click: toggle individual selection
                            if (selectedRows.has(index)) {
                                selectedRows.delete(index);
                                rows[index].classList.remove('selected');
                            } else {
                                selectedRows.add(index);
                                rows[index].classList.add('selected');
                            }
                            lastSelectedIndex = index;
                        } else if (event && event.shiftKey && lastSelectedIndex !== null) {
                            // Shift+click: select range
                            const start = Math.min(lastSelectedIndex, index);
                            const end = Math.max(lastSelectedIndex, index);
                            for (let i = start; i <= end; i++) {
                                selectedRows.add(i);
                                rows[i].classList.add('selected');
                            }
                        } else {
                            // Regular click: select single, clear others
                            selectedRows.forEach(i => rows[i].classList.remove('selected'));
                            selectedRows.clear();
                            selectedRows.add(index);
                            rows[index].classList.add('selected');
                            lastSelectedIndex = index;
                        }

                        // Update move and delete button states and text
                        const moveButton = document.getElementById('moveButton');
                        const deleteButton = document.getElementById('deleteButton');
                        if (selectedRows.size > 0) {
                            moveButton.disabled = false;
                            deleteButton.disabled = false;
                            if (selectedRows.size === 1) {
                                moveButton.textContent = 'Move to Queue...';
                                deleteButton.textContent = 'Delete Message...';
                            } else {
                                moveButton.textContent = 'Move ' + selectedRows.size + ' Messages to Queue...';
                                deleteButton.textContent = 'Delete ' + selectedRows.size + ' Messages...';
                            }
                        } else {
                            moveButton.disabled = true;
                            deleteButton.disabled = true;
                            moveButton.textContent = 'Move to Queue...';
                            deleteButton.textContent = 'Delete Message...';
                        }

                        // Show details for the last selected message (or first if clicking already selected)
                        const displayIndex = selectedRows.has(index) ? index : Array.from(selectedRows)[0];
                        if (displayIndex !== undefined) {
                            const displayMessage = messages[displayIndex];
                            
                            // Show details container and splitter
                            document.getElementById('detailsContainer').classList.add('visible');
                            document.getElementById('splitter').classList.add('visible');

                            // Update body content
                            document.getElementById('bodyContent').textContent = displayMessage.body;

                            // Update properties content
                            const propertiesContent = document.getElementById('propertiesContent');
                            const propEntries = Object.entries(displayMessage.properties);
                            
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
                    }

                    function escapeHtml(unsafe) {
                        return unsafe
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }

                    function moveSelectedMessage() {
                        if (selectedRows.size === 0) {
                            return;
                        }

                        // Collect all selected messages
                        const selectedMessages = Array.from(selectedRows).map(index => {
                            const message = messages[index];
                            return {
                                sequenceNumber: message.sequenceNumber,
                                messageId: message.messageId,
                                body: message.body,
                                properties: message.properties,
                                enqueuedTime: message.enqueuedTime,
                                deliveryCount: message.deliveryCount
                            };
                        });

                        vscode.postMessage({
                            command: 'moveToQueue',
                            data: selectedMessages
                        });
                    }

                    function deleteSelectedMessages() {
                        if (selectedRows.size === 0) {
                            return;
                        }

                        // Collect all selected messages
                        const selectedMessages = Array.from(selectedRows).map(index => {
                            const message = messages[index];
                            return {
                                sequenceNumber: message.sequenceNumber,
                                messageId: message.messageId,
                                body: message.body,
                                properties: message.properties,
                                enqueuedTime: message.enqueuedTime,
                                deliveryCount: message.deliveryCount
                            };
                        });

                        vscode.postMessage({
                            command: 'deleteMessages',
                            data: selectedMessages
                        });
                    }

                    // Drag and drop handlers
                    function handleDragStart(event, index) {
                        // If dragging a selected row, drag all selected messages
                        // Otherwise, drag just the single row being dragged
                        let messagesToDrag;
                        
                        if (selectedRows.has(index)) {
                            // Drag all selected messages
                            messagesToDrag = Array.from(selectedRows).map(i => {
                                const msg = messages[i];
                                return {
                                    sequenceNumber: msg.sequenceNumber,
                                    messageId: msg.messageId,
                                    body: msg.body,
                                    properties: msg.properties,
                                    enqueuedTime: msg.enqueuedTime,
                                    deliveryCount: msg.deliveryCount
                                };
                            });
                        } else {
                            // Drag single unselected message
                            const msg = messages[index];
                            messagesToDrag = [{
                                sequenceNumber: msg.sequenceNumber,
                                messageId: msg.messageId,
                                body: msg.body,
                                properties: msg.properties,
                                enqueuedTime: msg.enqueuedTime,
                                deliveryCount: msg.deliveryCount
                            }];
                        }
                        
                        // Notify extension about drag start so it can store the data
                        vscode.postMessage({
                            command: 'startDrag',
                            data: messagesToDrag
                        });
                        
                        const dragDataJson = JSON.stringify(messagesToDrag);
                        
                        // Set data with special URI format that VS Code can understand
                        const uri = 'busdriver-message:' + encodeURIComponent(dragDataJson);
                        event.dataTransfer.setData('text/uri-list', uri);
                        event.dataTransfer.setData('text/plain', dragDataJson);
                        event.dataTransfer.effectAllowed = 'copy';
                        
                        const count = messagesToDrag.length;
                        console.log('Drag started with ' + count + ' message(s)');
                    }

                    // Add click and drag handlers to table rows
                    document.addEventListener('DOMContentLoaded', () => {
                        const rows = document.querySelectorAll('tbody tr');
                        rows.forEach((row, index) => {
                            row.addEventListener('click', (e) => selectMessage(index, e));
                            row.setAttribute('draggable', 'true');
                            row.addEventListener('dragstart', (e) => handleDragStart(e, index));
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
