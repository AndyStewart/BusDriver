(function () {
    const vscode = acquireVsCodeApi();

    const initialDataElement = document.getElementById('queueMessagesInitialData');
    let parsedInitialData = { messages: [], pageSize: 50 };
    if (initialDataElement?.textContent) {
        try {
            parsedInitialData = JSON.parse(initialDataElement.textContent);
        } catch {
            parsedInitialData = { messages: [], pageSize: 50 };
        }
    }

    const queueName = typeof parsedInitialData.queueName === 'string' ? parsedInitialData.queueName : '';
    const headers = Array.isArray(parsedInitialData.headers) ? parsedInitialData.headers : [];
    const initialRows = Array.isArray(parsedInitialData.rows) ? parsedInitialData.rows : [];
    const messages = Array.isArray(parsedInitialData.messages) ? parsedInitialData.messages : [];
    const PAGE_SIZE = Number.isFinite(parsedInitialData.pageSize) ? parsedInitialData.pageSize : 50;
    let selectedRows = new Set();
    let lastSelectedIndex = null;
    let hasMore = messages.length === PAGE_SIZE;
    let isLoadingMore = false;

    const messageCount = document.getElementById('messageCount');

    const purgeButton = document.getElementById('purgeButton');
    if (purgeButton) {
        purgeButton.disabled = messages.length === 0;
    }

    function refresh() {
        vscode.postMessage({ command: 'refresh' });
    }

    function configureColumns() {
        vscode.postMessage({ command: 'configureColumns' });
    }

    function updateMessageCount() {
        if (messageCount) {
            messageCount.textContent = messages.length + ' message(s) peeked';
        }
    }

    function renderInitialGrid() {
        const gridContainer = document.getElementById('gridContainer');
        if (!gridContainer) {
            return;
        }

        gridContainer.innerHTML = '';
        if (initialRows.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.classList.add('no-messages');
            emptyState.textContent = 'No messages in queue';
            gridContainer.appendChild(emptyState);
            return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = String(headerText);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        initialRows.forEach((cells, index) => {
            const row = buildRow(cells, index);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        gridContainer.appendChild(table);
    }

    const splitter = document.getElementById('splitter');
    const detailsContainer = document.getElementById('detailsContainer');
    let isResizing = false;

    if (splitter && detailsContainer) {
        splitter.addEventListener('mousedown', e => {
            isResizing = true;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isResizing) {
                return;
            }

            const header = document.querySelector('.header');
            if (!(header instanceof HTMLElement)) {
                return;
            }

            const windowHeight = window.innerHeight;
            const headerHeight = header.offsetHeight;
            const availableHeight = windowHeight - headerHeight;

            const mouseY = e.clientY - headerHeight;
            const detailsHeight = availableHeight - mouseY - 4;

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
    }

    function switchTab(tabName, tabElement) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        if (tabElement instanceof HTMLElement) {
            tabElement.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const tabContent = document.getElementById(tabName + 'Tab');
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }

    function selectMessage(index, event) {
        const rows = document.querySelectorAll('tbody tr');

        if (event && (event.ctrlKey || event.metaKey)) {
            if (selectedRows.has(index)) {
                selectedRows.delete(index);
                rows[index].classList.remove('selected');
            } else {
                selectedRows.add(index);
                rows[index].classList.add('selected');
            }
            lastSelectedIndex = index;
        } else if (event && event.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            for (let i = start; i <= end; i += 1) {
                selectedRows.add(i);
                rows[i].classList.add('selected');
            }
        } else {
            selectedRows.forEach(i => rows[i].classList.remove('selected'));
            selectedRows.clear();
            selectedRows.add(index);
            rows[index].classList.add('selected');
            lastSelectedIndex = index;
        }

        const moveButton = document.getElementById('moveButton');
        const deleteButton = document.getElementById('deleteButton');
        if (selectedRows.size > 0) {
            if (moveButton) {
                moveButton.disabled = false;
                moveButton.textContent = selectedRows.size === 1
                    ? 'Move to Queue...'
                    : 'Move ' + selectedRows.size + ' Messages to Queue...';
            }
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.textContent = selectedRows.size === 1
                    ? 'Delete Message...'
                    : 'Delete ' + selectedRows.size + ' Messages...';
            }
        } else {
            if (moveButton) {
                moveButton.disabled = true;
                moveButton.textContent = 'Move to Queue...';
            }
            if (deleteButton) {
                deleteButton.disabled = true;
                deleteButton.textContent = 'Delete Message...';
            }
        }

        const displayIndex = selectedRows.has(index) ? index : Array.from(selectedRows)[0];
        if (displayIndex !== undefined) {
            const displayMessage = messages[displayIndex];
            const details = document.getElementById('detailsContainer');
            const splitterElement = document.getElementById('splitter');
            if (details) {
                details.classList.add('visible');
            }
            if (splitterElement) {
                splitterElement.classList.add('visible');
            }

            const bodyContent = document.getElementById('bodyContent');
            if (bodyContent) {
                bodyContent.textContent = displayMessage.body;
            }

            const propertiesContent = document.getElementById('propertiesContent');
            const propEntries = Object.entries(displayMessage.properties);

            if (propertiesContent) {
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
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getSelectedMessagesPayload() {
        return Array.from(selectedRows).map(index => {
            const message = messages[index];
            return {
                sequenceNumber: message.sequenceNumber,
                messageId: message.messageId,
                body: message.rawBody ?? message.body,
                properties: message.properties,
                enqueuedTime: message.enqueuedTime,
                deliveryCount: message.deliveryCount
            };
        });
    }

    function moveSelectedMessage() {
        if (selectedRows.size === 0) {
            return;
        }

        vscode.postMessage({
            command: 'moveToQueue',
            data: getSelectedMessagesPayload()
        });
    }

    function deleteSelectedMessages() {
        if (selectedRows.size === 0) {
            return;
        }

        vscode.postMessage({
            command: 'deleteMessages',
            data: getSelectedMessagesPayload()
        });
    }

    function purgeQueue() {
        vscode.postMessage({ command: 'purgeQueue' });
    }

    function handleDragStart(event, index) {
        let messagesToDrag;

        if (selectedRows.has(index)) {
            messagesToDrag = Array.from(selectedRows).map(i => {
                const msg = messages[i];
                return {
                    sequenceNumber: msg.sequenceNumber,
                    messageId: msg.messageId,
                    body: msg.rawBody ?? msg.body,
                    properties: msg.properties,
                    enqueuedTime: msg.enqueuedTime,
                    deliveryCount: msg.deliveryCount
                };
            });
        } else {
            const msg = messages[index];
            messagesToDrag = [{
                sequenceNumber: msg.sequenceNumber,
                messageId: msg.messageId,
                body: msg.rawBody ?? msg.body,
                properties: msg.properties,
                enqueuedTime: msg.enqueuedTime,
                deliveryCount: msg.deliveryCount
            }];
        }

        vscode.postMessage({
            command: 'startDrag',
            data: messagesToDrag
        });

        const dragDataJson = JSON.stringify(messagesToDrag);
        const uri = 'busdriver-message:' + encodeURIComponent(dragDataJson);
        event.dataTransfer.setData('text/uri-list', uri);
        event.dataTransfer.setData('text/plain', dragDataJson);
        event.dataTransfer.effectAllowed = 'copy';
    }

    function wireRow(row, index) {
        row.addEventListener('click', e => selectMessage(index, e));
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', e => handleDragStart(e, index));
    }

    function buildRow(cells, index) {
        const row = document.createElement('tr');
        cells.forEach((cell, cellIndex) => {
            const td = document.createElement('td');
            td.textContent = cell;
            if (cellIndex === 0) {
                td.classList.add('sequence-number');
            } else if (cellIndex === 1) {
                td.classList.add('message-id');
            }
            row.appendChild(td);
        });
        wireRow(row, index);
        return row;
    }

    function appendMessages(newMessages, newRows, moreAvailable) {
        const tbody = document.querySelector('tbody');
        if (!tbody || !Array.isArray(newMessages) || !Array.isArray(newRows)) {
            hasMore = Boolean(moreAvailable);
            isLoadingMore = false;
            return;
        }

        newRows.forEach((cells, index) => {
            const messageIndex = messages.length + index;
            const row = buildRow(cells, messageIndex);
            tbody.appendChild(row);
        });

        messages.push(...newMessages);
        hasMore = Boolean(moreAvailable);
        isLoadingMore = false;
        updateMessageCount();
    }

    function requestMoreMessages() {
        if (!hasMore || isLoadingMore || messages.length === 0) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || !lastMessage.sequenceNumber) {
            hasMore = false;
            return;
        }

        isLoadingMore = true;
        vscode.postMessage({
            command: 'loadMore',
            data: { fromSequenceNumber: lastMessage.sequenceNumber }
        });
    }

    function bindActionHandlers() {
        document.querySelectorAll('[data-action]').forEach(element => {
            const action = element.getAttribute('data-action');
            element.addEventListener('click', () => {
                switch (action) {
                    case 'refresh':
                        refresh();
                        break;
                    case 'configureColumns':
                        configureColumns();
                        break;
                    case 'moveToQueue':
                        moveSelectedMessage();
                        break;
                    case 'deleteMessages':
                        deleteSelectedMessages();
                        break;
                    case 'purgeQueue':
                        purgeQueue();
                        break;
                    default:
                        break;
                }
            });
        });
    }

    function bindTabHandlers() {
        document.querySelectorAll('.tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                if (tabName) {
                    switchTab(tabName, tab);
                }
            });
        });
    }

    window.addEventListener('message', event => {
        const message = event.data;
        if (!message || !message.command) {
            return;
        }

        if (message.command === 'appendMessages') {
            appendMessages(message.messages, message.rows, message.hasMore);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const queueTitle = document.getElementById('queueTitle');
        if (queueTitle) {
            queueTitle.textContent = 'Queue: ' + queueName;
        }
        updateMessageCount();
        renderInitialGrid();

        bindActionHandlers();
        bindTabHandlers();

        const gridContainer = document.getElementById('gridContainer');
        if (gridContainer) {
            gridContainer.addEventListener('scroll', () => {
                const remaining = gridContainer.scrollHeight - gridContainer.scrollTop - gridContainer.clientHeight;
                if (remaining < 200) {
                    requestMoreMessages();
                }
            });
        }
    });
})();
