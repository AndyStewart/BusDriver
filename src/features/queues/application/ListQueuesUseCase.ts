import { QueueRegistryService } from './QueueRegistryService';
import type { ListQueues } from '../ports/ListQueues';
import type { QueueSelection } from './ListQueuesTypes';

export class ListQueuesUseCase implements ListQueues {
    constructor(private readonly queueRegistryService: QueueRegistryService) {}

    async list(): Promise<QueueSelection[]> {
        const queues = await this.queueRegistryService.listAllQueues();
        return queues.map(entry => ({
            queue: {
                name: entry.queue.name,
                connectionId: entry.queue.connectionId
            },
            connection: {
                id: entry.connection.id,
                name: entry.connection.name
            }
        }));
    }
}
