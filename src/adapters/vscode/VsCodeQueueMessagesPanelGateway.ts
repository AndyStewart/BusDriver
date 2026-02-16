import type * as vscode from 'vscode';
import { QueueMessagesPanel } from '../../providers/QueueMessagesPanel';
import type { LoadQueueMessages } from '../../ports/primary/LoadQueueMessages';
import type { QueueReference } from '../../ports/primary/OpenQueueMessages';
import type { QueueMessagesPanelGateway } from '../../ports/secondary/QueueMessagesPanelGateway';

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
