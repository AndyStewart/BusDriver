import type { Connection } from '../../domain/models/Connection';
import type { ConnectionRepository } from '../../ports/ConnectionRepository';

export class InMemoryConnectionRepository implements ConnectionRepository {
    private connections: Connection[] = [];

    async getAll(): Promise<Connection[]> {
        return [...this.connections];
    }

    async getById(id: string): Promise<Connection | undefined> {
        return this.connections.find((connection) => connection.id === id);
    }

    async save(connection: Connection): Promise<void> {
        const index = this.connections.findIndex((entry) => entry.id === connection.id);
        if (index >= 0) {
            this.connections[index] = connection;
            return;
        }

        this.connections.push(connection);
    }

    async remove(id: string): Promise<void> {
        this.connections = this.connections.filter((connection) => connection.id !== id);
    }
}
