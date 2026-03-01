import type * as vscode from 'vscode';
import type { LoadQueueMessages } from '../../ports/primary/LoadQueueMessages';
import type { QueueMessagesPanelGateway } from '../../ports/secondary/QueueMessagesPanelGateway';
import type { QueueReference } from '../../features/openQueueMessages/OpenQueueMessagesTypes';
import { QueueMessagesPanel } from '../primary/WebviewQueueMessagesPanelAdapter';

export class VsCodeQueueMessagesPanelGateway implements QueueMessagesPanelGateway {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly loadQueueMessages: LoadQueueMessages
    ) {}

    async open(queue: QueueReference, connectionString: string): Promise<void> {
        await QueueMessagesPanel.createOrShow(
            this.extensionUri,
            {
                name: queue.name,
                connectionId: queue.connectionId
            },
            connectionString,
            this.loadQueueMessages
        );
    }
}
